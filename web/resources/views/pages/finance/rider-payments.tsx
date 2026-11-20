import { FinanceNavigation, FinanceRecord, FinanceReference, FinanceStatus, FinanceSummary, FinanceTable } from '@/components/finance/finance-ui';
import { Empty, money, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';
import ProgressStepper from '@/components/shared/progress-stepper';
import RecordAction from '@/components/shared/record-action';
import { DashboardMetric } from '@/components/workspace/dashboard-panels';
import { Banknote, ClipboardCheck, Wallet } from 'lucide-react';

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
    weekly,
}: {
    weekly: Pagination<{
        id: number;
        rider: { name: string };
        period_start: string;
        period_end: string;
        amount_cents: number;
        payment_date: string;
        paid_at: string | null;
        payment_reference: string | null;
    }>;
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
            <FinanceNavigation section="riders" />
            {role === 'rider' ? (
                <section aria-label="Task compensation summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <DashboardMetric
                        label="Recorded task fees"
                        value={money(totals.fees / 100)}
                        hint="All time; task fees only"
                        icon={ClipboardCheck}
                    />
                    <DashboardMetric
                        label="Recorded task payments"
                        value={money(totals.paid / 100)}
                        hint="All time; weekly compensation is separate"
                        icon={Banknote}
                    />
                    <DashboardMetric
                        label="Unpaid task fees"
                        value={money((Number(totals.fees) - Number(totals.paid)) / 100)}
                        hint="All time; excludes COD and shipping charges"
                        icon={Wallet}
                    />
                </section>
            ) : (
                <FinanceSummary
                    items={[
                        { label: 'Recorded task fees', cents: totals.fees, hint: 'All time / task fees only' },
                        { label: 'Recorded task payments', cents: totals.paid, hint: 'All time / separate from weekly compensation' },
                        { label: 'Unpaid task fees', cents: Number(totals.fees) - Number(totals.paid), hint: 'All time / COD is not income' },
                    ]}
                />
            )}
            <nav aria-label="Compensation sections" className="text-primary flex flex-wrap gap-3 text-sm">
                <a className="rounded-lg border px-3 py-2 underline underline-offset-4" href="#weekly-compensation">
                    Weekly compensation
                </a>
                <a className="rounded-lg border px-3 py-2 underline underline-offset-4" href="#payment-history">
                    Payment history
                </a>
                {role === 'logistics' && work && (
                    <a className="rounded-lg border px-3 py-2 underline underline-offset-4" href="#completed-work">
                        Completed work
                    </a>
                )}
            </nav>
            <h2 id="weekly-compensation" tabIndex={-1} className="scroll-mt-24 text-lg font-semibold">
                Weekly compensation
            </h2>
            {role === 'logistics' && (
                <RecordAction
                    triggerClassName="mt-0 w-fit"
                    title="Agree weekly compensation"
                    description="This opts the rider into a fixed seven-day period. Covered work cannot also receive parcel fees. Existing fees are preserved."
                    url="/rider-payments/weekly"
                    fields={[
                        { key: 'rider_id', label: 'Rider', type: 'select', options: riders.map((r) => ({ value: String(r.id), label: r.name })) },
                        { key: 'period_start', label: 'Period start', type: 'date' },
                        { key: 'amount', label: 'Weekly amount (PHP)', type: 'number', min: '0.01' },
                        { key: 'payment_date', label: 'Planned payment date', type: 'date' },
                        { key: 'notes', label: 'Notes (optional)', type: 'textarea', required: false },
                    ]}
                />
            )}
            {!!weekly?.data.length && (
                <FinanceTable
                    label="Weekly compensation agreements"
                    headers={['Rider', 'Compensation period', 'Agreed amount', 'Recorded payment', 'Outstanding', 'Status']}
                >
                    {weekly?.data.map((entry) => (
                        <FinanceRecord
                            key={entry.id}
                            title={`Weekly compensation: ${entry.rider.name}`}
                            cells={[
                                entry.rider.name,
                                entry.period_start.slice(0, 10) + ' to ' + entry.period_end.slice(0, 10),
                                money(entry.amount_cents / 100),
                                money(entry.paid_at ? entry.amount_cents / 100 : 0),
                                money(entry.paid_at ? 0 : entry.amount_cents / 100),
                                <FinanceStatus key="status">{entry.paid_at ? 'Payment recorded' : 'Awaiting payment'}</FinanceStatus>,
                            ]}
                        >
                            <h3 className="font-semibold">{entry.rider.name}</h3>
                            <p className="mt-2 text-sm">
                                {entry.period_start.slice(0, 10)} to {entry.period_end.slice(0, 10)}
                            </p>
                            <p className="my-3 font-semibold tabular-nums">{money(entry.amount_cents / 100)}</p>
                            <p className="text-sm">
                                {entry.paid_at ? 'Paid: ' + entry.payment_reference : 'Awaiting payment: ' + entry.payment_date.slice(0, 10)}
                            </p>
                            {entry.paid_at && (
                                <p className="text-muted-foreground text-sm">Payment recorded on {new Date(entry.paid_at).toLocaleString('en-PH')}</p>
                            )}
                            {role === 'logistics' && !entry.paid_at && (
                                <RecordAction
                                    title="Record weekly payment"
                                    description={`Confirm ${money(entry.amount_cents / 100)} was paid to ${entry.rider.name} for ${entry.period_start.slice(0, 10)} to ${entry.period_end.slice(0, 10)}. This records an actual payment and cannot be repeated.`}
                                    url={'/rider-payments/weekly/' + entry.id + '/pay'}
                                    fields={[{ key: 'payment_reference', label: 'Actual payment reference' }]}
                                />
                            )}
                        </FinanceRecord>
                    ))}
                </FinanceTable>
            )}
            {!weekly?.data.length && (
                <Empty
                    title="No weekly compensation recorded"
                    description="Weekly agreements and their recorded payments will appear here when Logistics records them."
                />
            )}
            {weekly && <Pager links={weekly.links} />}
            <h2 id="payment-history" tabIndex={-1} className="scroll-mt-24 text-lg font-semibold">
                Fee and payment history
            </h2>
            {!!entries.data.length && (
                <FinanceTable label="Recorded financial entries" headers={['Rider / delivery', 'Work type', 'Recorded fee', 'Payment status']}>
                    {entries.data.map((entry) => (
                        <FinanceRecord
                            key={entry.id}
                            title={`Rider fee: ${entry.rider.name}, Delivery #${entry.delivery_id}`}
                            cells={[
                                entry.rider.name + ' / Delivery #' + entry.delivery_id,
                                entry.leg.replaceAll('_', ' '),
                                money(entry.amount_cents / 100),
                                <FinanceStatus key="status">{entry.paid_at ? 'Payment recorded' : 'Awaiting payment'}</FinanceStatus>,
                            ]}
                        >
                            <h3 className="font-semibold">
                                {entry.rider.name} · Delivery #{entry.delivery_id} · {entry.leg}
                            </h3>
                            <ProgressStepper
                                layout="vertical"
                                variant="detailed"
                                label="Rider payment progress"
                                className="my-4"
                                stages={[
                                    { id: 'fee', label: 'Fee recorded', icon: ClipboardCheck, state: 'completed' },
                                    {
                                        id: 'payment',
                                        label: entry.paid_at ? 'Payment recorded' : 'Awaiting payment',
                                        icon: Banknote,
                                        state: entry.paid_at ? 'completed' : 'current',
                                        timestamp: entry.paid_at,
                                    },
                                ]}
                            />
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
                                    description={`Confirm Logistics has paid ${entry.rider.name} ${money(entry.amount_cents / 100)} for Delivery #${entry.delivery_id}. The fee amount is retained and this action cannot be repeated.`}
                                    url={`/rider-payments/${entry.id}/pay`}
                                    fields={[{ key: 'payment_reference', label: 'Actual payment reference', maxLength: 100 }]}
                                />
                            )}
                        </FinanceRecord>
                    ))}
                </FinanceTable>
            )}
            {!entries.data.length && (
                <Empty
                    title="No task fees recorded"
                    description="Eligible completed work and its recorded task payments will appear here. COD collections are separate."
                />
            )}
            <Pager links={entries.links} />
            {role === 'logistics' && work && (
                <>
                    <h2 id="completed-work" tabIndex={-1} className="scroll-mt-24 text-lg font-semibold">
                        Completed work available for fee recording
                    </h2>
                    <FinanceTable label="Completed work" headers={['Parcel', 'Delivery', 'Tracking reference', 'Fee recording']}>
                        {work.data.map((delivery) => (
                            <FinanceRecord
                                key={delivery.id}
                                title={`Completed work: Delivery #${delivery.id}`}
                                cells={[
                                    'Parcel #' + delivery.seller_order_id,
                                    'Delivery #' + delivery.id,
                                    <FinanceReference key="reference" value={delivery.tracking_reference} />,
                                    'Subject to existing eligibility checks',
                                ]}
                            >
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
                                                { value: 'return_collection', label: 'Return collection from buyer' },
                                            ],
                                        },
                                        { key: 'amount', label: 'Agreed fee (PHP)', type: 'number', min: '0.01', max: '999999.99' },
                                        { key: 'notes', label: 'Fee agreement / reason', type: 'textarea' },
                                    ]}
                                />
                            </FinanceRecord>
                        ))}
                    </FinanceTable>
                    <Pager links={work.links} />
                </>
            )}
        </Page>
    );
}
