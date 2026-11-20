import { FinanceNavigation, FinanceRecord, FinanceStatus, FinanceTable } from '@/components/finance/finance-ui';
import { Card, Empty, money, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';
import ProgressStepper from '@/components/shared/progress-stepper';
import RecordAction from '@/components/shared/record-action';
import { Banknote, ShieldCheck } from 'lucide-react';

type Parcel = {
    tracking_reference: string | null;
    platform_receipt: string | null;
    funded: boolean;
    breakdown?: Record<string, number>;
    id: number;
    store: string;
    amount_cents: number;
    can_pay: boolean;
    hold_reason: string | null;
    payout: { amount_cents: number; reference: string; created_at: string | null } | null;
};
export default function Settlements({ role, parcels }: { role: string; parcels: Pagination<Parcel> }) {
    return (
        <Page
            title="Seller settlements"
            description="Actual manual seller payments after verified COD reconciliation. Rider payments belong to Logistics."
        >
            {role !== 'admin' && <FinanceNavigation section="settlements" />}
            <Card>
                <p className="text-sm leading-relaxed">
                    Sales and proceeds are accounting figures. A payout appears here only after Admin records an actual payment with its reference.
                    Open returns hold new payouts. Refunds after a payout may create a seller balance owed back; see the seller cost/profit ledger.
                </p>
            </Card>
            <FinanceTable
                label="Seller settlement eligibility"
                headers={['Parcel', 'Store', 'Remaining proceeds / recorded payout', 'Eligibility / hold']}
            >
                {parcels.data.map((parcel) => (
                    <FinanceRecord
                        key={parcel.id}
                        title={`Parcel #${parcel.id}`}
                        cells={[
                            parcel.tracking_reference ?? 'Parcel #' + parcel.id,
                            parcel.store,
                            money((parcel.payout?.amount_cents ?? parcel.amount_cents) / 100),
                            <div key="status">
                                <FinanceStatus>{parcel.payout ? 'Payout recorded' : parcel.can_pay ? 'Eligible' : 'Payout held'}</FinanceStatus>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {parcel.hold_reason ?? (parcel.can_pay ? 'Eligible for a recorded manual payout' : '')}
                                </p>
                            </div>,
                        ]}
                    >
                        <h2 className="text-lg font-semibold">
                            Parcel #{parcel.id} · {parcel.store}
                        </h2>
                        <p className="text-muted-foreground text-sm break-words">Tracking: {parcel.tracking_reference ?? 'Unavailable'}</p>
                        <p className="text-sm">
                            Platform funding:{' '}
                            {parcel.platform_receipt
                                ? 'Product cash received on ' + parcel.platform_receipt
                                : parcel.funded
                                  ? 'Covered by allocated Lubos Coins; no product cash receipt required'
                                  : 'Awaiting confirmed product cash receipt or coin backing'}
                        </p>
                        {parcel.breakdown && (
                            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                                {Object.entries(parcel.breakdown).map(([label, cents]) => (
                                    <div key={label}>
                                        <dt className="text-muted-foreground text-xs">{label.replaceAll('_cents', '').replaceAll('_', ' ')}</dt>
                                        <dd className="mt-1 text-sm tabular-nums">{money(cents / 100)}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                        <ProgressStepper
                            layout="vertical"
                            variant="detailed"
                            label="Seller payout progress"
                            className="my-4"
                            stages={[
                                {
                                    id: 'eligibility',
                                    label: parcel.payout || parcel.can_pay ? 'Eligible' : 'Payout held',
                                    icon: ShieldCheck,
                                    state: parcel.payout || parcel.can_pay ? 'completed' : 'current',
                                    description: parcel.hold_reason ?? undefined,
                                },
                                {
                                    id: 'payout',
                                    label: parcel.payout ? 'Payout recorded' : 'Awaiting payout',
                                    icon: Banknote,
                                    state: parcel.payout ? 'completed' : parcel.can_pay ? 'current' : 'pending',
                                    timestamp: parcel.payout?.created_at,
                                },
                            ]}
                        />
                        <p className="mt-3 text-sm tabular-nums">
                            {parcel.payout
                                ? `Recorded payout: ${money(parcel.payout.amount_cents / 100)}`
                                : `Remaining seller proceeds: ${money(parcel.amount_cents / 100)}`}
                        </p>
                        {parcel.payout ? (
                            <p className="text-muted-foreground mt-2 text-sm break-all">
                                Reference: {parcel.payout.reference} ·{' '}
                                {parcel.payout.created_at
                                    ? new Date(parcel.payout.created_at).toLocaleString('en-PH')
                                    : 'Historical timestamp unavailable'}
                            </p>
                        ) : (
                            <p role="status" className="text-muted-foreground mt-2 text-sm">
                                {parcel.hold_reason ?? 'Eligible for a recorded manual payout'}
                            </p>
                        )}
                        {role === 'admin' && parcel.can_pay && (
                            <RecordAction
                                forceDialog
                                title="Record seller payout"
                                description={`Confirm you have actually paid ${money(parcel.amount_cents / 100)} to ${parcel.store} for Parcel #${parcel.id}. This records the full remaining settlement and does not send a bank transfer.`}
                                url={`/settlements/${parcel.id}`}
                                preview={
                                    <p className="rounded-xl border p-4 text-sm">
                                        {parcel.store} · {parcel.tracking_reference ?? 'Tracking unavailable'}
                                        <br />
                                        Net payable: {money(parcel.amount_cents / 100)}
                                    </p>
                                }
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
                    </FinanceRecord>
                ))}
            </FinanceTable>
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
