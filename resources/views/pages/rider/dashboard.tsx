import { LogisticsCharts } from '@/components/logistics/logistics-charts';
import RiderNavigation from '@/components/rider/rider-navigation';
import { Badge, buttonClass, Card, Empty, money, Page, secondaryClass } from '@/components/shared/marketplace-ui';
import { DashboardMetric } from '@/components/workspace/dashboard-panels';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ClipboardCheck, MapPinned, MessageCircle, PackageCheck, PackageOpen, Truck, Wallet } from 'lucide-react';

type Parcel = {
    id: number;
    status: string;
    exception: string | null;
    tracking: string | null;
    store: string;
    recipient: string;
    destination: string;
    cod: string;
};
export default function RiderDashboard({
    companyName,
    queues,
    pendingCod,
    activeCount,
    recentParcels,
}: {
    companyName: string | null;
    queues: Record<string, number>;
    pendingCod: string;
    activeCount: number;
    recentParcels: Parcel[];
}) {
    const { auth } = usePage<SharedData>().props;
    const cards = [
        { label: 'My pickups', value: queues.pickups, href: '/deliveries?stage=pickups', hint: 'Assigned parcels to collect', icon: PackageOpen },
        {
            label: 'Dispatch handovers',
            value: queues.dispatch,
            href: '/deliveries?stage=dispatch',
            hint: 'Accept handover and start delivery',
            icon: Truck,
        },
        {
            label: 'Out for delivery',
            value: queues.monitoring,
            href: '/deliveries?stage=monitoring',
            hint: 'Record proof and collect COD',
            icon: MapPinned,
        },
        {
            label: 'Delivery issues',
            value: queues.exceptions,
            href: '/deliveries?stage=exceptions',
            hint: 'Follow up with your logistics company',
            icon: ClipboardCheck,
        },
    ];
    return (
        <Page title="Rider dashboard" headerInNavbar description="Your assigned parcels, delivery proof, and COD responsibilities.">
            <section
                aria-label="Welcome and priorities"
                className="border-primary/15 from-accent via-card to-background rounded-2xl border bg-linear-to-br p-6 sm:p-8"
            >
                <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <div className="min-w-0">
                        <p className="text-primary text-xs font-semibold tracking-widest uppercase">My delivery overview</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight break-words sm:text-3xl">
                            Welcome back, {auth.user.name.trim().split(/\s+/)[0]}.
                        </h2>
                        <p className="text-muted-foreground mt-3 text-sm">{companyName || 'Your logistics company'}</p>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                            Check your assigned pickups, accept dispatch handovers, and complete each delivery with proof.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link href="/deliveries" className={buttonClass}>
                                My deliveries
                            </Link>
                            <Link href="/reports" className={secondaryClass}>
                                Delivery reports
                            </Link>
                        </div>
                    </div>
                    <div className="bg-card/90 rounded-xl border p-5">
                        <h3 className="text-sm font-semibold">Needs attention</h3>
                        <p className="text-muted-foreground mt-1 text-xs">Your current tasks</p>
                        <ul className="mt-3 divide-y">
                            {[...cards.slice(0, 2), { label: 'COD handovers', value: queues.cash, href: '/deliveries?stage=cash' }].map((item) => (
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
            <RiderNavigation />
            <section aria-label="My parcel workload" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <DashboardMetric key={card.label} {...card} />
                ))}
            </section>
            <LogisticsCharts
                queues={cards}
                delivered={queues.completed}
                active={activeCount}
                activeDescription="Active includes all your assigned parcels awaiting delivery, including pickups and parcels with delivery issues."
            />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">My recent parcels</h2>
                        <Link href="/deliveries" className="text-primary min-h-11 content-center text-sm underline">
                            View all parcels
                        </Link>
                    </div>
                    {recentParcels.length ? (
                        <div className="mt-3 divide-y">
                            {recentParcels.map((parcel) => (
                                <Link
                                    key={parcel.id}
                                    href={`/deliveries?search=${encodeURIComponent(parcel.tracking || parcel.store)}`}
                                    className="hover:bg-accent/40 focus-visible:ring-ring flex flex-wrap items-start gap-3 rounded-xl py-4 focus-visible:ring-2"
                                >
                                    <PackageCheck aria-hidden="true" className="text-primary mt-1 size-5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold break-words">{parcel.tracking || `Parcel #${parcel.id}`}</p>
                                        <p className="text-muted-foreground mt-1 text-sm break-words">
                                            {parcel.store} · {parcel.recipient}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs break-words">{parcel.destination}</p>
                                        <p className="mt-2 text-sm tabular-nums">Parcel COD: {money(parcel.cod)}</p>
                                        {parcel.exception && (
                                            <p className="text-destructive mt-2 text-sm">Issue: {parcel.exception.replaceAll('_', ' ')}</p>
                                        )}
                                    </div>
                                    <Badge status={parcel.status} />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Empty title="No assigned parcels yet" description="Your logistics company will assign pickups and deliveries here." />
                    )}
                </Card>
                <div className="space-y-6">
                    <Card>
                        <div className="flex items-center gap-3">
                            <Wallet aria-hidden="true" className="text-primary size-5" />
                            <h2 className="text-lg font-semibold">COD to hand over</h2>
                        </div>
                        <p className="mt-4 text-3xl font-semibold tabular-nums">{money(pendingCod)}</p>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Collected cash awaiting confirmation of receipt by your logistics company.
                        </p>
                        <Link href="/deliveries?stage=cash" className={`${secondaryClass} mt-5`}>
                            Review COD parcels
                        </Link>
                    </Card>
                    <Card>
                        <h2 className="text-lg font-semibold">Delivery checklist</h2>
                        <ol className="text-muted-foreground mt-4 list-inside list-decimal space-y-3 text-sm leading-relaxed">
                            <li>Check parcel identity and confirm pickup.</li>
                            <li>Accept the prepared dispatch handover.</li>
                            <li>Confirm recipient, upload proof, and record the full COD collected.</li>
                            <li>Report failed attempts and arrange cash handover with Logistics.</li>
                        </ol>
                        <Link href="/support?kind=message" className={`${secondaryClass} mt-5`}>
                            <MessageCircle aria-hidden="true" className="size-4" />
                            Open messages
                        </Link>
                    </Card>
                </div>
            </div>
        </Page>
    );
}
