import { Link, usePage } from '@inertiajs/react';

export const sellerQueues = [
    { key: 'all', label: 'All orders' },
    { key: 'pending', label: 'New orders' },
    { key: 'processing', label: 'Preparing' },
    { key: 'ready', label: 'Ready for pickup' },
    { key: 'transit', label: 'In delivery' },
    { key: 'issues', label: 'Delivery issues' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
];

export default function SellerNavigation() {
    const { url } = usePage();
    const stage = new URLSearchParams(url.split('?')[1] ?? '').get('stage') ?? 'all';
    return (
        <nav aria-label="Seller order queues" className="flex flex-wrap gap-2">
            {sellerQueues.map((queue) => {
                const active = url.split('?')[0] === '/orders' && stage === queue.key;
                return (
                    <Link
                        key={queue.key}
                        href={`/orders?stage=${queue.key}`}
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
