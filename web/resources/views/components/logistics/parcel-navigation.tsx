import { Card, inputClass, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Link, router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';

const queues = [
    { key: 'all', label: 'All Parcels' },
    { key: 'pickups', label: 'Pickup Requests' },
    { key: 'incoming', label: 'Incoming' },
    { key: 'sorting', label: 'For Sorting' },
    { key: 'dispatch', label: 'Ready for Delivery' },
    { key: 'monitoring', label: 'Delivery Progress' },
    { key: 'exceptions', label: 'Exceptions / Returns' },
    { key: 'cash', label: 'Cash Handovers' },
];

export default function ParcelNavigation({
    filters = {},
    records = false,
    delivery = false,
}: {
    filters?: { stage?: string; search?: string };
    records?: boolean;
    delivery?: boolean;
}) {
    const page = usePage();
    const stage = filters.stage ?? new URLSearchParams(page.url.split('?')[1]).get('stage') ?? 'all';
    const [search, setSearch] = useState(filters.search ?? '');
    const [loading, setLoading] = useState(false);
    return (
        <Card>
            <h2 className="text-lg font-semibold">{records ? 'Parcel records & handling history' : 'Parcel queues'}</h2>
            <p className="text-muted-foreground mt-2 text-sm">Open a queue or find a parcel by tracking reference or store name.</p>
            <nav aria-label="Parcel queues" className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {(delivery ? queues.filter((queue) => ['dispatch', 'monitoring', 'exceptions'].includes(queue.key)) : queues).map((queue) => (
                    <Link
                        key={queue.key}
                        href={`/deliveries?${new URLSearchParams({ stage: queue.key, ...(search.trim() ? { search: search.trim() } : {}), ...(records ? { view: 'records' } : {}) })}`}
                        aria-current={stage === queue.key ? 'page' : undefined}
                        className={`${stage === queue.key ? 'bg-accent text-primary' : 'text-muted-foreground'} hover:bg-accent hover:text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none`}
                    >
                        {delivery && queue.key === 'dispatch' ? 'Ready / assigned' : queue.label}
                    </Link>
                ))}
                {delivery && (
                    <Link href="/reports" className={secondaryClass}>
                        Completed deliveries
                    </Link>
                )}
            </nav>
            <ValidatedForm
                className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    router.get(
                        '/deliveries',
                        { stage, search: search.trim(), ...(records ? { view: 'records' } : {}) },
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

export function LogisticsWorkspaceTabs({ section }: { section: 'riders' | 'coverage' }) {
    const page = usePage();
    const path = page.url.split('?')[0];
    const links =
        section === 'riders'
            ? [
                  { label: 'Company riders', href: '/logistics/riders' },
                  { label: 'Rider applications', href: '/reviews' },
              ]
            : [
                  { label: 'Rider coverage', href: '/logistics/rider-coverage' },
                  { label: 'Shipping rates', href: '/logistics/shipping-rates' },
              ];
    return (
        <nav aria-label={section + ' workspace'} className="flex flex-wrap gap-2 border-b pb-3">
            {links.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    aria-current={path === link.href.split('?')[0] ? 'page' : undefined}
                    className="text-muted-foreground hover:bg-accent hover:text-primary aria-[current=page]:bg-accent aria-[current=page]:text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 motion-reduce:transition-none"
                >
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}
