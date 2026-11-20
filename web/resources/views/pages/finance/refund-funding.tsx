import { FinanceNavigation, FinanceRecord, FinanceReference, FinanceTable } from '@/components/finance/finance-ui';
import { buttonClass, Card, money, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';
import RecordAction from '@/components/shared/record-action';
import { Plus } from 'lucide-react';

export default function RefundFunding({
    available,
    entries,
    liabilities,
    walletEntries,
    recoveries,
}: {
    available: number;
    liabilities: number;
    recoveries: Pagination<{
        id: number;
        seller_debit_cents: number;
        seller_recovered_cents: number;
        logistics_debit_cents: number;
        logistics_recovered_cents: number;
        seller_order: { store: { name: string }; delivery: { tracking_reference: string | null } };
    }>;
    walletEntries: Pagination<{
        id: number;
        type: string;
        amount_cents: number;
        reference: string;
        parcel_return_id: number | null;
        buyer: string;
        tracking_reference: string | null;
        created_at: string | null;
        uncorrected: number | boolean;
        liability_based: number | boolean;
        balance_cents: number;
    }>;
    entries: Pagination<{ id: number; type: string; amount_cents: number; reference: string; notes: string }>;
}) {
    return (
        <Page title="Refund funding" description="Manage refund backing, track outstanding liabilities, and record repayments.">
            <FinanceNavigation section="refunds" />
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <Card className="flex flex-col items-start gap-4">
                    <div>
                        <h2 className="text-muted-foreground text-sm font-medium">Available unallocated backing</h2>
                        <p className="mt-2 text-3xl font-semibold break-words tabular-nums">{money(available / 100)}</p>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">Actual funds earmarked for refunds and available for allocation.</p>
                    <RecordAction
                        forceDialog
                        title="Record platform advance"
                        triggerIcon={Plus}
                        triggerClassName={`${buttonClass} mt-auto w-full sm:w-auto`}
                        description="Confirm these funds are physically available, earmarked for refunds, and excluded from other commitments. Include the receipt or reserve reference and source evidence. This records funds; it does not transfer money."
                        url="/refund-funding"
                        values={{ source: 'platform_advance' }}
                        fields={[
                            { key: 'amount', label: 'Actual amount (PHP)', type: 'number', min: '0.01' },
                            { key: 'reference', label: 'Unique receipt / reserve reference' },
                            { key: 'notes', label: 'Funding evidence and source', type: 'textarea', maxLength: 1000 },
                        ]}
                    />
                </Card>
                <Card className="flex flex-col gap-4">
                    <div>
                        <h2 className="text-muted-foreground text-sm font-medium">Outstanding Lubos Coins liabilities</h2>
                        <p className="mt-2 text-3xl font-semibold break-words tabular-nums">{money(liabilities / 100)}</p>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Admin approval credits the buyer wallet immediately. Coin liabilities and transport obligations are not cash receipts.
                    </p>
                </Card>
            </div>
            <section aria-labelledby="funding-ledger-heading" className="min-w-0 space-y-4">
                <div>
                    <h2 id="funding-ledger-heading" className="text-lg font-semibold">
                        Funding ledger
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        Recorded cash backing and refund obligations. Open an entry to review its reference and evidence.
                    </p>
                </div>
                <FinanceTable label="Refund cash and obligation entries" headers={['Entry type', 'Amount', 'Reference']}>
                    {entries.data.map((entry) => (
                        <FinanceRecord
                            key={entry.id}
                            title={`Refund ledger entry #${entry.id}`}
                            cells={[
                                entry.type.replaceAll('_', ' '),
                                money(entry.amount_cents / 100),
                                <FinanceReference key="reference" value={entry.reference} />,
                            ]}
                        >
                            <h2 className="font-semibold">{entry.type.replaceAll('_', ' ')}</h2>
                            <p className="mt-2 tabular-nums">{money(entry.amount_cents / 100)}</p>
                            <p className="mt-2 text-sm break-all">{entry.reference}</p>
                            <p className="text-muted-foreground mt-2 text-sm">{entry.notes}</p>
                        </FinanceRecord>
                    ))}
                </FinanceTable>
                <Pager links={entries.links} />
            </section>
            <section aria-labelledby="refund-recovery-heading" className="min-w-0 space-y-4">
                <div>
                    <h2 id="refund-recovery-heading" className="text-lg font-semibold">
                        Refund recovery records
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        Recorded liabilities are not available cash. Select a return to record an actual repayment. Seller recovery is also limited by
                        the store's outstanding balance.
                    </p>
                </div>
                <FinanceTable
                    label="Refund recoveries"
                    headers={['Return / tracking', 'Shop', 'Seller liability remaining', 'Logistics liability remaining']}
                >
                    {recoveries.data.map((entry) => (
                        <FinanceRecord
                            key={entry.id}
                            title={'Refund recovery: ' + (entry.seller_order.delivery?.tracking_reference ?? 'Return #' + entry.id)}
                            cells={[
                                <FinanceReference key="tracking" value={entry.seller_order.delivery?.tracking_reference ?? 'Return #' + entry.id} />,
                                entry.seller_order.store.name,
                                money((entry.seller_debit_cents - entry.seller_recovered_cents) / 100),
                                money((entry.logistics_debit_cents - entry.logistics_recovered_cents) / 100),
                            ]}
                        >
                            {(['seller', 'logistics'] as const).map((party) => {
                                const remaining =
                                    party === 'seller'
                                        ? entry.seller_debit_cents - entry.seller_recovered_cents
                                        : entry.logistics_debit_cents - entry.logistics_recovered_cents;
                                return (
                                    remaining > 0 && (
                                        <RecordAction
                                            key={party}
                                            forceDialog
                                            title={'Record ' + party + ' repayment'}
                                            description="Confirm an actual repayment with receipt evidence. The server checks the remaining recoverable balance again. This does not transfer money."
                                            url="/refund-funding"
                                            values={{ source: party + '_recovery', parcel_return_id: String(entry.id) }}
                                            preview={
                                                <p className="rounded-xl border p-4 text-sm">
                                                    {entry.seller_order.store.name} · {entry.seller_order.delivery?.tracking_reference}
                                                    <br />
                                                    Remaining return liability: {money(remaining / 100)}. Actual repayment increases available refund
                                                    backing.
                                                </p>
                                            }
                                            fields={[
                                                {
                                                    key: 'amount',
                                                    label: 'Actual repayment (PHP)',
                                                    type: 'number',
                                                    min: '0.01',
                                                    max: (remaining / 100).toFixed(2),
                                                },
                                                { key: 'reference', label: 'Unique actual receipt reference' },
                                                { key: 'notes', label: 'Repayment evidence and source', type: 'textarea', maxLength: 1000 },
                                            ]}
                                        />
                                    )
                                );
                            })}
                        </FinanceRecord>
                    ))}
                </FinanceTable>
                <Pager links={recoveries.links} />
            </section>
            <section aria-labelledby="wallet-corrections-heading" className="min-w-0 space-y-4">
                <div>
                    <h2 id="wallet-corrections-heading" className="text-lg font-semibold">
                        Exceptional wallet corrections
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        Select a wallet entry only to correct a documented error. Original entries remain in the ledger.
                    </p>
                </div>
                <FinanceTable label="Wallet adjustment history" headers={['Wallet entry', 'Type', 'Amount', 'Reference']}>
                    {walletEntries.data.map((entry) => (
                        <FinanceRecord
                            key={entry.id}
                            title={`Wallet entry #${entry.id}`}
                            cells={[
                                entry.buyer + (entry.tracking_reference ? ' · ' + entry.tracking_reference : ''),
                                entry.type.replaceAll('_', ' '),
                                money(entry.amount_cents / 100),
                                <FinanceReference key="reference" value={entry.reference} />,
                            ]}
                        >
                            <p className="text-sm">
                                Wallet entry #{entry.id} / {entry.type} / {money(entry.amount_cents / 100)}
                            </p>
                            <p className="mt-2 text-xs break-all">{entry.reference}</p>
                            <p className="mt-2 text-sm">
                                Buyer: {entry.buyer}. Return: {entry.parcel_return_id ?? 'No linked return'}. Tracking:{' '}
                                {entry.tracking_reference ?? 'Unavailable'}.
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Recorded: {entry.created_at ? new Date(entry.created_at).toLocaleString('en-PH') : 'Historical timestamp unavailable'}
                                . Available coins: {money(entry.balance_cents / 100)} equivalent.
                            </p>
                            {!!entry.uncorrected &&
                            !!entry.parcel_return_id &&
                            ['approved_refund_credit', 'return_restoration', 'corrective_debit'].includes(entry.type) ? (
                                <RecordAction
                                    forceDialog
                                    title={entry.amount_cents < 0 ? 'Reverse this corrective debit' : 'Correct this refund credit'}
                                    description={
                                        entry.liability_based
                                            ? 'Exceptional correction only. The original entry stays unchanged. A debit requires available coins. This changes the coin liability and does not move cash or the reserve.'
                                            : 'Exceptional correction of a historical reserve-funded credit only. The original entry stays unchanged. A debit requires available coins; a restoration requires historical reserve backing.'
                                    }
                                    url="/wallet-adjustments"
                                    values={{ transaction_id: String(entry.id) }}
                                    preview={
                                        <p className="rounded-xl border p-4 text-sm">
                                            {entry.buyer} · {entry.tracking_reference ?? entry.reference}
                                            <br />
                                            Wallet impact: {money(-entry.amount_cents / 100)} equivalent.{' '}
                                            {entry.liability_based
                                                ? 'The coin liability changes by the same signed amount; cash reserve is unchanged.'
                                                : `Historical refund backing changes by ${money(entry.amount_cents / 100)}.`}
                                        </p>
                                    }
                                    fields={[{ key: 'reason', label: 'Correction evidence and reason', type: 'textarea', maxLength: 1000 }]}
                                />
                            ) : (
                                <p className="text-muted-foreground mt-3 text-sm">
                                    {entry.uncorrected
                                        ? 'This entry is not eligible for refund correction.'
                                        : 'A correction has already been recorded.'}
                                </p>
                            )}
                        </FinanceRecord>
                    ))}
                </FinanceTable>
                <Pager links={walletEntries.links} />
            </section>
        </Page>
    );
}
