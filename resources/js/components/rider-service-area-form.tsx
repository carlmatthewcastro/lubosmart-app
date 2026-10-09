import InputError from '@/components/input-error';
import { Card, Select, buttonClass } from '@/components/marketplace-ui';
import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Location = { code: string; name: string };
type Option = { id: number; name: string };
function useLocations(query: string | null) {
    const [items, setItems] = useState<Location[]>([]);
    const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
    const [error, setError] = useState('');
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
                setError('');
            })
            .catch((exception: Error) => {
                if (!controller.signal.aborted) setError(exception.message);
            });
        return () => controller.abort();
    }, [query]);
    return { items: query === null || loadedQuery !== query ? [] : items, error };
}

export default function RiderServiceAreaForm({ centers, riders }: { centers: Option[]; riders: (Option & { sorting_center_id: number })[] }) {
    const form = useForm({ sorting_center_id: centers[0]?.id.toString() ?? '', rider_id: '', province_code: '', city_code: '', barangay_code: '' });
    const provinces = useLocations('');
    const cities = useLocations(form.data.province_code ? `?province=${form.data.province_code}` : null);
    const barangays = useLocations(form.data.city_code ? `?city=${form.data.city_code}` : null);
    const locations = [
        ['province_code', 'Province', provinces],
        ['city_code', 'Municipality / City', cities],
        ['barangay_code', 'Barangay', barangays],
    ] as const;
    return (
        <Card>
            <h2 className="font-semibold">Courier coverage areas</h2>
            <p className="text-muted-foreground mt-2 text-sm">Assign a barangay to a courier before assigning parcels in that area.</p>
            <form
                className="mt-4 grid gap-4 sm:grid-cols-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post('/rider-service-areas', { preserveScroll: true });
                }}
            >
                <Select
                    label="Logistics center"
                    required
                    value={form.data.sorting_center_id}
                    onChange={(event) => {
                        form.setData('sorting_center_id', event.target.value);
                        form.setData('rider_id', '');
                    }}
                >
                    {centers.map((center) => (
                        <option key={center.id} value={center.id}>
                            {center.name}
                        </option>
                    ))}
                </Select>
                <Select
                    label="Approved courier"
                    required
                    value={form.data.rider_id}
                    onChange={(event) => form.setData('rider_id', event.target.value)}
                >
                    <option value="">Choose a courier</option>
                    {riders
                        .filter((rider) => rider.sorting_center_id === Number(form.data.sorting_center_id))
                        .map((rider) => (
                            <option key={rider.id} value={rider.id}>
                                {rider.name}
                            </option>
                        ))}
                </Select>
                {locations.map(([key, label, choices]) => (
                    <div key={key}>
                        <Select
                            label={label}
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
                            <option value="">Choose {label.toLowerCase()}</option>
                            {choices.items.map((item) => (
                                <option key={item.code} value={item.code}>
                                    {item.name}
                                </option>
                            ))}
                        </Select>
                        <InputError message={form.errors[key] || choices.error} />
                    </div>
                ))}
                <InputError message={form.errors.rider_id || form.errors.sorting_center_id} />
                <button className={buttonClass} disabled={form.processing}>
                    Save coverage area
                </button>
            </form>
        </Card>
    );
}
