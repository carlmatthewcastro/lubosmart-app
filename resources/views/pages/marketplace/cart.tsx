import { useConfirmAction } from '@/components/shared/action-feedback';
import { Card, Empty, Field, Notice, Page, Select, buttonClass, money, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { useWorkspaceStatus } from '@/components/workspace/workspace-runtime';
import { accountApi } from '@/lib/account-api';
import { type SharedData } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Product } from './catalog';

type Address = { id: number; label: string; recipient_name: string; line1: string; barangay: string; city: string; province: string; phone: string };
export default function Cart({
    items,
    addresses,
    shippingFee,
    logisticsPricing,
}: {
    items: {
        id: number;
        quantity: number;
        product: Product & { is_available?: boolean };
        product_variant_id?: number | null;
        variant?: { name: string; stock: number; is_active: boolean } | null;
    }[];
    addresses: Address[];
    shippingFee: string;
    logisticsPricing: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const confirm = useConfirmAction();
    const workspace = useWorkspaceStatus();
    const canCheckout = auth.user.status === 'approved' && !!auth.user.email_verified_at;
    const [addingAddress, setAddingAddress] = useState(addresses.length === 0);
    const [updating, setUpdating] = useState(false);
    const [checkoutKey] = useState(() => crypto.randomUUID());
    const checkout = useForm({
        address_id: addresses[0]?.id.toString() ?? '',
        checkout_key: checkoutKey,
        logistics_center_id: '',
        expected_shipping_total: '',
    });
    const address = useForm({
        label: 'Home',
        recipient_name: '',
        phone: '',
        line1: '',
        line2: '',
        barangay: '',
        city: '',
        province: '',
        region: '',
        zip: '',
    });
    const selectedAddressId = checkout.data.address_id;
    const setCheckoutData = checkout.setData;
    useEffect(() => {
        if (!addresses.some((item) => String(item.id) === selectedAddressId)) {
            setCheckoutData('address_id', addresses[0]?.id.toString() ?? '');
        }
    }, [addresses, selectedAddressId, setCheckoutData]);
    const subtotal = items.reduce((total, item) => total + Math.round(Number(item.product.price) * 100) * item.quantity, 0) / 100;
    const stores = new Set(items.map((item) => item.product.store_id)).size;
    const [quotes, setQuotes] = useState<{ id: number; name: string; total: number; parcels: { weight_grams: number; fee_cents: number }[] }[]>([]);
    const [quoteAddress, setQuoteAddress] = useState('');
    const [quoteError, setQuoteError] = useState('');
    const [quoteAttempt, setQuoteAttempt] = useState(0);
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherBusy, setVoucherBusy] = useState(false);
    const [voucherError, setVoucherError] = useState('');
    const [voucher, setVoucher] = useState<{ code: string; discount_cents: number; cartKey: string } | null>(null);
    const itemKey = items
        .map((item) => [item.id, item.quantity, item.product.price, item.product.weight_grams, item.product_variant_id].join(':'))
        .join(',');
    const voucherReady = !!voucher && voucher.cartKey === itemKey && voucher.code === voucherCode.trim().toUpperCase();
    const discount = voucherReady ? voucher.discount_cents / 100 : 0;
    const shippingRevision = workspace?.revisions.shipping ?? '';
    const quoteKey = `${checkout.data.address_id}:${itemKey}:${shippingRevision}`;
    const unavailable = items.some(
        (item) =>
            item.product.status !== 'active' ||
            item.product.is_available === false ||
            item.quantity > item.product.stock ||
            (!!item.product_variant_id && (!item.variant?.is_active || item.quantity > item.variant.stock)),
    );
    useEffect(() => {
        if (!logisticsPricing || !checkout.data.address_id) return;
        const controller = new AbortController();
        setQuoteError('');
        fetch('/cart/shipping-quote?address_id=' + checkout.data.address_id, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
            cache: 'no-store',
        })
            .then(async (response) => {
                if (!response.ok) throw new Error('Shipping quotes could not be loaded. Try again.');
                return response.json();
            })
            .then((data) => {
                if (!controller.signal.aborted) {
                    setQuotes(data.options);
                    setQuoteAddress(quoteKey);
                    setQuoteError('');
                }
            })
            .catch((error: Error) => {
                if (!controller.signal.aborted) setQuoteError(error.message);
            });
        return () => controller.abort();
    }, [logisticsPricing, checkout.data.address_id, itemKey, quoteAttempt, quoteKey]);
    const quotesReady = quoteAddress === quoteKey;
    const selectedQuote = quotesReady ? quotes.find((quote) => quote.id.toString() === checkout.data.logistics_center_id) : undefined;
    const shipping = logisticsPricing ? (selectedQuote?.total ?? 0) : stores * Number(shippingFee);
    const update = async (product: number, quantity: number, variantId?: number | null) => {
        if (updating) return;
        if (
            quantity === 0 &&
            !(await confirm({
                title: 'Remove this item?',
                description: 'This removes this product option from your shopping bag. You can add it again while stock is available.',
                confirmLabel: 'Remove item',
                destructive: true,
            }))
        )
            return;
        router.put(
            `/cart/${product}`,
            { quantity, product_variant_id: variantId ?? null },
            { preserveScroll: true, onStart: () => setUpdating(true), onFinish: () => setUpdating(false) },
        );
    };
    return (
        <Page
            title="Your shopping bag"
            description="Review your finds and choose where to send them."
            action={
                <Link href="/shop" className={secondaryClass}>
                    Continue shopping
                </Link>
            }
        >
            {unavailable && (
                <Notice tone="warning">
                    Some items are unavailable or have less stock than your requested quantity. Adjust or remove them before checkout. Items in your
                    bag do not reserve stock.
                </Notice>
            )}
            {!canCheckout && (
                <Card className="mb-6">
                    <h2 className="font-semibold">Complete your profile before purchasing</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Your account must be approved before shopping. Submit your personal details, full address, and valid photo ID for admin
                        review. We will email the result.
                    </p>
                    <Link href={route('application.edit')} className={`${buttonClass} mt-4`}>
                        Complete your profile
                    </Link>
                </Card>
            )}
            {!items.length ? (
                <Empty title="Your bag is empty" description="Browse products and add your favorites." href="/shop" label="Discover products" />
            ) : (
                <div className="grid items-start gap-6 lg:grid-cols-[1fr_350px]">
                    <div className="space-y-6">
                        <Card>
                            <h2 className="mb-5 font-semibold">Items ({items.length})</h2>
                            <ul className="divide-y">
                                {items.map((item) => (
                                    <li
                                        key={item.id}
                                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                                    >
                                        <div className="min-w-0 break-words">
                                            <p className="text-muted-foreground text-xs">{item.product.store.name}</p>
                                            <p className="mt-1 font-medium">{item.product.name}</p>
                                            {item.variant && (
                                                <p className="text-muted-foreground mt-1 text-sm">
                                                    {item.variant.name} ·{' '}
                                                    {item.variant.is_active
                                                        ? `${item.variant.stock} available`
                                                        : 'Option retired; remove this item to continue'}
                                                </p>
                                            )}
                                            <p className="text-muted-foreground mt-2 text-sm">{money(item.product.price)} each</p>
                                        </div>
                                        <div className="row-start-2 flex w-fit items-center rounded-xl border sm:row-start-auto">
                                            <button
                                                type="button"
                                                aria-label={`Decrease ${item.product.name} quantity`}
                                                className="hover:bg-accent flex size-11 items-center justify-center rounded-xl"
                                                disabled={updating}
                                                onClick={() =>
                                                    update(
                                                        item.product.id,
                                                        Math.min(item.quantity - 1, item.variant?.stock ?? item.product.stock),
                                                        item.product_variant_id,
                                                    )
                                                }
                                            >
                                                <Minus className="size-3" />
                                            </button>
                                            <span className="min-w-7 text-center text-sm">{item.quantity}</span>
                                            <button
                                                type="button"
                                                aria-label={`Increase ${item.product.name} quantity`}
                                                className="hover:bg-accent flex size-11 items-center justify-center rounded-xl"
                                                disabled={
                                                    updating ||
                                                    (item.variant && !item.variant.is_active) ||
                                                    item.quantity >= (item.variant?.stock ?? item.product.stock)
                                                }
                                                onClick={() => update(item.product.id, item.quantity + 1, item.product_variant_id)}
                                            >
                                                <Plus className="size-3" />
                                            </button>
                                        </div>
                                        <p className="col-start-2 row-start-1 text-right text-sm font-semibold tabular-nums sm:col-start-auto sm:row-start-auto">
                                            {money(Number(item.product.price) * item.quantity)}
                                        </p>
                                        <button
                                            type="button"
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 col-start-2 row-start-2 flex size-11 items-center justify-center justify-self-end rounded-xl sm:col-start-auto sm:row-start-auto"
                                            aria-label={`Remove ${item.product.name}`}
                                            disabled={updating}
                                            onClick={() => update(item.product.id, 0, item.product_variant_id)}
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                        <Card>
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="font-semibold">Delivery address</h2>
                                <Link href="/settings/addresses" className="text-primary text-sm">
                                    Manage addresses
                                </Link>
                                <button
                                    type="button"
                                    className="text-primary min-h-11 text-sm"
                                    aria-expanded={addingAddress}
                                    onClick={() => setAddingAddress(!addingAddress)}
                                >
                                    {addingAddress ? 'Close form' : 'Add address'}
                                </button>
                            </div>
                            {addresses.length > 0 && (
                                <div className="space-y-3">
                                    {addresses.map((item) => (
                                        <label
                                            key={item.id}
                                            className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${checkout.data.address_id === String(item.id) ? 'border-primary bg-accent/40' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="delivery-address"
                                                value={item.id}
                                                checked={checkout.data.address_id === String(item.id)}
                                                onChange={(e) => checkout.setData('address_id', e.target.value)}
                                                className="accent-primary mt-1"
                                            />
                                            <span>
                                                <span className="text-sm font-semibold">
                                                    {item.label} · {item.recipient_name}
                                                </span>
                                                <span className="text-muted-foreground mt-1 block text-sm">
                                                    {item.line1}, {item.barangay}, {item.city}, {item.province}
                                                </span>
                                                <span className="text-muted-foreground block text-xs">{item.phone}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {addingAddress && (
                                <ValidatedForm
                                    className="mt-5 grid gap-4 sm:grid-cols-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        address.post('/addresses', {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                address.reset();
                                                setAddingAddress(false);
                                            },
                                        });
                                    }}
                                >
                                    {(Object.keys(address.data) as (keyof typeof address.data)[]).map((key) => (
                                        <Field
                                            key={key}
                                            label={
                                                {
                                                    label: 'Address label',
                                                    recipient_name: 'Recipient name',
                                                    phone: 'Phone number',
                                                    line1: 'Street, house & building',
                                                    line2: 'Apartment / floor (optional)',
                                                    barangay: 'Barangay',
                                                    city: 'City / municipality',
                                                    province: 'Province',
                                                    region: 'Region',
                                                    zip: 'Postal code',
                                                }[key]
                                            }
                                            required={key !== 'line2'}
                                            value={address.data[key]}
                                            onChange={(e) => address.setData(key, e.target.value)}
                                            error={address.errors[key]}
                                        />
                                    ))}
                                    <button className={buttonClass} disabled={address.processing}>
                                        Save address
                                    </button>
                                </ValidatedForm>
                            )}
                        </Card>
                    </div>
                    <Card className="lg:sticky lg:top-24">
                        <h2 className="font-semibold">Order summary</h2>
                        <ValidatedForm
                            className="mt-4 space-y-3"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setVoucherBusy(true);
                                setVoucherError('');
                                setVoucher(null);
                                try {
                                    const result = await accountApi<{ code: string; discount_cents: number }>('/cart/voucher', 'POST', {
                                        voucher_code: voucherCode,
                                    });
                                    setVoucher({ ...result, cartKey: itemKey });
                                } catch (error) {
                                    setVoucherError(error instanceof Error ? error.message : 'Unable to apply voucher. Try again.');
                                } finally {
                                    setVoucherBusy(false);
                                }
                            }}
                        >
                            <Field
                                label="Store voucher code (optional)"
                                maxLength={30}
                                value={voucherCode}
                                onChange={(event) => setVoucherCode(event.target.value)}
                                error={voucherError || (checkout.errors as Record<string, string>).voucher_code}
                            />
                            <div className="flex flex-wrap gap-3">
                                <button className={secondaryClass} disabled={voucherBusy || updating || checkout.processing || !voucherCode.trim()}>
                                    {voucherBusy ? 'Checking voucher…' : 'Apply voucher'}
                                </button>
                                <button
                                    type="button"
                                    className={secondaryClass}
                                    onClick={() => {
                                        setVoucherCode('');
                                        setVoucher(null);
                                        setVoucherError('');
                                    }}
                                    disabled={voucherBusy || checkout.processing}
                                >
                                    Remove voucher
                                </button>
                            </div>
                            {voucherCode && !voucherReady && !voucherBusy && (
                                <p role="status" className="text-muted-foreground text-xs">
                                    Apply this code after changing your cart to confirm the discount.
                                </p>
                            )}
                            {voucherReady && (
                                <p role="status" className="text-success text-sm">
                                    {voucher.code} applied: {money(discount)} off its store items.
                                </p>
                            )}
                        </ValidatedForm>
                        <div className="mt-6 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                {money(subtotal)}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Delivery ({stores} {stores === 1 ? 'store' : 'stores'})
                                </span>
                                {logisticsPricing && !selectedQuote ? 'Choose shipping' : money(shipping)}
                            </div>
                            {logisticsPricing ? (
                                <div className="space-y-3">
                                    <Select
                                        label="Logistics provider"
                                        value={checkout.data.logistics_center_id}
                                        disabled={!quotesReady}
                                        onChange={(event) => checkout.setData('logistics_center_id', event.target.value)}
                                        error={checkout.errors.logistics_center_id}
                                    >
                                        <option value="">Choose a provider</option>
                                        {(quotesReady ? quotes : []).map((quote) => (
                                            <option key={quote.id} value={quote.id}>
                                                {quote.name} / {money(quote.total)}
                                            </option>
                                        ))}
                                    </Select>
                                    {quoteError && (
                                        <Notice tone="error">
                                            <p>{quoteError}</p>
                                            <button
                                                type="button"
                                                className={`${secondaryClass} mt-3`}
                                                onClick={() => {
                                                    setQuoteAddress('');
                                                    setQuoteError('');
                                                    setQuoteAttempt((attempt) => attempt + 1);
                                                }}
                                            >
                                                Retry shipping quotes
                                            </button>
                                        </Notice>
                                    )}
                                    {!quoteError && (
                                        <p role="status" className="text-muted-foreground text-sm leading-relaxed">
                                            {!checkout.data.address_id
                                                ? 'Choose a delivery address to see shipping quotes.'
                                                : !quotesReady
                                                  ? 'Loading available providers...'
                                                  : !quotes.length
                                                    ? 'No provider can currently serve every parcel. Check address coverage and ask sellers to add packed weights.'
                                                    : 'Rates include a destination base fee and extra weight charges. Each store sends a separate parcel.'}
                                        </p>
                                    )}
                                    {selectedQuote?.parcels.map((parcel, index) => (
                                        <p key={index} className="text-muted-foreground text-xs">
                                            Parcel {index + 1}: {(parcel.weight_grams / 1000).toFixed(2)} kg / {money(parcel.fee_cents / 100)}
                                        </p>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-xs">{money(shippingFee)} per store. Each store sends a separate parcel.</p>
                            )}
                            <div className="flex justify-between border-t pt-4 text-base font-semibold">
                                <span>Total</span>
                                {logisticsPricing && !selectedQuote ? 'Choose shipping' : money(subtotal + shipping - discount)}
                            </div>
                        </div>
                        <ValidatedForm
                            confirmation={{
                                title: 'Place this COD order?',
                                description: `${items.reduce((count, item) => count + item.quantity, 0)} items from ${stores} store(s). Total cash on delivery: ${money(subtotal + shipping - discount)}. Stock is deducted only when checkout succeeds.`,
                                confirmLabel: 'Place COD order',
                            }}
                            onSubmit={(e) => {
                                e.preventDefault();
                                checkout.transform((data) => ({
                                    ...data,
                                    expected_items_subtotal: subtotal.toFixed(2),
                                    expected_shipping_total: shipping.toFixed(2),
                                    voucher_code: voucherReady ? voucher.code : '',
                                    expected_discount_total: voucherReady ? discount.toFixed(2) : '',
                                }));
                                checkout.post('/checkout');
                            }}
                        >
                            <Select label="Payment method" value="cod" disabled>
                                <option value="cod">Cash on delivery</option>
                            </Select>
                            <button
                                className={`${buttonClass} mt-5 w-full`}
                                disabled={
                                    !canCheckout ||
                                    unavailable ||
                                    checkout.processing ||
                                    updating ||
                                    voucherBusy ||
                                    (!!voucherCode.trim() && !voucherReady) ||
                                    !checkout.data.address_id ||
                                    (logisticsPricing && !selectedQuote)
                                }
                            >
                                {checkout.processing ? 'Placing order…' : 'Place COD order'}
                            </button>
                        </ValidatedForm>
                        <p className="text-muted-foreground mt-4 flex items-start gap-2 text-xs leading-relaxed">
                            Pay the rider when your parcel arrives.
                        </p>
                    </Card>
                </div>
            )}
        </Page>
    );
}
