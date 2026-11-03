import { Card, Empty, money, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';
import RecordAction from '@/components/shared/record-action';

type Parcel = {
    id: number;
    store: string;
    amount_cents: number;
    can_pay: boolean;
    hold_reason: string | null;
    payout: { amount_cents: number; reference: string; created_at: string } | null;
};
export default function Settlements({ role, parcels }: { role: string; parcels: Pagination<Parcel> }) {
    return (
        <Page
            title="Seller settlements"
            description="Actual manual seller payments after verified COD reconciliation. Rider payments belong to Logistics."
        >
            <Card>
                <p className="text-sm leading-relaxed">
                    Sales and proceeds are accounting figures. A payout appears here only after Admin records an actual payment with its reference.
                    Open returns hold new payouts. Refunds after a payout may create a seller balance owed back; see the seller cost/profit ledger.
                </p>
            </Card>
            {parcels.data.map((parcel) => (
                <Card key={parcel.id}>
                    <h2 className="text-lg font-semibold">
                        Parcel #{parcel.id} · {parcel.store}
                    </h2>
                    <p className="mt-3 text-sm tabular-nums">
                        {parcel.payout
                            ? `Recorded payout: ${money(parcel.payout.amount_cents / 100)}`
                            : `Remaining seller proceeds: ${money(parcel.amount_cents / 100)}`}
                    </p>
                    {parcel.payout ? (
                        <p className="text-muted-foreground mt-2 text-sm break-all">
                            Reference: {parcel.payout.reference} · {new Date(parcel.payout.created_at).toLocaleString()}
                        </p>
                    ) : (
                        <p role="status" className="text-muted-foreground mt-2 text-sm">
                            {parcel.hold_reason ?? 'Eligible for a recorded manual payout'}
                        </p>
                    )}
                    {role === 'admin' && parcel.can_pay && (
                        <RecordAction
                            title="Record seller payout"
                            description={`Confirm you have actually paid ${money(parcel.amount_cents / 100)} to this seller. This records the full remaining settlement and does not send a bank transfer.`}
                            url={`/settlements/${parcel.id}`}
                            fields={[
                                {
                                    key: 'amount',
                                    label: 'Actual amount paid (PHP)',
                                    type: 'number',
                                    value: (parcel.amount_cents / 100).toFixed(2),
                                    min: '0.01',
                                    max: '99999999.99',
                                },
                                { key: 'reference', label: 'Unique payment reference', maxLength: 100 },
                                { key: 'notes', label: 'Payment notes (optional)', type: 'textarea', required: false },
                            ]}
                        />
                    )}
                </Card>
            ))}
            {!parcels.data.length && (
                <Empty
                    title="No completed parcels"
                    description="Seller settlement records appear after delivery. COD must be fully reconciled before payout."
                />
            )}
            <Pager links={parcels.links} />
        </Page>
    );
}
