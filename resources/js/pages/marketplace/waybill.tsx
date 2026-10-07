import { buttonClass, money, secondaryClass } from '@/components/marketplace-ui';
import { Head, Link } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { type SellerOrder } from './orders';

export default function Waybill({ order }: { order: SellerOrder }) {
    return (
        <main className="mx-auto max-w-2xl p-5 sm:p-10">
            <Head title={`Waybill ${order.id}`} />
            <div className="mb-6 flex justify-between gap-3 print:hidden">
                <Link href="/orders" className={secondaryClass}>
                    Back to orders
                </Link>
                <button className={buttonClass} onClick={() => window.print()}>
                    <Printer className="size-4" />
                    Print waybill
                </button>
            </div>
            <article className="rounded-2xl border bg-white p-8 text-gray-900 print:rounded-none print:border-0 print:p-0">
                <header className="flex items-center justify-between border-b pb-6">
                    <div className="flex items-center gap-3">
                        <img src="/logo.svg" alt="" className="size-10" />
                        <span className="text-xl font-semibold">LubosMart</span>
                    </div>
                    <span className="text-sm">COD · Parcel #{order.id}</span>
                </header>
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
                        </li>
                    ))}
                </ul>
                <div className="rounded-xl bg-gray-100 p-5">
                    <p className="text-xs tracking-widest uppercase">Collect from recipient</p>
                    <p className="mt-2 text-3xl font-semibold">{money(Number(order.subtotal) + Number(order.shipping_fee))}</p>
                    <p className="mt-2 text-xs text-gray-500">Includes the delivery fee for this parcel.</p>
                </div>
                <footer className="mt-7 text-xs text-gray-500">
                    Internal LubosMart waybill · Keep this label with the parcel. Record delivery and cash collection in the courier workspace.
                </footer>
            </article>
        </main>
    );
}
