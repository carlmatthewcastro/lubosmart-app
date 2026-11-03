import AppWordmark from '@/components/branding/app-wordmark';
import ParcelBarcode from '@/components/logistics/parcel-barcode';
import { notify, useConfirmAction } from '@/components/shared/action-feedback';
import { buttonClass, money, secondaryClass } from '@/components/shared/marketplace-ui';
import { assets } from '@/config/assets';
import type { SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { type SellerOrder } from './orders';

export default function Waybill({ order }: { order: SellerOrder }) {
    const confirm = useConfirmAction();
    const { auth } = usePage<SharedData>().props;
    const print = useForm({ packages: 1, request_key: crypto.randomUUID() });
    return (
        <main className="mx-auto max-w-2xl p-5 sm:p-10">
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
                                description: `Recipient: ${order.order.shipping_recipient_name}. Destination: ${order.order.shipping_city}, ${order.order.shipping_province}. Collect ${money(Number(order.subtotal) + Number(order.shipping_fee))}. Print one label for this physical parcel. Reprints keep the same tracking identity.`,
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
            <article className="rounded-2xl border bg-white p-5 text-gray-900 sm:p-8 print:rounded-none print:border-0 print:p-0">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-6">
                    <div className="flex items-center gap-3">
                        <img src={assets.brand.logo} alt="" className="size-10" />
                        <AppWordmark className="text-xl [--app-wordmark-color:#000]" />
                    </div>
                    <span className="text-sm">COD · Parcel #{order.id}</span>
                </header>
                {order.delivery?.tracking_reference && <ParcelBarcode reference={order.delivery.tracking_reference} />}
                <div className="py-6">
                    <p className="text-xs tracking-widest text-gray-500 uppercase">Ship to</p>
                    <h1 className="mt-3 text-2xl font-semibold">{order.order.shipping_recipient_name}</h1>
                    <p className="mt-3 leading-relaxed">
                        {order.order.shipping_line1}
                        <br />
                        {order.order.shipping_barangay}, {order.order.shipping_city}
                        <br />
                        {order.order.shipping_province}
                    </p>
                    <p className="mt-3">{order.order.shipping_phone}</p>
                </div>
                <div className="border-y py-5">
                    <p className="text-xs text-gray-500">Sender store</p>
                    <p className="mt-1 font-semibold">{order.store.name}</p>
                    <p className="mt-2 text-sm">
                        Order #{order.order_id} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </p>
                </div>
                <ul className="my-5 space-y-2 text-sm">
                    {order.items.map((item) => (
                        <li key={item.id}>
                            {item.quantity} × {item.product_name}
                            {item.variant_name && ` · ${item.variant_name}`}
                        </li>
                    ))}
                </ul>
                <div className="rounded-xl bg-gray-100 p-5">
                    <p className="text-xs tracking-widest uppercase">Collect from recipient</p>
                    <p className="mt-2 text-3xl font-semibold">{money(Number(order.subtotal) + Number(order.shipping_fee))}</p>
                    <p className="mt-2 text-xs text-gray-500">Includes the delivery fee for this parcel.</p>
                </div>
                <footer className="mt-7 text-xs text-gray-500">
                    Internal LubosMart waybill · Keep this label with the parcel. Record delivery and cash collection in the rider workspace.
                </footer>
            </article>
        </main>
    );
}
