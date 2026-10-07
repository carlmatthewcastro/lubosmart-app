import { Badge, buttonClass, Card, Empty, inputClass, money, Page, Pager, type Pagination } from '@/components/marketplace-ui';
import { Link, useForm } from '@inertiajs/react';
import { Check, MapPin, MessageCircle, Package, Truck } from 'lucide-react';

type Message = { id: number; body: string; name: string; created_at: string };
export type SellerOrder = {
    id: number;
    order_id: number;
    status: string;
    subtotal: string;
    shipping_fee: string;
    seller_proceeds: string;
    commission_amount: string;
    store: { name: string };
    items: { id: number; product_name: string; quantity: number; price_each: string }[];
    delivery: { id: number; status: string; proof_photo_path: string | null } | null;
    order: {
        status: string;
        shipping_recipient_name: string;
        shipping_phone: string;
        shipping_line1: string;
        shipping_barangay: string;
        shipping_city: string;
        shipping_province: string;
        created_at: string;
    };
};
function OrderCard({ order, messages, role }: { order: SellerOrder; messages: Message[]; role: string }) {
    const message = useForm({ body: '' });
    const cancel = useForm({});
    const prepare = useForm({ status: order.status === 'pending' ? 'processing' : 'shipped' });
    const stage =
        order.status === 'completed'
            ? 3
            : ['picked_up', 'in_transit'].includes(order.delivery?.status ?? '')
              ? 2
              : order.status === 'shipped'
                ? 1
                : 0;
    return (
        <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-muted-foreground text-xs">
                        Order #{order.order_id} / Parcel #{order.id}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">{order.store.name}</h2>
                </div>
                <Badge
                    status={
                        order.status === 'cancelled' || order.delivery?.status === 'unassigned'
                            ? order.status
                            : (order.delivery?.status ?? order.status)
                    }
                />
            </div>
            <ol aria-label="Order progress" className={`my-6 grid grid-cols-4 gap-1 ${order.status === 'cancelled' ? 'hidden' : ''}`}>
                {['Preparing', 'Ready', 'On the way', 'Delivered'].map((label, i) => (
                    <li key={label} className="text-center">
                        <div className={`mb-2 h-1 rounded-full ${i <= stage ? 'bg-primary' : 'bg-muted'}`} />
                        <span className={`text-[10px] sm:text-xs ${i <= stage ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                    </li>
                ))}
            </ol>
            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <ul className="space-y-3">
                        {order.items.map((item) => (
                            <li key={item.id} className="flex justify-between gap-3 text-sm">
                                <span>
                                    {item.product_name}
                                    <span className="text-muted-foreground"> × {item.quantity}</span>
                                </span>
                                <span className="shrink-0">{money(Number(item.price_each) * item.quantity)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 flex justify-between border-t pt-3 text-sm">
                        <span className="text-muted-foreground">Delivery fee</span>
                        {money(order.shipping_fee)}
                    </div>
                    <div className="mt-3 flex justify-between font-semibold">
                        <span>Cash on delivery</span>
                        {money(Number(order.subtotal) + Number(order.shipping_fee))}
                    </div>
                    {role === 'seller' && (
                        <p className="text-muted-foreground mt-3 text-xs">
                            Seller proceeds: {money(order.seller_proceeds)} · Commission: {money(order.commission_amount)}
                        </p>
                    )}
                </div>
                <div className="bg-background rounded-xl p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="text-primary size-4" />
                        Delivery details
                    </p>
                    <p className="text-sm">{order.order.shipping_recipient_name}</p>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {order.order.shipping_line1}, {order.order.shipping_barangay}, {order.order.shipping_city}, {order.order.shipping_province}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">{order.order.shipping_phone}</p>
                    {order.delivery?.proof_photo_path && (
                        <a href={`/deliveries/${order.delivery.id}/proof`} className="text-primary mt-3 block text-sm underline">
                            Download delivery proof
                        </a>
                    )}
                </div>
            </div>
            {role === 'seller' && ['pending', 'processing'].includes(order.status) && (
                <button
                    className={`${buttonClass} mt-5`}
                    disabled={prepare.processing}
                    onClick={() => prepare.patch(`/orders/${order.id}`, { preserveScroll: true })}
                >
                    {order.status === 'pending' ? <Package className="size-4" /> : <Truck className="size-4" />}
                    {order.status === 'pending' ? 'Start preparing' : 'Mark ready for pickup'}
                </button>
            )}
            {['seller', 'admin'].includes(role) && (
                <Link href={`/orders/${order.id}/waybill`} className="text-primary mt-5 ml-3 inline-flex text-sm underline">
                    Print waybill
                </Link>
            )}
            {role === 'buyer' && order.order.status === 'pending' && (
                <details className="mt-5">
                    <summary className="text-muted-foreground cursor-pointer text-sm">Cancel this purchase</summary>
                    <p className="text-muted-foreground my-3 text-sm">
                        This cancels every store parcel in Order #{order.order_id}. Cancellation is available until a seller begins preparation.
                    </p>
                    <button
                        className="bg-destructive text-destructive-foreground min-h-11 rounded-xl px-4 text-sm"
                        disabled={cancel.processing}
                        onClick={() => cancel.post(`/purchases/${order.order_id}/cancel`, { preserveScroll: true })}
                    >
                        Confirm cancellation
                    </button>
                </details>
            )}
            {order.status === 'completed' && (
                <p className="mt-5 flex items-center gap-2 text-sm text-emerald-700">
                    <Check className="size-4" />
                    Delivered successfully
                </p>
            )}
            <details className="mt-6 border-t pt-5">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <MessageCircle className="text-primary size-4" />
                    Order conversation ({messages.length})
                </summary>
                <div className="mt-4 space-y-3">
                    {messages.length ? (
                        messages.map((item) => (
                            <div key={item.id} className="bg-background rounded-xl p-4">
                                <p className="text-primary text-xs font-medium">{item.name}</p>
                                <p className="mt-2 text-sm whitespace-pre-wrap">{item.body}</p>
                                <p className="text-muted-foreground mt-2 text-[10px]">{new Date(item.created_at).toLocaleString()}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-sm">Ask a question or share an update about this order.</p>
                    )}
                    {role !== 'admin' && (
                        <form
                            className="flex flex-wrap items-end gap-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                message.post(`/orders/${order.id}/messages`, { preserveScroll: true, onSuccess: () => message.reset() });
                            }}
                        >
                            <label className="min-w-0 flex-1 text-sm">
                                Your message
                                <textarea
                                    className={`${inputClass} mt-2`}
                                    required
                                    maxLength={2000}
                                    rows={2}
                                    placeholder="Write a message…"
                                    value={message.data.body}
                                    onChange={(e) => message.setData('body', e.target.value)}
                                />
                            </label>
                            <button className={buttonClass} disabled={message.processing}>
                                Send
                            </button>
                        </form>
                    )}
                </div>
            </details>
        </Card>
    );
}
export default function Orders({ orders, messages, role }: { orders: Pagination<SellerOrder>; messages: Record<string, Message[]>; role: string }) {
    return (
        <Page
            title={role === 'seller' ? 'Order fulfillment' : 'Orders & tracking'}
            description={
                role === 'seller'
                    ? 'Prepare each parcel, arrange pickup, and keep your buyers informed.'
                    : 'Follow each store’s parcel from preparation to your doorstep.'
            }
        >
            {orders.data.length ? (
                <div className="space-y-5">
                    {orders.data.map((order) => (
                        <OrderCard key={`${order.id}-${order.status}`} order={order} messages={messages[order.id] ?? []} role={role} />
                    ))}
                </div>
            ) : (
                <Empty
                    title="No orders yet"
                    description={
                        role === 'seller' ? 'Incoming orders appear here when a buyer checks out.' : 'Your purchases will appear here after checkout.'
                    }
                    href={role === 'buyer' ? '/shop' : '/dashboard'}
                    label={role === 'buyer' ? 'Start exploring' : 'Back to overview'}
                />
            )}
            <Pager links={orders.links} />
        </Page>
    );
}
