import InputError from '@/components/auth/auth-feedback';
import RequiredMark from '@/components/auth/required-mark';
import { inputClass } from '@/components/shared/marketplace-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { uploadError } from '@/lib/registration-validation';
import { CircleCheck, Eye, FileText, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type SellerDetails = {
    business_permit: File | null;
    business_name: string;
    business_category_id: string;
    seller_type: string;
    tin: string;
    region_code: string;
    province_code: string;
    city_code: string;
    barangay_code: string;
    line1: string;
    house_number: string;
    street: string;
    zip: string;
    identity: File | null;
    dti_certificate: File | null;
    sec_certificate: File | null;
    bir_2303: File | null;
};
export const emptySellerDetails: SellerDetails = {
    business_permit: null,
    business_name: '',
    business_category_id: '',
    seller_type: '',
    tin: '',
    region_code: '',
    province_code: '',
    city_code: '',
    barangay_code: '',
    line1: '',
    house_number: '',
    street: '',
    zip: '',
    identity: null,
    dti_certificate: null,
    sec_certificate: null,
    bir_2303: null,
};
type Location = { code: string; name: string; postal_code?: string | null };
type DocumentKind = 'identity' | 'dti_certificate' | 'sec_certificate' | 'bir_2303' | 'business_permit';
export type CompanyDetails = { sec_number: string; position: string; service_regions: string[] };
export const emptyCompanyDetails: CompanyDetails = { sec_number: '', position: '', service_regions: [] };
type Props = {
    data: SellerDetails & Partial<CompanyDetails>;
    errors: Partial<Record<keyof (SellerDetails & CompanyDetails), string>>;
    set: (key: keyof (SellerDetails & CompanyDetails), value: string | File | null | string[]) => void;
    company?: boolean;
    personalAddressOnly?: boolean;
    disabled: boolean;
    existing?: string[];
};

export function Upload<K extends string>({
    kind,
    label,
    file,
    error,
    set,
    disabled,
    existing,
}: {
    kind: K;
    label: string;
    file: File | null;
    error?: string;
    set: (kind: K, value: File | null) => void;
    disabled: boolean;
    existing: boolean;
}) {
    const [preview, setPreview] = useState('');
    const [previewOpen, setPreviewOpen] = useState(false);
    const ref = useRef<HTMLInputElement>(null);
    const fileError = error || (file ? uploadError(file) : undefined);
    const isPdf = file?.name.toLowerCase().endsWith('.pdf') ?? false;
    useEffect(() => {
        if (!file || uploadError(file)) {
            setPreview('');
            setPreviewOpen(false);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    return (
        <div className="grid content-start gap-2 self-start">
            <label htmlFor={`seller-${kind}`} className="min-h-5 text-sm font-medium">
                {label}
                {!existing && <RequiredMark />}
                {existing ? ' (saved; choose a file to replace)' : ' (required)'}
            </label>
            <input
                id={`seller-${kind}`}
                ref={ref}
                name={kind}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={disabled}
                required={!existing}
                className={inputClass}
                aria-invalid={!!fileError}
                aria-describedby={`seller-${kind}-hint${fileError ? ` seller-${kind}-error` : ''}`}
                onChange={(event) => set(kind, event.target.files?.[0] ?? null)}
            />
            <p id={`seller-${kind}-hint`} className="text-muted-foreground text-xs">
                JPG, PNG or PDF, up to 5 MB per file. Use a clear, readable document.
            </p>
            <div className="flex h-32 min-w-0 flex-col gap-2">
                {file && (
                    <div className="bg-muted/40 flex min-h-0 min-w-0 flex-1 items-start gap-3 overflow-y-auto rounded-xl border p-3">
                        {fileError ? (
                            <FileText className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
                        ) : (
                            <CircleCheck className="text-success size-5 shrink-0" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium break-all">{file.name}</p>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {(file.size / 1048576).toFixed(2)} MB · {fileError ? 'Needs attention' : 'Selected; checked again on submission'}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive flex size-11 shrink-0 items-center justify-center rounded-lg"
                            disabled={disabled}
                            aria-label={`Remove ${label}`}
                            onClick={() => {
                                set(kind, null);
                                if (ref.current) ref.current.value = '';
                            }}
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                )}
                {file && preview && !fileError && (
                    <>
                        <Button type="button" variant="outline" className="w-fit shrink-0" onClick={() => setPreviewOpen(true)}>
                            <Eye aria-hidden="true" />
                            View file
                        </Button>
                        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                            <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden !p-0 sm:max-w-4xl">
                                <DialogHeader className="border-b px-6 py-5 pr-14">
                                    <DialogTitle className="break-all">{label}</DialogTitle>
                                    <DialogDescription className="break-all">{file.name}</DialogDescription>
                                </DialogHeader>
                                <div className="min-h-0 overflow-auto p-4 sm:p-6">
                                    {isPdf ? (
                                        <div className="space-y-3">
                                            <iframe
                                                src={preview}
                                                title={`Preview of ${label}`}
                                                className="bg-card h-[min(70dvh,700px)] w-full rounded-lg border"
                                            />
                                            <a
                                                href={preview}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary inline-flex min-h-11 items-center font-medium underline underline-offset-4"
                                            >
                                                Open PDF in a new tab
                                            </a>
                                        </div>
                                    ) : (
                                        <img
                                            src={preview}
                                            alt={`Preview of selected ${label}`}
                                            className="mx-auto max-h-[min(70dvh,700px)] max-w-full rounded-lg object-contain"
                                        />
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </div>
            <InputError reserveSpace id={`seller-${kind}-error`} message={fileError} />
        </div>
    );
}

export default function SellerRegistrationFields({
    data,
    errors,
    set,
    disabled,
    existing = [],
    company = false,
    personalAddressOnly = false,
}: Props) {
    const fileKinds: DocumentKind[] = personalAddressOnly ? [] : ['identity', 'business_permit'];
    if (!company && data.seller_type === 'sole_proprietorship') fileKinds.push('dti_certificate', 'bir_2303');
    if (!company && data.seller_type === 'corporation') fileKinds.push('sec_certificate', 'bir_2303');
    if (company) fileKinds.push('sec_certificate', 'bir_2303');
    const [regions, setRegions] = useState<Location[]>([]);
    const [provinces, setProvinces] = useState<Location[]>([]);
    const [cities, setCities] = useState<Location[]>([]);
    const [barangays, setBarangays] = useState<Location[]>([]);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [loadError, setLoadError] = useState('');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        const fetchOptions = async (query: Record<string, string | number>, setter: (items: Location[]) => void) => {
            const response = await fetch(route('registration.options', query), {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });
            if (!response.ok) throw new Error('Registration selections are unavailable. Please retry.');
            setter(await response.json());
        };
        setLoadError('');
        setProvinces([]);
        setCities([]);
        setBarangays([]);
        const load = async () => {
            await fetchOptions({ regions: 1 }, setRegions);
            if (!company && !personalAddressOnly) {
                const response = await fetch(route('registration.options', { categories: 1 }), {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error('Shop categories are unavailable. Please retry.');
                setCategories(await response.json());
            }
            if (data.region_code) await fetchOptions({ region: data.region_code }, setProvinces);
            if (data.province_code) await fetchOptions({ province: data.province_code }, setCities);
            if (data.city_code) await fetchOptions({ city: data.city_code }, setBarangays);
        };
        void load().catch((error: unknown) => {
            if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load selections.');
        });
        return () => controller.abort();
    }, [data.region_code, data.province_code, data.city_code, retry, company, personalAddressOnly]);
    const input = (key: keyof (SellerDetails & CompanyDetails), label: string, minLength?: number, maxLength?: number) => (
        <div className="grid content-start gap-2 self-start">
            <label htmlFor={`seller-${key}`} className="min-h-5 text-sm font-medium">
                {label}
                <RequiredMark />
            </label>
            <input
                id={`seller-${key}`}
                name={key}
                className={inputClass}
                required
                disabled={disabled}
                value={String(data[key] ?? '')}
                minLength={minLength}
                maxLength={maxLength}
                aria-invalid={!!errors[key]}
                aria-describedby={`seller-${key}-error`}
                onChange={(event) => set(key, event.target.value)}
            />
            <InputError reserveSpace id={`seller-${key}-error`} message={errors[key]} />
        </div>
    );
    const select = (key: keyof SellerDetails, label: string, items: { value: string; label: string }[], parents = true) => (
        <div className="grid content-start gap-2 self-start">
            <label htmlFor={`seller-${key}`} className="min-h-5 text-sm font-medium">
                {label}
                <RequiredMark />
            </label>
            <select
                id={`seller-${key}`}
                name={key}
                className={inputClass}
                value={String(data[key])}
                required
                disabled={disabled || !parents}
                aria-invalid={!!errors[key]}
                aria-describedby={`seller-${key}-error`}
                onChange={(event) => {
                    set(key, event.target.value);
                    if (key === 'region_code') {
                        set('province_code', '');
                        set('city_code', '');
                        set('barangay_code', '');
                    }
                    if (key === 'province_code') {
                        set('city_code', '');
                        set('barangay_code', '');
                    }
                    if (['region_code', 'province_code'].includes(key)) set('zip', '');
                    if (key === 'city_code') {
                        set('barangay_code', '');
                        set('zip', cities.find((city) => city.code === event.target.value)?.postal_code ?? '');
                    }
                    if (key === 'seller_type') {
                        set('dti_certificate', null);
                        set('sec_certificate', null);
                        set('bir_2303', null);
                    }
                }}
            >
                <option value="">Choose {label.toLowerCase()}</option>
                {items.map((item) => (
                    <option key={item.value} value={item.value}>
                        {item.label}
                    </option>
                ))}
            </select>
            <InputError reserveSpace id={`seller-${key}-error`} message={errors[key]} />
        </div>
    );
    const options = (items: Location[]) => items.map((item) => ({ value: item.code, label: item.name }));
    return (
        <fieldset disabled={disabled} className="grid min-w-0 items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <legend className="mb-4 font-semibold">
                {personalAddressOnly ? 'Residential address' : company ? 'Company and registration documents' : 'Shop and registration documents'}
            </legend>
            {loadError && (
                <div role="alert" className="col-span-full">
                    <p>{loadError}</p>
                    <button type="button" className="min-h-11 underline" onClick={() => setRetry(retry + 1)}>
                        Retry selections
                    </button>
                </div>
            )}
            {!personalAddressOnly && input('business_name', company ? 'Company name' : 'Shop name', company ? 1 : 3, company ? 160 : 30)}
            {company && (
                <>
                    {input('sec_number', 'SEC registration number (CS202012345)', 11, 11)}
                    {input('position', 'Contact person position', 1, 100)}
                    <fieldset className="col-span-full grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <legend className="mb-2 text-sm font-medium">
                            Service areas — select at least one region
                            <RequiredMark />
                        </legend>
                        <p role="status" className="text-muted-foreground col-span-full mb-1 text-xs">
                            {data.service_regions?.length ?? 0} regions selected
                        </p>
                        {regions.map((region) => (
                            <label
                                key={region.code}
                                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors motion-reduce:transition-none ${data.service_regions?.includes(region.code) ? 'border-primary bg-accent text-primary' : 'bg-card hover:border-primary/50 hover:bg-accent/40'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    className="accent-primary focus-visible:ring-ring size-4 shrink-0 focus-visible:ring-2 focus-visible:ring-offset-2"
                                    name="service_regions"
                                    value={region.code}
                                    checked={data.service_regions?.includes(region.code) ?? false}
                                    disabled={disabled}
                                    onChange={(event) =>
                                        set(
                                            'service_regions',
                                            event.target.checked
                                                ? [...(data.service_regions ?? []), region.code]
                                                : (data.service_regions ?? []).filter((code) => code !== region.code),
                                        )
                                    }
                                />
                                {region.name}
                            </label>
                        ))}
                        <div className="col-span-full">
                            <InputError message={errors.service_regions} />
                        </div>
                    </fieldset>
                </>
            )}
            {!company &&
                !personalAddressOnly &&
                select(
                    'business_category_id',
                    'Shop category',
                    categories.map((item) => ({ value: String(item.id), label: item.name })),
                )}
            {!company &&
                !personalAddressOnly &&
                select('seller_type', 'Seller type', [
                    { value: 'individual', label: 'Individual' },
                    { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
                    { value: 'corporation', label: 'Corporation' },
                ])}
            {!personalAddressOnly && input('tin', 'TIN (000-000-000-000)', 15, 15)}
            <div className="col-span-full border-t pt-6">
                <h3 className="font-semibold">{personalAddressOnly ? 'Address' : 'Business address'}</h3>
                <p className="text-muted-foreground mt-1 text-sm">Choose your region first. Each address list depends on the previous selection.</p>
            </div>
            {select('region_code', 'Region', options(regions))}
            {select('province_code', 'Province', options(provinces), !!data.region_code)}
            {select('city_code', 'City / municipality', options(cities), !!data.province_code)}
            {select('barangay_code', 'Barangay', options(barangays), !!data.city_code)}
            {input('house_number', 'House / unit number', 1, 30)}
            {input('street', 'Street / subdivision', 1, 160)}
            {input('zip', 'Postal code', 4, 4)}
            <p className="text-muted-foreground col-span-full text-xs">
                Postal code fills automatically when a city match is available. Confirm it for your address; some cities have several ZIP codes.
            </p>
            {!personalAddressOnly && (
                <div className="col-span-full border-t pt-6">
                    <h3 className="font-semibold">Required documents</h3>
                    <p className="text-muted-foreground mt-1 text-sm">Only documents required for your selected account type are shown.</p>
                </div>
            )}
            {fileKinds.map((kind) => (
                <Upload
                    key={kind}
                    kind={kind}
                    label={
                        {
                            identity: 'Government-issued ID',
                            dti_certificate: 'DTI certificate',
                            sec_certificate: 'SEC certificate',
                            bir_2303: 'BIR Form 2303',
                            business_permit: "Mayor's / business permit",
                        }[kind]
                    }
                    file={data[kind]}
                    error={errors[kind]}
                    set={set}
                    disabled={disabled}
                    existing={existing.includes(kind)}
                />
            ))}
        </fieldset>
    );
}
