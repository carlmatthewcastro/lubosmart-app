import { buttonClass, Card, Empty, Field, money, Page, Pager, secondaryClass, type Pagination } from '@/components/marketplace-ui';
import { titleCase } from '@/lib/admin-display';
import { Link, useForm } from '@inertiajs/react';
import { Banknote, CalendarDays, Download, PackageCheck, Percent, Wallet } from 'lucide-react';
type Record = {
    id: number;
    order_id: number;
    subtotal: string;
    shipping_fee: string;
    commission_amount: string;
    seller_proceeds: string;
    store: { name: string };
};
export default function Reports({
    records,
    totals,
    role,
    filters,
}: {
    records: Pagination<Record>;
    totals: { [key: string]: string | number };
    role: string;
    filters: { from?: string; to?: string };
}) {
    const financial = ['admin', 'seller'].includes(role);
    const dates = useForm({ from: filters.from ?? '', to: filters.to ?? '' });
    const exportUrl = (type: string) => '/reports/export?' + new URLSearchParams({ type, from: filters.from ?? '', to: filters.to ?? '' }).toString();
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
                      : role === 'courier'
                        ? 'Delivery History'
                        : 'Delivery Reports'
            }
            description={
                financial
                    ? 'Review completed sales, platform commission, and seller proceeds.'
                    : 'Review completed deliveries and cash-on-delivery totals.'
            }
        >
            <Card>
                <div className="mb-5 flex items-start gap-3">
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
                <form
                    className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
                    onSubmit={(event) => {
                        event.preventDefault();
                        dates.get('/reports');
                    }}
                >
                    <Field
                        label="Start Date"
                        type="date"
                        value={dates.data.from}
                        onChange={(event) => dates.setData('from', event.target.value)}
                        error={dates.errors.from}
                    />
                    <Field
                        label="End Date"
                        type="date"
                        min={dates.data.from || undefined}
                        value={dates.data.to}
                        onChange={(event) => dates.setData('to', event.target.value)}
                        error={dates.errors.to}
                    />
                    <button className={buttonClass} disabled={dates.processing}>
                        Apply Filters
                    </button>
                    <Link href="/reports" className={secondaryClass}>
                        Reset
                    </Link>
                </form>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                    <p className="text-muted-foreground text-xs">{period}</p>
                    {role === 'admin' && (
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            {records.data.length ? (
                <Card>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-semibold">Completed Deliveries</h2>
                        <span className="bg-accent text-primary rounded-full px-3 py-1 text-xs font-medium">
                            {records.total.toLocaleString('en-PH')} {records.total === 1 ? 'parcel' : 'parcels'}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-sm">
                            <caption className="sr-only">Completed deliveries and their financial totals</caption>
                            <thead>
                                <tr className="text-muted-foreground border-b">
                                    <th className="pb-4 font-medium">Parcel & Store</th>
                                    <th className="pb-4 text-right font-medium">{financial ? 'Product Sales' : 'COD Value'}</th>
                                    {financial && (
                                        <>
                                            <th className="pb-4 text-right font-medium">Commission</th>
                                            <th className="pb-4 text-right font-medium">Seller Proceeds</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {records.data.map((record) => (
                                    <tr key={record.id} className="hover:bg-accent/20 transition-colors">
                                        <td className="py-5">
                                            <span className="font-medium">Parcel #{record.id}</span>
                                            <span className="text-muted-foreground mt-1 block text-xs">{record.store.name}</span>
                                        </td>
                                        <td className="text-right tabular-nums">
                                            {money(financial ? record.subtotal : Number(record.subtotal) + Number(record.shipping_fee))}
                                        </td>
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
                            : 'COD value includes the product total and delivery fee collected from the buyer.'}
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
