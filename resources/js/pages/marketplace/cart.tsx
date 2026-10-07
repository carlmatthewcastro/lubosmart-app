import { Card, Empty, Field, Page, Select, buttonClass, money, secondaryClass } from '@/components/marketplace-ui';
import { Link, router, useForm } from '@inertiajs/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { type Product } from './catalog';

type Address = { id: number; label: string; recipient_name: string; line1: string; barangay: string; city: string; province: string; phone: string };
export default function Cart({
    items,
    addresses,
    shippingFee,
}: {
    items: { id: number; quantity: number; product: Product }[];
    addresses: Address[];
    shippingFee: string;
}) {
    const [addingAddress, setAddingAddress] = useState(addresses.length === 0);
    const [updating, setUpdating] = useState(false);
    const [checkoutKey] = useState(() => crypto.randomUUID());
    const checkout = useForm({ address_id: addresses[0]?.id.toString() ?? '', checkout_key: checkoutKey });
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
    const subtotal = items.reduce((total, item) => total + Math.round(Number(item.product.price) * 100) * item.quantity, 0) / 100;
    const stores = new Set(items.map((item) => item.product.store_id)).size;
    const shipping = stores * Number(shippingFee);
    const update = (product: number, quantity: number) =>
        router.put(`/cart/${product}`, { quantity }, { preserveScroll: true, onStart: () => setUpdating(true), onFinish: () => setUpdating(false) });
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
            {!items.length ? (
                <Empty title="Your bag is empty" description="Browse products and add your favorites." href="/shop" label="Discover products" />
            ) : (
                <div className="grid items-start gap-6 lg:grid-cols-[1fr_350px]">
                    <div className="space-y-6">
                        <Card>
                            <h2 className="mb-5 font-semibold">Items ({items.length})</h2>
                            <ul className="divide-y">
                                {items.map((item) => (
                                    <li key={item.id} className="flex flex-wrap items-center gap-4 py-5">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-muted-foreground text-xs">{item.product.store.name}</p>
                                            <p className="mt-1 font-medium">{item.product.name}</p>
                                            <p className="text-muted-foreground mt-2 text-sm">{money(item.product.price)} each</p>
                                        </div>
                                        <div className="flex items-center rounded-xl border">
                                            <button
                                                type="button"
                                                aria-label={`Decrease ${item.product.name} quantity`}
                                                className="p-3"
                                                disabled={updating}
                                                onClick={() => update(item.product.id, item.quantity - 1)}
                                            >
                                                <Minus className="size-3" />
                                            </button>
                                            <span className="min-w-7 text-center text-sm">{item.quantity}</span>
                                            <button
                                                type="button"
                                                aria-label={`Increase ${item.product.name} quantity`}
                                                className="p-3"
                                                disabled={updating || item.quantity >= item.product.stock}
                                                onClick={() => update(item.product.id, item.quantity + 1)}
                                            >
                                                <Plus className="size-3" />
                                            </button>
                                        </div>
                                        <p className="w-24 text-right text-sm font-semibold">{money(Number(item.product.price) * item.quantity)}</p>
                                        <button
                                            type="button"
                                            className="text-muted-foreground hover:text-destructive p-3"
                                            aria-label={`Remove ${item.product.name}`}
                                            disabled={updating}
                                            onClick={() => update(item.product.id, 0)}
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
                                <button type="button" className="text-primary text-sm" onClick={() => setAddingAddress(!addingAddress)}>
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
                                <form
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
                                </form>
                            )}
                        </Card>
                    </div>
                    <Card className="lg:sticky lg:top-24">
                        <h2 className="font-semibold">Order summary</h2>
                        <div className="mt-6 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                {money(subtotal)}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Delivery ({stores} {stores === 1 ? 'store' : 'stores'})
                                </span>
                                {money(shipping)}
                            </div>
                            <p className="text-muted-foreground text-xs">{money(shippingFee)} per store. Each store sends a separate parcel.</p>
                            <div className="flex justify-between border-t pt-4 text-base font-semibold">
                                <span>Total</span>
                                {money(subtotal + shipping)}
                            </div>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                checkout.post('/checkout');
                            }}
                        >
                            <Select label="Payment method" value="cod" disabled>
                                <option value="cod">Cash on delivery</option>
                            </Select>
                            <button className={`${buttonClass} mt-5 w-full`} disabled={checkout.processing || updating || !checkout.data.address_id}>
                                {checkout.processing ? 'Placing order…' : 'Place COD order'}
                            </button>
                        </form>
                        <p className="text-muted-foreground mt-4 flex items-start gap-2 text-xs leading-relaxed">
                            Pay the courier when your parcel arrives.
                        </p>
                    </Card>
                </div>
            )}
        </Page>
    );
}
