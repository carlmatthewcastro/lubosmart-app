import { Card, Select, buttonClass, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { useForm } from '@inertiajs/react';
import { Building2, Map, MapPin, Package, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

type Location = { code: string; name: string };
type Option = { id: number; name: string };
export function useLocations(query: string | null) {
    const [items, setItems] = useState<Location[]>([]);
    const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
    const [failure, setFailure] = useState<{ query: string; message: string } | null>(null);
    useEffect(() => {
        if (query === null) return;
        const controller = new AbortController();
        fetch(`/locations${query}`, { signal: controller.signal, headers: { Accept: 'application/json' } })
            .then(async (response) => {
                if (!response.ok) throw new Error('Address choices could not be loaded. Please try again.');
                return response.json() as Promise<Location[]>;
            })
            .then((data) => {
                setItems(data);
                setLoadedQuery(query);
                setFailure(null);
            })
            .catch((exception: Error) => {
                if (!controller.signal.aborted) setFailure({ query, message: exception.message });
            });
        return () => controller.abort();
    }, [query]);
    const error = failure && failure.query === query ? failure.message : '';
    return { items: query === null || loadedQuery !== query ? [] : items, error, loading: query !== null && loadedQuery !== query && !error };
}

export default function RiderServiceAreaForm({
    centers,
    riders,
    close,
    onProcessingChange,
}: {
    centers: Option[];
    riders: (Option & { logistics_center_id: number })[];
    close?: () => void;
    onProcessingChange?: (processing: boolean) => void;
}) {
    const form = useForm({ logistics_center_id: centers[0]?.id.toString() ?? '', rider_id: '', province_code: '', city_code: '', barangay_code: '' });
    const provinces = useLocations('');
    const cities = useLocations(form.data.province_code ? `?province=${form.data.province_code}` : null);
    const barangays = useLocations(form.data.city_code ? `?city=${form.data.city_code}` : null);
    const locations = [
        ['province_code', 'Province', provinces],
        ['city_code', 'Municipality / City', cities],
        ['barangay_code', 'Barangay', barangays],
    ] as const;
    const destination = locations
        .map(([key, , choices]) => choices.items.find((item) => item.code === form.data[key])?.name)
        .reverse()
        .filter(Boolean)
        .join(', ');
    const selectedRider = riders.find((rider) => rider.id === Number(form.data.rider_id));
    const selectedCenter = centers.find((center) => center.id === Number(form.data.logistics_center_id));
    const Container = close ? 'div' : Card;
    return (
        <Container className={close ? 'coverage-editor' : undefined}>
            {!close && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold">Assign rider coverage</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Choose a rider and destination barangay before assigning deliveries in that area.
                    </p>
                </div>
            )}
            <ValidatedForm
                confirmation={{
                    title: 'Assign rider coverage?',
                    description: `Assign ${selectedRider?.name ?? 'this rider'} at ${selectedCenter?.name ?? 'this center'} to ${destination || 'the selected destination'}? This coverage determines which delivery assignments are permitted.`,
                    confirmLabel: 'Assign coverage',
                }}
                className="space-y-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (form.processing) return;
                    form.post('/rider-service-areas', {
                        preserveScroll: true,
                        onStart: () => onProcessingChange?.(true),
                        onFinish: () => onProcessingChange?.(false),
                        onSuccess: close,
                    });
                }}
            >
                <div className="grid gap-4">
                    <div className="coverage-location-field">
                        {close && <Package aria-hidden="true" />}
                        <Select
                            label="Logistics center"
                            reserveFeedback={false}
                            error={form.errors.logistics_center_id}
                            required
                            value={form.data.logistics_center_id}
                            onChange={(event) => {
                                form.setData('logistics_center_id', event.target.value);
                                form.setData('rider_id', '');
                            }}
                        >
                            {centers.map((center) => (
                                <option key={center.id} value={center.id}>
                                    {center.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="coverage-location-field">
                        {close && <UserRound aria-hidden="true" />}
                        <Select
                            label="Approved rider"
                            reserveFeedback={false}
                            error={form.errors.rider_id}
                            required
                            value={form.data.rider_id}
                            onChange={(event) => form.setData('rider_id', event.target.value)}
                        >
                            <option value="">Choose a rider</option>
                            {riders
                                .filter((rider) => rider.logistics_center_id === Number(form.data.logistics_center_id))
                                .map((rider) => (
                                    <option key={rider.id} value={rider.id}>
                                        {rider.name}
                                    </option>
                                ))}
                        </Select>
                    </div>
                </div>
                <fieldset className="min-w-0 border-t pt-4">
                    <legend className="pr-3 text-sm font-medium">Destination coverage</legend>
                    <div className="grid gap-4">
                        {locations.map(([key, label, choices]) => (
                            <div key={key} className="coverage-location-field">
                                {close &&
                                    (key === 'province_code' ? (
                                        <Map aria-hidden="true" />
                                    ) : key === 'city_code' ? (
                                        <Building2 aria-hidden="true" />
                                    ) : (
                                        <MapPin aria-hidden="true" />
                                    ))}
                                <Select
                                    label={label}
                                    aria-busy={choices.loading}
                                    reserveFeedback={false}
                                    error={form.errors[key] || choices.error}
                                    disabled={
                                        choices.loading ||
                                        (key === 'city_code' && !form.data.province_code) ||
                                        (key === 'barangay_code' && !form.data.city_code)
                                    }
                                    required
                                    value={form.data[key]}
                                    onChange={(event) => {
                                        form.setData(key, event.target.value);
                                        if (key === 'province_code') {
                                            form.setData('city_code', '');
                                            form.setData('barangay_code', '');
                                        }
                                        if (key === 'city_code') form.setData('barangay_code', '');
                                    }}
                                >
                                    <option value="">
                                        {choices.loading
                                            ? 'Loading choices…'
                                            : key === 'city_code' && !form.data.province_code
                                              ? 'Choose province first'
                                              : key === 'barangay_code' && !form.data.city_code
                                                ? 'Choose municipality / city first'
                                                : `Choose ${label.toLowerCase()}`}
                                    </option>
                                    {choices.items.map((item) => (
                                        <option key={item.code} value={item.code}>
                                            {item.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        ))}
                    </div>
                </fieldset>
                <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
                    {close && (
                        <button type="button" className={secondaryClass} disabled={form.processing} onClick={close}>
                            Cancel
                        </button>
                    )}
                    <button
                        className={buttonClass + ' w-full sm:w-auto'}
                        disabled={
                            form.processing ||
                            !form.data.rider_id ||
                            !form.data.barangay_code ||
                            provinces.loading ||
                            cities.loading ||
                            barangays.loading
                        }
                    >
                        {form.processing ? 'Saving coverage…' : 'Save Coverage'}
                    </button>
                </div>
            </ValidatedForm>
        </Container>
    );
}
