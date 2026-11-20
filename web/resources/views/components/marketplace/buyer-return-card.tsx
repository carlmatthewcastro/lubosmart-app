import OrderProductImage from '@/components/marketplace/order-product-image';
import ActivityTimeline, { returnEventPresentation } from '@/components/shared/activity-timeline';
import { Badge, Card, money, secondaryClass } from '@/components/shared/marketplace-ui';
import ProgressStepper from '@/components/shared/progress-stepper';
import { returnStages } from '@/components/shared/workflow-stages';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { activityNote } from '@/lib/activity-note';
import { type ReturnRecord } from '@/pages/finance/returns';
import { ChevronRight, CircleCheck, Clock3, History, Info, Package, Truck } from 'lucide-react';

const statuses: Record<string, { label: string; next: string; step: number }> = {
    requested: { label: 'Under review', next: 'Your request is awaiting admin review. Keep the whole parcel together while you wait.', step: 0 },
    approved: {
        label: 'Approved',
        next: 'Your return is approved. Wait for logistics to assign a return rider before sending your parcel.',
        step: 1,
    },
    assigned: {
        label: 'Awaiting collection',
        next: 'A return rider has been assigned. Keep all items ready for collection and wait for handover instructions.',
        step: 1,
    },
    collected: {
        label: 'Returning to seller',
        next: 'Your parcel has been collected. The seller will confirm receipt and inspect the returned items.',
        step: 2,
    },
    received: {
        label: 'Received by seller',
        next: 'The seller has received your parcel. Refund review is pending; no payment is confirmed until a refund is recorded.',
        step: 3,
    },
    refunded: {
        label: 'Refund recorded',
        next: 'A refund has been recorded. View details for the cash and Lubos Coins breakdown.',
        step: 4,
    },
    closed: { label: 'Closed without refund', next: 'This return was closed without a refund. View details for the recorded decision.', step: 4 },
    rejected: {
        label: 'Request declined',
        next: 'Your request was declined. Review the decision below; contact support if you need clarification.',
        step: -1,
    },
};

export default function BuyerReturnCard({ entry }: { entry: ReturnRecord }) {
    const parcel = entry.seller_order;
    const status = statuses[entry.status] ?? {
        label: entry.status.replaceAll('_', ' '),
        next: 'View return details for the latest recorded update.',
        step: -1,
    };
    const latest = [...entry.events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id);
    return (
        <Card className="buyer-return-card overflow-hidden !p-0 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <span className="bg-accent text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl">
                        <Package aria-hidden="true" className="size-6" />
                    </span>
                    <h3 className="text-sm font-semibold break-words">{parcel.store.name}</h3>
                    <span className="text-muted-foreground text-xs">
                        Return #{entry.id} · Parcel #{parcel.id}
                    </span>
                </div>
                <Badge
                    status={entry.status === 'refunded' ? 'completed' : entry.status === 'rejected' ? 'rejected' : entry.status}
                    label={status.label}
                />
            </div>
            <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <div className="min-w-0">
                    <ul className="space-y-3">
                        {parcel.items.map((item) => (
                            <li key={item.id} className="flex min-w-0 items-center gap-3">
                                <OrderProductImage src={item.product_image_url} name={item.product_name} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold break-words">{item.product_name}</p>
                                    {item.variant_name && <p className="text-muted-foreground mt-1 text-xs break-words">{item.variant_name}</p>}
                                    <p className="text-muted-foreground mt-1 text-xs">Quantity: {item.quantity}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="bg-muted/40 mt-4 rounded-2xl p-4">
                        <p className="text-muted-foreground text-xs font-medium">Return reason</p>
                        <p className="mt-1 line-clamp-3 text-sm break-words whitespace-pre-wrap">{entry.reason}</p>
                    </div>
                </div>
                <div className="min-w-0 lg:border-l lg:pl-6">
                    <h4 className="text-sm font-semibold">Return progress</h4>
                    <ProgressStepper label="Return progress" stages={returnStages(entry)} layout="responsive" className="my-5" />
                    <div className="bg-accent/60 rounded-2xl p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                            <Info aria-hidden="true" className="text-primary size-4 shrink-0" />
                            What happens next
                        </p>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{status.next}</p>
                    </div>
                    {entry.decision_reason && (
                        <p className="mt-4 text-sm break-words">
                            <span className="font-medium">Decision: </span>
                            {entry.decision_reason}
                        </p>
                    )}
                    {entry.refund_cents != null && (
                        <p className="text-success mt-4 flex items-center gap-2 text-sm font-semibold tabular-nums">
                            <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
                            Recorded refund: {money(entry.refund_cents / 100)}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
                <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                    <Clock3 aria-hidden="true" className="size-4" />
                    {latest[0] ? (
                        <>
                            Updated{' '}
                            <time dateTime={latest[0].created_at}>
                                {new Date(latest[0].created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                            </time>
                        </>
                    ) : (
                        'No history recorded yet'
                    )}
                </p>
                <Dialog>
                    <DialogTrigger asChild>
                        <button type="button" className={secondaryClass}>
                            <History aria-hidden="true" className="size-4" />
                            View details & history
                            <ChevronRight aria-hidden="true" className="size-4" />
                        </button>
                    </DialogTrigger>
                    <DialogContent className="bg-card motion-reduce:animate-none sm:max-w-2xl">
                        <DialogHeader className="border-b pb-3">
                            <DialogTitle>Return details & history</DialogTitle>
                            <DialogDescription>
                                Return #{entry.id} · Parcel #{parcel.id} · {parcel.store.name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <Badge status={entry.status} label={status.label} />
                            <p className="text-muted-foreground text-xs">Whole-parcel return</p>
                        </div>
                        <section>
                            <h3 className="text-sm font-semibold">Return reason</h3>
                            <p className="text-muted-foreground mt-2 text-sm break-words whitespace-pre-wrap">{entry.reason}</p>
                        </section>
                        {parcel.delivery?.tracking_reference && (
                            <p className="text-muted-foreground text-xs break-all">Tracking reference: {parcel.delivery.tracking_reference}</p>
                        )}
                        <section className="bg-accent/50 rounded-xl p-4">
                            <h3 className="text-sm font-semibold">Decision & refund</h3>
                            <dl className="mt-3 space-y-3 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">Admin decision</dt>
                                    <dd className="mt-1 break-words">{entry.decision_reason ?? 'Awaiting review'}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Reviewed responsibility</dt>
                                    <dd className="mt-1 break-words">
                                        <span className="capitalize">{entry.responsibility ?? 'Awaiting review'}</span>
                                        {entry.responsibility_reason ? ` · ${entry.responsibility_reason}` : ''}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Refund value recorded</dt>
                                    <dd className="mt-1 break-words tabular-nums">
                                        {entry.refund_cents == null
                                            ? 'No refund payment recorded'
                                            : `${money(entry.refund_cents / 100)} · ${entry.refund_reference ?? 'No reference recorded'}`}
                                    </dd>
                                </div>
                                {entry.refund_method && (
                                    <div>
                                        <dt className="text-muted-foreground">Cash and coins</dt>
                                        <dd className="mt-1">
                                            Cash: {money((entry.cash_refunded_cents ?? 0) / 100)} / Coins credited/restored:{' '}
                                            {money((entry.coins_refunded_cents ?? 0) / 100)} equivalent
                                        </dd>
                                    </div>
                                )}
                                {entry.product_refund_cents != null && entry.shipping_refund_cents != null && (
                                    <div>
                                        <dt className="text-muted-foreground">Refund breakdown</dt>
                                        <dd className="mt-1 tabular-nums">
                                            Products: {money(entry.product_refund_cents / 100)} · Shipping: {money(entry.shipping_refund_cents / 100)}
                                        </dd>
                                    </div>
                                )}
                                {entry.condition && (
                                    <div>
                                        <dt className="text-muted-foreground">Returned goods</dt>
                                        <dd className="mt-1 break-words">
                                            {entry.condition} · {entry.restocked ? 'Stock restored once' : 'Stock not restored'}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </section>
                        <section>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                                <Truck aria-hidden="true" className="text-primary size-4" />
                                Return history
                            </h3>
                            {latest.length ? (
                                <ActivityTimeline
                                    label="Return history"
                                    entries={latest.map((event) => ({
                                        id: event.id,
                                        ...returnEventPresentation(event.action),
                                        at: event.created_at,
                                        content: activityNote(event.notes),
                                    }))}
                                />
                            ) : (
                                <p className="text-muted-foreground text-sm">No return events have been recorded yet.</p>
                            )}
                        </section>
                    </DialogContent>
                </Dialog>
            </div>
        </Card>
    );
}
