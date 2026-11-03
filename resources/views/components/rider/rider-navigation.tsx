import { Link, usePage } from '@inertiajs/react';

export const riderQueues = [
    { key: 'all', label: 'All parcels' },
    { key: 'pickups', label: 'My pickups' },
    { key: 'dispatch', label: 'Dispatch handovers' },
    { key: 'monitoring', label: 'Out for delivery' },
    { key: 'exceptions', label: 'Delivery issues' },
    { key: 'cash', label: 'COD handover' },
    { key: 'completed', label: 'Completed' },
];

export default function RiderNavigation() {
    const { url } = usePage();
    const stage = new URLSearchParams(url.split('?')[1] ?? '').get('stage') ?? 'all';
    return (
        <nav aria-label="My delivery queues" className="flex flex-wrap gap-2">
            {riderQueues.map((queue) => {
                const active = url.startsWith('/deliveries') && stage === queue.key;
                return (
                    <Link
                        key={queue.key}
                        href={`/deliveries?stage=${queue.key}`}
                        aria-current={active ? 'page' : undefined}
                        className={`focus-visible:ring-ring flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-medium focus-visible:ring-2 ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent text-foreground'}`}
                    >
                        {queue.label}
                    </Link>
                );
            })}
        </nav>
    );
}
