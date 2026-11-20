import AppWordmark from '@/components/branding/app-wordmark';
import ParcelBarcode from '@/components/logistics/parcel-barcode';
import ParcelQrCode from '@/components/logistics/parcel-qr-code';
import { notify, useConfirmAction } from '@/components/shared/action-feedback';
import { buttonClass, money, secondaryClass } from '@/components/shared/marketplace-ui';
import type { SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import '../../../css/waybill.css';
import { type SellerOrder } from './orders';

export default function Waybill({ order }: { order: SellerOrder }) {
    const confirm = useConfirmAction();
    const { auth } = usePage<SharedData>().props;
    const print = useForm({ packages: 1, request_key: crypto.randomUUID() });
    const pickup = order.shipping_quote?.pickup_address ?? order.store.pickup_address;
    const reference = order.delivery?.tracking_reference;
    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const orderDate = new Date(order.order.created_at);
    const formattedDate = Number.isNaN(orderDate.getTime())
        ? 'Not available'
        : orderDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
    return (
        <main className="waybill-page mx-auto max-w-2xl p-4 sm:p-8">
            <Head title={`Waybill ${order.id}`} />
            <div className="mb-6 flex flex-wrap justify-between gap-3 print:hidden">
                <Link href="/orders" className={secondaryClass}>
                    Back to orders
                </Link>
                <button
                    className={buttonClass}
                    disabled={print.processing}
                    onClick={async () => {
                        if (
                            auth.user.role !== 'admin' &&
                            !(await confirm({
                                title: `Print waybill for parcel #${order.id}?`,
                                description: `Recipient: ${order.order.shipping_recipient_name}. Destination: ${order.order.shipping_city}, ${order.order.shipping_province}. Collect ${money(order.cod_due_cents != null ? order.cod_due_cents / 100 : Number(order.subtotal) + Number(order.shipping_fee) - (order.coins_redeemed_cents ?? 0) / 100)}. Print one label for this physical parcel. Reprints keep the same tracking identity.`,
                                confirmLabel: 'Request print',
                            }))
                        )
                            return;
                        print.post(`/orders/${order.id}/waybill`, {
                            preserveScroll: true,
                            onSuccess: () => {
                                print.setData('request_key', crypto.randomUUID());
                                window.print();
                                if (auth.user.role !== 'admin') notify('Print requested. Check the printer or save the label as PDF.');
                            },
                        });
                    }}
                >
                    <Printer className="size-4" />
                    Print waybill
                </button>
            </div>
            <p className="mb-4 text-sm print:hidden">
                One seller order = one physical parcel. Attach one label only; a replacement print keeps the same tracking identity.
            </p>
            {Object.entries(print.errors).map(([key, error]) => (
                <p key={key} role="alert" className="text-destructive mb-3 print:hidden">
                    {error}
                </p>
            ))}
            <article className="shipping-label" aria-label={`Shipping label for parcel ${order.id}`}>
                <header className="shipping-label-header">
                    <AppWordmark className="shipping-label-brand" />
                    <div>
                        <span className="shipping-label-caption">Parcel ID</span>
                        <strong>#{order.id}</strong>
                    </div>
                </header>
                <div className="shipping-label-order">
                    <div>
                        <span className="shipping-label-caption">Order ID</span>
                        <strong>#{order.order_id}</strong>
                    </div>
                    <span className="shipping-label-service">COD</span>
                </div>
                <div className="shipping-label-details">
                    {reference && (
                        <div className="shipping-label-qr">
                            <ParcelQrCode reference={reference} />
                        </div>
                    )}
                    <dl className="shipping-label-facts">
                        <div>
                            <dt>Quantity</dt>
                            <dd>
                                {quantity} {quantity === 1 ? 'item' : 'items'}
                            </dd>
                        </div>
                        <div>
                            <dt>Weight</dt>
                            <dd>
                                {order.shipping_weight_grams != null ? `${order.shipping_weight_grams.toLocaleString('en-PH')} g` : 'Not recorded'}
                            </dd>
                        </div>
                        <div>
                            <dt>Order date</dt>
                            <dd>{formattedDate}</dd>
                        </div>
                    </dl>
                </div>
                {reference ? (
                    <div className="shipping-label-barcode">
                        <ParcelBarcode reference={reference} />
                    </div>
                ) : (
                    <p className="shipping-label-section">Tracking reference not yet assigned.</p>
                )}
                <section>
                    <h2 className="shipping-label-heading">Buyer (to)</h2>
                    <div className="shipping-label-section">
                        <div className="shipping-label-contact">
                            <h1>{order.order.shipping_recipient_name}</h1>
                            <span>{order.order.shipping_phone}</span>
                        </div>
                        <p>
                            {[order.order.shipping_line1, order.order.shipping_barangay, order.order.shipping_city, order.order.shipping_province]
                                .filter(Boolean)
                                .join(', ')}
                        </p>
                    </div>
                </section>
                <section>
                    <h2 className="shipping-label-heading">Seller (from)</h2>
                    <div className="shipping-label-section">
                        <div className="shipping-label-contact">
                            <strong>{order.store.name}</strong>
                            {pickup?.phone && <span>{pickup.phone}</span>}
                        </div>
                        <p>
                            {pickup
                                ? [pickup.line1, pickup.barangay, pickup.city, pickup.province].filter(Boolean).join(', ')
                                : 'Pickup address not available'}
                        </p>
                    </div>
                </section>
                <section className="shipping-label-collection">
                    <div>
                        <h2>COD · Collect from recipient</h2>
                        <p>Includes delivery fee</p>
                    </div>
                    <strong>
                        {money(
                            order.cod_due_cents != null
                                ? order.cod_due_cents / 100
                                : Number(order.subtotal) + Number(order.shipping_fee) - (order.coins_redeemed_cents ?? 0) / 100,
                        )}
                    </strong>
                </section>
                <section className="shipping-label-items">
                    <h2>Parcel contents</h2>
                    <ul>
                        {order.items.map((item) => (
                            <li key={item.id}>
                                {item.quantity} × {item.product_name}
                                {item.variant_name && ` · ${item.variant_name}`}
                            </li>
                        ))}
                    </ul>
                </section>
                <footer className="shipping-label-footer">Internal LubosMart waybill · One label per parcel · Keep with parcel</footer>
            </article>
        </main>
    );
}
