import {
    FinanceExplanation,
    FinanceNavigation,
    FinanceRecord,
    FinanceReference,
    FinanceStatus,
    FinanceSummary,
    FinanceTable,
} from '@/components/finance/finance-ui';
import { Empty, money, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';
import ProgressStepper from '@/components/shared/progress-stepper';
import RecordAction from '@/components/shared/record-action';
import { Banknote, ShieldCheck } from 'lucide-react';

type Entry = {
    parcel_id: number;
    delivery_id: number;
    can_submit: boolean;
    can_reconcile: boolean;
    handover: { amount_cents: number; reference: string; submitted_at: string; submitted_by: number } | null;
    logistics_name: string;
    tracking_reference: string | null;
    allocation_cents: number;
    shipping_refund_cents: number | null;
    status: 'cod_reconciled' | 'awaiting_cod_reconciliation' | 'coin_funded_shipping_retained';
    can_record: boolean;
    product_remittance_cents: number;
    reconciled_at: string | null;
    remittance: {
        amount_cents: number;
        reference: string;
        external_reference: string | null;
        received_on: string;
        recorded_at: string | null;
        recorded_by: number;
        notes: string | null;
    } | null;
};

export default function LogisticsSettlements({
    entries,
    totals,
    can_record,
    can_submit,
    can_reconcile,
}: {
    entries: Pagination<Entry>;
    totals: {
        allocated_cents: number;
        reconciled_cents: number;
        pending_cents: number;
        shipping_refund_cents: number;
        retained_cents: number;
        product_remittances_cents: number;
    };
    can_record: boolean;
    can_submit: boolean;
    can_reconcile: boolean;
}) {
    return (
        <Page
            title="Logistics cash handovers"
            description="Logistics submits product cash to Admin and retains the parcel’s original shipping fee. Admin confirms actual receipt."
        >
            <FinanceNavigation section="shipping" />
            <p className="text-muted-foreground text-sm">
                {can_submit
                    ? 'Open View details for a parcel, then choose Hand over cash to Admin after the full rider cash receipt is confirmed.'
                    : 'Open View details to review a Logistics handover, verify COD reconciliation, and confirm the cash you physically received.'}
            </p>
            <FinanceSummary
                items={[
                    { label: 'Original shipping allocations', cents: totals.allocated_cents },
                    { label: 'COD reconciled allocations', cents: totals.reconciled_cents },
                    { label: 'Recorded shipping refunds', cents: totals.shipping_refund_cents },
                    { label: 'Shipping retained with recorded product remittance', cents: totals.retained_cents },
                ]}
            />
            <FinanceExplanation title="Shipping entitlement and cash custody">
                <p>
                    Logistics retains its assigned shipping allocation and remits the appropriate product amount. These allocations are not additional
                    payments owed by the platform. Rider compensation is separate.
                </p>
                <p className="tabular-nums">
                    Awaiting COD reconciliation: {money(totals.pending_cents / 100)}. Product cash received by platform:{' '}
                    {money(totals.product_remittances_cents / 100)}.
                </p>
                <p>
                    COD reconciliation confirms rider cash received by Logistics. Only an actual platform receipt record confirms product cash
                    received. COD reconciliation alone does not establish product remittance.
                </p>
                <p>
                    Shipping refunds are adjustments for review, not automatic Logistics liability. Historical refunds without an explicit split are
                    excluded.
                </p>
            </FinanceExplanation>
            <FinanceTable
                label="Recorded financial entries"
                headers={['Parcel / tracking', 'Logistics', 'Shipping allocation', 'COD status', 'Platform receipt']}
            >
                {entries.data.map((entry) => (
                    <FinanceRecord
                        key={entry.parcel_id}
                        title={`Parcel #${entry.parcel_id}`}
                        cells={[
                            <div key="parcel">
                                Parcel #{entry.parcel_id}
                                <div className="mt-1">
                                    <FinanceReference value={entry.tracking_reference} />
                                </div>
                            </div>,
                            entry.logistics_name,
                            money(entry.allocation_cents / 100),
                            <FinanceStatus key="cod">
                                {entry.status !== 'awaiting_cod_reconciliation' ? 'Reconciled' : 'Awaiting reconciliation'}
                            </FinanceStatus>,
                            <div key="receipt">
                                {entry.remittance ? (
                                    <>
                                        Confirmed: {entry.remittance.received_on}
                                        <div className="mt-1">
                                            <FinanceReference value={entry.remittance.reference} />
                                        </div>
                                    </>
                                ) : entry.product_remittance_cents === 0 ? (
                                    'Coin funded; no product cash due'
                                ) : entry.handover ? (
                                    'Submitted to Admin; awaiting receipt confirmation'
                                ) : (
                                    'Awaiting Logistics cash handover'
                                )}
                            </div>,
                        ]}
                    >
                        <h2 className="text-lg font-semibold">
                            Parcel #{entry.parcel_id} · {entry.logistics_name}
                        </h2>
                        <div className="my-4 grid gap-3 rounded-xl border p-4 text-sm">
                            <p className="font-medium">Logistics → Admin</p>
                            <p className="tabular-nums">Fixed product cash to hand over: {money(entry.product_remittance_cents / 100)}</p>
                            <p className="tabular-nums">Shipping retained by Logistics: {money(entry.allocation_cents / 100)}</p>
                            {entry.handover && (
                                <>
                                    <p className="break-all">Handover reference: {entry.handover.reference}</p>
                                    <p role="status">
                                        {entry.remittance
                                            ? 'Admin confirmed cash received.'
                                            : 'Submitted by Logistics. Awaiting Admin receipt confirmation.'}
                                    </p>
                                </>
                            )}
                            {can_submit && entry.can_submit && (
                                <RecordAction
                                    forceDialog
                                    title="Hand over cash to Admin"
                                    description={`Confirm you physically handed ${money(entry.product_remittance_cents / 100)} to Admin for Parcel #${entry.parcel_id}. Shipping stays with Logistics. Admin must still confirm receipt.`}
                                    url={`/logistics-settlements/${entry.parcel_id}/handover`}
                                    fields={[]}
                                    preview={
                                        <p className="tabular-nums">
                                            Fixed amount: {money(entry.product_remittance_cents / 100)}. The system generates the handover reference.
                                        </p>
                                    }
                                />
                            )}
                            {can_reconcile && entry.can_reconcile && (
                                <RecordAction
                                    forceDialog
                                    title="Verify rider COD reconciliation"
                                    description="Verify the full cash received by Logistics against the collected COD. This enables the separate Admin receipt confirmation below."
                                    url={`/deliveries/${entry.delivery_id}`}
                                    action="reconcile_cod"
                                    fields={[]}
                                />
                            )}
                            {!entry.remittance && !entry.can_submit && !entry.handover && entry.status === 'awaiting_cod_reconciliation' && (
                                <p>Logistics must confirm the full rider cash receipt before submitting to Admin.</p>
                            )}
                            {can_record && entry.can_reconcile && <p>First verify COD reconciliation, then confirm the Logistics cash receipt.</p>}
                        </div>
                        <ProgressStepper
                            layout="vertical"
                            variant="detailed"
                            label="Product remittance progress"
                            className="my-4"
                            stages={[
                                {
                                    id: 'cod',
                                    label: 'COD reconciliation',
                                    icon: ShieldCheck,
                                    state: entry.status !== 'awaiting_cod_reconciliation' ? 'completed' : 'current',
                                    timestamp: entry.reconciled_at,
                                },
                                {
                                    id: 'remittance',
                                    label: entry.product_remittance_cents === 0 ? 'Coin funded; no product cash due' : 'Platform receipt recorded',
                                    icon: Banknote,
                                    state: entry.remittance ? 'completed' : entry.status !== 'awaiting_cod_reconciliation' ? 'current' : 'pending',
                                    timestamp: entry.remittance?.recorded_at,
                                },
                            ]}
                        />
                        <p className="text-muted-foreground mt-2 text-sm break-all">Tracking: {entry.tracking_reference ?? 'Not recorded'}</p>
                        <p className="mt-3 tabular-nums">Shipping allocation: {money(entry.allocation_cents / 100)}</p>
                        <p className="mt-2 text-sm">
                            {entry.status !== 'awaiting_cod_reconciliation' ? 'COD reconciled' : 'Awaiting full COD reconciliation'}
                        </p>
                        {entry.remittance ? (
                            <p className="mt-2 text-sm break-words tabular-nums">
                                Platform received {money(entry.remittance.amount_cents / 100)} on {entry.remittance.received_on}. Reference:{' '}
                                {entry.remittance.reference}. Logistics retained shipping.
                            </p>
                        ) : (
                            <p className="text-muted-foreground mt-2 text-sm">
                                {entry.product_remittance_cents === 0
                                    ? 'Merchandise is coin funded. No product cash receipt is required; shipping remains with Logistics after reconciliation.'
                                    : 'Awaiting actual product remittance to Platform.'}
                            </p>
                        )}
                        {entry.remittance && (
                            <dl className="space-y-2 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">External receipt reference</dt>
                                    <dd>{entry.remittance.external_reference ?? 'No separate external reference provided'}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Receipt evidence</dt>
                                    <dd className="whitespace-pre-wrap">{entry.remittance.notes ?? 'Historical evidence unavailable'}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Recorded by Admin</dt>
                                    <dd>
                                        Admin #{entry.remittance.recorded_by} ·{' '}
                                        {entry.remittance.recorded_at
                                            ? new Date(entry.remittance.recorded_at).toLocaleString('en-PH')
                                            : 'Historical timestamp unavailable'}
                                    </dd>
                                </div>
                            </dl>
                        )}
                        {can_record && entry.can_record && entry.product_remittance_cents > 0 && (
                            <RecordAction
                                forceDialog
                                title="Confirm cash received from Logistics"
                                description={`Confirm the platform actually received ${money(entry.product_remittance_cents / 100)} from ${entry.logistics_name} for Parcel #${entry.parcel_id}. This includes Seller proceeds and commission. Logistics keeps the original shipping allocation. This records evidence; it does not transfer money.`}
                                url={`/logistics-settlements/${entry.parcel_id}`}
                                preview={
                                    <dl className="bg-muted/40 space-y-2 rounded-xl border p-4 text-sm">
                                        <div>
                                            <dt className="text-muted-foreground">Tracking</dt>
                                            <dd className="break-all">{entry.tracking_reference ?? 'Tracking unavailable'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">Logistics company</dt>
                                            <dd>{entry.logistics_name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">Expected product remittance</dt>
                                            <dd className="tabular-nums">{money(entry.product_remittance_cents / 100)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">Shipping retained by Logistics</dt>
                                            <dd className="tabular-nums">{money(entry.allocation_cents / 100)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">Internal receipt reference</dt>
                                            <dd>Generated by the system after confirmation.</dd>
                                        </div>
                                    </dl>
                                }
                                fields={[
                                    {
                                        key: 'amount',
                                        label: 'Actual product cash received (PHP)',
                                        type: 'number',
                                        min: '0.01',
                                        max: '99999999.99',
                                        value: (entry.product_remittance_cents / 100).toFixed(2),
                                        readOnly: true,
                                    },
                                    {
                                        key: 'external_reference',
                                        label: 'External payment or physical receipt reference (if available)',
                                        maxLength: 100,
                                        required: false,
                                        value: entry.handover?.reference ?? '',
                                        readOnly: !!entry.handover,
                                    },
                                    { key: 'received_on', label: 'Actual receipt date (Philippines)', type: 'date' },
                                    { key: 'notes', label: 'Actual receipt evidence: payment source, receipt or handover details', type: 'textarea' },
                                ]}
                            />
                        )}
                        {entry.shipping_refund_cents !== null && (
                            <p className="text-muted-foreground mt-2 text-sm tabular-nums">
                                Recorded shipping refund: {money(entry.shipping_refund_cents / 100)}
                            </p>
                        )}
                    </FinanceRecord>
                ))}
            </FinanceTable>
            {!entries.data.length && (
                <Empty
                    title="No delivered shipping allocations"
                    description="Delivered parcels assigned to your company will appear here. No shipping payments have been inferred."
                />
            )}
            <Pager links={entries.links} />
        </Page>
    );
}
