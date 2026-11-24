import { InfoModal } from '@/components/shared/info-modal';
import { Badge, Card, Empty, Page, money } from '@/components/shared/marketplace-ui';
import DashboardBanner from '@/components/workspace/dashboard-banner';
import { DashboardFinance } from '@/components/workspace/dashboard-overview';
import { Link, usePoll } from '@inertiajs/react';
import { Boxes, CheckCircle2, CircleAlert, ClipboardCheck, PackageCheck, PackageOpen, Truck, type LucideIcon } from 'lucide-react';

function DashboardMetric({ label, value, hint, icon: Icon, href }: { label: string; value: number; hint: string; icon: LucideIcon; href: string }) {
    return (
        <Link
            href={href}
            className="bg-card hover:bg-accent focus-visible:ring-ring flex min-w-0 items-center gap-3 rounded-xl border p-4 focus-visible:ring-2"
        >
            <Icon aria-hidden="true" className="text-primary size-5 shrink-0" />
            <div className="min-w-0">
                <h2 className="text-muted-foreground text-sm font-medium">{label}</h2>
                <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
                <span className="sr-only">{hint}</span>
            </div>
        </Link>
    );
}

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
    summary,
}: {
    centers: { id: number; name: string }[];
    summary: { atCenter: number; outForDelivery: number; deliveredToday: number; receivedCod: string; returns: number };
    metrics: Metrics;
    applications: { id: number; user: { name: string } }[];
    recentParcels: Parcel[];
    setupChecklist?: { label: string; complete: boolean; count: number; description: string; url: string }[];
}) {
    usePoll(30000, { only: ['summary', 'metrics', 'applications', 'recentParcels', 'setupChecklist'] });
    return (
        <Page
            title="Logistics Dashboard"
            headerInNavbar
            showLogisticsBanner={false}
            description="Manage your center, coordinate riders, and keep parcels moving."
        >
            <DashboardBanner role="logistics" />
            <section aria-label="Parcel summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardMetric
                    label="Awaiting pickup approval"
                    value={metrics.pickupRequests}
                    hint="Unassigned pickup requests from sellers"
                    icon={PackageOpen}
                    href="/deliveries?stage=pickups"
                />
                <DashboardMetric
                    label="At logistics center"
                    value={summary.atCenter}
                    hint="Received parcels awaiting dispatch acceptance"
                    icon={Boxes}
                    href="/deliveries"
                />
                <DashboardMetric
                    label="Out for delivery"
                    value={summary.outForDelivery}
                    hint="Parcels currently out for delivery"
                    icon={Truck}
                    href="/deliveries?stage=monitoring"
                />
                <DashboardMetric
                    label="Delivered today"
                    value={summary.deliveredToday}
                    hint="Recorded delivery completions today in system time"
                    icon={PackageCheck}
                    href="/reports"
                />
            </section>
            <div className="grid items-start gap-6 xl:grid-cols-2">
                <div className="bg-card rounded-xl border p-5">
                    <h2 className="text-lg font-semibold">Needs attention</h2>
                    <p className="text-muted-foreground mt-1 text-xs">Current company review queues</p>
                    <ul className="mt-3 divide-y">
                        {[
                            { label: 'Pickup approvals', value: metrics.pickupRequests, href: '/deliveries?stage=pickups' },
                            { label: 'Parcels to sort', value: metrics.sorting, href: '/deliveries?stage=sorting' },
                            { label: 'Delivery assignments', value: metrics.dispatch ?? 0, href: '/deliveries?stage=dispatch' },
                            { label: 'Delivery exceptions', value: metrics.exceptions ?? 0, href: '/deliveries?stage=exceptions' },
                            { label: 'COD handovers', value: metrics.cash ?? 0, href: '/deliveries?stage=cash' },
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
                <div className="space-y-6">
                    <DashboardFinance
                        title="COD overview"
                        description="Actual cash received by your centers, all time. Review remittances for product cash due to Admin."
                        rows={[{ label: 'COD received by logistics', value: money(summary.receivedCod) }]}
                        href="/logistics-settlements"
                        action="Review admin remittances"
                    />
                    <DashboardMetric
                        label="Return parcels to process"
                        value={summary.returns}
                        hint="Active physical return tasks within your centers"
                        icon={ClipboardCheck}
                        href="/returns"
                    />
                </div>
            </div>

            {setupChecklist.some((item) => !item.complete) && (
                <Card>
                    <h2 className="text-lg font-semibold">Company setup</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Complete these requirements before serving a route. Every assignment still checks the exact area, Rider, and parcel stage.
                    </p>
                    <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                        {setupChecklist
                            .filter((item) => !item.complete)
                            .map((item) => (
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
                                    <Link
                                        href={item.url}
                                        className="text-primary mt-2 inline-flex min-h-11 items-center text-sm font-medium underline"
                                    >
                                        {item.complete ? 'Manage setup' : 'Complete setup'}
                                    </Link>
                                </li>
                            ))}
                    </ul>
                </Card>
            )}
            <div className="grid items-start gap-6">
                <div className="space-y-6">
                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-semibold">Recent parcels</h2>
                            <Link href="/deliveries" className="text-primary text-sm">
                                View all
                            </Link>
                        </div>
                        {recentParcels.length ? (
                            <div className="mt-5 divide-y">
                                {recentParcels.map((parcel) => (
                                    <Link key={parcel.id} href="/deliveries" className="flex flex-wrap items-center gap-3 py-3">
                                        <span className="bg-accent text-primary flex size-10 items-center justify-center rounded-xl">
                                            <PackageCheck className="size-5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium break-words">
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
                    {!!applications.length && (
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
                    )}
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
