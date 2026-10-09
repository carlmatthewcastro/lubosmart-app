import { Card, Field, Page, buttonClass, money, secondaryClass } from '@/components/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from '@inertiajs/react';
import { Percent, Truck } from 'lucide-react';
import { useState } from 'react';
export default function Commission({ settings }: { settings: { platform_commission_basis_points: number; shipping_fee_per_seller_order: string } }) {
    const [confirming, setConfirming] = useState(false);
    const form = useForm({
        commission_percent: String(settings.platform_commission_basis_points / 100),
        shipping_fee_per_seller_order: settings.shipping_fee_per_seller_order,
    });
    const save = () => {
        form.transform((data) => ({
            shipping_fee_per_seller_order: data.shipping_fee_per_seller_order,
            platform_commission_basis_points: /^\d+(\.\d{1,2})?$/.test(data.commission_percent)
                ? Math.round(Number(data.commission_percent) * 100)
                : null,
        }));
        form.patch('/reports/settings', { preserveScroll: true, onSuccess: () => setConfirming(false), onError: () => setConfirming(false) });
    };
    return (
        <Page title="Commission & Fees" description="Set the rates applied to new orders.">
            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <span className="bg-accent text-primary inline-flex rounded-xl p-3">
                        <Percent className="size-5" />
                    </span>
                    <p className="text-muted-foreground mt-4 text-sm">Platform Commission</p>
                    <p className="mt-2 text-3xl font-semibold">{settings.platform_commission_basis_points / 100}%</p>
                    <p className="text-muted-foreground mt-2 text-sm">Deducted from product sales after delivery.</p>
                </Card>
                <Card>
                    <span className="bg-accent text-primary inline-flex rounded-xl p-3">
                        <Truck className="size-5" />
                    </span>
                    <p className="text-muted-foreground mt-4 text-sm">Delivery Fee per Store</p>
                    <p className="mt-2 text-3xl font-semibold">{money(settings.shipping_fee_per_seller_order)}</p>
                    <p className="text-muted-foreground mt-2 text-sm">Added to the buyer's order total.</p>
                </Card>
            </div>
            <Card>
                <h2 className="font-semibold">Update Rates</h2>
                <form
                    className="mt-5 grid items-end gap-4 sm:grid-cols-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setConfirming(true);
                    }}
                >
                    <Field
                        label="Commission (%)"
                        required
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.data.commission_percent}
                        onChange={(event) => form.setData('commission_percent', event.target.value)}
                        error={(form.errors as Record<string, string>).platform_commission_basis_points}
                    />
                    <Field
                        label="Delivery Fee (PHP)"
                        required
                        type="number"
                        min="0"
                        max="9999.99"
                        step="0.01"
                        value={form.data.shipping_fee_per_seller_order}
                        onChange={(event) => form.setData('shipping_fee_per_seller_order', event.target.value)}
                        error={form.errors.shipping_fee_per_seller_order}
                    />
                    <button className={buttonClass} disabled={form.processing}>
                        Review Changes
                    </button>
                </form>
                <div className="bg-accent/40 mt-5 rounded-xl p-4 text-sm">
                    <p className="font-medium">Example for PHP 1,000 in Product Sales</p>
                    <p className="text-muted-foreground mt-1">
                        Commission: {money(Number(form.data.commission_percent) * 10)} / Seller receives:{' '}
                        {money(1000 - Number(form.data.commission_percent) * 10)}
                    </p>
                </div>
                <p className="text-muted-foreground mt-4 text-xs">
                    Existing orders keep their original rates. Changes are recorded in activity history.
                </p>
            </Card>
            <Dialog
                open={confirming}
                onOpenChange={(value) => {
                    if (!form.processing) setConfirming(value);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Rate Changes</DialogTitle>
                        <DialogDescription>
                            New orders will use {form.data.commission_percent}% commission and {money(form.data.shipping_fee_per_seller_order)}{' '}
                            delivery per store.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3">
                        <button className={secondaryClass} disabled={form.processing} onClick={() => setConfirming(false)}>
                            Keep Editing
                        </button>
                        <button className={buttonClass} disabled={form.processing} onClick={save}>
                            {form.processing ? 'Saving...' : 'Save Rates'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </Page>
    );
}
