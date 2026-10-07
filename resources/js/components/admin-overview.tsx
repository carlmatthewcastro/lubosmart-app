import { Card, Empty, Page, buttonClass, secondaryClass } from '@/components/marketplace-ui';
import { Link } from '@inertiajs/react';
import { ClipboardCheck, Store, Users, Wallet } from 'lucide-react';

export type AdminOverviewData = {
    applications: { id: number; name: string; role: string; submittedAt: string | null }[];
    activeDeliveries: number;
    codAwaitingReconciliation: number;
};

type Activity = { id: number; label: string; status: string; detail: string; occurredAt?: string };

function dateLabel(value?: string | null) {
    if (!value) return null;
    // Database timestamps without an offset are stored in UTC.
    const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminOverview({
    stats,
    overview,
    records,
}: {
    stats: Record<string, number>;
    overview: AdminOverviewData;
    records: Activity[];
}) {
    const metrics = [
        {
            label: 'Pending applications',
            value: stats['Pending review'],
            detail: 'Ready for your review',
            href: '/reviews?status=submitted',
            icon: ClipboardCheck,
        },
        { label: 'Registered accounts', value: stats.Accounts, detail: 'Manage account access', href: '/accounts', icon: Users },
        { label: 'Approved stores', value: stats['Approved stores'], detail: 'Explore the marketplace', href: '/shop', icon: Store },
        {
            label: 'COD to reconcile',
            value: overview.codAwaitingReconciliation,
            detail: 'Cash received by centers',
            href: '/deliveries',
            icon: Wallet,
        },
    ];

    return (
        <Page
            title="Admin overview"
            description="Review applications, manage accounts, and keep operations moving."
            action={
                <Link href="/reports" className={secondaryClass}>
                    View reports
                </Link>
            }
        >
            <section aria-label="Platform summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <Link
                        key={metric.label}
                        href={metric.href}
                        className="bg-card hover:border-primary/40 focus-visible:ring-primary/30 min-w-0 rounded-2xl border p-5 transition focus-visible:ring-4 focus-visible:outline-none"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-muted-foreground text-sm font-medium">{metric.label}</p>
                            <metric.icon aria-hidden="true" className="text-primary size-4 shrink-0" />
                        </div>
                        <p className="mt-5 text-3xl font-semibold tracking-tight">{metric.value.toLocaleString()}</p>
                        <p className="text-muted-foreground mt-2 text-xs">{metric.detail}</p>
                    </Link>
                ))}
            </section>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <Card className="overflow-hidden !p-0">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5 sm:p-6">
                        <div>
                            <h2 className="font-semibold">Application queue</h2>
                            <p className="text-muted-foreground mt-1 text-sm">Oldest submissions first.</p>
                        </div>
                        <Link
                            href="/reviews?status=submitted"
                            className="text-primary rounded-md text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
                        >
                            View all
                        </Link>
                    </div>
                    {overview.applications.length ? (
                        <ul className="divide-y">
                            {overview.applications.map((application) => (
                                <li key={application.id} className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium break-words">{application.name}</p>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            {application.role === 'logistics' ? 'Sorting center' : application.role === 'seller' ? 'Seller' : 'Buyer'}{' '}
                                            · #{application.id}
                                            {application.submittedAt && ` · ${dateLabel(application.submittedAt)}`}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/reviews/${application.id}`}
                                        className={secondaryClass}
                                        aria-label={`Review application ${application.id}`}
                                    >
                                        Review
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-5 py-12 text-center sm:px-6">
                            <h3 className="font-medium">No applications waiting</h3>
                            <p className="text-muted-foreground mt-2 text-sm">New submissions will appear here.</p>
                        </div>
                    )}
                </Card>

                <Card className="border-primary/15 bg-accent/40">
                    <h2 className="font-semibold">Parcel operations</h2>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">Follow deliveries and cash handovers across the platform.</p>
                    <dl className="mt-6 space-y-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <dt className="text-muted-foreground">Active deliveries</dt>
                            <dd className="font-semibold">{overview.activeDeliveries.toLocaleString()}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <dt className="text-muted-foreground">COD to reconcile</dt>
                            <dd className="font-semibold">{overview.codAwaitingReconciliation.toLocaleString()}</dd>
                        </div>
                    </dl>
                    <Link href="/deliveries" className={`${buttonClass} mt-6 w-full`}>
                        Open operations
                    </Link>
                </Card>
            </div>

            <section aria-labelledby="admin-activity-title">
                <h2 id="admin-activity-title" className="mb-4 font-semibold">
                    Recent platform activity
                </h2>
                {records.length ? (
                    <Card className="overflow-hidden !p-0">
                        <ul className="divide-y">
                            {records.map((record) => (
                                <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium break-words">{record.label}</p>
                                        <p className="text-muted-foreground mt-1 text-xs">{record.detail}</p>
                                    </div>
                                    {record.occurredAt && (
                                        <time
                                            dateTime={record.occurredAt.includes('T') ? record.occurredAt : `${record.occurredAt.replace(' ', 'T')}Z`}
                                            className="text-muted-foreground text-xs"
                                        >
                                            {dateLabel(record.occurredAt)}
                                        </time>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </Card>
                ) : (
                    <Empty title="No activity yet" description="Application decisions and account updates will appear here." />
                )}
            </section>
        </Page>
    );
}
