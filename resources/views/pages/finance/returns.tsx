import { Card, Empty, money, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';
import RecordAction, { type ActionField } from '@/components/shared/record-action';

type Location = { recipient_name?: string; phone?: string; line1?: string; barangay?: string; city?: string; province?: string };
type ReturnRecord = {
    id: number;
    status: string;
    reason: string;
    decision_reason: string | null;
    refund_cents?: number | null;
    refund_reference?: string | null;
    restocked: boolean;
    condition: string | null;
    pickup_address?: Location | null;
    events: { id: number; action: string; notes: string; created_at: string }[];
    seller_order: {
        id: number;
        subtotal: string;
        shipping_fee: string;
        store: { name: string };
        delivery: { tracking_reference: string | null };
        order: {
            shipping_recipient_name: string;
            shipping_phone: string;
            shipping_line1: string;
            shipping_barangay: string;
            shipping_city: string;
            shipping_province: string;
        };
        items: { id: number; product_name: string; variant_name: string | null; quantity: number }[];
    };
};
const reason: ActionField = { key: 'reason', label: 'Reason / handover notes', type: 'textarea' };
const tracking: ActionField = { key: 'tracking_reference', label: 'Scan or enter the attached parcel tracking reference', maxLength: 40 };

function ReturnCard({ entry, role, riders }: { entry: ReturnRecord; role: string; riders: { id: number; name: string }[] }) {
    const parcel = entry.seller_order;
    const url = `/returns/${entry.id}`;
    const maximum = Number(parcel.subtotal) + Number(parcel.shipping_fee);
    return (
        <Card>
            <h2 className="text-lg font-semibold">
                Return #{entry.id} · Parcel #{parcel.id} · {parcel.store.name}
            </h2>
            <p role="status" className="text-primary mt-3 text-sm font-semibold capitalize">
                {entry.status.replaceAll('_', ' ')}
            </p>
            <p className="text-muted-foreground mt-2 text-sm break-all">Tracking: {parcel.delivery?.tracking_reference ?? 'Not recorded'}</p>
            <p className="mt-3 text-sm break-words whitespace-pre-wrap">{entry.reason}</p>
            <ul className="mt-3 space-y-1 text-sm">
                {parcel.items.map((item) => (
                    <li key={item.id}>
                        {item.product_name}
                        {item.variant_name ? ` · ${item.variant_name}` : ''} × {item.quantity}
                    </li>
                ))}
            </ul>
            {entry.decision_reason && <p className="text-muted-foreground mt-3 text-sm break-words">Admin decision: {entry.decision_reason}</p>}
            {entry.refund_cents != null && (
                <p className="text-success mt-3 text-sm">
                    Recorded manual refund: {money(entry.refund_cents / 100)} · {entry.refund_reference}
                </p>
            )}
            {entry.condition && (
                <p className="text-muted-foreground mt-3 text-sm">
                    Seller received goods: {entry.condition}. {entry.restocked ? 'Stock restored once.' : 'Stock was not restored.'}
                </p>
            )}
            {['logistics', 'rider'].includes(role) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                        <h3 className="text-sm font-semibold">Collect from buyer</h3>
                        <p className="text-muted-foreground mt-2 text-sm break-words">
                            {parcel.order.shipping_recipient_name} · {parcel.order.shipping_phone}
                            <br />
                            {parcel.order.shipping_line1}, {parcel.order.shipping_barangay}, {parcel.order.shipping_city},{' '}
                            {parcel.order.shipping_province}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">Return to seller</h3>
                        <p className="text-muted-foreground mt-2 text-sm break-words">
                            {entry.pickup_address
                                ? [
                                      entry.pickup_address.recipient_name,
                                      entry.pickup_address.phone,
                                      entry.pickup_address.line1,
                                      entry.pickup_address.barangay,
                                      entry.pickup_address.city,
                                      entry.pickup_address.province,
                                  ]
                                      .filter(Boolean)
                                      .join(', ')
                                : 'Confirm the seller handover location through the parcel conversation before collecting.'}
                        </p>
                    </div>
                </div>
            )}
            {role === 'admin' && entry.status === 'requested' && (
                <>
                    <RecordAction
                        title="Approve return"
                        description="Approve a whole-parcel return. Logistics will assign the return rider. This does not record a refund or restore stock."
                        url={url}
                        method="patch"
                        action="approve"
                        fields={[reason]}
                    />
                    <RecordAction
                        title="Reject return"
                        description="Give the buyer a clear reason. No refund or inventory change will be recorded."
                        url={url}
                        method="patch"
                        action="reject"
                        fields={[reason]}
                    />
                </>
            )}
            {role === 'logistics' && ['approved', 'assigned'].includes(entry.status) && (
                <RecordAction
                    title="Assign return rider"
                    description="Choose your affiliated, operational rider to collect this approved return and transport it to the seller. The original delivery history stays intact."
                    url={url}
                    method="patch"
                    action="assign"
                    fields={[
                        {
                            key: 'rider_id',
                            label: 'Return rider',
                            type: 'select',
                            options: riders.map((rider) => ({ value: String(rider.id), label: rider.name })),
                        },
                        reason,
                    ]}
                />
            )}
            {role === 'rider' && entry.status === 'assigned' && (
                <RecordAction
                    title="Confirm return collection"
                    description="Scan the original waybill and confirm you physically collected this approved return from the buyer. Do not confirm before handover."
                    url={url}
                    method="patch"
                    action="collect"
                    fields={[tracking, reason]}
                />
            )}
            {role === 'seller' && entry.status === 'collected' && (
                <RecordAction
                    title="Confirm returned goods receipt"
                    description="Scan the waybill and inspect the whole returned parcel before confirming receipt. Restock only complete, intact goods. This does not refund the buyer."
                    url={url}
                    method="patch"
                    action="receive"
                    fields={[
                        tracking,
                        {
                            key: 'condition',
                            label: 'Returned goods condition',
                            type: 'select',
                            options: [
                                { value: 'intact', label: 'Intact and complete' },
                                { value: 'damaged', label: 'Damaged / not saleable' },
                            ],
                        },
                        {
                            key: 'restock',
                            label: 'Inventory decision',
                            type: 'select',
                            value: 'no',
                            options: [
                                { value: 'no', label: 'Receive without restocking' },
                                { value: 'yes', label: 'Restore the original item quantities once' },
                            ],
                        },
                        reason,
                    ]}
                />
            )}
            {role === 'admin' && entry.status === 'received' && maximum > 0 && (
                <RecordAction
                    title="Record manual refund"
                    description={`Confirm the actual buyer refund after seller receipt and full COD reconciliation. Maximum ${money(maximum)}. Amounts first reverse net product sales and their commission proportionally; any remainder is shipping refund. A refund after seller payout creates a seller balance owed back. This records a payment you made; it does not send money.`}
                    url={url}
                    method="patch"
                    action="refund"
                    fields={[
                        {
                            key: 'amount',
                            label: 'Actual amount refunded (PHP)',
                            type: 'number',
                            min: '0.01',
                            max: maximum.toFixed(2),
                            value: parcel.subtotal,
                        },
                        { key: 'reference', label: 'Unique refund payment reference', maxLength: 100 },
                        reason,
                    ]}
                />
            )}
            {role === 'admin' && entry.status === 'received' && (
                <RecordAction
                    title="Close without refund"
                    description="Use only when the return is resolved without any buyer refund, including a zero-COD parcel. Record the agreed reason. This preserves all original monetary entries and does not record a payment."
                    url={url}
                    method="patch"
                    action="close"
                    fields={[reason]}
                />
            )}
            <details className="mt-5 border-t pt-4">
                <summary className="min-h-6 cursor-pointer text-sm font-medium">Return handover and decision history</summary>
                <ol className="mt-3 space-y-3">
                    {entry.events.map((event) => (
                        <li key={event.id} className="text-sm">
                            <p className="font-medium capitalize">
                                {event.action} · {new Date(event.created_at).toLocaleString()}
                            </p>
                            <p className="text-muted-foreground mt-1 break-words">{event.notes}</p>
                        </li>
                    ))}
                </ol>
            </details>
        </Card>
    );
}
export default function Returns({
    role,
    returns,
    eligible,
    riders,
}: {
    role: string;
    returns: Pagination<ReturnRecord>;
    eligible: { id: number; store: { name: string } }[];
    riders: { id: number; name: string }[];
}) {
    return (
        <Page
            title="Returns and refunds"
            description="Admin decisions, Logistics return assignments, confirmed seller receipt and recorded manual refunds."
        >
            <Card>
                <p className="text-sm leading-relaxed">
                    This process covers one whole parcel per request. Admin reviews the request before transport. A return does not automatically
                    restore stock or pay a refund. Original delivery and COD history remain recorded separately.
                </p>
            </Card>
            {role === 'buyer' && !!eligible.length && (
                <RecordAction
                    title="Request a return"
                    description="Explain why you need to return the whole parcel. Wait for Admin approval and a Logistics return assignment; do not send it without instructions."
                    url="/returns"
                    fields={[
                        {
                            key: 'seller_order_id',
                            label: 'Delivered parcel',
                            type: 'select',
                            value: eligible.length === 1 ? String(eligible[0].id) : '',
                            options: eligible.map((parcel) => ({ value: String(parcel.id), label: `Parcel #${parcel.id} · ${parcel.store.name}` })),
                        },
                        { key: 'reason', label: 'Return reason (at least 10 characters)', type: 'textarea', maxLength: 2000 },
                    ]}
                />
            )}
            {returns.data.map((entry) => (
                <ReturnCard key={`${entry.id}-${entry.status}`} entry={entry} role={role} riders={riders} />
            ))}
            {!returns.data.length && (
                <Empty
                    title="No return requests"
                    description={
                        role === 'buyer'
                            ? 'Eligible delivered parcels can be requested here or from your order page.'
                            : 'Authorized return requests will appear here.'
                    }
                />
            )}
            <Pager links={returns.links} />
        </Page>
    );
}
