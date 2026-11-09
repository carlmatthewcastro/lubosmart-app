import { Card, inputClass, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';

const queues = [
    { key: 'all', label: 'All Parcels' },
    { key: 'pickups', label: 'Pickup Requests' },
    { key: 'incoming', label: 'Incoming' },
    { key: 'sorting', label: 'Sorting' },
    { key: 'dispatch', label: 'Dispatch' },
    { key: 'monitoring', label: 'Monitoring' },
    { key: 'exceptions', label: 'Exceptions / Returns' },
    { key: 'cash', label: 'Cash Handovers' },
];

export default function ParcelNavigation() {
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    return (
        <Card>
            <h2 className="text-lg font-semibold">Parcel operations</h2>
            <p className="text-muted-foreground mt-2 text-sm">Open a queue or find a parcel by tracking reference or store name.</p>
            <nav aria-label="Parcel queues" className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {queues.map((queue) => (
                    <Link
                        key={queue.key}
                        href={`/deliveries?${new URLSearchParams({ stage: queue.key, ...(search.trim() ? { search: search.trim() } : {}) })}`}
                        className="text-muted-foreground hover:bg-accent hover:text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-xl px-3.5 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                    >
                        {queue.label}
                    </Link>
                ))}
            </nav>
            <ValidatedForm
                className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    router.get(
                        '/deliveries',
                        { stage: 'all', search: search.trim() },
                        { onStart: () => setLoading(true), onFinish: () => setLoading(false) },
                    );
                }}
            >
                <div className="min-w-0 flex-1 basis-64">
                    <label htmlFor="dashboard-parcel-search" className="text-sm font-medium">
                        Find a parcel or seller
                    </label>
                    <input
                        id="dashboard-parcel-search"
                        type="search"
                        maxLength={100}
                        className={`${inputClass} mt-2`}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by tracking reference or store name"
                    />
                </div>
                <button className={secondaryClass} disabled={loading}>
                    <Search className="size-4" aria-hidden="true" />
                    {loading ? 'Searching…' : 'Search'}
                </button>
            </ValidatedForm>
        </Card>
    );
}
