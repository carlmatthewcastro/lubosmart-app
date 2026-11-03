import { Card, money, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';
import RecordAction from '@/components/shared/record-action';

type Cost = {
    id: number;
    incurred_on: string;
    category: string;
    description: string;
    amount_cents: number;
    voided_at: string | null;
    void_reason: string | null;
};
export default function SellerCosts({
    costs,
    totals,
    canRecord,
}: {
    costs: Pagination<Cost>;
    totals: { proceeds: number; refunds: number; costs: number; profit: number; paid: number; balance: number };
    canRecord: boolean;
}) {
    return (
        <Page
            title="Seller costs and profit"
            description="Completed proceeds, refund adjustments, recorded costs and actual settlements are shown separately."
        >
            <Card>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        ['Completed seller proceeds', totals.proceeds],
                        ['Seller refund deductions', totals.refunds],
                        ['Recorded costs', totals.costs],
                        ['Profit from recorded costs', totals.profit],
                        ['Actual recorded payouts', totals.paid],
                        ['Unsettled seller balance', totals.balance],
                    ].map(([label, cents]) => (
                        <div key={label}>
                            <p className="text-muted-foreground text-sm">{label}</p>
                            <p className="mt-2 text-xl font-semibold tabular-nums">{money(Number(cents) / 100)}</p>
                        </div>
                    ))}
                </div>
                <p className="text-muted-foreground mt-5 text-sm">
                    All-time figures. Profit = completed proceeds − seller refund deductions − valid recorded costs. Unsettled balance = proceeds −
                    refund deductions − actual payouts; a negative balance is owed back after refunds. Profit depends on complete cost entries and is
                    not a bank balance.
                </p>
            </Card>
            {canRecord && (
                <RecordAction
                    title="Record seller cost"
                    description="Record an actual cost for this store. If an entry is incorrect, void it with a reason and create a corrected entry; history is retained."
                    url="/seller/costs"
                    fields={[
                        { key: 'incurred_on', label: 'Cost date', type: 'date' },
                        {
                            key: 'category',
                            label: 'Cost category',
                            type: 'select',
                            options: ['goods', 'packaging', 'operations', 'other'].map((value) => ({ value, label: value })),
                        },
                        { key: 'description', label: 'Cost description', type: 'textarea' },
                        { key: 'amount', label: 'Cost (PHP)', type: 'number', min: '0.01', max: '99999999.99' },
                    ]}
                />
            )}
            <h2 className="text-lg font-semibold">Cost history</h2>
            {costs.data.map((cost) => (
                <Card key={cost.id}>
                    <h3 className="font-semibold">
                        {cost.category} · {cost.incurred_on.slice(0, 10)}
                    </h3>
                    <p className="mt-2 text-sm break-words">{cost.description}</p>
                    <p className="mt-3 font-semibold tabular-nums">{money(cost.amount_cents / 100)}</p>
                    {cost.voided_at ? (
                        <p className="text-muted-foreground mt-2 text-sm break-words">Voided: {cost.void_reason}</p>
                    ) : (
                        <RecordAction
                            title="Void cost"
                            description="This excludes the cost from the profit calculation while retaining the original entry. Confirm the entry and give a reason."
                            url={`/seller/costs/${cost.id}/void`}
                            fields={[{ key: 'reason', label: 'Reason for voiding', type: 'textarea' }]}
                        />
                    )}
                </Card>
            ))}
            {!costs.data.length && <Card>No seller costs recorded yet.</Card>}
            <Pager links={costs.links} />
        </Page>
    );
}
