import OrderProductImage from '@/components/marketplace/order-product-image';
import { type PurchaseReview, ReviewEditor } from '@/components/marketplace/review-form';
import { money } from '@/components/shared/marketplace-ui';
import ProgressStepper from '@/components/shared/progress-stepper';
import { parcelStages } from '@/components/shared/workflow-stages';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type SellerOrder } from '@/pages/marketplace/orders';
import { CreditCard, MapPin } from 'lucide-react';
import { type RefObject } from 'react';

export type BuyerOrderPanel = 'tracking' | 'details' | 'review';

export default function BuyerOrderDialog({
    order,
    panel,
    onClose,
    reviews,
    returnFocus,
    audience = 'buyer',
}: {
    audience?: 'buyer' | 'seller';
    order: SellerOrder;
    panel: BuyerOrderPanel | null;
    onClose: () => void;
    reviews: Record<string, PurchaseReview>;
    returnFocus: RefObject<HTMLElement | null>;
}) {
    const eligible = order.status === 'completed' && order.delivery?.status === 'delivered';
    return (
        <Dialog
            open={panel !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent
                className={`bg-card motion-reduce:animate-none ${panel === 'details' ? 'sm:max-w-2xl' : ''}`}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    if (returnFocus.current?.isConnected) returnFocus.current.focus();
                }}
            >
                <DialogHeader className="border-b pb-3">
                    <DialogTitle>
                        {panel === 'tracking'
                            ? 'Track parcel'
                            : panel === 'details'
                              ? 'Order details'
                              : order.items.every((item) => reviews[item.id])
                                ? 'Edit review'
                                : 'Leave review'}
                    </DialogTitle>
                    <DialogDescription>
                        Order #{order.order_id} · Parcel #{order.id}
                        {panel === 'review' ? ` · ${order.store.name}` : ''}
                    </DialogDescription>
                </DialogHeader>
                {panel === 'tracking' && (
                    <>
                        {order.status === 'cancelled' && <p className="text-destructive text-sm">This order was cancelled.</p>}
                        {order.delivery?.exception_status && (
                            <p role="status" className="text-destructive text-sm">
                                Delivery issue: {order.delivery.exception_status.replaceAll('_', ' ')}.{' '}
                                {audience === 'seller'
                                    ? 'Contact support or your buyer for follow-up.'
                                    : 'Contact your seller or support for follow-up.'}
                            </p>
                        )}
                        {order.delivery?.tracking_reference && (
                            <p className="text-muted-foreground text-xs break-all">Tracking reference: {order.delivery.tracking_reference}</p>
                        )}
                        <ProgressStepper label="Parcel handover history" stages={parcelStages(order, true)} layout="vertical" variant="detailed" />
                    </>
                )}
                {panel === 'details' && (
                    <div className="grid min-w-0 gap-6 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                        <div className="min-w-0">
                            <ul className="space-y-4">
                                {order.items.map((item) => (
                                    <li key={item.id} className="flex items-center gap-3">
                                        <OrderProductImage src={item.product_image_url} name={item.product_name} className="size-14 rounded-lg" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold break-words">{item.product_name}</p>
                                            {item.variant_name && <p className="text-muted-foreground text-xs break-words">{item.variant_name}</p>}
                                            <p className="text-muted-foreground mt-1 text-xs">Quantity: {item.quantity}</p>
                                        </div>
                                        <span className="text-xs font-semibold tabular-nums">{money(Number(item.price_each) * item.quantity)}</span>
                                    </li>
                                ))}
                            </ul>
                            <dl className="mt-5 space-y-3 border-t pt-3 text-sm">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">Subtotal</dt>
                                    <dd className="tabular-nums">{money(order.subtotal)}</dd>
                                </div>
                                {Number(order.discount_amount ?? 0) > 0 && (
                                    <div className="text-success">
                                        <dt>Voucher {order.voucher_code}</dt>
                                        <dd>{money(order.discount_amount!)} discount applied to product sales</dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">Delivery fee</dt>
                                    <dd className="tabular-nums">{money(order.shipping_fee)}</dd>
                                </div>
                                {(order.coins_redeemed_cents ?? 0) > 0 && (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-muted-foreground">Lubos Coins used</dt>
                                        <dd className="tabular-nums">{money((order.coins_redeemed_cents ?? 0) / 100)} equivalent</dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-3 border-t pt-3 font-semibold">
                                    <dt>Total (Cash on delivery)</dt>
                                    <dd className="tabular-nums">
                                        {money(
                                            order.cod_due_cents != null
                                                ? order.cod_due_cents / 100
                                                : Number(order.subtotal) + Number(order.shipping_fee) - (order.coins_redeemed_cents ?? 0) / 100,
                                        )}
                                    </dd>
                                </div>
                                {audience === 'seller' && (
                                    <>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-muted-foreground">Seller proceeds</dt>
                                            <dd className="tabular-nums">{money(order.seller_proceeds)}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-muted-foreground">Commission</dt>
                                            <dd className="tabular-nums">{money(order.commission_amount)}</dd>
                                        </div>
                                    </>
                                )}
                            </dl>
                        </div>
                        <div className="min-w-0 space-y-3">
                            <section className="bg-accent/60 rounded-xl p-4">
                                <h3 className="flex items-center gap-2 text-sm font-semibold">
                                    <MapPin aria-hidden="true" className="text-primary size-4" />
                                    Delivery details
                                </h3>
                                <p className="mt-3 text-sm break-words">{order.order.shipping_recipient_name}</p>
                                <p className="text-muted-foreground mt-1 text-xs leading-relaxed break-words">
                                    {audience === 'seller' ? (
                                        <>
                                            {order.order.shipping_city}, {order.order.shipping_province}. Contact the buyer through parcel messaging;
                                            use the authorized waybill for the shipping label.
                                        </>
                                    ) : (
                                        <>
                                            {order.order.shipping_line1}, {order.order.shipping_barangay}, {order.order.shipping_city},{' '}
                                            {order.order.shipping_province}
                                        </>
                                    )}
                                </p>
                                {audience === 'buyer' && <p className="mt-2 text-xs">{order.order.shipping_phone}</p>}
                            </section>
                            <section className="bg-accent/60 rounded-xl p-4">
                                <h3 className="flex items-center gap-2 text-sm font-semibold">
                                    <CreditCard aria-hidden="true" className="text-primary size-4" />
                                    Payment method
                                </h3>
                                <p className="mt-3 text-sm">Cash on delivery (COD)</p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {audience === 'seller'
                                        ? 'Cash collected through the delivery workflow. Seller payouts are recorded separately in settlements.'
                                        : 'Pay in cash upon receiving your parcel.'}
                                </p>
                            </section>
                        </div>
                    </div>
                )}
                {audience === 'buyer' && panel === 'review' && eligible && (
                    <div className="space-y-6">
                        {order.items.map((item) => (
                            <section key={item.id}>
                                <h3 className="mb-3 text-sm font-medium break-words">
                                    {item.product_name}
                                    {item.variant_name ? ` · ${item.variant_name}` : ''}
                                </h3>
                                <ReviewEditor
                                    itemId={item.id}
                                    name={item.product_name}
                                    review={reviews[item.id]}
                                    onCancel={onClose}
                                    onSaved={order.items.length === 1 ? onClose : undefined}
                                />
                            </section>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
