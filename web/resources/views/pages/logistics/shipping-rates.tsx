import '@/../css/coverage-workspace.css';
import InputError from '@/components/auth/input-error';
import { LogisticsWorkspaceTabs } from '@/components/logistics/parcel-navigation';
import { useLocations } from '@/components/logistics/rider-service-area-form';
import { Badge, Empty, Field, Page, Select, buttonClass, inputClass, money, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { router, useForm } from '@inertiajs/react';
import { Check, FileText, MapPin, MoreHorizontal, Package, Plus, Search, Tag } from 'lucide-react';
import { useRef, useState } from 'react';

type Center = { id: number; name: string };
type Rate = {
    id: number;
    logistics_center_id: number;
    center_name: string;
    area_name: string;
    barangay_name: string | null;
    city_name: string | null;
    province_name: string | null;
    province_code: string;
    city_code: string;
    barangay_code: string;
    base_fee_cents: number;
    included_weight_grams: number;
    extra_kg_fee_cents: number;
    max_weight_grams: number;
    is_active: boolean | number;
};

function RateEditor({
    centers,
    rates,
    rate,
    close,
    pricingEnabled,
    setSaving,
}: {
    centers: Center[];
    rates: Rate[];
    rate: Rate | null;
    close: () => void;
    pricingEnabled: boolean;
    setSaving: (saving: boolean) => void;
}) {
    const form = useForm({
        rate_id: rate?.id ?? null,
        logistics_center_id: String(rate?.logistics_center_id ?? centers[0]?.id ?? ''),
        province_code: rate?.province_code ?? '',
        city_code: rate?.city_code ?? '',
        barangay_code: rate?.barangay_code ?? '',
        barangay_codes: [] as string[],
        base_fee: rate ? (rate.base_fee_cents / 100).toFixed(2) : '',
        extra_kg_fee: rate ? (rate.extra_kg_fee_cents / 100).toFixed(2) : '',
        included_weight_grams: rate?.included_weight_grams ?? 1000,
        max_weight_grams: rate?.max_weight_grams ?? 20000,
        is_active: Boolean(rate?.is_active),
    });
    const provinces = useLocations('');
    const cities = useLocations(form.data.province_code ? `?province=${form.data.province_code}` : null);
    const barangays = useLocations(form.data.city_code ? `?city=${form.data.city_code}` : null);
    const [search, setSearch] = useState('');
    const [review, setReview] = useState(false);
    const existing = new Set(
        rates.filter((item) => item.logistics_center_id === Number(form.data.logistics_center_id)).map((item) => item.barangay_code),
    );
    const visible = barangays.items.filter((item) => item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    const eligible = barangays.items.filter((item) => !existing.has(item.code));
    const selectedCount = rate ? 1 : form.data.barangay_codes.length;
    const municipality = cities.items.find((item) => item.code === form.data.city_code)?.name ?? rate?.city_name ?? 'Choose a municipality';
    const selectionError = Object.entries(form.errors)
        .filter(([key]) => key === 'barangay_codes' || key === 'barangay_code' || key.startsWith('barangay_codes.'))
        .map(([, message]) => message)
        .join(' ');
    const save = () => {
        if (form.processing) return;
        form.transform((data) =>
            rate
                ? Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'barangay_codes'))
                : Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'barangay_code' && key !== 'rate_id')),
        );
        form.post('/logistics/shipping-rates', {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: close,
            onError: () => setReview(false),
        });
    };
    return (
        <ValidatedForm
            className="coverage-editor space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                if (form.processing || !selectedCount) return;
                if (form.data.is_active) setReview(true);
                else save();
            }}
        >
            {centers.length > 1 && (
                <Select
                    label="Logistics center"
                    reserveFeedback={false}
                    required
                    disabled={!!rate}
                    value={form.data.logistics_center_id}
                    error={form.errors.logistics_center_id}
                    onChange={(event) => {
                        form.setData('logistics_center_id', event.target.value);
                        form.setData('barangay_codes', []);
                    }}
                >
                    {centers.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </Select>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(
                    [
                        ['province_code', 'Province', provinces],
                        ['city_code', 'Municipality / City', cities],
                    ] as const
                ).map(([key, label, choices]) => (
                    <Select
                        key={key}
                        label={label}
                        reserveFeedback={false}
                        required
                        value={form.data[key]}
                        error={form.errors[key] || choices.error}
                        aria-busy={choices.loading}
                        disabled={!!rate || choices.loading || (key === 'city_code' && !form.data.province_code)}
                        onChange={(event) => {
                            form.setData(key, event.target.value);
                            if (key === 'province_code') form.setData('city_code', '');
                            setSearch('');
                            form.setData('barangay_codes', []);
                        }}
                    >
                        <option value="">{choices.loading ? 'Loading...' : `Choose ${label.toLowerCase()}`}</option>
                        {choices.items.map((item) => (
                            <option key={item.code} value={item.code}>
                                {item.name}
                            </option>
                        ))}
                    </Select>
                ))}
            </div>
            {rate ? (
                <Field label="Barangay" reserveFeedback={false} value={rate.barangay_name || rate.area_name} disabled />
            ) : (
                <fieldset className="space-y-3">
                    <legend className="sr-only">Barangays</legend>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">Barangay</span>
                        <button
                            type="button"
                            className="text-primary focus-visible:ring-ring flex min-h-6 items-center gap-2 text-sm focus-visible:ring-2"
                            disabled={!eligible.length || form.processing}
                            onClick={() => form.setData('barangay_codes', selectedCount === eligible.length ? [] : eligible.map((item) => item.code))}
                        >
                            <span aria-hidden="true" className="border-primary flex size-4 items-center justify-center rounded border">
                                {selectedCount === eligible.length && selectedCount > 0 && <Check className="size-3" />}
                            </span>
                            {selectedCount === eligible.length && selectedCount > 0 ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <label className="relative block">
                        <span className="sr-only">Search barangays</span>
                        <Search aria-hidden="true" className="text-muted-foreground absolute top-3 left-3 size-4" />
                        <input
                            className={inputClass + ' pl-10'}
                            type="search"
                            placeholder="Search barangays..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                    <div
                        className="bg-accent/35 max-h-48 overflow-y-auto rounded-xl border"
                        role="group"
                        aria-label="Barangay choices"
                        aria-describedby="barangay-selection-error"
                        aria-busy={barangays.loading}
                    >
                        {visible.map((item) => (
                            <label
                                key={item.code}
                                className={`flex min-h-10 items-center gap-3 border-b px-4 py-2 text-sm last:border-0 ${existing.has(item.code) ? 'text-muted-foreground' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    className="accent-primary size-4"
                                    disabled={existing.has(item.code) || form.processing}
                                    checked={form.data.barangay_codes.includes(item.code)}
                                    onChange={(event) =>
                                        form.setData(
                                            'barangay_codes',
                                            event.target.checked
                                                ? [...form.data.barangay_codes, item.code]
                                                : form.data.barangay_codes.filter((code) => code !== item.code),
                                        )
                                    }
                                />
                                {item.name}
                                {existing.has(item.code) && <span className="ml-auto text-xs">Rate exists</span>}
                            </label>
                        ))}
                        {!visible.length && (
                            <p className="text-muted-foreground p-4 text-sm">
                                {barangays.loading
                                    ? 'Loading barangays...'
                                    : !form.data.city_code
                                      ? 'Choose a municipality / city first.'
                                      : 'No matching barangays.'}
                            </p>
                        )}
                    </div>
                    <InputError id="barangay-selection-error" message={selectionError || barangays.error} />
                </fieldset>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                    label="Base fee (₱)"
                    reserveFeedback={false}
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    required
                    value={form.data.base_fee}
                    error={form.errors.base_fee}
                    onChange={(event) => form.setData('base_fee', event.target.value)}
                />
                <Field
                    label="Extra kilogram fee (₱)"
                    reserveFeedback={false}
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    required
                    value={form.data.extra_kg_fee}
                    error={form.errors.extra_kg_fee}
                    onChange={(event) => form.setData('extra_kg_fee', event.target.value)}
                />
                <Field
                    label="Included weight (kg)"
                    reserveFeedback={false}
                    type="number"
                    min="0.001"
                    max="50"
                    step="0.001"
                    required
                    value={form.data.included_weight_grams / 1000}
                    error={form.errors.included_weight_grams}
                    onChange={(event) => form.setData('included_weight_grams', Math.round(Number(event.target.value) * 1000))}
                />
                <Field
                    label="Maximum weight (kg)"
                    reserveFeedback={false}
                    type="number"
                    min={form.data.included_weight_grams / 1000}
                    max="50"
                    step="0.001"
                    required
                    value={form.data.max_weight_grams / 1000}
                    error={form.errors.max_weight_grams}
                    onChange={(event) => form.setData('max_weight_grams', Math.round(Number(event.target.value) * 1000))}
                />
            </div>
            <label className="flex min-h-6 items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    className="accent-primary size-4"
                    checked={form.data.is_active}
                    onChange={(event) => form.setData('is_active', event.target.checked)}
                />
                Publish rates for new orders
            </label>
            <InputError message={form.errors.is_active} />
            <section aria-label="Rate preview" className="bg-accent/40 space-y-3 rounded-xl border p-4">
                <div className="flex items-center gap-4">
                    <span className="coverage-stat-icon">
                        <Package aria-hidden="true" />
                    </span>
                    <div>
                        <h3 className="text-muted-foreground text-xs">Rate assignment preview</h3>
                        <p className="mt-1 font-semibold tabular-nums">
                            {selectedCount} {selectedCount === 1 ? 'barangay' : 'barangays'} · {money(form.data.base_fee || 0)} base fee
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">{money(form.data.extra_kg_fee || 0)} per extra kilogram</p>
                        <p className="sr-only">{municipality}</p>
                    </div>
                </div>
            </section>
            <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
                <button type="button" className={secondaryClass} disabled={form.processing} onClick={close}>
                    Cancel
                </button>
                <button className={buttonClass} disabled={form.processing || (!rate && (!selectedCount || barangays.loading || !!barangays.error))}>
                    <Check aria-hidden="true" className="size-4" />
                    {form.processing
                        ? 'Saving...'
                        : rate
                          ? 'Apply Rates'
                          : `Apply rates to ${selectedCount} ${selectedCount === 1 ? 'barangay' : 'barangays'}`}
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
                        <DialogTitle>Publish shipping rates?</DialogTitle>
                        <DialogDescription>New orders will use these barangay rates. Existing orders keep their original fees.</DialogDescription>
                    </DialogHeader>
                    <p className="text-sm">
                        {money(form.data.base_fee)} covers {form.data.included_weight_grams / 1000} kg, plus {money(form.data.extra_kg_fee)} per
                        started extra kilogram. Maximum: {form.data.max_weight_grams / 1000} kg.
                    </p>
                    {!pricingEnabled && (
                        <p className="text-muted-foreground text-sm">
                            First publication activates logistics quotes at checkout. Prepare seller pickup areas, buyer destinations, and packed
                            product weights before continuing.
                        </p>
                    )}
                    <div className="flex justify-end gap-3">
                        <button type="button" className={secondaryClass} disabled={form.processing} onClick={() => setReview(false)}>
                            Go back
                        </button>
                        <button type="button" className={buttonClass} disabled={form.processing} onClick={save}>
                            {form.processing ? 'Publishing...' : 'Publish rates'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </ValidatedForm>
    );
}

export default function ShippingRates({ centers, rates, pricingEnabled }: { centers: Center[]; rates: Rate[]; pricingEnabled: boolean }) {
    const [editing, setEditing] = useState<Rate | null | undefined>();
    const [confirm, setConfirm] = useState<Rate | null>(null);
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const addButton = useRef<HTMLButtonElement>(null);
    const lastAction = useRef<HTMLButtonElement | null>(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const published = rates.filter((rate) => rate.is_active).length;
    const visible = rates.filter(
        (rate) =>
            (!search.trim() ||
                [rate.area_name, rate.barangay_name, rate.city_name, rate.province_name, rate.center_name]
                    .join(' ')
                    .toLocaleLowerCase()
                    .includes(search.trim().toLocaleLowerCase())) &&
            (!status || (status === 'published' ? !!rate.is_active : !rate.is_active)),
    );
    return (
        <Page title="Coverage & Rates" description="Manage rider coverage areas and set shipping rates for your service locations.">
            <section className="coverage-workspace space-y-5">
                <LogisticsWorkspaceTabs section="coverage" />
                <div className="flex flex-wrap items-center gap-4">
                    <div className="coverage-stat">
                        <span className="coverage-stat-icon">
                            <Tag aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-xs font-semibold">Published Rates</p>
                            <p className="text-2xl font-semibold tabular-nums">{published}</p>
                        </div>
                        <Check aria-hidden="true" className="text-success ml-auto size-5" />
                    </div>
                    <div className="coverage-stat">
                        <span className="coverage-stat-icon bg-warning/10 text-warning">
                            <FileText aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-xs font-semibold">Draft Rates</p>
                            <p className="text-2xl font-semibold tabular-nums">{rates.length - published}</p>
                        </div>
                    </div>
                    <button
                        ref={addButton}
                        className={buttonClass + ' ml-auto'}
                        disabled={!centers.length}
                        onClick={() => {
                            lastAction.current = null;
                            setEditing(null);
                        }}
                    >
                        <Plus aria-hidden="true" className="size-4" />
                        Add Shipping Rates
                    </button>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                    <label className="relative min-w-0 flex-1">
                        <span className="sr-only">Search shipping rates</span>
                        <Search aria-hidden="true" className="text-muted-foreground absolute top-3 left-4 size-5" />
                        <input
                            type="search"
                            className={inputClass + ' pl-12'}
                            placeholder="Search barangay, municipality, or province..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                    <select
                        aria-label="Publication status"
                        className={inputClass + ' sm:w-48'}
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                    </select>
                </div>
                {visible.length ? (
                    <div className="overflow-x-auto rounded-2xl border" role="region" aria-label="Shipping rates" tabIndex={0}>
                        <table aria-label="Barangay shipping rates" className="w-full min-w-[680px] text-left text-sm">
                            <thead className="bg-accent/70">
                                <tr>
                                    {['Service Area', 'Base Fee', 'Extra / kg', 'Max. Weight', 'Status', 'Actions'].map((label) => (
                                        <th scope="col" key={label} className="px-4 py-3 font-medium">
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-card/80 divide-y">
                                {visible.map((rate) => (
                                    <tr key={rate.id}>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="bg-accent/60 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                                                    <MapPin aria-hidden="true" className="size-5" />
                                                </span>
                                                <div>
                                                    <p className="font-semibold">{rate.barangay_name || rate.area_name.split(',')[0]}</p>
                                                    <p className="text-muted-foreground mt-1">
                                                        {[rate.city_name, rate.province_name].filter(Boolean).join(', ') ||
                                                            rate.area_name.split(',').slice(1).join(',').trim()}
                                                    </p>
                                                    {centers.length > 1 && <p className="text-muted-foreground text-xs">{rate.center_name}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 tabular-nums">
                                            <p className="font-semibold">{money(rate.base_fee_cents / 100)}</p>
                                            <p className="text-muted-foreground mt-1 text-xs">Up to {rate.included_weight_grams / 1000} kg</p>
                                        </td>
                                        <td className="px-4 py-4 font-semibold tabular-nums">{money(rate.extra_kg_fee_cents / 100)}</td>
                                        <td className="px-4 py-4 tabular-nums">{rate.max_weight_grams / 1000} kg</td>
                                        <td className="px-4 py-4">
                                            <Badge status={rate.is_active ? 'published' : 'draft'} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        className="hover:bg-accent focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-xl border focus-visible:ring-2"
                                                        aria-label={`Actions for ${rate.area_name}`}
                                                        onClick={(event) => {
                                                            lastAction.current = event.currentTarget;
                                                        }}
                                                    >
                                                        <MoreHorizontal className="size-5" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => setEditing(rate)}>Edit rate</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => setConfirm(rate)}>
                                                        {rate.is_active ? 'Pause rate' : 'Publish rate'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty
                        title={rates.length ? 'No matching rates' : 'No shipping rates yet'}
                        description={
                            centers.length
                                ? 'Add shipping rates for the barangays your center serves, or adjust your filters.'
                                : 'An approved logistics center is required before adding rates.'
                        }
                    />
                )}
                <p role="status" className="text-muted-foreground px-1 text-sm">
                    {visible.length} of {rates.length} rates
                </p>
            </section>
            <Dialog
                open={editing !== undefined}
                onOpenChange={(open) => {
                    if (!open && !saving) setEditing(undefined);
                }}
            >
                <DialogContent
                    className="coverage-rate-panel"
                    overlayClassName="coverage-dialog-overlay"
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        (lastAction.current?.isConnected ? lastAction.current : addButton.current)?.focus();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{editing ? 'Edit Shipping Rate' : 'Add Shipping Rates'}</DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Edit this barangay independently. Other rates stay unchanged.'
                                : 'Apply the same shipping rate to multiple barangays.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editing !== undefined && (
                        <RateEditor
                            key={editing?.id ?? 'new'}
                            centers={centers}
                            rates={rates}
                            rate={editing}
                            close={() => setEditing(undefined)}
                            pricingEnabled={pricingEnabled}
                            setSaving={setSaving}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!confirm}
                onOpenChange={(open) => {
                    if (!open && !busy) setConfirm(null);
                }}
            >
                <DialogContent
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        (lastAction.current?.isConnected ? lastAction.current : addButton.current)?.focus();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{confirm?.is_active ? 'Pause this rate?' : 'Publish this rate?'}</DialogTitle>
                        <DialogDescription>
                            {confirm?.area_name} will {confirm?.is_active ? 'stop being available' : 'be available'} for new checkout quotes. Existing
                            orders keep their fee.
                        </DialogDescription>
                    </DialogHeader>
                    {!pricingEnabled && !confirm?.is_active && (
                        <p className="text-sm">
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
                            {busy ? 'Saving...' : 'Confirm'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </Page>
    );
}
