import { buttonClass, Card, Empty, Field, money, Page, Pager, type Pagination } from '@/components/marketplace-ui';
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
    settings,
    role,
}: {
    records: Pagination<Record>;
    totals: { [key: string]: string | number };
    settings: { shipping_fee_per_seller_order: string; platform_commission_basis_points: number } | null;
    role: string;
}) {
    const financial = ['admin', 'seller'].includes(role);
    const form = useForm({
        shipping_fee_per_seller_order: settings?.shipping_fee_per_seller_order ?? '50.00',
        platform_commission_basis_points: settings?.platform_commission_basis_points ?? 1000,
    });
    return (
        <Page
            title={role === 'seller' ? 'Sales reports' : role === 'rider' ? 'Delivery history' : 'Reports & insights'}
            description="View completed parcels and totals."
        >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(totals).map(([label, value]) => (
                    <Card key={label}>
                        <p className="text-muted-foreground text-sm">{label}</p>
                        <p className="mt-4 text-2xl font-semibold">{label === 'Completed parcels' ? value : money(value)}</p>
                    </Card>
                ))}
            </div>
            {settings && (
                <Card>
                    <h2 className="font-semibold">Platform rates</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Changes apply to new orders. 100 basis points = 1%; the default commission is 10% of product sales.
                    </p>
                    <form
                        className="mt-5 grid items-end gap-4 sm:grid-cols-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.patch('/reports/settings', { preserveScroll: true });
                        }}
                    >
                        <Field
                            label="Delivery fee per store (PHP)"
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={form.data.shipping_fee_per_seller_order}
                            onChange={(e) => form.setData('shipping_fee_per_seller_order', e.target.value)}
                        />
                        <Field
                            label="Commission (basis points)"
                            type="number"
                            required
                            min="0"
                            max="10000"
                            value={form.data.platform_commission_basis_points}
                            onChange={(e) => form.setData('platform_commission_basis_points', Number(e.target.value))}
                        />
                        <button className={buttonClass} disabled={form.processing}>
                            Save rates
                        </button>
                    </form>
                </Card>
            )}
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
