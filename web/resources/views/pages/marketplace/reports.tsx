import { FinanceNavigation } from '@/components/finance/finance-ui';
import AutoFilterForm from '@/components/shared/auto-filter-form';
import { FilterToolbar } from '@/components/shared/filter-toolbar';
import { Card, Empty, Field, money, Page, Pager, secondaryClass, type Pagination } from '@/components/shared/marketplace-ui';
import { titleCase } from '@/lib/admin-display';
import { Link, useForm } from '@inertiajs/react';
import { Banknote, CalendarDays, Download, PackageCheck, Percent, Wallet } from 'lucide-react';
type Record = {
    id: number;
    order_id: number;
    subtotal: string;
    shipping_fee: string;
    cod_due_cents?: number | null;
    coins_redeemed_cents?: number;
    delivery?: { delivered_at: string | null; tracking_reference: string | null } | null;
    commission_amount: string;
    seller_proceeds: string;
    store: { name: string };
};
export default function Reports({
    records,
    totals,
    role,
    filters,
    adjustments,
}: {
    records: Pagination<Record>;
    totals: { [key: string]: string | number };
    role: string;
    filters: { from?: string; to?: string };
    adjustments?: { [key: string]: number } | null;
}) {
    const financial = ['admin', 'seller'].includes(role);
    const dates = useForm({ from: filters.from ?? '', to: filters.to ?? '' });
    const exportUrl = (type: string) =>
        (role === 'seller' ? '/seller/reports/export?' : '/reports/export?') +
        new URLSearchParams({ type, from: filters.from ?? '', to: filters.to ?? '' }).toString();
    const icons = [PackageCheck, Banknote, Percent, Wallet];
    const formatDate = (value: string) =>
        new Date(value + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const period =
        filters.from || filters.to
            ? 'Showing deliveries ' +
              (filters.from ? 'from ' + formatDate(filters.from) : '') +
              (filters.from && filters.to ? ' ' : '') +
              (filters.to ? 'through ' + formatDate(filters.to) : '') +
              '.'
            : 'Showing all completed deliveries.';
    return (
        <Page
            title={
                role === 'admin'
                    ? 'Sales & Commission Reports'
                    : role === 'seller'
                      ? 'Sales Reports'
                      : role === 'rider'
                        ? 'Delivery History'
                        : 'Delivery Reports'
            }
            description={
                financial
                    ? 'Review completed sales, platform commission, and seller proceeds.'
                    : 'Review completed deliveries and cash-on-delivery totals.'
            }
        >
            <FinanceNavigation section="reports" />
            <Card className="!p-4 sm:!p-5">
                <div className="mb-4 flex items-start gap-3">
                    <span className="bg-accent text-primary rounded-xl p-2.5">
                        <CalendarDays className="size-5" />
                    </span>
                    <div>
                        <h2 className="font-semibold">Reporting Period</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Filter by delivery date. Leave both dates blank to include all completed deliveries.
                        </p>
                    </div>
                </div>
                <AutoFilterForm
                    processing={dates.processing}
                    cancel={dates.cancel}
                    className="relative"
                    onSubmit={(event) => {
                        event.preventDefault();
                        dates.get('/reports', { preserveState: true, preserveScroll: true, replace: true });
                    }}
                >
                    <FilterToolbar
                        primaryClassName="md:w-48 lg:w-48"
                        hasErrors={Object.keys(dates.errors).length > 0}
                        primary={
                            <Field
                                reserveFeedback={false}
                                label="Start Date"
                                type="date"
                                value={dates.data.from}
                                onChange={(event) => dates.setData('from', event.target.value)}
                                error={dates.errors.from}
                            />
                        }
                        activeFilters={[
                            { key: 'from', label: 'From', value: dates.data.from ?? '', onRemove: () => dates.setData('from', '') },
                            { key: 'to', label: 'To', value: dates.data.to ?? '', onRemove: () => dates.setData('to', '') },
                        ].filter((filter) => !!filter.value)}
                    >
                        <Field
                            reserveFeedback={false}
                            label="End Date"
                            type="date"
                            min={dates.data.from || undefined}
                            value={dates.data.to}
                            onChange={(event) => dates.setData('to', event.target.value)}
                            error={dates.errors.to}
                        />
                    </FilterToolbar>
                </AutoFilterForm>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                    <p className="text-muted-foreground text-xs">{period}</p>
                    {financial && (
                        <div className="flex flex-wrap gap-3">
                            <a className={secondaryClass} href={exportUrl('sales')}>
                                <Download className="size-4" />
                                Export Sales CSV
                            </a>
                            <a className={secondaryClass} href={exportUrl('commission')}>
                                <Download className="size-4" />
                                Export Commission CSV
                            </a>
                        </div>
                    )}
                </div>
            </Card>
            <div className={`grid gap-4 sm:grid-cols-2 ${financial ? 'xl:grid-cols-4' : 'xl:grid-cols-2'}`}>
                {Object.entries(totals).map(([label, value], index) => {
                    const Icon = icons[index % icons.length];
                    return (
                        <Card key={label}>
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-muted-foreground text-sm">{titleCase(label)}</p>
                                <span className="bg-accent text-primary rounded-lg p-2">
                                    <Icon className="size-4" />
                                </span>
                            </div>
                            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                                {label === 'Completed parcels' ? Number(value).toLocaleString('en-PH') : money(value)}
                            </p>
                        </Card>
                    );
                })}
            </div>
            {adjustments && (
                <Card>
                    <h2 className="text-lg font-semibold">Refund and settlement adjustments</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Recorded adjustments for parcels delivered in the selected period. Historical sales above are retained. These are payment
                        records, not automatic transfers.
                    </p>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                        {Object.entries(adjustments).map(([label, amount]) => (
                            <div key={label}>
                                <dt className="text-muted-foreground text-sm">{label}</dt>
                                <dd className="mt-2 font-semibold tabular-nums">{money(amount)}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link className={secondaryClass} href="/settlements">
                            Seller settlements
                        </Link>
                        <Link className={secondaryClass} href="/returns">
                            Returns and refunds
                        </Link>
                        {role === 'seller' && (
                            <Link className={secondaryClass} href="/seller/costs">
                                Costs and profit
                            </Link>
                        )}
                    </div>
                </Card>
            )}
            {records.data.length ? (
                <Card>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-semibold">Completed Deliveries</h2>
                        <span className="bg-accent text-primary rounded-full px-3 py-1 text-xs font-medium">
                            {records.total.toLocaleString('en-PH')} {records.total === 1 ? 'parcel' : 'parcels'}
                        </span>
                    </div>
                    <div
                        role="region"
                        aria-label="Completed deliveries table"
                        tabIndex={0}
                        className="focus-visible:outline-ring overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
                    >
                        <table className="w-full min-w-[560px] text-left text-sm">
                            <caption className="sr-only">Completed deliveries and their financial totals</caption>
                            <thead>
                                <tr className="text-muted-foreground border-b">
                                    <th scope="col" className="pb-4 font-medium">
                                        Parcel & Store
                                    </th>
                                    <th scope="col" className="pb-4 text-right font-medium">
                                        {financial ? 'Product Sales' : 'COD Value'}
                                    </th>
                                    {role === 'rider' && (
                                        <th scope="col" className="px-4 pb-4 font-medium">
                                            Delivered on
                                        </th>
                                    )}
                                    {financial && (
                                        <>
                                            <th scope="col" className="pb-4 text-right font-medium">
                                                Commission
                                            </th>
                                            <th scope="col" className="pb-4 text-right font-medium">
                                                Seller Proceeds
                                            </th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {records.data.map((record) => (
                                    <tr key={record.id} className="hover:bg-accent/20 transition-colors">
                                        <td className="py-3">
                                            <span className="font-medium">Parcel #{record.id}</span>
                                            <span className="text-muted-foreground mt-1 block text-xs">{record.store.name}</span>
                                            {record.delivery?.tracking_reference && (
                                                <span className="text-muted-foreground mt-1 block text-xs break-all">
                                                    {record.delivery.tracking_reference}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right tabular-nums">
                                            {money(
                                                financial
                                                    ? record.subtotal
                                                    : record.cod_due_cents != null
                                                      ? record.cod_due_cents / 100
                                                      : Number(record.subtotal) +
                                                        Number(record.shipping_fee) -
                                                        (record.coins_redeemed_cents ?? 0) / 100,
                                            )}
                                        </td>
                                        {role === 'rider' && (
                                            <td className="px-4 text-sm">
                                                {record.delivery?.delivered_at
                                                    ? new Date(record.delivery.delivered_at).toLocaleString('en-PH')
                                                    : 'Not recorded'}
                                            </td>
                                        )}
                                        {financial && (
                                            <>
                                                <td className="text-right tabular-nums">{money(record.commission_amount)}</td>
                                                <td className="text-right font-medium tabular-nums">{money(record.seller_proceeds)}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-muted-foreground mt-5 border-t pt-4 text-xs leading-relaxed">
                        {financial
                            ? 'Seller proceeds equal product sales minus commission. These amounts do not confirm that a payout has been made.'
                            : 'Total parcel COD value uses recorded cash due after coin payment, including shipping. This is separate from rider earnings and pending COD handover.'}
                    </p>
                </Card>
            ) : (
                <Empty
                    title="No Completed Deliveries"
                    description="Try a different date range. Completed deliveries will appear here once available."
                />
            )}
            <Pager links={records.links} />
        </Page>
    );
}
