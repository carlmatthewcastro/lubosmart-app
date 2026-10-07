import { buttonClass, Card, Empty, Field, money, Page, Pager, secondaryClass, type Pagination } from '@/components/marketplace-ui';
import { useForm } from '@inertiajs/react';
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
    const exportUrl = (type: string) => `/reports/export?${new URLSearchParams({ type, ...dates.data }).toString()}`;
    return (
        <Page
            title={role === 'seller' ? 'Sales reports' : role === 'rider' ? 'Delivery history' : 'Reports & insights'}
            description="View completed parcels and totals."
        >
            <Card>
                <form
                    className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
                    onSubmit={(e) => {
                        e.preventDefault();
                        dates.get('/reports');
                    }}
                >
                    <Field label="Delivered from" type="date" value={dates.data.from} onChange={(e) => dates.setData('from', e.target.value)} />
                    <Field label="Delivered to" type="date" value={dates.data.to} onChange={(e) => dates.setData('to', e.target.value)} />
                    <button className={buttonClass} disabled={dates.processing}>
                        Apply dates
                    </button>
                </form>
                {role === 'admin' && (
                    <div className="mt-4 flex flex-wrap gap-3">
                        <a className={secondaryClass} href={exportUrl('sales')}>
                            Download sales CSV
                        </a>
                        <a className={secondaryClass} href={exportUrl('commission')}>
                            Download commission CSV
                        </a>
                    </div>
                )}
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(totals).map(([label, value]) => (
                    <Card key={label}>
                        <p className="text-muted-foreground text-sm">{label}</p>
                        <p className="mt-4 text-2xl font-semibold">{label === 'Completed parcels' ? value : money(value)}</p>
                    </Card>
                ))}
            </div>
            {records.data.length ? (
                <Card className="min-w-0 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                        <caption className="mb-5 text-left font-semibold">Completed order parcels</caption>
                        <thead>
                            <tr className="text-muted-foreground border-b">
                                <th className="pb-4 font-medium">Parcel / store</th>
                                <th className="pb-4 font-medium">{financial ? 'Sales' : 'Parcel COD value'}</th>
                                {financial && (
                                    <>
                                        <th className="pb-4 font-medium">Commission</th>
                                        <th className="pb-4 font-medium">Seller proceeds</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {records.data.map((record) => (
                                <tr key={record.id}>
                                    <td className="py-4">
                                        #{record.id}
                                        <span className="text-muted-foreground mt-1 block text-xs">{record.store.name}</span>
                                    </td>
                                    <td>{money(financial ? record.subtotal : Number(record.subtotal) + Number(record.shipping_fee))}</td>
                                    {financial && (
                                        <>
                                            <td>{money(record.commission_amount)}</td>
                                            <td>{money(record.seller_proceeds)}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="text-muted-foreground mt-4 text-xs">
                        {financial
                            ? 'Seller proceeds are calculated amounts. This report does not confirm seller payouts.'
                            : 'COD is cash collected for the order. It is not courier earnings.'}
                    </p>
                </Card>
            ) : (
                <Empty title="No completed deliveries yet" description="Completed deliveries will appear here." />
            )}
            <Pager links={records.links} />
        </Page>
    );
}
