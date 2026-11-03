import { Select, secondaryClass } from '@/components/shared/marketplace-ui';
import { useEffect, useState } from 'react';

type Location = { code: string; name: string; postal_code?: string | null };
export type AddressSelection = { region_code: string; province_code: string; city_code: string; barangay_code: string };

function useLocations(query: string | null, retry: number) {
    const [result, setResult] = useState<{ query: string; items: Location[]; error: string; retry: number }>();
    useEffect(() => {
        if (query === null) return;
        const controller = new AbortController();
        void fetch(route('registration.options') + query, { headers: { Accept: 'application/json' }, signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) throw new Error('Address choices could not be loaded. Retry to continue.');
                const items = (await response.json()) as Location[];
                if (!controller.signal.aborted) setResult({ query, items, error: '', retry });
            })
            .catch(() => {
                if (!controller.signal.aborted)
                    setResult({ query, items: [], error: 'Address choices could not be loaded. Retry to continue.', retry });
            });
        return () => controller.abort();
    }, [query, retry]);
    const current = result?.query === query && result?.retry === retry ? result : undefined;
    return { items: current?.items ?? [], error: current?.error, loading: query !== null && !current };
}

export default function AddressLocationFields({
    data,
    errors,
    disabled,
    onChange,
}: {
    data: AddressSelection;
    errors: Partial<Record<keyof AddressSelection, string>>;
    disabled: boolean;
    onChange: (values: Partial<AddressSelection> & { zip?: string }) => void;
}) {
    const [retry, setRetry] = useState(0);
    const regions = useLocations('?regions=1', retry);
    const provinces = useLocations(data.region_code ? '?region=' + data.region_code : null, retry);
    const cities = useLocations(data.province_code ? '?province=' + data.province_code : null, retry);
    const barangays = useLocations(data.city_code ? '?city=' + data.city_code : null, retry);
    const error = regions.error || provinces.error || cities.error || barangays.error;
    const choices = [
        { key: 'region_code', label: 'Region', result: regions, available: true },
        { key: 'province_code', label: 'Province / NCR', result: provinces, available: !!data.region_code },
        { key: 'city_code', label: 'City / municipality', result: cities, available: !!data.province_code },
        { key: 'barangay_code', label: 'Barangay', result: barangays, available: !!data.city_code },
    ] as const;
    return (
        <>
            {choices.map(({ key, label, result, available }) => (
                <Select
                    key={key}
                    id={'address-' + key}
                    name={key}
                    label={label}
                    required
                    value={data[key]}
                    disabled={disabled || !available || result.loading || !!result.error}
                    error={errors[key]}
                    onChange={(event) => {
                        const value = event.target.value;
                        if (key === 'region_code') onChange({ region_code: value, province_code: '', city_code: '', barangay_code: '', zip: '' });
                        if (key === 'province_code') onChange({ province_code: value, city_code: '', barangay_code: '', zip: '' });
                        if (key === 'city_code')
                            onChange({
                                city_code: value,
                                barangay_code: '',
                                zip: cities.items.find((item) => item.code === value)?.postal_code ?? '',
                            });
                        if (key === 'barangay_code') onChange({ barangay_code: value });
                    }}
                >
                    <option value="">{result.loading ? 'Loading choices...' : 'Choose ' + label.toLowerCase()}</option>
                    {result.items.map((item) => (
                        <option key={item.code} value={item.code}>
                            {item.name}
                        </option>
                    ))}
                </Select>
            ))}
            {error && (
                <div className="sm:col-span-2">
                    <p role="alert" className="text-destructive mb-2 text-sm">
                        {error}
                    </p>
                    <button type="button" className={secondaryClass} disabled={disabled} onClick={() => setRetry((value) => value + 1)}>
                        Retry address choices
                    </button>
                </div>
            )}
            {[regions, provinces, cities, barangays].some((result) => result.loading) && (
                <p role="status" className="text-muted-foreground text-sm sm:col-span-2">
                    Loading address choices...
                </p>
            )}
        </>
    );
}
