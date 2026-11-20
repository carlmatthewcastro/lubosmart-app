import { type ProgressStage } from '@/components/shared/progress-stepper';
import { type ReturnRecord } from '@/pages/finance/returns';
import { type SellerOrder } from '@/pages/marketplace/orders';
import { Banknote, ClipboardCheck, ClipboardList, Mail, Package, PackageCheck, ScanLine, ShieldCheck, Store, Truck, UserRound } from 'lucide-react';

/** Recorded milestones only: a missing handover is never inferred from a later event. */
export function parcelStages(order: Pick<SellerOrder, 'status' | 'delivery' | 'order'>, detailed = false): ProgressStage[] {
    const d = order.delivery;
    const delivered = d?.status === 'delivered';
    const transit = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(d?.status ?? '');
    const stages: ProgressStage[] = detailed
        ? [
              { id: 'placed', label: 'Order placed', icon: ClipboardList, timestamp: order.order.created_at, state: 'completed' },
              {
                  id: 'pickup',
                  label: 'Collected from seller',
                  icon: Package,
                  timestamp: d?.picked_up_at,
                  state: d?.picked_up_at ? 'completed' : 'pending',
                  motion: order.status === 'processing' ? 'package' : undefined,
              },
              {
                  id: 'received',
                  label: 'Received at logistics center',
                  icon: ScanLine,
                  timestamp: d?.received_at,
                  state: d?.received_at ? 'completed' : 'pending',
                  motion: 'scan',
              },
              {
                  id: 'sorted',
                  label: 'Sorted for delivery',
                  icon: PackageCheck,
                  timestamp: d?.sorted_at,
                  state: d?.sorted_at ? 'completed' : 'pending',
                  motion: 'scan',
              },
              {
                  id: 'dispatch',
                  label: 'Accepted by delivery rider',
                  icon: Truck,
                  timestamp: d?.dispatch_accepted_at,
                  state: d?.dispatch_accepted_at ? 'completed' : 'pending',
                  motion: 'truck',
              },
              {
                  id: 'delivered',
                  label: 'Delivered to recipient',
                  icon: ShieldCheck,
                  timestamp: d?.delivered_at,
                  state: delivered ? 'completed' : 'pending',
              },
          ]
        : [
              {
                  id: 'prepare',
                  label: order.status === 'pending' ? 'Placed' : 'Preparing',
                  icon: Package,
                  timestamp: order.status === 'pending' ? order.order.created_at : null,
                  state:
                      order.status === 'pending' || order.status === 'processing'
                          ? 'current'
                          : ['shipped', 'completed'].includes(order.status)
                            ? 'completed'
                            : 'pending',
                  motion: order.status === 'processing' ? 'package' : undefined,
              },
              {
                  id: 'ready',
                  label: 'Ready for pickup',
                  icon: PackageCheck,
                  state: transit ? 'completed' : order.status === 'shipped' ? 'current' : 'pending',
              },
              { id: 'transit', label: 'On the way', icon: Truck, state: delivered ? 'completed' : transit ? 'current' : 'pending', motion: 'truck' },
              { id: 'delivered', label: 'Delivered', icon: ShieldCheck, timestamp: d?.delivered_at, state: delivered ? 'completed' : 'pending' },
          ];
    const stopped = order.status === 'cancelled' || order.order.status === 'cancelled';
    const exception = d?.exception_status || (['failed', 'returned', 'cancelled'].includes(d?.status ?? '') ? d?.status : null);
    const active = stages.findIndex((s) => s.state === 'current');
    const next = active >= 0 ? active : stages.findIndex((s) => s.state === 'pending');
    if ((stopped || exception) && !delivered) {
        const target = next >= 0 ? next : stages.length - 1;
        stages[target] = {
            ...stages[target],
            state: stopped || exception === 'cancelled' ? 'cancelled' : 'failed',
            label: stopped ? 'Order cancelled' : 'Delivery issue',
            description: stopped ? 'This order was cancelled.' : exception!.replaceAll('_', ' '),
        };
    } else if (detailed && next >= 0 && !delivered) stages[next].state = 'current';
    return stages;
}

export function returnStages(entry: Pick<ReturnRecord, 'status' | 'events' | 'decision_reason' | 'workflow_version'>): ProgressStage[] {
    const statuses = [
        'requested',
        'approved',
        'assigned',
        'collected',
        'facility_received',
        'seller_assigned',
        'seller_in_transit',
        'received',
        'refunded',
        'closed',
        'rejected',
    ];
    const known = statuses.includes(entry.status);
    const evidence = (actions: string[]) =>
        entry.events.filter((e) => actions.includes(e.action)).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]?.created_at;
    const definitions = [
        { id: 'review', label: 'Review', icon: ClipboardList, actions: ['requested'] },
        { id: 'approved', label: 'Approved', icon: ClipboardCheck, actions: ['approve'] },
        { id: 'collected', label: 'Collected', icon: Truck, actions: ['collect'] },
        ...(entry.workflow_version === 2
            ? [
                  { id: 'facility', label: 'Facility received', icon: Truck, actions: ['facility_receive'] },
                  { id: 'seller-return', label: 'Returning to seller', icon: Truck, actions: ['accept_seller_dispatch'] },
              ]
            : []),
        { id: 'received', label: 'Seller received', icon: Store, actions: ['receive'] },
        {
            id: 'refund',
            label: entry.status === 'closed' ? 'Closed without refund' : 'Refund recorded',
            icon: Banknote,
            actions: entry.status === 'closed' ? ['close'] : ['refund'],
        },
    ];
    const current =
        entry.workflow_version === 2
            ? (
                  {
                      requested: 0,
                      approved: 2,
                      assigned: 2,
                      collected: 3,
                      facility_received: 4,
                      seller_assigned: 4,
                      seller_in_transit: 5,
                      received: 6,
                      refunded: 7,
                      closed: 7,
                      rejected: 0,
                  } as Record<string, number>
              )[entry.status]
            : ({ requested: 0, approved: 2, assigned: 2, collected: 3, received: 4, refunded: 5, closed: 5, rejected: 0 } as Record<string, number>)[
                  entry.status
              ];
    return definitions.map((s, i) => ({
        id: s.id,
        label: entry.status === 'rejected' && i === 0 ? 'Request declined' : s.label,
        icon: s.icon,
        state:
            entry.status === 'rejected' && i === 0
                ? 'failed'
                : known && i === current
                  ? 'current'
                  : evidence(s.actions) || (known && entry.status !== 'rejected' && i < current)
                    ? 'completed'
                    : 'pending',
        timestamp: evidence(entry.status === 'rejected' && i === 0 ? ['reject'] : s.actions),
        description:
            (entry.status === 'rejected' && i === 0) || (entry.status === 'closed' && i === definitions.length - 1)
                ? (entry.decision_reason ?? undefined)
                : undefined,
    }));
}

export const accountIcons = [UserRound, Mail, ClipboardList, ShieldCheck];

export function codStages(collection: {
    status: string;
    received_amount?: string | null;
    discrepancy_reason?: string | null;
    collected_at?: string | null;
    handed_over_at?: string | null;
    reconciled_at?: string | null;
}): ProgressStage[] {
    const known = ['collected', 'handed_over', 'reconciled'].includes(collection.status);
    const received = ['handed_over', 'reconciled'].includes(collection.status) && collection.received_amount != null;
    const discrepancy = !!collection.discrepancy_reason;
    return [
        { id: 'collected', label: 'COD collected', icon: Banknote, state: known ? 'completed' : 'pending', timestamp: collection.collected_at },
        {
            id: 'handover',
            label: 'Cash received',
            icon: ClipboardCheck,
            state: received ? 'completed' : known && !discrepancy ? 'current' : 'pending',
            timestamp: collection.handed_over_at,
        },
        {
            id: 'reconciled',
            label: discrepancy ? 'Discrepancy' : 'Reconciled',
            icon: ShieldCheck,
            description: collection.discrepancy_reason ?? undefined,
            state: discrepancy ? 'failed' : collection.status === 'reconciled' && received ? 'completed' : received ? 'current' : 'pending',
            timestamp: collection.reconciled_at,
        },
    ];
}
