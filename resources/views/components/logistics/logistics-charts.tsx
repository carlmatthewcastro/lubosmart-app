import { Card } from '@/components/shared/marketplace-ui';
import { Link } from '@inertiajs/react';

export function LogisticsCharts({
    queues,
    delivered,
    active,
    activeDescription = 'Includes in-transit and out-for-delivery parcels. Other parcel statuses are excluded.',
}: {
    queues: { label: string; value: number; href: string }[];
    delivered: number;
    active: number;
    activeDescription?: string;
}) {
    const maximum = Math.max(1, ...queues.map((item) => item.value));
    const total = delivered + active;
    const circumference = 2 * Math.PI * 48;
    return (
        <section aria-label="Parcel charts" className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Card className="min-w-0">
                <h2 className="text-lg font-semibold">Parcel workload</h2>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Current queue counts. A parcel may appear in more than one queue.
                </p>
                <div aria-hidden="true" className="mt-6 grid h-40 grid-cols-4 items-end gap-4 border-b">
                    {queues.map((item) => (
                        <div key={item.label} className="flex h-full flex-col justify-end gap-2 text-center">
                            <span className="text-xs font-medium tabular-nums">{item.value.toLocaleString()}</span>
                            <div className="bg-primary mx-auto w-full max-w-12 rounded-t-lg" style={{ height: `${(item.value / maximum) * 80}%` }} />
                        </div>
                    ))}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {queues.map((item) => (
                        <li key={item.label}>
                            <Link
                                href={item.href}
                                className="hover:bg-accent focus-visible:ring-ring block min-h-11 rounded-lg px-2 py-2 text-center text-xs leading-relaxed focus-visible:ring-2"
                            >
                                <span>{item.label}</span>
                                <span className="sr-only">: {item.value.toLocaleString()} parcels</span>
                            </Link>
                        </li>
                    ))}
                </ul>
                {!queues.some((item) => item.value) && <p className="text-muted-foreground mt-3 text-xs">No parcels in these queues yet.</p>}
            </Card>
            <Card className="min-w-0">
                <h2 className="text-lg font-semibold">Delivery progress</h2>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">Current active deliveries and all-time delivered parcels.</p>
                <div className="relative mx-auto mt-5 size-40" aria-hidden="true">
                    <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                        <circle
                            cx="60"
                            cy="60"
                            r="48"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="12"
                            className={total ? 'text-primary/20' : 'text-muted'}
                        />
                        <circle
                            cx="60"
                            cy="60"
                            r="48"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="12"
                            className="text-primary"
                            strokeDasharray={`${circumference * (total ? delivered / total : 0)} ${circumference}`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-semibold tabular-nums">{total.toLocaleString()}</span>
                        <span className="text-muted-foreground text-xs">parcels shown</span>
                    </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div className="border-primary border-l-4 pl-3">
                        <dt className="text-muted-foreground text-xs">Delivered</dt>
                        <dd className="mt-1 font-semibold tabular-nums">{delivered.toLocaleString()}</dd>
                    </div>
                    <div className="border-primary/20 border-l-4 pl-3">
                        <dt className="text-muted-foreground text-xs">Active deliveries</dt>
                        <dd className="mt-1 font-semibold tabular-nums">{active.toLocaleString()}</dd>
                    </div>
                </dl>
                <p className="text-muted-foreground mt-4 text-xs leading-relaxed">{activeDescription}</p>
                {!total && <p className="text-muted-foreground mt-2 text-xs">Delivery activity will appear here when parcels are dispatched.</p>}
            </Card>
        </section>
    );
}
