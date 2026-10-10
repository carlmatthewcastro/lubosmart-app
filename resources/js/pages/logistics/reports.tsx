import { Card, Empty, Field, Page, Pager, type Pagination, buttonClass, money, secondaryClass } from '@/components/marketplace-ui';
import { useForm } from '@inertiajs/react';
import { Download, PackageCheck } from 'lucide-react';

type Record = {
    id: number;
    subtotal: string;
    shipping_fee: string;
    store: { name: string };
    delivery: { delivered_at: string | null; rider: { name: string } | null };
};
export default function LogisticsReports({
    records,
    totals,
    filters,
}: {
    records: Pagination<Record>;
    totals: { 'Completed Parcels': number; 'Shipping Fees': string; 'COD Value': number };
    filters: { from?: string; to?: string };
}) {
    const form = useForm({ from: filters.from ?? '', to: filters.to ?? '' });
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][]).toString();
    return (
        <Page title="Delivery Reports" description="Review completed parcels and delivery amounts for your logistics center.">
            <Card>
                <form
                    className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.get('/reports', { preserveState: true });
                    }}
                >
                    <Field
                        label="Delivered From"
                        type="date"
                        value={form.data.from}
                        onChange={(event) => form.setData('from', event.target.value)}
                        error={form.errors.from}
                    />
                    <Field
                        label="Delivered To"
                        type="date"
                        min={form.data.from || undefined}
                        value={form.data.to}
                        onChange={(event) => form.setData('to', event.target.value)}
                        error={form.errors.to}
                    />
                    <button className={buttonClass} disabled={form.processing}>
                        Apply Dates
                    </button>
                </form>
                <a href={`/logistics/reports/export${query ? '?' + query : ''}`} className={`${secondaryClass} mt-4`}>
                    <Download className="size-4" />
                    Download Delivery CSV
                </a>
            </Card>
            <div className="grid gap-4 sm:grid-cols-3">
                {Object.entries(totals).map(([label, value]) => (
                    <Card key={label}>
                        <p className="text-muted-foreground text-sm">{label}</p>
                        <p className="mt-4 text-2xl font-semibold tabular-nums">{label === 'Completed Parcels' ? value : money(value)}</p>
                    </Card>
                ))}
            </div>
            {records.data.length ? (
                <Card>
                    <h2 className="font-semibold">Completed Deliveries</h2>
                    <div className="mt-5 divide-y">
                        {records.data.map((record) => (
                            <div key={record.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto]">
                                <div>
                                    <p className="flex items-center gap-2 text-sm font-medium">
                                        <PackageCheck className="text-primary size-4" />
                                        Parcel #{record.id} · {record.store.name}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {record.delivery.rider?.name ?? 'Unassigned rider'} ·{' '}
                                        {record.delivery.delivered_at
                                            ? new Date(record.delivery.delivered_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                                            : 'Date unavailable'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Shipping Fee</p>
                                    <p className="mt-1 text-sm font-semibold">{money(record.shipping_fee)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">COD Value</p>
                                    <p className="mt-1 text-sm font-semibold">{money(Number(record.subtotal) + Number(record.shipping_fee))}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-muted-foreground mt-5 border-t pt-4 text-xs leading-relaxed">
                        Shipping fees are order snapshots. COD value includes products and shipping; these totals do not confirm rider earnings or
                        cash handover.
                    </p>
                </Card>
            ) : (
                <Empty title="No Completed Deliveries" description="Delivered parcels matching these dates will appear here." />
            )}
            <Pager links={records.links} />
        </Page>
    );
}
