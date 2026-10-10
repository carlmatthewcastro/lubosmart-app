import { InfoModal } from '@/components/info-modal';
import { Badge, Card, Empty, Page, secondaryClass } from '@/components/marketplace-ui';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Boxes, CheckCheck, ClipboardCheck, MapPinned, PackageCheck, PackageOpen, Truck, Users, Wallet } from 'lucide-react';

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
        <Page
            title="Logistics Dashboard"
            description="Manage your center, coordinate riders, and keep parcels moving."
            action={
                <Link href="/deliveries" className={secondaryClass}>
                    Parcel Operations <ArrowRight className="size-4" />
                </Link>
            }
        >
            <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-6 py-5">
                <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        {centers.map((center) => center.name).join(' · ') || 'Your Logistics Center'}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold">Welcome back, {auth.user.name.split(' ')[0]}.</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {attention
                            ? `${attention} ${attention === 1 ? 'item needs' : 'items need'} your attention.`
                            : 'Your operations queue is up to date.'}
                    </p>
                </div>
                <span className="bg-accent text-primary inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium">
                    <CheckCheck className="size-4" />
                    {metrics.delivered} Delivered
                </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="group bg-card hover:border-primary/30 rounded-2xl border p-5 transition hover:shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">{card.label}</span>
                            <card.icon className="text-primary size-5" />
                        </div>
                        <p className="mt-5 text-3xl font-semibold tabular-nums">{card.value}</p>
                        <p className="text-muted-foreground mt-2 text-xs">{card.hint}</p>
                    </Link>
                ))}
            </div>
            <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
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
                <Card>
                    <h2 className="font-semibold">Center Management</h2>
                    <p className="text-muted-foreground mt-2 text-sm">Prepare coverage and riders before dispatch.</p>
                    <div className="mt-5 space-y-2">
                        {[
                            {
                                label: 'Rider Management',
                                detail: `${metrics.activeRiders} active ${metrics.activeRiders === 1 ? 'rider' : 'riders'}`,
                                href: '/accounts',
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
                            <Link key={item.label} href={item.href} className="hover:bg-accent/50 flex items-center gap-3 rounded-xl p-3 transition">
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
            {!centers.length && (
                <Empty
                    title="Center Setup Is Required"
                    description="Your account needs an approved logistics center. Contact the admin before accepting parcels."
                />
            )}
        </Page>
    );
}
