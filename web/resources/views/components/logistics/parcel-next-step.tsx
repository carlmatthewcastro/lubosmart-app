import { buttonClass } from '@/components/shared/marketplace-ui';
import type { Delivery } from '@/pages/marketplace/deliveries';
import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

export default function ParcelNextStep({
    parcel,
    role,
    compact = false,
    scanning = false,
}: {
    parcel: Delivery;
    role: string;
    compact?: boolean;
    scanning?: boolean;
}) {
    let title = 'Delivery completed';
    let description = 'The delivery is recorded. Continue the recorded COD handover and reconciliation process.';
    let scan = false;
    if (parcel.seller_order.status === 'cancelled') {
        title = 'Parcel cancelled';
        description = 'Do not assign, collect, or dispatch this parcel.';
    } else if (parcel.exception_status) {
        title = 'Resolve the parcel exception';
        description = 'Logistics must record the next exception decision before normal fulfillment can continue.';
    } else if (parcel.status === 'unassigned') {
        title = parcel.pickup_approved_at ? 'Next: assign pickup rider' : 'Next: approve pickup request';
        description = parcel.pickup_approved_at
            ? 'Pickup is approved. Choose the Seller pickup area and a Rider covering that area. Delivery coverage will be checked separately after sorting.'
            : 'Review this seller parcel and approve the pickup before assigning a rider.';
    } else if (parcel.status === 'assigned') {
        title = role === 'rider' ? 'Next: confirm physical pickup' : 'Waiting for the pickup rider';
        description =
            'The assigned rider must collect the parcel from the seller and scan its attached label. It will reach delivery assignment after center receipt and sorting.';
    } else if (parcel.status !== 'delivered' && !parcel.received_at) {
        title = role === 'rider' ? 'Next: bring the parcel to the center' : 'Next: confirm center receipt';
        description = 'The pickup is recorded. Logistics must scan and receive the physical parcel before sorting.';
        scan = role === 'logistics';
    } else if (parcel.status !== 'delivered' && !parcel.sorted_at) {
        title = 'Next: sort by destination';
        description = 'Logistics records the destination area and bin/route. No additional scan is required.';
    } else if (parcel.status !== 'delivered' && !parcel.dispatch_prepared_at) {
        title = role === 'rider' ? 'Waiting for delivery assignment' : 'Next: assign delivery rider';
        description = 'Logistics assigns an eligible delivery rider without an additional scan. The pickup rider may be selected again.';
    } else if (parcel.status !== 'delivered' && !parcel.dispatch_accepted_at) {
        title = role === 'rider' ? 'Next: accept dispatch handover' : 'Waiting for the delivery rider to accept';
        description =
            'The parcel appears in the assigned rider’s Dispatch queue. That rider must scan and accept the handover before going out for delivery.';
    } else if (parcel.status === 'in_transit') {
        title = 'Next: mark out for delivery';
        description = 'Dispatch handover is accepted. The assigned rider can now begin the delivery route.';
    } else if (parcel.status === 'out_for_delivery') {
        title = 'Next: deliver and record actual COD';
        description =
            'Confirm delivery only after the buyer receives the parcel, with a camera photo, delivery note, and explicit confirmation of the full COD payment.';
    }
    if (compact)
        return (
            <p className="text-primary mt-3 flex items-start gap-2 text-sm font-medium">
                <ArrowRight aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{title}</span>
            </p>
        );
    return (
        <div
            className="bg-accent/40 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 sm:p-5"
            role={compact ? undefined : 'status'}
        >
            <div className="min-w-0 flex-1 basis-64">
                <p className="text-primary text-base font-semibold">{title}</p>
                {!compact && <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>}
            </div>
            {!compact && scan && !scanning && (
                <Link href="/logistics/scan" className={buttonClass}>
                    Scan parcel for center receipt
                </Link>
            )}
        </div>
    );
}
