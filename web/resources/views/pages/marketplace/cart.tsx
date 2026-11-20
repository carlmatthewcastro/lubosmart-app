import { type PublicVoucher } from '@/components/marketplace/public-vouchers';
import AddressLocationFields, { type AddressSelection } from '@/components/settings/address-location-fields';
import { useConfirmAction } from '@/components/shared/action-feedback';
import { Card, Empty, Field, Notice, Page, Select, buttonClass, money, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWorkspaceStatus } from '@/components/workspace/workspace-runtime';
import { accountApi } from '@/lib/account-api';
import { type SharedData } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Banknote,
    Check,
    Coins,
    FileText,
    House,
    ImageIcon,
    List,
    MapPin,
    Minus,
    Plus,
    ShieldCheck,
    ShoppingBag,
    Store,
    TicketPercent,
    Trash2,
    Truck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import '../../../css/storefront-cart.css';
import '../../../css/storefront-catalog.css';
import { type Product } from './catalog';

type Address = { id: number; label: string; recipient_name: string; line1: string; barangay: string; city: string; province: string; phone: string };
export default function Cart({
    items,
    addresses,
    shippingFee,
    logisticsPricing,
    walletBalanceCents = 0,
    publicVouchers = [],
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
    walletBalanceCents?: number;
    publicVouchers?: PublicVoucher[];
}) {
    const { auth } = usePage<SharedData>().props;
    const confirm = useConfirmAction();
    const workspace = useWorkspaceStatus();
    const canCheckout = auth.user.status === 'approved' && !!auth.user.email_verified_at;
    const [addingAddress, setAddingAddress] = useState(addresses.length === 0);
    const [addressSelection, setAddressSelection] = useState<AddressSelection>({
        region_code: '',
        province_code: '',
        city_code: '',
        barangay_code: '',
    });
    const [updating, setUpdating] = useState(false);
    const [checkoutKey] = useState(() => crypto.randomUUID());
    const checkout = useForm({
        address_id: addresses[0]?.id.toString() ?? '',
        checkout_key: checkoutKey,
        logistics_center_id: '',
        expected_shipping_total: '',
        coins_to_redeem_cents: 0,
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
    const voucherTrigger = useRef<HTMLButtonElement>(null);
    const [voucherOpen, setVoucherOpen] = useState(false);
    const [draftVoucher, setDraftVoucher] = useState('');
    const [deliveryOpen, setDeliveryOpen] = useState(false);
    const [voucherBusy, setVoucherBusy] = useState(false);
    const [voucherError, setVoucherError] = useState('');
    const [voucher, setVoucher] = useState<{ code: string; discount_cents: number; cartKey: string } | null>(null);
    const itemKey = items
        .map((item) => [item.id, item.quantity, item.product.price, item.product.weight_grams, item.product_variant_id].join(':'))
        .join(',');
    const voucherReady = !!voucher && voucher.cartKey === itemKey && voucher.code === voucherCode.trim().toUpperCase();
    const [useCoins, setUseCoins] = useState(false);
    const coins = useCoins ? Math.max(0, Math.min(walletBalanceCents, Math.round(subtotal * 100) - (voucherReady ? voucher.discount_cents : 0))) : 0;
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
        setQuoteAddress('');
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
    const quotesReady = !quoteError && quoteAddress === quoteKey;
    const selectedQuote = quotesReady ? quotes.find((quote) => quote.id.toString() === checkout.data.logistics_center_id) : undefined;
    const shipping = logisticsPricing ? (selectedQuote?.total ?? 0) : stores * Number(shippingFee);
    const checkoutBlockedReason = !canCheckout
        ? 'Your account must be approved and your email verified before checkout.'
        : unavailable
          ? 'Adjust or remove unavailable items or quantities above the available stock.'
          : checkout.processing
            ? 'Your order is being placed.'
            : updating
              ? 'Wait for your bag to finish updating.'
              : voucherBusy
                ? 'Wait for your voucher discount to be checked.'
                : voucherCode.trim() && !voucherReady
                  ? 'Your bag changed. Select the voucher again or remove it to continue.'
                  : !checkout.data.address_id
                    ? 'Add or choose a delivery address to continue.'
                    : logisticsPricing && !selectedQuote
                      ? quoteError
                          ? 'Shipping quotes failed to load. Use Retry shipping quotes above.'
                          : !quotesReady
                            ? 'Wait for available shipping providers to load.'
                            : !quotes.length
                              ? 'Delivery is unavailable for this address. Change your address to continue.'
                              : 'Choose a logistics provider under Delivery option to continue.'
                      : '';
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
        <Page storefront title="Your shopping bag" description="Review your finds and choose where to send them.">
            <div className="shopping-bag-content">
                {unavailable && (
                    <Notice tone="warning">
                        Some items are unavailable or have less stock than your requested quantity. Adjust or remove them before checkout. Items in
                        your bag do not reserve stock.
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
                    <div className="shopping-bag-layout">
                        <div className="shopping-bag-main space-y-4">
                            <Card className="shopping-bag-panel">
                                <div className="shopping-bag-section-heading">
                                    <h2>
                                        <ShoppingBag aria-hidden="true" />
                                        Items ({items.length})
                                    </h2>
                                    <Link href="/shop" className="text-primary inline-flex min-h-11 items-center text-sm font-medium hover:underline">
                                        Continue shopping
                                    </Link>
                                </div>
                                <ul className="shopping-bag-items">
                                    {items.map((item) => (
                                        <li key={item.id} className="shopping-bag-item">
                                            <div className="shopping-bag-product">
                                                <div className="shopping-bag-photo">
                                                    <ImageIcon aria-hidden="true" className="text-muted-foreground size-6" />
                                                    {item.product.image_url && (
                                                        <img
                                                            src={item.product.image_url}
                                                            alt={item.product.name}
                                                            width={96}
                                                            height={112}
                                                            loading="lazy"
                                                            onError={(event) => {
                                                                event.currentTarget.hidden = true;
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                                <div className="min-w-0 break-words">
                                                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                                                        <Store aria-hidden="true" className="size-4 shrink-0" />
                                                        {item.product.store.name}
                                                    </p>
                                                    <Link href={`/products/${item.product.id}`} className="mt-1 block font-semibold hover:underline">
                                                        {item.product.name}
                                                    </Link>
                                                    {item.variant && (
                                                        <p className="text-muted-foreground mt-1 text-sm">
                                                            {item.variant.name} ·{' '}
                                                            {item.variant.is_active
                                                                ? `${item.variant.stock} available`
                                                                : 'Option retired; remove this item to continue'}
                                                        </p>
                                                    )}
                                                    <p className="text-muted-foreground mt-2 text-sm tabular-nums">
                                                        {money(item.product.price)} each
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shopping-bag-quantity bg-card flex w-fit items-center rounded-xl border">
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
                                                    <Minus aria-hidden="true" className="size-4" />
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
                                                    <Plus aria-hidden="true" className="size-4" />
                                                </button>
                                            </div>
                                            <p className="shopping-bag-line-total text-right font-semibold tabular-nums">
                                                {money(Number(item.product.price) * item.quantity)}
                                            </p>
                                            <button
                                                type="button"
                                                className="shopping-bag-remove text-muted-foreground hover:text-destructive hover:bg-destructive/5 focus-visible:ring-ring flex size-11 items-center justify-center justify-self-end rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                                                aria-label={`Remove ${item.product.name}`}
                                                disabled={updating}
                                                onClick={() => update(item.product.id, 0, item.product_variant_id)}
                                            >
                                                <Trash2 aria-hidden="true" className="size-5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                            <Card className="shopping-bag-panel">
                                <div className="shopping-bag-section-heading">
                                    <h2>
                                        <MapPin aria-hidden="true" />
                                        Delivery address
                                    </h2>
                                    <Link
                                        href="/settings/addresses"
                                        className="text-primary inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline"
                                    >
                                        <List aria-hidden="true" className="size-4" />
                                        Manage addresses
                                    </Link>
                                    <button
                                        type="button"
                                        className={secondaryClass + ' text-primary'}
                                        aria-expanded={addingAddress}
                                        onClick={() => setAddingAddress(!addingAddress)}
                                    >
                                        <Plus aria-hidden="true" className="size-4" />
                                        {addingAddress ? 'Close form' : 'Add address'}
                                    </button>
                                </div>
                                {addresses.length > 0 && (
                                    <div className="space-y-3">
                                        {addresses.map((item) => (
                                            <label
                                                key={item.id}
                                                className={`shopping-bag-address flex cursor-pointer items-center gap-4 rounded-xl border p-4 ${checkout.data.address_id === String(item.id) ? 'border-primary bg-accent/40' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="delivery-address"
                                                    value={item.id}
                                                    checked={checkout.data.address_id === String(item.id)}
                                                    onChange={(e) => checkout.setData('address_id', e.target.value)}
                                                    className="accent-primary size-5 shrink-0"
                                                />
                                                <House aria-hidden="true" className="text-primary hidden size-8 shrink-0 sm:block" />
                                                <span className="min-w-0 break-words">
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
                                                    setAddressSelection({ region_code: '', province_code: '', city_code: '', barangay_code: '' });
                                                    setAddingAddress(false);
                                                },
                                            });
                                        }}
                                    >
                                        <AddressLocationFields
                                            data={addressSelection}
                                            errors={{
                                                region_code: address.errors.region,
                                                province_code: address.errors.province,
                                                city_code: address.errors.city,
                                                barangay_code: address.errors.barangay,
                                            }}
                                            disabled={address.processing}
                                            onChange={({ zip, ...selection }) => {
                                                setAddressSelection((previous) => ({ ...previous, ...selection }));
                                                if (zip !== undefined) address.setData((previous) => ({ ...previous, zip }));
                                            }}
                                            onNamesChange={(names) => address.setData((previous) => ({ ...previous, ...names }))}
                                        />
                                        {(Object.keys(address.data) as (keyof typeof address.data)[])
                                            .filter((key) => !['region', 'province', 'city', 'barangay'].includes(key))
                                            .map((key) => (
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
                                                    disabled={address.processing}
                                                    maxLength={key === 'zip' ? 4 : undefined}
                                                    pattern={key === 'zip' ? '[0-9]{4}' : undefined}
                                                    inputMode={key === 'zip' ? 'numeric' : undefined}
                                                    value={address.data[key]}
                                                    onChange={(e) => address.setData(key, e.target.value)}
                                                    error={address.errors[key]}
                                                />
                                            ))}
                                        <p className="text-muted-foreground text-sm sm:col-span-2">
                                            Postal code fills automatically when a city match is available. Confirm it for your address; some cities
                                            have several ZIP codes.
                                        </p>
                                        <button className={buttonClass} disabled={address.processing}>
                                            Save address
                                        </button>
                                    </ValidatedForm>
                                )}
                            </Card>
                        </div>
                        <Card className="shopping-bag-panel shopping-bag-summary checkout-refined">
                            <div className="shopping-bag-section-heading">
                                <h2>
                                    <FileText aria-hidden="true" />
                                    Checkout
                                </h2>
                                <span className="shopping-bag-store-count">
                                    <Store aria-hidden="true" className="size-5" />
                                    {stores} {stores === 1 ? 'store' : 'stores'}
                                </span>
                            </div>
                            <section className="shopping-bag-option">
                                <div className="shopping-bag-option-heading">
                                    <TicketPercent aria-hidden="true" className="text-primary size-6 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <strong>Shop voucher</strong>
                                        {voucherReady && (
                                            <p className="text-success text-sm">
                                                {money(discount)} off <span className="bg-success/10 rounded px-2 py-1 text-xs">Applied</span>
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className={secondaryClass}
                                        disabled={voucherBusy || checkout.processing}
                                        ref={voucherTrigger}
                                        onClick={() => {
                                            setDraftVoucher(voucherReady ? voucher.code : '');
                                            setVoucherError('');
                                            setVoucherOpen(true);
                                        }}
                                    >
                                        {voucherReady ? 'Change' : 'Choose voucher'}
                                    </button>
                                </div>
                                {(voucherError || (checkout.errors as Record<string, string>).voucher_code) && (
                                    <p role="alert" className="text-destructive px-4 pb-3 text-sm">
                                        {voucherError || (checkout.errors as Record<string, string>).voucher_code}
                                    </p>
                                )}
                            </section>
                            <Dialog open={voucherOpen} onOpenChange={setVoucherOpen}>
                                <DialogContent
                                    onCloseAutoFocus={(event) => {
                                        event.preventDefault();
                                        voucherTrigger.current?.focus();
                                    }}
                                    className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"
                                >
                                    <DialogHeader>
                                        <DialogTitle>Choose shop voucher</DialogTitle>
                                        <DialogDescription>
                                            Choose one voucher for its store. Only one voucher can be used per checkout.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <fieldset className="space-y-3" disabled={voucherBusy}>
                                        <legend className="sr-only">Shop vouchers</legend>
                                        {publicVouchers.map((v) => (
                                            <label
                                                key={v.id}
                                                className={
                                                    'flex items-start gap-3 rounded-xl border p-4 ' +
                                                    (draftVoucher === v.code ? 'border-primary bg-primary/5' : 'border-border')
                                                }
                                            >
                                                <input
                                                    type="radio"
                                                    name="shop-voucher"
                                                    className="accent-primary mt-1 size-4"
                                                    value={v.code}
                                                    checked={draftVoucher === v.code}
                                                    disabled={!v.eligible}
                                                    onChange={() => setDraftVoucher(v.code)}
                                                />
                                                <span className="min-w-0 text-sm">
                                                    <strong className="block text-base">{money(v.amount_cents / 100)} off</strong>
                                                    <span className="block">Minimum spend {money(v.minimum_cents / 100)}</span>
                                                    <span className="text-muted-foreground block">
                                                        Store #{v.store_id} / Expires {new Date(v.expires_at).toLocaleDateString('en-PH')}
                                                    </span>
                                                    {!v.eligible && <span className="text-muted-foreground block">Not eligible for this bag</span>}
                                                </span>
                                            </label>
                                        ))}
                                        {!publicVouchers.length && (
                                            <p className="text-muted-foreground text-sm">No vouchers available for the stores in your bag.</p>
                                        )}
                                        <label className="flex min-h-12 items-center gap-3 rounded-xl border p-4">
                                            <input
                                                type="radio"
                                                name="shop-voucher"
                                                className="accent-primary size-4"
                                                checked={!draftVoucher}
                                                onChange={() => setDraftVoucher('')}
                                            />
                                            No voucher
                                        </label>
                                    </fieldset>
                                    {voucherError && (
                                        <p role="alert" className="text-destructive text-sm">
                                            {voucherError}
                                        </p>
                                    )}
                                    <DialogFooter>
                                        <button type="button" className={secondaryClass} disabled={voucherBusy} onClick={() => setVoucherOpen(false)}>
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className={buttonClass}
                                            disabled={
                                                voucherBusy ||
                                                updating ||
                                                checkout.processing ||
                                                (!!draftVoucher && !publicVouchers.some((v) => v.code === draftVoucher && v.eligible))
                                            }
                                            onClick={async () => {
                                                if (!draftVoucher) {
                                                    setVoucher(null);
                                                    setVoucherCode('');
                                                    setVoucherError('');
                                                    setVoucherOpen(false);
                                                    return;
                                                }
                                                setVoucherBusy(true);
                                                setVoucherError('');
                                                try {
                                                    const result = await accountApi<{ code: string; discount_cents: number }>(
                                                        '/cart/voucher',
                                                        'POST',
                                                        { voucher_code: draftVoucher },
                                                    );
                                                    setVoucher({ ...result, cartKey: itemKey });
                                                    setVoucherCode(result.code);
                                                    setVoucherOpen(false);
                                                } catch (error) {
                                                    setVoucherError(error instanceof Error ? error.message : 'Unable to apply voucher.');
                                                } finally {
                                                    setVoucherBusy(false);
                                                }
                                            }}
                                        >
                                            {voucherBusy ? 'Applying...' : 'Apply voucher'}
                                        </button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <section className="shopping-bag-option" aria-labelledby="cart-delivery-heading">
                                <div className="shopping-bag-option-heading">
                                    <span className="shopping-bag-option-icon">
                                        <Truck aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h3 id="cart-delivery-heading" className="font-semibold">
                                            Delivery option
                                        </h3>
                                        <p className="shopping-bag-option-description">
                                            {logisticsPricing ? (selectedQuote?.name ?? 'Choose your logistics provider') : 'Delivery per store'}
                                        </p>
                                    </div>
                                    <strong className="shrink-0 text-sm tabular-nums">
                                        {logisticsPricing && !selectedQuote ? 'Pending' : money(shipping)}
                                    </strong>
                                </div>
                                <div className="shopping-bag-option-body">
                                    {logisticsPricing && (
                                        <button type="button" className={secondaryClass} onClick={() => setDeliveryOpen(!deliveryOpen)}>
                                            {selectedQuote ? 'Change' : 'Choose delivery'}
                                        </button>
                                    )}
                                    {logisticsPricing && deliveryOpen ? (
                                        <div className="space-y-3">
                                            <Select
                                                label="Logistics provider"
                                                id="cart-logistics-provider"
                                                value={checkout.data.logistics_center_id}
                                                disabled={!checkout.data.address_id || !quotesReady || !quotes.length}
                                                aria-describedby="shipping-availability"
                                                reserveFeedback={!!checkout.errors.logistics_center_id}
                                                onChange={(event) => checkout.setData('logistics_center_id', event.target.value)}
                                                error={checkout.errors.logistics_center_id}
                                            >
                                                <option value="">
                                                    {quotesReady && !quotes.length ? 'No providers available' : 'Choose a provider'}
                                                </option>
                                                {(quotesReady ? quotes : []).map((quote) => (
                                                    <option key={quote.id} value={quote.id}>
                                                        {quote.name} / {money(quote.total)}
                                                    </option>
                                                ))}
                                            </Select>
                                            {quoteError && (
                                                <Notice tone="error">
                                                    <p id="shipping-availability">{quoteError}</p>
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
                                                <p id="shipping-availability" role="status" className="text-muted-foreground text-sm leading-relaxed">
                                                    {!checkout.data.address_id
                                                        ? 'Choose a delivery address to see shipping quotes.'
                                                        : !quotesReady
                                                          ? 'Loading available providers...'
                                                          : !quotes.length
                                                            ? 'Delivery is unavailable for this address. Change your address to continue.'
                                                            : 'Choose an eligible courier for your address.'}
                                                </p>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </section>
                            <section className="shopping-bag-option shopping-bag-coins" aria-labelledby="cart-coins-heading">
                                <label className="shopping-bag-option-heading cursor-pointer">
                                    <span className="shopping-bag-option-icon">
                                        <Coins aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <strong id="cart-coins-heading">Lubos Coins</strong>
                                        <span className="shopping-bag-option-description">{money(walletBalanceCents / 100)} available</span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        role="switch"
                                        className="shopping-bag-coin-switch"
                                        aria-labelledby="cart-coins-heading"
                                        aria-describedby="cart-coins-help"
                                        checked={useCoins}
                                        onChange={(e) => setUseCoins(e.target.checked)}
                                        disabled={walletBalanceCents <= 0 || subtotal <= discount || checkout.processing}
                                    />
                                </label>
                                <p id="cart-coins-help" className="text-muted-foreground px-4 pb-4 text-xs leading-relaxed">
                                    Coins apply to merchandise. Shipping is payable in cash.{' '}
                                    <Link href="/wallet" className="text-primary underline">
                                        View wallet
                                    </Link>
                                </p>
                                {checkout.errors.coins_to_redeem_cents && (
                                    <p role="alert" className="text-destructive px-4 pb-4 text-sm">
                                        {checkout.errors.coins_to_redeem_cents}
                                    </p>
                                )}
                            </section>
                            <section className="shopping-bag-option shopping-bag-cod" aria-labelledby="cart-payment-heading">
                                <div className="shopping-bag-option-heading">
                                    <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full">
                                        <Check aria-hidden="true" className="size-4" />
                                    </span>
                                    <Banknote aria-hidden="true" className="text-primary size-8 shrink-0" />
                                    <div className="min-w-0">
                                        <h3 id="cart-payment-heading" className="font-semibold">
                                            Cash on delivery
                                        </h3>
                                        <p className="shopping-bag-option-description">Pay when your parcel arrives.</p>
                                    </div>
                                </div>
                            </section>
                            <section className="shopping-bag-payment-details" aria-labelledby="cart-payment-details">
                                <h3 id="cart-payment-details" className="mb-4 text-lg font-semibold">
                                    Payment summary
                                </h3>
                                <dl className="space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">Merchandise subtotal</dt>
                                        <dd className="font-semibold tabular-nums">{money(subtotal)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">Shipping fee</dt>
                                        <dd className="text-right font-semibold tabular-nums">
                                            {logisticsPricing && !selectedQuote ? 'Choose shipping' : money(shipping)}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">Voucher discount</dt>
                                        <dd className="font-semibold tabular-nums">
                                            {discount > 0 ? '-' : ''}
                                            {money(discount)}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">Lubos Coins applied</dt>
                                        <dd className="font-semibold tabular-nums">
                                            {coins > 0 ? '-' : ''}
                                            {money(coins / 100)}
                                        </dd>
                                    </div>
                                    <div className="shopping-bag-total-payment">
                                        <dt>
                                            <span className="block font-semibold">Total payment</span>
                                            <span className="text-muted-foreground text-xs">Inclusive of shipping</span>
                                        </dt>
                                        <dd className="text-primary text-right text-xl font-bold tabular-nums">
                                            {logisticsPricing && !selectedQuote ? (
                                                <span className="text-sm">Choose shipping</span>
                                            ) : (
                                                money(subtotal + shipping - discount - coins / 100)
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            </section>
                            <ValidatedForm
                                confirmation={{
                                    title: 'Place this COD order?',
                                    description: `${items.reduce((count, item) => count + item.quantity, 0)} items from ${stores} store(s). Total cash on delivery: ${money(subtotal + shipping - discount - coins / 100)}. Stock is deducted only when checkout succeeds.`,
                                    confirmLabel: 'Place COD order',
                                }}
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    checkout.transform((data) => ({
                                        ...data,
                                        coins_to_redeem_cents: coins,
                                        expected_items_subtotal: subtotal.toFixed(2),
                                        expected_shipping_total: shipping.toFixed(2),
                                        voucher_code: voucherReady ? voucher.code : '',
                                        expected_discount_total: voucherReady ? discount.toFixed(2) : '',
                                    }));
                                    checkout.post('/checkout');
                                }}
                            >
                                <button
                                    className={`${buttonClass} shopping-bag-checkout w-full`}
                                    disabled={!!checkoutBlockedReason}
                                    aria-describedby={checkoutBlockedReason ? 'checkout-blocked-reason' : undefined}
                                >
                                    <ShoppingBag aria-hidden="true" className="size-5" />
                                    {checkout.processing
                                        ? 'Placing order…'
                                        : 'Place order \u00b7 ' + money(subtotal + shipping - discount - coins / 100)}
                                </button>
                                {checkoutBlockedReason && (
                                    <p id="checkout-blocked-reason" role="status" className="text-muted-foreground mt-3 text-sm">
                                        {checkoutBlockedReason}
                                    </p>
                                )}
                            </ValidatedForm>
                            <p className="shopping-bag-checkout-note">
                                <ShieldCheck aria-hidden="true" className="text-primary size-5" />
                                Safe and secure checkout
                            </p>
                        </Card>
                    </div>
                )}
            </div>
        </Page>
    );
}
