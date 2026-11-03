import { Card, Empty, money, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';
import RecordAction from '@/components/shared/record-action';

type Payment = {
    id: number;
    delivery_id: number;
    rider: { name: string };
    leg: string;
    amount_cents: number;
    notes: string;
    paid_at: string | null;
    payment_reference: string | null;
};
export default function RiderPayments({
    role,
    entries,
    totals,
    riders,
    work,
}: {
    role: string;
    entries: Pagination<Payment>;
    totals: { fees: number; paid: number };
    riders: { id: number; name: string }[];
    work: Pagination<{ id: number; tracking_reference: string; seller_order_id: number }> | null;
}) {
    return (
        <Page
            title={role === 'rider' ? 'My earnings and payments' : 'Rider fees and payments'}
            description="Logistics handles rider compensation. COD collections and shipping charges are not rider wages."
        >
            <Card>
                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        ['Recorded fees', totals.fees],
                        ['Recorded payments', totals.paid],
                        ['Unpaid fees', Number(totals.fees) - Number(totals.paid)],
                    ].map(([label, cents]) => (
                        <div key={label}>
                            <p className="text-muted-foreground text-sm">{label}</p>
                            <p className="mt-2 text-xl font-semibold tabular-nums">{money(Number(cents) / 100)}</p>
                        </div>
                    ))}
                </div>
            </Card>
            <h2 className="text-lg font-semibold">Fee and payment history</h2>
            {entries.data.map((entry) => (
                <Card key={entry.id}>
                    <h3 className="font-semibold">
                        {entry.rider.name} · Delivery #{entry.delivery_id} · {entry.leg}
                    </h3>
                    <p className="mt-3 text-lg font-semibold tabular-nums">{money(entry.amount_cents / 100)}</p>
                    <p className="text-muted-foreground mt-2 text-sm break-words">{entry.notes}</p>
                    <p role="status" className="mt-3 text-sm">
                        {entry.paid_at
                            ? `Paid: ${new Date(entry.paid_at).toLocaleString()} · ${entry.payment_reference}`
                            : 'Fee recorded; payment not yet recorded'}
                    </p>
                    {role === 'logistics' && !entry.paid_at && (
                        <RecordAction
                            title="Record rider payment"
                            description={`Confirm Logistics has paid this rider ${money(entry.amount_cents / 100)}. The fee amount is retained and this action cannot be repeated.`}
                            url={`/rider-payments/${entry.id}/pay`}
                            fields={[{ key: 'payment_reference', label: 'Actual payment reference', maxLength: 100 }]}
                        />
                    )}
                </Card>
            ))}
            {!entries.data.length && (
                <Empty
                    title="No rider fees recorded"
                    description="Logistics records agreed fees after the corresponding pickup, delivery or return work is completed."
                />
            )}
            <Pager links={entries.links} />
            {role === 'logistics' && work && (
                <>
                    <h2 className="text-lg font-semibold">Completed work available for fee recording</h2>
                    {work.data.map((delivery) => (
                        <Card key={delivery.id}>
                            <h3 className="font-semibold break-all">{delivery.tracking_reference ?? `Delivery #${delivery.id}`}</h3>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Delivery #{delivery.id} / Parcel #{delivery.seller_order_id}
                            </p>
                            <RecordAction
                                title="Record rider fee"
                                description="Choose the rider who actually completed this parcel leg and enter the agreed fee. One fee record is permitted for each rider and parcel leg. COD is separate."
                                url="/rider-payments"
                                fields={[
                                    { key: 'delivery_id', label: 'Delivery ID', type: 'number', value: String(delivery.id), min: '1' },
                                    {
                                        key: 'rider_id',
                                        label: 'Rider',
                                        type: 'select',
                                        options: riders.map((rider) => ({ value: String(rider.id), label: rider.name })),
                                    },
                                    {
                                        key: 'leg',
                                        label: 'Completed work',
                                        type: 'select',
                                        options: [
                                            { value: 'pickup', label: 'Pickup' },
                                            { value: 'delivery', label: 'Delivery' },
                                            { value: 'return', label: 'Return to seller' },
                                        ],
                                    },
                                    { key: 'amount', label: 'Agreed fee (PHP)', type: 'number', min: '0.01', max: '999999.99' },
                                    { key: 'notes', label: 'Fee agreement / reason', type: 'textarea' },
                                ]}
                            />
                        </Card>
                    ))}
                    <Pager links={work.links} />
                </>
            )}
        </Page>
    );
}
