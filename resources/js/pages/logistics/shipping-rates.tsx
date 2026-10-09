import InputError from '@/components/input-error';
import { Badge, Card, Empty, Field, Page, Select, buttonClass, money, secondaryClass } from '@/components/marketplace-ui';
import { useLocations } from '@/components/rider-service-area-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { router, useForm } from '@inertiajs/react';
import { MapPinned, Pencil, Plus, Scale, Wallet } from 'lucide-react';
import { useState } from 'react';

type Center = { id: number; name: string };
type Rate = {
    id: number;
    sorting_center_id: number;
    center_name: string;
    area_name: string;
    province_code: string;
    city_code: string;
    barangay_code: string;
    base_fee_cents: number;
    included_weight_grams: number;
    extra_kg_fee_cents: number;
    max_weight_grams: number;
    is_active: boolean | number;
};
function RateEditor({ centers, rate, close, pricingEnabled }: { centers: Center[]; rate: Rate | null; close: () => void; pricingEnabled: boolean }) {
    const form = useForm({
        sorting_center_id: (rate?.sorting_center_id ?? centers[0]?.id)?.toString() ?? '',
        province_code: rate?.province_code ?? '',
        city_code: rate?.city_code ?? '',
        barangay_code: rate?.barangay_code ?? '',
        base_fee: rate ? (rate.base_fee_cents / 100).toFixed(2) : '',
        included_weight_grams: rate?.included_weight_grams ?? 1000,
        extra_kg_fee: rate ? (rate.extra_kg_fee_cents / 100).toFixed(2) : '',
        max_weight_grams: rate?.max_weight_grams ?? 20000,
        is_active: Boolean(rate?.is_active),
    });
    const provinces = useLocations('');
    const cities = useLocations(form.data.province_code ? `?province=${form.data.province_code}` : null);
    const barangays = useLocations(form.data.city_code ? `?city=${form.data.city_code}` : null);
    const [sample, setSample] = useState(1500);
    const [review, setReview] = useState(false);
    const save = () => form.post('/logistics/shipping-rates', { preserveScroll: true, onSuccess: close, onError: () => setReview(false) });
    const extra = Math.ceil(Math.max(0, sample - Number(form.data.included_weight_grams)) / 1000);
    const preview = Number(form.data.base_fee || 0) + extra * Number(form.data.extra_kg_fee || 0);
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                if (form.data.is_active) setReview(true);
                else save();
            }}
            className="space-y-5"
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Select
                    label="Logistics Center"
                    required
                    disabled={Boolean(rate)}
                    value={form.data.sorting_center_id}
                    onChange={(event) => form.setData('sorting_center_id', event.target.value)}
                    error={form.errors.sorting_center_id}
                >
                    {centers.map((center) => (
                        <option key={center.id} value={center.id}>
                            {center.name}
                        </option>
                    ))}
                </Select>
                {(
                    [
                        ['province_code', 'Province', provinces],
                        ['city_code', 'Municipality / City', cities],
                        ['barangay_code', 'Barangay', barangays],
                    ] as const
                ).map(([key, label, choices]) => (
                    <div key={key}>
                        <Select
                            label={label}
                            required
                            value={form.data[key]}
                            disabled={Boolean(rate)}
                            onChange={(event) => {
                                form.setData(key, event.target.value);
                                if (key === 'province_code') {
                                    form.setData('city_code', '');
                                    form.setData('barangay_code', '');
                                }
                                if (key === 'city_code') form.setData('barangay_code', '');
                            }}
                            error={form.errors[key]}
                        >
                            <option value="">Choose {label.toLowerCase()}</option>
                            {choices.items.map((location) => (
                                <option key={location.code} value={location.code}>
                                    {location.name}
                                </option>
                            ))}
                        </Select>
                        <InputError message={choices.error} />
                    </div>
                ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label="Base Fee (PHP)"
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    required
                    value={form.data.base_fee}
                    onChange={(event) => form.setData('base_fee', event.target.value)}
                    error={form.errors.base_fee}
                />
                <Field
                    label="Included Weight (grams)"
                    type="number"
                    min="1"
                    max="50000"
                    step="1"
                    required
                    value={form.data.included_weight_grams}
                    onChange={(event) => form.setData('included_weight_grams', Number(event.target.value))}
                    error={form.errors.included_weight_grams}
                />
                <Field
                    label="Each Extra Kilogram (PHP)"
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    required
                    value={form.data.extra_kg_fee}
                    onChange={(event) => form.setData('extra_kg_fee', event.target.value)}
                    error={form.errors.extra_kg_fee}
                />
                <Field
                    label="Maximum Parcel Weight (grams)"
                    type="number"
                    min={form.data.included_weight_grams}
                    max="50000"
                    step="1"
                    required
                    value={form.data.max_weight_grams}
                    onChange={(event) => form.setData('max_weight_grams', Number(event.target.value))}
                    error={form.errors.max_weight_grams}
                />
            </div>
            <div className="bg-accent/40 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium">Quote Preview</span>
                    <span className="text-primary text-xl font-semibold">
                        {!form.data.base_fee || !form.data.extra_kg_fee
                            ? 'Enter Fees'
                            : sample > form.data.max_weight_grams
                              ? 'Over Limit'
                              : money(preview)}
                    </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {[500, 1000, 1500, 3000].map((grams) => (
                        <button
                            key={grams}
                            type="button"
                            onClick={() => setSample(grams)}
                            aria-pressed={sample === grams}
                            className={`rounded-lg border px-3 py-1.5 text-xs ${sample === grams ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'}`}
                        >
                            {grams / 1000} kg
                        </button>
                    ))}
                </div>
                <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                    Extra weight rounds up to the next kilogram. Includes packed item weights for one seller parcel.
                </p>
            </div>
            <Select
                label="Rate Status"
                value={form.data.is_active ? 'published' : 'draft'}
                onChange={(event) => form.setData('is_active', event.target.value === 'published')}
            >
                <option value="draft">Draft — unavailable at checkout</option>
                <option value="published">Published — available at checkout</option>
            </Select>
            <p className="text-muted-foreground text-xs leading-relaxed">
                Published areas cover pickup and delivery. Changes apply to new orders; confirmed fees stay unchanged. Saving an existing barangay
                updates its rate.
            </p>
            <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" className={secondaryClass} onClick={close}>
                    Cancel
                </button>
                <button className={buttonClass} disabled={form.processing}>
                    {form.processing ? 'Saving…' : form.data.is_active ? 'Review & Publish' : 'Save Draft'}
                </button>
            </div>
            <Dialog
                open={review}
                onOpenChange={(open) => {
                    if (!form.processing) setReview(open);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Publish This Shipping Rate?</DialogTitle>
                        <DialogDescription>New orders will use this rate for the selected barangay.</DialogDescription>
                    </DialogHeader>
                    <div className="bg-accent/30 rounded-xl border p-4 text-sm leading-relaxed">
                        {money(form.data.base_fee)} covers {form.data.included_weight_grams / 1000} kg, plus {money(form.data.extra_kg_fee)} for each
                        extra kilogram. Maximum: {form.data.max_weight_grams / 1000} kg.
                    </div>
                    {!pricingEnabled && (
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            This is the first publication and activates logistics quotes at checkout. Ensure seller pickup areas, buyer destinations,
                            and packed product weights are ready before continuing.
                        </p>
                    )}
                    <div className="flex justify-end gap-3">
                        <button type="button" className={secondaryClass} disabled={form.processing} onClick={() => setReview(false)}>
                            Go Back
                        </button>
                        <button type="button" className={buttonClass} disabled={form.processing} onClick={save}>
                            Publish Rate
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </form>
    );
}
export default function ShippingRates({ centers, rates, pricingEnabled }: { centers: Center[]; rates: Rate[]; pricingEnabled: boolean }) {
    const [editing, setEditing] = useState<Rate | null | undefined>();
    const [confirm, setConfirm] = useState<Rate | null>(null);
    const [busy, setBusy] = useState(false);
    return (
        <Page
            title="Shipping Rates & Coverage"
            description="Set fair, consistent shipping fees for the barangays your center serves."
            action={
                <button className={buttonClass} disabled={!centers.length} onClick={() => setEditing(null)}>
                    <Plus className="size-4" />
                    Add Barangay Rate
                </button>
            }
        >
            <div className="grid gap-4 sm:grid-cols-3">
                {[
                    { label: 'Published Areas', value: rates.filter((rate) => rate.is_active).length, icon: MapPinned },
                    { label: 'Draft Areas', value: rates.filter((rate) => !rate.is_active).length, icon: Wallet },
                    { label: 'Pricing Basis', value: 'Area + Weight', icon: Scale },
                ].map((item) => (
                    <Card key={item.label}>
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-sm">{item.label}</p>
                            <item.icon className="text-primary size-5" />
                        </div>
                        <p className="mt-4 text-2xl font-semibold">{item.value}</p>
                    </Card>
                ))}
            </div>
            {rates.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    {rates.map((rate) => (
                        <Card key={rate.id}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-muted-foreground text-xs">{rate.center_name}</p>
                                    <h2 className="mt-1 font-semibold">{rate.area_name}</h2>
                                </div>
                                <Badge status={rate.is_active ? 'published' : 'draft'} />
                            </div>
                            <div className="bg-background my-5 grid grid-cols-2 gap-4 rounded-xl p-4">
                                <div>
                                    <p className="text-muted-foreground text-xs">Base Fee</p>
                                    <p className="mt-1 text-xl font-semibold">{money(rate.base_fee_cents / 100)}</p>
                                    <p className="text-muted-foreground mt-1 text-xs">Up to {rate.included_weight_grams / 1000} kg</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Each Extra Kilogram</p>
                                    <p className="mt-1 text-xl font-semibold">{money(rate.extra_kg_fee_cents / 100)}</p>
                                    <p className="text-muted-foreground mt-1 text-xs">Maximum {rate.max_weight_grams / 1000} kg</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button className={secondaryClass} onClick={() => setEditing(rate)}>
                                    <Pencil className="size-4" />
                                    Edit Rate
                                </button>
                                <button className={secondaryClass} onClick={() => setConfirm(rate)}>
                                    {rate.is_active ? 'Pause Rate' : 'Publish Rate'}
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Empty
                    title="No Shipping Rates Yet"
                    description="Add pickup and delivery barangays, set their rates, then publish them when your center is ready."
                />
            )}
            <Card>
                <h2 className="font-semibold">How Shipping Is Calculated</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Base fee for the destination barangay + each started kilogram above the included weight. For example, a ₱50 base fee covering 1 kg
                    and ₱15 per extra kg gives a ₱65 fee for a 1.5 kg parcel. Set your actual rates based on operating costs and the areas you can
                    serve.
                </p>
                <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                    Both pickup and destination must be covered. No per-kilometer or volumetric charges are applied in this version. Unavailable areas
                    and missing product weights prevent a quote.
                </p>
            </Card>
            <Dialog
                open={editing !== undefined}
                onOpenChange={(open) => {
                    if (!open) setEditing(undefined);
                }}
            >
                <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Shipping Rate' : 'Add Barangay Rate'}</DialogTitle>
                        <DialogDescription>Choose your coverage and review the fee calculation.</DialogDescription>
                    </DialogHeader>
                    {editing !== undefined && (
                        <RateEditor
                            key={editing?.id ?? 'new'}
                            centers={centers}
                            rate={editing}
                            pricingEnabled={pricingEnabled}
                            close={() => setEditing(undefined)}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={Boolean(confirm)}
                onOpenChange={(open) => {
                    if (!open && !busy) setConfirm(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{confirm?.is_active ? 'Pause This Rate?' : 'Publish This Rate?'}</DialogTitle>
                        <DialogDescription>
                            {confirm?.area_name} will {confirm?.is_active ? 'stop being available' : 'be available'} for new checkout quotes. Existing
                            orders keep their fee.
                        </DialogDescription>
                    </DialogHeader>
                    {!pricingEnabled && !confirm?.is_active && (
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            First publication activates logistics checkout. Prepare coverage and packed product weights before publishing.
                        </p>
                    )}
                    <div className="flex justify-end gap-3">
                        <button className={secondaryClass} disabled={busy} onClick={() => setConfirm(null)}>
                            Cancel
                        </button>
                        <button
                            className={buttonClass}
                            disabled={busy}
                            onClick={() => {
                                if (confirm)
                                    router.patch(
                                        `/logistics/shipping-rates/${confirm.id}`,
                                        { is_active: !confirm.is_active },
                                        {
                                            preserveScroll: true,
                                            onStart: () => setBusy(true),
                                            onFinish: () => setBusy(false),
                                            onSuccess: () => setConfirm(null),
                                        },
                                    );
                            }}
                        >
                            Confirm
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </Page>
    );
}
