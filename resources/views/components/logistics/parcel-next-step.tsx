import { secondaryClass } from '@/components/shared/marketplace-ui';
import type { Delivery } from '@/pages/marketplace/deliveries';
import { Link } from '@inertiajs/react';

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
        description = 'Logistics must verify the label and record the destination area and bin/route.';
        scan = role === 'logistics';
    } else if (parcel.status !== 'delivered' && !parcel.dispatch_prepared_at) {
        title = role === 'rider' ? 'Waiting for delivery assignment' : 'Next: assign delivery rider';
        description = 'Logistics must scan the label and assign an eligible delivery rider. The pickup rider may be selected again.';
    } else if (parcel.status !== 'delivered' && !parcel.dispatch_accepted_at) {
        title = role === 'rider' ? 'Next: accept dispatch handover' : 'Waiting for the delivery rider to accept';
        description =
            'The parcel appears in the assigned rider’s Dispatch queue. That rider must scan and accept the handover before going out for delivery.';
    } else if (parcel.status === 'in_transit') {
        title = 'Next: mark out for delivery';
        description = 'Dispatch handover is accepted. The assigned rider can now begin the delivery route.';
    } else if (parcel.status === 'out_for_delivery') {
        title = 'Next: deliver and record actual COD';
        description = 'Confirm delivery only after the buyer receives the parcel, with recipient details, proof photo, and the full COD amount.';
    }
    return (
        <div className="bg-accent/40 mt-4 space-y-2 rounded-xl border p-4" role={compact ? undefined : 'status'}>
            <p className="text-primary text-sm font-semibold">{title}</p>
            {!compact && <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>}
            {!compact && scan && !scanning && (
                <Link href="/logistics/scan" className={secondaryClass}>
                    Scan parcel for the next action
                </Link>
            )}
        </div>
    );
}
