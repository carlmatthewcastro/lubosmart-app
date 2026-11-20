import BuyerOrderDialog, { type BuyerOrderPanel } from '@/components/marketplace/buyer-order-dialog';
import OrderProductImage from '@/components/marketplace/order-product-image';
import { type PurchaseReview } from '@/components/marketplace/review-form';
import SellerListFilters from '@/components/seller/list-filters';
import { sellerQueues } from '@/components/seller/seller-navigation';
import { useConfirmAction } from '@/components/shared/action-feedback';
import { Badge, buttonClass, Card, Empty, money, Page, Pager, secondaryClass, Textarea, type Pagination } from '@/components/shared/marketplace-ui';
import ProgressStepper from '@/components/shared/progress-stepper';
import { openRecordSection, RecordDisclosure, RecordHeader } from '@/components/shared/record-header';
import ValidatedForm from '@/components/shared/validated-form';
import { parcelStages } from '@/components/shared/workflow-stages';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link, useForm, usePoll } from '@inertiajs/react';
import {
    Check,
    CircleCheck,
    CircleX,
    CreditCard,
    Download,
    Eye,
    FileText,
    History,
    MapPin,
    MessageCircle,
    Package,
    PackageCheck,
    RotateCcw,
    Star,
    Truck,
} from 'lucide-react';
import { useRef, useState } from 'react';
import '../../../css/storefront-catalog.css';

type Message = { id: number; body: string; name: string; created_at: string };
export type SellerOrder = {
    cod_due_cents?: number | null;
    coins_redeemed_cents?: number;
    shipping_quote?: {
        basis: string;
        provider?: string;
        pickup_address?: { line1: string; barangay: string; city: string; province: string; phone: string };
    };
    shipping_weight_grams?: number | null;
    id: number;
    order_id: number;
    status: string;
    subtotal: string;
    shipping_fee: string;
    seller_proceeds: string;
    commission_amount: string;
    discount_amount?: string;
    voucher_code?: string | null;
    store: { name: string; pickup_address?: { line1: string; barangay: string; city: string; province: string; phone: string } | null };
    items: {
        id: number;
        product_name: string;
        product_image_url?: string | null;
        quantity: number;
        price_each: string;
        variant_name?: string | null;
    }[];
    delivery: {
        id: number;
        status: string;
        proof_photo_path: string | null;
        delivery_notes?: string | null;
        tracking_reference?: string | null;
        exception_status?: string | null;
        picked_up_at?: string | null;
        received_at?: string | null;
        sorted_at?: string | null;
        dispatch_accepted_at?: string | null;
        delivered_at?: string | null;
    } | null;
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
function OrderCard({
    order,
    messages,
    role,
    reviews,
}: {
    order: SellerOrder;
    messages: Message[];
    role: string;
    reviews: Record<string, PurchaseReview>;
}) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [panel, setPanel] = useState<BuyerOrderPanel | null>(null);
    const actionMenuRef = useRef<HTMLButtonElement>(null);
    const dialogReturnFocus = useRef<HTMLElement | null>(null);
    const openPanel = (value: BuyerOrderPanel) => {
        const active = document.activeElement;
        dialogReturnFocus.current = active instanceof HTMLElement && !active.closest('[role="menu"]') ? active : actionMenuRef.current;
        setPanel(value);
    };
    const openDetails = () => (customerView ? openPanel('details') : setDetailsOpen(true));
    const openHistory = () => (customerView ? openPanel('tracking') : openRecordSection(historyRef.current));
    const buyer = role === 'buyer';
    const customerView = buyer || role === 'seller';
    const historyRef = useRef<HTMLDetailsElement>(null);
    const conversationRef = useRef<HTMLDetailsElement>(null);
    const confirm = useConfirmAction();
    const message = useForm({ body: '' });
    const cancel = useForm({});
    const prepare = useForm({ status: order.status === 'pending' ? 'processing' : 'shipped' });
    return (
        <Card className="!p-4 sm:!p-5">
            <RecordHeader
                showIcon={!customerView}
                triggerRef={actionMenuRef}
                label={`Order #${order.order_id} / Parcel #${order.id}`}
                title={order.store.name}
                reference={order.delivery?.tracking_reference}
                status={
                    <Badge
                        label={
                            order.status === 'shipped' && ['unassigned', 'assigned'].includes(order.delivery?.status ?? '')
                                ? order.delivery?.status === 'assigned'
                                    ? 'Pickup rider assigned'
                                    : 'Ready for pickup'
                                : undefined
                        }
                        status={
                            ['pending', 'processing', 'completed', 'cancelled'].includes(order.status) || order.delivery?.status === 'unassigned'
                                ? order.status
                                : (order.delivery?.status ?? order.status)
                        }
                    />
                }
                onOpen={openDetails}
                actions={[
                    { id: 'details', label: 'View order details', icon: Eye, onSelect: openDetails },
                    {
                        id: 'history',
                        label: 'View handover history',
                        icon: History,
                        visible: order.status !== 'cancelled',
                        onSelect: openHistory,
                    },
                    {
                        id: 'conversation',
                        label: 'Order conversation',
                        icon: MessageCircle,
                        onSelect: () => openRecordSection(conversationRef.current),
                    },
                    {
                        id: 'waybill',
                        label: 'Print waybill',
                        icon: FileText,
                        visible: ['seller', 'admin'].includes(role),
                        href: '/orders/' + order.id + '/waybill',
                    },
                    {
                        id: 'proof',
                        label: 'Download delivery proof',
                        icon: Download,
                        visible: !!order.delivery?.proof_photo_path,
                        href: '/deliveries/' + order.delivery?.id + '/proof',
                        download: true,
                    },
                    {
                        id: 'return',
                        label: 'Request or follow a return',
                        icon: RotateCcw,
                        visible: role === 'buyer' && order.status === 'completed',
                        href: '/returns?parcel=' + order.id,
                    },
                ]}
            />
            {customerView ? (
                <div className="mt-3 grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1.2fr)_auto]">
                    <div className="min-w-0 space-y-3">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex min-w-0 items-center gap-3">
                                <OrderProductImage src={item.product_image_url} name={item.product_name} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold break-words">{item.product_name}</p>
                                    {item.variant_name && <p className="text-muted-foreground text-xs break-words">{item.variant_name}</p>}
                                    <p className="text-muted-foreground mt-1 text-xs">Quantity: {item.quantity}</p>
                                </div>
                            </div>
                        ))}
                        <p className="text-muted-foreground flex items-center gap-2 text-xs">
                            <CreditCard aria-hidden="true" className="size-4" />
                            Cash on delivery
                        </p>
                    </div>
                    <ProgressStepper label="Order progress" stages={parcelStages(order)} className="my-4" />
                    <p className="text-lg font-semibold tabular-nums lg:text-right">
                        {money(
                            order.cod_due_cents != null
                                ? order.cod_due_cents / 100
                                : Number(order.subtotal) + Number(order.shipping_fee) - (order.coins_redeemed_cents ?? 0) / 100,
                        )}
                    </p>
                </div>
            ) : (
                <>
                    <p className="mt-3 line-clamp-2 text-sm [overflow-wrap:anywhere]">
                        {order.items.map((item) => item.product_name + (item.variant_name ? ' (' + item.variant_name + ')' : '')).join(', ')}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                        {order.items.reduce((total, item) => total + item.quantity, 0)} items / COD{' '}
                        {money(
                            order.cod_due_cents != null
                                ? order.cod_due_cents / 100
                                : Number(order.subtotal) + Number(order.shipping_fee) - (order.coins_redeemed_cents ?? 0) / 100,
                        )}
                    </p>
                    <ProgressStepper label="Order progress" stages={parcelStages(order)} className="my-4" />
                </>
            )}
            {buyer && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <p
                        className={`flex flex-wrap items-center gap-2 text-xs ${order.status === 'completed' ? 'text-success' : 'text-muted-foreground'}`}
                    >
                        {order.status === 'completed' ? (
                            <CircleCheck aria-hidden="true" className="size-4" />
                        ) : (
                            <Package aria-hidden="true" className="size-4" />
                        )}
                        {order.status === 'completed'
                            ? 'Delivered successfully'
                            : order.status === 'cancelled'
                              ? 'Order cancelled ? Placed'
                              : 'Order placed'}
                        {order.status === 'completed' && !order.delivery?.delivered_at && <span>? Order placed</span>}
                        <time dateTime={order.delivery?.delivered_at ?? order.order.created_at}>
                            {new Date(order.delivery?.delivered_at ?? order.order.created_at).toLocaleString('en-PH', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                            })}
                        </time>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={secondaryClass} onClick={openDetails}>
                            <Eye aria-hidden="true" className="size-4" />
                            View details
                        </button>
                        {order.status !== 'cancelled' && (
                            <button type="button" className={secondaryClass} onClick={openHistory}>
                                <Truck aria-hidden="true" className="size-4" />
                                Track parcel
                            </button>
                        )}
                        {order.status === 'completed' && order.delivery?.status === 'delivered' && (
                            <button type="button" className={buttonClass} onClick={() => openPanel('review')}>
                                <Star aria-hidden="true" className="size-4" />
                                {order.items.every((item) => reviews[item.id]) ? 'Edit review' : 'Leave review'}
                            </button>
                        )}
                    </div>
                </div>
            )}
            {role === 'seller' && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <p className="text-muted-foreground text-sm break-words">
                        {order.order.shipping_recipient_name} &middot; {order.order.shipping_city}, {order.order.shipping_province}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={secondaryClass} onClick={openDetails}>
                            <Eye aria-hidden="true" className="size-4" />
                            View details
                        </button>
                        {order.status !== 'cancelled' && (
                            <button type="button" className={secondaryClass} onClick={openHistory}>
                                <Truck aria-hidden="true" className="size-4" />
                                Track parcel
                            </button>
                        )}
                    </div>
                </div>
            )}
            {order.delivery?.exception_status && (
                <p role="status" className="text-destructive mt-4 text-sm">
                    Delivery issue: {order.delivery.exception_status.replaceAll('_', ' ')}.{' '}
                    {role === 'buyer' ? 'Contact your seller or support for follow-up.' : 'Contact support or your buyer for follow-up.'}
                </p>
            )}
            {!customerView && order.status !== 'cancelled' && (
                <RecordDisclosure ref={historyRef} className="mt-3 border-t pt-2">
                    <summary className="min-h-11 cursor-pointer text-sm font-medium">Parcel handover history</summary>
                    <p className="text-muted-foreground mt-3 text-sm">
                        Rider assignment and label printing do not confirm physical pickup. Each store sends a separate parcel.
                    </p>
                    <ProgressStepper
                        label="Parcel handover history"
                        stages={parcelStages(order, true)}
                        layout="vertical"
                        variant="parcel"
                        className="mt-4"
                    />
                </RecordDisclosure>
            )}
            {!customerView && (
                <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                    <DialogTrigger className={secondaryClass}>View order details</DialogTrigger>
                    <DialogContent className="bg-card sm:max-w-3xl">
                        <DialogHeader className="border-b pb-4">
                            <DialogTitle>Order details</DialogTitle>
                            <DialogDescription>
                                Order #{order.order_id} · Parcel #{order.id}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <ul className="space-y-3">
                                    {order.items.map((item) => (
                                        <li key={item.id} className="flex items-center gap-3 text-sm">
                                            <OrderProductImage src={item.product_image_url} name={item.product_name} className="size-14 rounded-lg" />
                                            <span className="min-w-0 flex-1 break-words">
                                                {item.product_name}
                                                {item.variant_name && <span className="text-muted-foreground"> · {item.variant_name}</span>}
                                                <span className="text-muted-foreground"> × {item.quantity}</span>
                                            </span>
                                            <span className="shrink-0">{money(Number(item.price_each) * item.quantity)}</span>
                                        </li>
                                    ))}
                                </ul>
                                {Number(order.discount_amount ?? 0) > 0 && (
                                    <p className="text-success mt-4 text-sm">
                                        Voucher {order.voucher_code}: −{money(order.discount_amount!)} on product sales
                                    </p>
                                )}
                                <div className="mt-4 flex justify-between border-t pt-3 text-sm">
                                    <span className="text-muted-foreground">Delivery fee</span>
                                    {money(order.shipping_fee)}
                                </div>
                                <div className="mt-3 flex justify-between font-semibold">
                                    <span>Cash on delivery</span>
                                    {money(
                                        order.cod_due_cents != null
                                            ? order.cod_due_cents / 100
                                            : Number(order.subtotal) + Number(order.shipping_fee) - (order.coins_redeemed_cents ?? 0) / 100,
                                    )}
                                </div>
                                {role === 'seller' && (
                                    <p className="text-muted-foreground mt-3 text-xs">
                                        Seller proceeds: {money(order.seller_proceeds)} · Commission: {money(order.commission_amount)}
                                    </p>
                                )}
                            </div>
                            <div className="bg-accent/50 rounded-xl p-4">
                                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                    <MapPin className="text-primary size-4" />
                                    Delivery details
                                </p>
                                <p className="text-sm">{order.order.shipping_recipient_name}</p>
                                {role === 'seller' ? (
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        {order.order.shipping_city}, {order.order.shipping_province}. Contact the buyer through parcel messaging; use
                                        the authorized waybill for the shipping label.
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                                        {order.order.shipping_line1}, {order.order.shipping_barangay}, {order.order.shipping_city},{' '}
                                        {order.order.shipping_province}
                                    </p>
                                )}
                                {role !== 'seller' && <p className="text-muted-foreground mt-2 text-xs">{order.order.shipping_phone}</p>}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
            {order.delivery?.delivery_notes && <p className="my-4 text-sm break-words">Delivery notes: {order.delivery.delivery_notes}</p>}
            {role === 'seller' && ['pending', 'processing'].includes(order.status) && (
                <button
                    className={`${buttonClass} mt-5`}
                    disabled={prepare.processing}
                    onClick={async () => {
                        if (
                            await confirm({
                                title: order.status === 'pending' ? 'Start preparing this parcel?' : 'Mark this parcel ready for pickup?',
                                description: `Parcel #${order.id} from ${order.store.name}. Confirm the items and packaging before updating fulfillment.`,
                                confirmLabel: order.status === 'pending' ? 'Start preparing' : 'Mark ready for pickup',
                            })
                        ) {
                            prepare.transform(() => ({ status: order.status === 'pending' ? 'processing' : 'shipped' }));
                            prepare.patch(`/orders/${order.id}`, { preserveScroll: true });
                        }
                    }}
                >
                    {order.status === 'pending' ? <Package className="size-4" /> : <Truck className="size-4" />}
                    {prepare.processing ? 'Updating parcel…' : order.status === 'pending' ? 'Start preparing' : 'Mark ready for pickup'}
                </button>
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
                        onClick={async () => {
                            if (
                                await confirm({
                                    title: `Cancel Order #${order.order_id}?`,
                                    description:
                                        'This cancels every store parcel in this purchase and restores eligible stock. A seller must not have started preparation.',
                                    confirmLabel: 'Cancel purchase',
                                    destructive: true,
                                })
                            )
                                cancel.post(`/purchases/${order.order_id}/cancel`, { preserveScroll: true });
                        }}
                    >
                        Confirm cancellation
                    </button>
                </details>
            )}
            {!buyer && order.status === 'completed' && (
                <p className="text-success mt-5 flex items-center gap-2 text-sm">
                    <Check className="size-4" />
                    Delivered successfully
                </p>
            )}

            {customerView && (
                <BuyerOrderDialog
                    audience={role === 'seller' ? 'seller' : 'buyer'}
                    order={order}
                    panel={panel}
                    onClose={() => setPanel(null)}
                    reviews={reviews}
                    returnFocus={dialogReturnFocus}
                />
            )}
            <RecordDisclosure ref={conversationRef} className="mt-6 border-t pt-5">
                <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
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
                        <ValidatedForm
                            className="flex flex-wrap items-end gap-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                message.post(`/orders/${order.id}/messages`, { preserveScroll: true, onSuccess: () => message.reset() });
                            }}
                        >
                            <div className="min-w-0 flex-1">
                                <Textarea
                                    label="Your message"
                                    error={message.errors.body}
                                    required
                                    maxLength={2000}
                                    rows={2}
                                    placeholder="Write a message…"
                                    value={message.data.body}
                                    onChange={(e) => message.setData('body', e.target.value)}
                                />
                            </div>
                            <button className={buttonClass} disabled={message.processing}>
                                {message.processing ? 'Sending…' : 'Send'}
                            </button>
                        </ValidatedForm>
                    )}
                </div>
            </RecordDisclosure>
        </Card>
    );
}
function BuyerOrderFilters({ filters, total }: { filters: { search?: string; stage?: string }; total: number }) {
    const queues = [
        { value: 'all', label: 'All orders', icon: Package },
        { value: 'pending', label: 'New orders', icon: Package },
        { value: 'processing', label: 'Preparing', icon: PackageCheck },
        { value: 'ready', label: 'To ship', icon: Package },
        { value: 'transit', label: 'To receive', icon: Truck },
        { value: 'completed', label: 'Completed', icon: CircleCheck },
        { value: 'cancelled', label: 'Cancelled', icon: CircleX },
        { value: 'issues', label: 'Delivery issues', icon: History },
    ];
    return (
        <>
            <nav aria-label="Order status" className="bg-card/60 grid grid-cols-2 gap-1 rounded-2xl sm:grid-cols-4 xl:grid-cols-8">
                {queues.map(({ value, label, icon: Icon }) => (
                    <Link
                        key={value}
                        href="/orders"
                        data={{ stage: value }}
                        preserveScroll
                        preserveState
                        aria-current={(filters.stage ?? 'all') === value ? 'page' : undefined}
                        className={`focus-visible:ring-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-2 px-2 py-3 text-xs font-medium focus-visible:ring-2 ${(filters.stage ?? 'all') === value ? 'border-primary bg-accent text-primary' : 'text-muted-foreground hover:bg-accent/50 border-transparent'}`}
                    >
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                        {label}
                    </Link>
                ))}
            </nav>
            <p role="status" className="text-muted-foreground text-xs">
                {total.toLocaleString()} matching {total === 1 ? 'parcel' : 'parcels'}
            </p>
        </>
    );
}

export default function Orders({
    orders,
    messages,
    role,
    filters = {},
    reviews = {},
}: {
    orders: Pagination<SellerOrder>;
    messages: Record<string, Message[]>;
    role: string;
    filters?: { search?: string; stage?: string };
    reviews?: Record<string, PurchaseReview>;
}) {
    usePoll(30000, { only: ['orders', 'messages', 'reviews'] }, { autoStart: role === 'admin' });
    const filtered = !!filters.search || (!!filters.stage && filters.stage !== 'all');
    return (
        <Page
            storefront={role === 'buyer'}
            banner="orders"
            title={
                role === 'seller'
                    ? (sellerQueues.find((queue) => queue.key === (filters.stage ?? 'all'))?.label ?? 'All orders')
                    : 'Orders & tracking'
            }
            description={
                role === 'seller'
                    ? 'Prepare each parcel, arrange pickup, and keep your buyers informed.'
                    : 'Follow each store’s parcel from preparation to your doorstep.'
            }
        >
            {role === 'buyer' && <BuyerOrderFilters key={JSON.stringify(filters)} filters={filters} total={orders.total} />}
            {role === 'seller' && (
                <>
                    <SellerListFilters key={JSON.stringify(filters)} filters={filters} />
                    <p role="status" className="text-muted-foreground text-sm">
                        {orders.total.toLocaleString()} matching {orders.total === 1 ? 'parcel' : 'parcels'}
                    </p>
                </>
            )}
            {orders.data.length ? (
                <div className={role === 'buyer' ? 'space-y-3' : 'space-y-5'}>
                    {orders.data.map((order) => (
                        <OrderCard key={order.id} order={order} messages={messages[order.id] ?? []} role={role} reviews={reviews} />
                    ))}
                </div>
            ) : (
                <Empty
                    title={filtered ? 'No matching orders' : 'No orders yet'}
                    description={
                        filtered
                            ? 'Change the queue or reset your search to see more orders.'
                            : role === 'seller'
                              ? 'Incoming orders appear here when a buyer checks out.'
                              : 'Your purchases will appear here after checkout.'
                    }
                    href={role === 'seller' && filtered ? '/orders' : role === 'buyer' ? '/shop' : '/dashboard'}
                    label={role === 'seller' && filtered ? 'View all orders' : role === 'buyer' ? 'Start exploring' : 'Back to overview'}
                />
            )}
            <Pager links={orders.links} />
        </Page>
    );
}
