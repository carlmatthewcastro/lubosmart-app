import { Card, Field, Page, buttonClass, money } from '@/components/marketplace-ui';
import { useForm } from '@inertiajs/react';
export default function Commission({ settings }: { settings: { platform_commission_basis_points: number; shipping_fee_per_seller_order: string } }) {
    const form = useForm({
        commission_percent: String(settings.platform_commission_basis_points / 100),
        shipping_fee_per_seller_order: settings.shipping_fee_per_seller_order,
    });
    return (
        <Page title="Commission & fees" description="Manage the platform rate applied to new orders.">
            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <p className="text-muted-foreground text-sm">Current platform commission</p>
                    <p className="mt-4 text-3xl font-semibold">{settings.platform_commission_basis_points / 100}%</p>
                    <p className="text-muted-foreground mt-2 text-sm">Applied to product sales, excluding delivery fees.</p>
                </Card>
                <Card>
                    <p className="text-muted-foreground text-sm">Delivery fee per store</p>
                    <p className="mt-4 text-3xl font-semibold">{money(settings.shipping_fee_per_seller_order)}</p>
                </Card>
            </div>
            <Card>
                <h2 className="font-semibold">Update rates</h2>
                <form
                    noValidate
                    className="mt-5 grid items-end gap-4 sm:grid-cols-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.transform((data) => ({
                            shipping_fee_per_seller_order: data.shipping_fee_per_seller_order,
                            platform_commission_basis_points: /^\d+(\.\d{1,2})?$/.test(data.commission_percent)
                                ? Math.round(Number(data.commission_percent) * 100)
                                : null,
                        }));
                        form.patch('/reports/settings', { preserveScroll: true });
                    }}
                >
                    <Field
                        label="Commission (%)"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.data.commission_percent}
                        onChange={(e) => form.setData('commission_percent', e.target.value)}
                    />
                    <Field
                        label="Delivery fee (PHP)"
                        type="number"
                        min="0"
                        max="9999.99"
                        step="0.01"
                        value={form.data.shipping_fee_per_seller_order}
                        onChange={(e) => form.setData('shipping_fee_per_seller_order', e.target.value)}
                        error={form.errors.shipping_fee_per_seller_order}
                    />
                    <button className={buttonClass} disabled={form.processing}>
                        Save rates
                    </button>
                </form>
                <p className="text-muted-foreground mt-4 text-sm">
                    Existing orders keep their original rates. Changes are recorded in the activity log.
                </p>
            </Card>
        </Page>
    );
}
