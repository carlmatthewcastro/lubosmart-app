import AuthFeedback from '@/components/auth/auth-feedback';
import RequiredMark from '@/components/auth/required-mark';
import { Upload } from '@/components/auth/seller-registration-fields';
import { inputClass } from '@/components/shared/marketplace-ui';
import { useEffect, useState } from 'react';

export type RiderDetails = {
    middle_initial: string;
    sex: string;
    vehicle_type: string;
    plate_number: string;
    sorting_center_id: string;
    province_code: string;
    city_code: string;
    barangay_code: string;
    line1: string;
    house_number: string;
    street: string;
    zip: string;
    identity: File | null;
    license: File | null;
    vehicle_registration: File | null;
};
export const emptyRiderDetails: RiderDetails = {
    middle_initial: '',
    sex: '',
    vehicle_type: '',
    plate_number: '',
    sorting_center_id: '',
    province_code: '',
    city_code: '',
    barangay_code: '',
    line1: '',
    house_number: '',
    street: '',
    zip: '',
    identity: null,
    license: null,
    vehicle_registration: null,
};
type Location = { code: string; name: string; postal_code?: string | null };
function useRegistrationLocations(query: string | null, retry: number) {
    const [result, setResult] = useState<{ query: string | null; items: Location[] }>({ query: null, items: [] });
    const [error, setError] = useState('');
    useEffect(() => {
        if (query === null) return;
        const controller = new AbortController();
        setError('');
        void fetch(route('registration.options') + query, { headers: { Accept: 'application/json' }, signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) throw new Error('Address choices could not be loaded. Retry to continue.');
                return (await response.json()) as Location[];
            })
            .then((items) => {
                if (!controller.signal.aborted) setResult({ query, items });
            })
            .catch((error) => {
                if (!controller.signal.aborted) setError(error.message);
            });
        return () => controller.abort();
    }, [query, retry]);
    return { items: result.query === query ? result.items : [], error };
}
export default function RiderRegistrationFields({
    data,
    errors,
    centers,
    disabled,
    set,
}: {
    data: RiderDetails;
    errors: Record<string, string>;
    centers: { id: number; name: string }[];
    disabled: boolean;
    set: (key: keyof RiderDetails, value: string | File | null) => void;
}) {
    const [retry, setRetry] = useState(0);
    const provinces = useRegistrationLocations('', retry);
    const cities = useRegistrationLocations(data.province_code ? '?province=' + data.province_code : null, retry);
    const barangays = useRegistrationLocations(data.city_code ? '?city=' + data.city_code : null, retry);
    const select = (key: keyof RiderDetails, label: string, items: { value: string; label: string }[], unavailable = false) => (
        <div className="grid content-start gap-2 self-start">
            <label htmlFor={'rider-' + key} className="min-h-5 text-sm font-medium">
                {label}
                <RequiredMark />
            </label>
            <select
                id={'rider-' + key}
                name={key}
                value={String(data[key])}
                className={inputClass}
                required
                disabled={disabled || unavailable}
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? 'rider-' + key + '-error' : undefined}
                onChange={(event) => {
                    set(key, event.target.value);
                    if (key === 'province_code') {
                        set('zip', '');
                        set('city_code', '');
                        set('barangay_code', '');
                    }
                    if (key === 'city_code') {
                        set('barangay_code', '');
                        set('zip', cities.items.find((city) => city.code === event.target.value)?.postal_code ?? '');
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
            <AuthFeedback reserveSpace id={'rider-' + key + '-error'} message={errors[key]} />
        </div>
    );
    const input = (
        key: 'middle_initial' | 'plate_number' | 'line1' | 'zip' | 'house_number' | 'street',
        label: string,
        maxLength: number,
        required = true,
    ) => (
        <div className="grid content-start gap-2 self-start">
            <label htmlFor={'rider-' + key} className="min-h-5 text-sm font-medium">
                {label}
                {required && <RequiredMark />}
            </label>
            <input
                id={'rider-' + key}
                name={key}
                value={data[key]}
                maxLength={maxLength}
                required={required}
                disabled={disabled}
                className={inputClass}
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? 'rider-' + key + '-error' : undefined}
                onChange={(event) => set(key, event.target.value)}
            />
            <AuthFeedback reserveSpace id={'rider-' + key + '-error'} message={errors[key]} />
        </div>
    );
    const locations = (items: Location[]) => items.map((item) => ({ value: item.code, label: item.name }));
    return (
        <fieldset disabled={disabled} className="grid min-w-0 items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <legend className="mb-4 font-semibold">Rider details</legend>
            {select(
                'sorting_center_id',
                'Logistics center',
                centers.map((center) => ({ value: String(center.id), label: center.name })),
            )}
            {!centers.length && (
                <p role="status" className="text-muted-foreground col-span-full text-sm">
                    No approved Logistics centers are available yet. Please return when a center is available.
                </p>
            )}
            {select(
                'vehicle_type',
                'Vehicle',
                ['motorcycle', 'bicycle', 'car', 'van', 'truck'].map((value) => ({ value, label: value })),
            )}
            {input('plate_number', 'Plate number', 30)}
            <h3 className="col-span-full border-t pt-5 font-semibold">Contact address</h3>
            {select('province_code', 'Province / NCR', locations(provinces.items))}
            {select('city_code', 'City / municipality', locations(cities.items), !data.province_code)}
            {select('barangay_code', 'Barangay', locations(barangays.items), !data.city_code)}
            {input('house_number', 'House / unit number', 30)}
            {input('street', 'Street / subdivision', 160)}
            {input('zip', 'Postal code', 4)}
            <p className="text-muted-foreground col-span-full text-xs">
                Postal code fills automatically when a city match is available. Confirm it for your address; some cities have several ZIP codes.
            </p>
            {(provinces.error || cities.error || barangays.error) && (
                <div className="col-span-full">
                    <AuthFeedback message={provinces.error || cities.error || barangays.error} />
                    <button type="button" onClick={() => setRetry(retry + 1)} className="text-primary min-h-11 underline">
                        Retry address choices
                    </button>
                </div>
            )}
            <h3 className="col-span-full border-t pt-5 font-semibold">Required documents</h3>
            {(['identity', 'license', 'vehicle_registration'] as const).map((kind) => (
                <Upload
                    key={kind}
                    kind={kind}
                    label={kind === 'identity' ? 'Government-issued ID' : kind === 'license' ? "Driver's license" : 'Vehicle OR/CR'}
                    file={data[kind]}
                    error={errors[kind]}
                    disabled={disabled}
                    existing={false}
                    set={set}
                />
            ))}
        </fieldset>
    );
}
