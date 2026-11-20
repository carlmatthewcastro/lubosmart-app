import {
    FinanceExplanation,
    FinanceNavigation,
    FinanceRecord,
    FinanceReference,
    FinanceStatus,
    FinanceSummary,
    FinanceTable,
} from '@/components/finance/finance-ui';
import ActivityTimeline from '@/components/shared/activity-timeline';
import { buttonClass, Card, Field, money, Page, Pager, type Pagination, secondaryClass, Select } from '@/components/shared/marketplace-ui';
import { Link, useForm, usePage } from '@inertiajs/react';

export default function Finance({
    role,
    amounts,
    discrepancies,
    legacy_rates,
    filters = {},
    transactions,
}: {
    transactions: Pagination<{
        placed_at?: string;
        store: string;
        logistics: string | null;
        status_label: string;
        status_description: string;
        timeline: { label: string; at: string | null; complete: boolean; party: string | null }[];
        parcel_id: number;
        tracking_reference: string | null;
        cash_status: string | null;
        expected_cash_cents: number;
        collected_cents: number | null;
        received_cents: number | null;
        platform_received_cents: number | null;
        paid_cents: number | null;
        collection_reference: string | null;
        handover_reference: string | null;
        remittance_reference: string | null;
        payout_reference: string | null;
    }>;
    filters?: { from?: string; to?: string; cash_status?: string; reference?: string };
    role: string;
    amounts: Record<string, number>;
    discrepancies: number;
    legacy_rates: number;
}) {
    const form = useForm({
        from: filters.from ?? '',
        to: filters.to ?? '',
        cash_status: filters.cash_status ?? '',
        reference: filters.reference ?? '',
    });

    const tab = new URLSearchParams(usePage().url.split('?')[1] ?? '').get('tab') === 'transactions' ? 'transactions' : 'overview';
    const groups = [
        [
            'Cash custody and reconciliation',
            [
                'Expected COD',
                'COD collected',
                'Cash received by Logistics',
                'Awaiting Logistics cash receipt',
                'Awaiting Admin reconciliation',
                'COD reconciled',
                'Product cash received by Platform',
                'Cash held by Logistics',
                'Awaiting COD collection',
            ],
        ],
        ['Shipping allocations', ['Shipping allocations', 'Shipping refunds']],
        [
            'Sales, commission and proceeds',
            [
                'Gross product sales',
                'Seller voucher discounts',
                'Net product sales',
                'Expected commission',
                'Recognized commission',
                'Reconciled commission',
                'Commission backed by platform cash receipt',
                'Commission backed by coin funding',
                'Commission backed by platform funding',
                'Commission reversals',
                'Seller proceeds',
                'Manual seller payouts',
                'Unsettled seller balance',
                'Seller payable balances before payout holds',
            ],
        ],
        [
            'Rider compensation / all time',
            [
                'Weekly compensation agreed',
                'Weekly compensation paid',
                'Weekly compensation outstanding',
                'Rider fees earned',
                'Rider fees paid',
                'Rider fees outstanding',
            ],
        ],
        [
            'Refunds and recoveries',
            [
                'Seller refund deductions',
                'Manual buyer refunds',
                'Approved refund value',
                'Pending approved refund offers',
                'Seller recovery receipts',
                'Seller recovery balance',
                'Logistics refund liabilities',
                'Logistics recovery receipts',
            ],
        ],
        [
            'Costs, coins and funding',
            [
                'Recorded operating costs',
                'Estimated profit after recorded costs',
                'Lubos Coins redeemed',
                'Lubos Coins refunded',
                'Outstanding coin liabilities',
                'Available refund reserve',
            ],
        ],
    ] as const;
    const highlights =
        role === 'logistics'
            ? ['COD collected', 'Cash received by Logistics', 'Shipping allocations', 'Rider fees outstanding']
            : role === 'rider'
              ? ['Rider fees earned', 'Rider fees paid', 'Rider fees outstanding', 'Weekly compensation outstanding']
              : role === 'seller'
                ? ['Seller proceeds', 'Manual seller payouts', 'Unsettled seller balance', 'Seller refund deductions']
                : ['COD collected', 'Product cash received by Platform', 'Seller payable balances before payout holds', 'Manual seller payouts'];
    const present = (keys: readonly string[]) => keys.filter((key) => Object.hasOwn(amounts, key));
    return (
        <Page
            title={role === 'logistics' || role === 'admin' ? 'Finance Center' : role === 'seller' ? 'Financial workspace' : 'My finance overview'}
            description="Recorded financial amounts for your authorized records. Order-date filters apply to parcel figures."
        >
            <FinanceNavigation section={tab} />
            <Card className="!p-4">
                <form
                    className="grid min-w-0 items-end gap-4 sm:grid-cols-2 xl:grid-cols-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.get(tab === 'transactions' ? '/finance?tab=transactions' : '/finance', { preserveState: true, preserveScroll: true });
                    }}
                >
                    <Field
                        reserveFeedback={false}
                        label="Order creation from"
                        type="date"
                        value={form.data.from}
                        onChange={(e) => form.setData('from', e.target.value)}
                        error={form.errors.from}
                    />
                    <Field
                        reserveFeedback={false}
                        label="Order creation to"
                        type="date"
                        value={form.data.to}
                        onChange={(e) => form.setData('to', e.target.value)}
                        error={form.errors.to}
                    />
                    <Select
                        reserveFeedback={false}
                        label="Cash status"
                        value={form.data.cash_status}
                        onChange={(e) => form.setData('cash_status', e.target.value)}
                    >
                        <option value="">All cash states</option>
                        <option value="collected">Collected</option>
                        <option value="handed_over">Received by Logistics</option>
                        <option value="reconciled">Reconciled</option>
                    </Select>
                    <Field
                        reserveFeedback={false}
                        label="Exact transaction / tracking reference"
                        value={form.data.reference}
                        onChange={(e) => form.setData('reference', e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                        <button className={buttonClass} disabled={form.processing}>
                            {form.processing ? 'Applying...' : 'Apply filters'}
                        </button>
                        <Link className={secondaryClass} href={tab === 'transactions' ? '/finance?tab=transactions' : '/finance'}>
                            Reset
                        </Link>
                    </div>
                </form>
            </Card>
            {tab === 'overview' && (
                <>
                    <FinanceSummary
                        items={present(highlights).map((label) => ({
                            label,
                            cents: amounts[label],
                            hint:
                                label === 'Seller payable balances before payout holds'
                                    ? 'Accounting balance; eligibility checks still apply'
                                    : /Rider fees|Weekly/.test(label)
                                      ? 'All time / separate from COD custody'
                                      : 'Recorded amount / stages may overlap',
                        }))}
                    />
                    <Card className="!p-4">
                        <h2 className="text-lg font-semibold">Financial attention</h2>
                        <p className="mt-2 text-sm">
                            Cash discrepancies: {discrepancies}. Uncancelled parcels missing a historical commission rate: {legacy_rates}.
                        </p>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Missing historical rates are excluded from expected commission. Review existing cash and settlement records before
                            confirming financial actions.
                        </p>
                    </Card>
                    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
                        {groups.map(
                            ([title, keys]) =>
                                present(keys).length > 0 && (
                                    <Card key={title} className="!p-4">
                                        <h2 className="text-lg font-semibold">{title}</h2>
                                        <dl className="mt-3 divide-y">
                                            {present(keys).map((key) => (
                                                <div key={key} className="flex min-w-0 flex-wrap justify-between gap-2 py-3">
                                                    <dt className="text-muted-foreground text-sm">{key}</dt>
                                                    <dd className="font-semibold tabular-nums">{money(amounts[key] / 100)}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                        {title === 'Refunds and recoveries' && role === 'logistics' && (
                                            <p className="text-muted-foreground mt-2 text-xs">
                                                Logistics liabilities and recovery receipts are all time.
                                            </p>
                                        )}
                                        {title === 'Costs, coins and funding' && (
                                            <p className="text-muted-foreground mt-2 text-xs">
                                                Operating costs and profit use all-time recorded costs. Wallet liabilities and refund reserve are
                                                current balances.
                                            </p>
                                        )}
                                    </Card>
                                ),
                        )}
                    </div>
                </>
            )}
            <FinanceExplanation title="How to read these figures">
                <p>
                    Collected COD is cash custody, not rider income. COD reconciliation verifies cash received by Logistics; platform receipt requires
                    a separately confirmed product remittance. Logistics retains its shipping allocation.
                </p>
                <p>
                    Expected, recognized and reconciled commission overlap; do not add them together. Unsettled proceeds and balances before holds are
                    not immediately eligible payouts. Recorded profit depends on complete cost entries.
                </p>
                <p>
                    Weekly compensation and task fees are separate ledgers. Historical shipping refunds without a stored split are excluded from the
                    shipping-refund total. These records do not initiate money transfers.
                </p>
            </FinanceExplanation>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Transaction history</h2>
                <p className="text-muted-foreground text-sm">Parcel records / order creation dates</p>
            </div>
            {transactions.data.length ? (
                <FinanceTable
                    label="Financial transaction references"
                    headers={['Parcel / tracking', 'Expected cash', 'Collected', 'Received by Logistics', 'Cash status', 'Order created']}
                >
                    {transactions.data.map((entry) => (
                        <FinanceRecord
                            key={entry.parcel_id}
                            title={entry.tracking_reference ?? 'Parcel #' + entry.parcel_id}
                            cells={[
                                <div key="reference">
                                    {entry.store}
                                    <div className="mt-1">
                                        <FinanceReference value={entry.tracking_reference} />
                                    </div>
                                    <p className="text-muted-foreground mt-1 text-xs">Parcel #{entry.parcel_id}</p>
                                </div>,
                                money(entry.expected_cash_cents / 100),
                                entry.collected_cents === null ? 'Not recorded' : money(entry.collected_cents / 100),
                                entry.received_cents === null ? 'Not recorded' : money(entry.received_cents / 100),
                                <FinanceStatus key="status">{entry.status_label}</FinanceStatus>,
                                entry.placed_at ? new Date(entry.placed_at).toLocaleString('en-PH') : 'Not recorded',
                            ]}
                        >
                            <p className="font-medium">
                                {entry.store}
                                {entry.logistics ? ' · ' + entry.logistics : ''}
                            </p>
                            <p className="text-muted-foreground text-sm">{entry.status_description}</p>
                            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2">
                                <div className="min-w-0 space-y-4">
                                    <section className="bg-accent/60 min-w-0 rounded-xl border p-4">
                                        <h3 className="mb-4 font-semibold">Financial breakdown</h3>
                                        <p className="text-muted-foreground mb-4 text-xs">
                                            Expected cash is the amount due. Collected and received amounts are separately recorded evidence.
                                        </p>
                                        <dl className="divide-y text-sm">
                                            {[
                                                ['Expected cash', entry.expected_cash_cents],
                                                ['Collected', entry.collected_cents],
                                                ['Received by Logistics', entry.received_cents],
                                                ...(role !== 'rider' ? [['Product cash received by Platform', entry.platform_received_cents]] : []),
                                                ...(['admin', 'seller'].includes(role) ? [['Paid to seller', entry.paid_cents]] : []),
                                            ].map(([label, value]) => (
                                                <div key={label} className="flex justify-between gap-4 py-3">
                                                    <dt className="text-muted-foreground text-sm">{label}</dt>
                                                    <dd className="shrink-0 text-right font-semibold tabular-nums">
                                                        {value === null ? 'Not recorded' : money(Number(value) / 100)}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </section>
                                    <section className="min-w-0 rounded-xl border p-4">
                                        <h3 className="mb-4 font-semibold">Transaction references</h3>{' '}
                                        <dl className="space-y-3">
                                            {[
                                                ['Tracking reference', entry.tracking_reference],
                                                ['Collection reference', entry.collection_reference],
                                                ['Handover reference', entry.handover_reference],
                                                ...(role !== 'rider' ? [['Product remittance reference', entry.remittance_reference]] : []),
                                                ...(['admin', 'seller'].includes(role) ? [['Payout reference', entry.payout_reference]] : []),
                                            ].map(([label, value]) => (
                                                <div key={label}>
                                                    <dt className="text-muted-foreground text-sm">{label}</dt>
                                                    <dd className="mt-1 text-sm break-all">{value ?? 'Not recorded'}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </section>
                                </div>
                                <section className="bg-accent/35 min-w-0 rounded-xl border p-4">
                                    <h3 className="mb-4 font-semibold">COD progress</h3>{' '}
                                    <ActivityTimeline
                                        label="Financial transaction timeline"
                                        entries={entry.timeline.map((step, index) => ({
                                            id: index,
                                            label: step.label,
                                            at: step.at,
                                            state: step.complete ? 'completed' : 'pending',
                                            content: step.party ?? 'Responsible party not recorded',
                                        }))}
                                    />
                                </section>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                References are recorded evidence. They do not independently establish completion of every financial stage.
                            </p>
                        </FinanceRecord>
                    ))}
                </FinanceTable>
            ) : (
                <Card>
                    <p className="font-semibold">No matching transaction references</p>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Records appear within your authorized scope. Reset filters to check for other records.
                    </p>
                </Card>
            )}
            <Pager links={transactions.links} />
        </Page>
    );
}
