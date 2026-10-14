import { InfoModal } from '@/components/shared/info-modal';
import { Badge, Card, Empty, Page, secondaryClass } from '@/components/shared/marketplace-ui';
import { DashboardMetric, DashboardQueues, DashboardWelcome } from '@/components/workspace/dashboard-panels';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Boxes, ClipboardCheck, MapPinned, PackageCheck, PackageOpen, Truck, Users, Wallet } from 'lucide-react';

type Metrics = {
    pickupRequests: number;
    incoming: number;
    sorting: number;
    activeDeliveries: number;
    delivered: number;
    riderApplications: number;
    activeRiders: number;
    publishedRates: number;
};
type Parcel = { id: number; status: string; rider: { name: string } | null; seller_order: { store: { name: string } } };
export default function LogisticsDashboard({
    centers,
    metrics,
    applications,
    recentParcels,
}: {
    centers: { id: number; name: string }[];
    metrics: Metrics;
    applications: { id: number; user: { name: string } }[];
    recentParcels: Parcel[];
}) {
    const { auth } = usePage<SharedData>().props;
    const cards = [
        {
            label: 'Pickup Requests',
            value: metrics.pickupRequests,
            hint: 'Seller parcels ready for approval',
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
    const attention = metrics.pickupRequests + metrics.sorting + metrics.riderApplications;
    return (
        <Page title="Logistics Dashboard" headerInNavbar description="Manage your center, coordinate riders, and keep parcels moving.">
            <DashboardWelcome
                label="Logistics portal"
                title={'Welcome back, ' + auth.user.name.split(' ')[0] + '.'}
                description={
                    (centers.map((center) => center.name).join(' / ') || 'Your logistics company') +
                    (attention ? ' / ' + attention + ' items need attention.' : ' / Your operations queue is up to date.')
                }
                icon={Truck}
            >
                <Link href="/deliveries" className={secondaryClass}>
                    Open parcel operations <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <span className="text-primary text-sm font-medium">{metrics.delivered.toLocaleString()} delivered parcels</span>
            </DashboardWelcome>
            <Card>
                <h2 className="text-lg font-semibold">Keep parcels moving</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    Approve the seller pickup, receive and sort the parcel, then assign a rider with destination coverage.
                </p>
                <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'Approve pickup', detail: 'Verify seller requests', stage: 'pickups' },
                        { label: 'Receive parcels', detail: 'Confirm center arrival', stage: 'incoming' },
                        { label: 'Sort by area', detail: 'Prepare destination batches', stage: 'sorting' },
                        { label: 'Assign a rider', detail: 'Match coverage and rider', stage: 'dispatch' },
                        { label: 'Monitor delivery', detail: 'Track delivery and COD', stage: 'monitoring' },
                    ].map((item, index) => (
                        <li key={item.stage}>
                            <Link
                                href={'/deliveries?stage=' + item.stage}
                                className="hover:bg-accent focus-visible:ring-ring flex h-full min-h-24 gap-3 rounded-xl border p-4 focus-visible:ring-2"
                            >
                                <span className="bg-accent text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                                    {index + 1}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold">{item.label}</p>
                                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{item.detail}</p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ol>
            </Card>
            <section aria-label="Operations overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <DashboardMetric key={card.label} label={card.label} value={card.value} hint={card.hint} href={card.href} icon={card.icon} />
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
                    <DashboardQueues
                        title="Parcel queues"
                        description="Current company queues. Parcels can appear in more than one stage."
                        items={cards.map((card) => ({ label: card.label, value: card.value, href: card.href }))}
                    />
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
                                    href: '/deliveries?stage=dispatch',
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
                                    <ArrowRight className="text-muted-foreground size-4" />
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
