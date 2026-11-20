import { FinanceRecord, FinanceTable } from '@/components/finance/finance-ui';
import AutoFilterForm from '@/components/shared/auto-filter-form';
import { FilterToolbar } from '@/components/shared/filter-toolbar';
import { Card, Empty, Field, Page, Pager, type Pagination, money, secondaryClass } from '@/components/shared/marketplace-ui';
import { useForm } from '@inertiajs/react';
import { Download } from 'lucide-react';

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
            <Card className="!p-4">
                <AutoFilterForm
                    processing={form.processing}
                    cancel={form.cancel}
                    className="relative"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.get('/reports', { preserveState: true, preserveScroll: true, replace: true });
                    }}
                >
                    <FilterToolbar
                        primaryClassName="md:w-48 lg:w-48"
                        hasErrors={Object.keys(form.errors).length > 0}
                        primary={
                            <Field
                                reserveFeedback={false}
                                label="Delivered From"
                                type="date"
                                value={form.data.from}
                                onChange={(event) => form.setData('from', event.target.value)}
                                error={form.errors.from}
                            />
                        }
                        activeFilters={[
                            { key: 'from', label: 'From', value: form.data.from ?? '', onRemove: () => form.setData('from', '') },
                            { key: 'to', label: 'To', value: form.data.to ?? '', onRemove: () => form.setData('to', '') },
                        ].filter((filter) => !!filter.value)}
                    >
                        <Field
                            reserveFeedback={false}
                            label="Delivered To"
                            type="date"
                            min={form.data.from || undefined}
                            value={form.data.to}
                            onChange={(event) => form.setData('to', event.target.value)}
                            error={form.errors.to}
                        />
                    </FilterToolbar>
                </AutoFilterForm>
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
                    <FinanceTable label="Completed deliveries" headers={['Parcel', 'Store', 'Rider', 'Delivered on', 'Shipping fee', 'COD value']}>
                        {records.data.map((record) => (
                            <FinanceRecord
                                key={record.id}
                                title={'Delivered parcel #' + record.id}
                                cells={[
                                    'Parcel #' + record.id,
                                    record.store.name,
                                    record.delivery.rider?.name ?? 'Unassigned rider',
                                    record.delivery.delivered_at
                                        ? new Date(record.delivery.delivered_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                                        : 'Date unavailable',
                                    money(record.shipping_fee),
                                    money(Number(record.subtotal) + Number(record.shipping_fee)),
                                ]}
                            >
                                <h3 className="font-semibold">{record.store.name}</h3>
                                <p>Assigned rider: {record.delivery.rider?.name ?? 'Unassigned rider'}</p>
                                <p>
                                    Delivery completed:{' '}
                                    {record.delivery.delivered_at ? new Date(record.delivery.delivered_at).toLocaleString('en-PH') : 'Not recorded'}
                                </p>
                                <p className="tabular-nums">Shipping fee: {money(record.shipping_fee)}</p>
                                <p className="tabular-nums">COD value: {money(Number(record.subtotal) + Number(record.shipping_fee))}</p>
                                <p className="text-muted-foreground text-sm">Delivery completion does not confirm cash handover or rider earnings.</p>
                            </FinanceRecord>
                        ))}
                    </FinanceTable>
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
