import { LogisticsCharts } from '@/components/logistics/logistics-charts';
import ParcelNavigation from '@/components/logistics/parcel-navigation';
import { InfoModal } from '@/components/shared/info-modal';
import { Badge, Card, Empty, Page, secondaryClass } from '@/components/shared/marketplace-ui';
import { DashboardMetric } from '@/components/workspace/dashboard-panels';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Boxes, CheckCircle2, CircleAlert, ClipboardCheck, MapPinned, PackageCheck, PackageOpen, Truck, Users, Wallet } from 'lucide-react';

type Metrics = {
    pickupRequests: number;
    incoming: number;
    sorting: number;
    activeDeliveries: number;
    delivered: number;
    riderApplications: number;
    activeRiders: number;
    publishedRates: number;
    dispatch: number;
    exceptions: number;
    cash: number;
};
type Parcel = { id: number; status: string; rider: { name: string } | null; seller_order: { store: { name: string } } };
export default function LogisticsDashboard({
    centers,
    metrics,
    applications,
    recentParcels,
    setupChecklist = [],
}: {
    centers: { id: number; name: string }[];
    metrics: Metrics;
    applications: { id: number; user: { name: string } }[];
    recentParcels: Parcel[];
    setupChecklist?: { label: string; complete: boolean; count: number; description: string; url: string }[];
}) {
    const { auth } = usePage<SharedData>().props;
    const cards = [
        {
            label: 'Pickup Requests',
            value: metrics.pickupRequests,
            hint: 'Approve requests and assign pickup Riders',
            href: '/deliveries?stage=pickups',
            icon: PackageOpen,
        },
        {
            label: 'Incoming Parcels',
            value: metrics.incoming,
            hint: 'Assigned or collected by riders',
            href: '/deliveries?stage=incoming',
            icon: Truck,
        },
        { label: 'Awaiting Sorting', value: metrics.sorting, hint: 'Received at your center', href: '/deliveries?stage=sorting', icon: Boxes },
        {
            label: 'Active Deliveries',
            value: metrics.activeDeliveries,
            hint: 'In transit or out for delivery',
            href: '/deliveries?stage=monitoring',
            icon: MapPinned,
        },
    ];
    return (
        <Page title="Logistics Dashboard" headerInNavbar description="Manage your center, coordinate riders, and keep parcels moving.">
            <section
                aria-label="Welcome and priorities"
                className="border-primary/15 from-accent via-card to-background rounded-2xl border bg-linear-to-br p-6 sm:p-8"
            >
                <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <div className="min-w-0">
                        <p className="text-primary text-xs font-semibold tracking-widest uppercase">Operations overview</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight break-words sm:text-3xl">
                            Welcome back, {auth.user.name.trim().split(/\s+/)[0]}.
                        </h2>
                        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                            {centers.map((center) => center.name).join(' / ') || 'Your logistics company'}
                        </p>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                            Monitor parcel movement, review your queues, and keep your riders ready.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link href="/deliveries" className={secondaryClass}>
                                Parcel operations
                            </Link>
                            <Link href="/reports" className={secondaryClass}>
                                Delivery reports
                            </Link>
                        </div>
                    </div>
                    <div className="bg-card/90 rounded-xl border p-5">
                        <h3 className="text-sm font-semibold">Needs attention</h3>
                        <p className="text-muted-foreground mt-1 text-xs">Current company review queues</p>
                        <ul className="mt-3 divide-y">
                            {[
                                { label: 'Pickup approvals', value: metrics.pickupRequests, href: '/deliveries?stage=pickups' },
                                { label: 'Parcels to sort', value: metrics.sorting, href: '/deliveries?stage=sorting' },
                                { label: 'Rider applications', value: metrics.riderApplications, href: '/reviews' },
                            ].map((item) => (
                                <li key={item.label}>
                                    <Link
                                        href={item.href}
                                        className="hover:text-primary focus-visible:ring-ring flex min-h-11 items-center justify-between gap-3 rounded px-1 text-sm focus-visible:ring-2"
                                    >
                                        <span>{item.label}</span>
                                        <span className="font-semibold tabular-nums">{item.value.toLocaleString()}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>
            {!!setupChecklist.length && (
                <Card>
                    <h2 className="text-lg font-semibold">Company setup</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Complete these requirements before serving a route. Every assignment still checks the exact area, Rider, and parcel stage.
                    </p>
                    <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                        {setupChecklist.map((item) => (
                            <li key={item.label} className="rounded-xl border p-4">
                                <div className="flex items-start gap-3">
                                    {item.complete ? (
                                        <CheckCircle2 aria-hidden className="text-success mt-0.5 size-5 shrink-0" />
                                    ) : (
                                        <CircleAlert aria-hidden className="text-warning mt-0.5 size-5 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold">{item.label}</h3>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            {item.complete ? `${item.count} configured` : 'Needs setup'}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{item.description}</p>
                                <Link href={item.url} className="text-primary mt-2 inline-flex min-h-11 items-center text-sm font-medium underline">
                                    {item.complete ? 'Manage setup' : 'Complete setup'}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
            <ParcelNavigation />
            <Card>
                <h2 className="text-lg font-semibold">Dispatch, exceptions and cash</h2>
                <nav aria-label="Logistics follow-up work" className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                        { label: 'Delivery assignments', value: metrics.dispatch ?? 0, url: '/deliveries?stage=dispatch' },
                        { label: 'Delivery exceptions', value: metrics.exceptions ?? 0, url: '/deliveries?stage=exceptions' },
                        { label: 'COD handovers', value: metrics.cash ?? 0, url: '/deliveries?stage=cash' },
                    ].map((item) => (
                        <Link
                            key={item.url}
                            href={item.url}
                            className="hover:bg-accent flex min-h-11 items-center justify-between gap-3 rounded-xl border p-4 text-sm"
                        >
                            <span>{item.label}</span>
                            <span className="font-semibold tabular-nums">{item.value}</span>
                        </Link>
                    ))}
                </nav>
            </Card>
            <section aria-label="Operations overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <DashboardMetric key={card.label} label={card.label} value={card.value} hint={card.hint} href={card.href} icon={card.icon} />
                ))}
            </section>
            <LogisticsCharts queues={cards} delivered={metrics.delivered} active={metrics.activeDeliveries} />
            <section aria-label="Company resources" className="grid gap-4 sm:grid-cols-3">
                {[
                    {
                        label: 'Delivered parcels',
                        value: metrics.delivered,
                        hint: 'All-time completed deliveries',
                        href: '/reports',
                        icon: PackageCheck,
                    },
                    {
                        label: 'Active riders',
                        value: metrics.activeRiders,
                        hint: 'Approved and email verified',
                        href: '/logistics/riders',
                        icon: Users,
                    },
                    {
                        label: 'Published rates',
                        value: metrics.publishedRates,
                        hint: 'Active barangay coverage rates',
                        href: '/logistics/shipping-rates',
                        icon: Wallet,
                    },
                ].map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="bg-card hover:border-primary/40 focus-visible:ring-ring min-w-0 rounded-2xl border p-5 focus-visible:ring-2"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-medium">{item.label}</h2>
                            <item.icon aria-hidden="true" className="text-primary size-5 shrink-0" />
                        </div>
                        <p className="mt-3 text-2xl font-semibold tabular-nums">{item.value.toLocaleString()}</p>
                        <p className="text-muted-foreground mt-1 text-xs">{item.hint}</p>
                    </Link>
                ))}
            </section>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-semibold">Recent Parcels</h2>
                            <Link href="/deliveries" className="text-primary text-sm">
                                View All
                            </Link>
                        </div>
                        {recentParcels.length ? (
                            <div className="mt-5 divide-y">
                                {recentParcels.map((parcel) => (
                                    <Link key={parcel.id} href="/deliveries" className="flex flex-wrap items-center gap-3 py-4">
                                        <span className="bg-accent text-primary flex size-10 items-center justify-center rounded-xl">
                                            <PackageCheck className="size-5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium">
                                                Parcel #{parcel.id} · {parcel.seller_order.store.name}
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-xs">{parcel.rider?.name ?? 'Awaiting rider assignment'}</p>
                                        </div>
                                        <Badge status={parcel.status} />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-5 rounded-xl border border-dashed p-7 text-center">
                                <PackageOpen className="text-muted-foreground mx-auto size-7" />
                                <p className="mt-3 text-sm font-medium">No Parcels Yet</p>
                                <p className="text-muted-foreground mt-1 text-xs">Publish your coverage rates so buyers can choose your center.</p>
                            </div>
                        )}
                    </Card>
                    <Card>
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Rider Applications</h2>
                            <Link href="/reviews" className="text-primary text-sm">
                                Review Queue
                            </Link>
                        </div>
                        {applications.length ? (
                            <div className="mt-4 divide-y">
                                {applications.map((application) => (
                                    <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                                        <p className="text-sm font-medium">{application.user.name}</p>
                                        <InfoModal kind="registration" id={application.id} label="Review Application" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground mt-4 text-sm">No rider applications waiting for review.</p>
                        )}
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <h2 className="font-semibold">Center Management</h2>
                        <p className="text-muted-foreground mt-2 text-sm">Prepare coverage and riders before dispatch.</p>
                        <div className="mt-5 space-y-2">
                            {[
                                {
                                    label: 'Rider Management',
                                    detail: `${metrics.activeRiders} active ${metrics.activeRiders === 1 ? 'rider' : 'riders'}`,
                                    href: '/logistics/riders',
                                    icon: Users,
                                },
                                {
                                    label: 'Shipping Rates & Coverage',
                                    detail: `${metrics.publishedRates} published barangay rates`,
                                    href: '/logistics/shipping-rates',
                                    icon: Wallet,
                                },
                                {
                                    label: 'Coverage Assignments',
                                    detail: 'Match riders to destination barangays',
                                    href: '/logistics/rider-coverage',
                                    icon: MapPinned,
                                },
                                { label: 'Delivery Reports', detail: 'Completed parcels and collected COD', href: '/reports', icon: ClipboardCheck },
                            ].map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className="hover:bg-accent/50 flex items-center gap-3 rounded-xl p-3 transition"
                                >
                                    <item.icon className="text-primary size-5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">{item.label}</p>
                                        <p className="text-muted-foreground mt-1 text-xs">{item.detail}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
            {!centers.length && (
                <Empty
                    title="Center Setup Is Required"
                    description="Your account needs an approved logistics center. Contact the admin before accepting parcels."
                />
            )}
        </Page>
    );
}
