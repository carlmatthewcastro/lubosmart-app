import { Badge, buttonClass, Card, Empty, money, Page, secondaryClass } from '@/components/shared/marketplace-ui';
import { DashboardFinance, DashboardOverview } from '@/components/workspace/dashboard-overview';
import { DashboardMetric, DashboardWelcome } from '@/components/workspace/dashboard-panels';
import type { SharedData } from '@/types';
import { Link, usePage, usePoll } from '@inertiajs/react';
import { ClipboardCheck, MapPinned, PackageCheck, PackageOpen, Truck, Wallet } from 'lucide-react';

type Parcel = {
    id: number;
    status: string;
    exception: string | null;
    tracking: string | null;
    store: string;
    recipient: string;
    destination: string;
    cod: string;
    codResponsibility?: boolean;
};
export default function RiderDashboard({
    companyName,
    queues,
    pendingCod,
    recentParcels,
    summary,
}: {
    companyName: string | null;
    queues: Record<string, number>;
    pendingCod: string;
    activeCount: number;
    recentParcels: Parcel[];
    summary: { fees: string; weekly: string; paid: string; returns: number };
}) {
    usePoll(30000, { only: ['summary', 'queues', 'pendingCod', 'recentParcels'] });
    const { auth } = usePage<SharedData>().props;
    const capability = auth.user.rider_capability ?? 'both';
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
    ].filter(
        (card) =>
            capability === 'both' ||
            (capability === 'pickup' ? card.label === 'My pickups' || card.label === 'Delivery issues' : card.label !== 'My pickups'),
    );
    return (
        <Page title="Rider dashboard" headerInNavbar description="Your assigned parcels, delivery proof, and COD responsibilities.">
            <DashboardWelcome
                label="Your delivery workspace"
                title={'Welcome back, ' + auth.user.name.trim().split(/\s+/)[0] + '.'}
                description="Keep your parcels moving. Review assignments, track deliveries, and stay on top of your handovers."
                context={companyName || 'Your logistics company'}
                icon={Truck}
            >
                <Link href="/deliveries" className={buttonClass}>
                    My deliveries
                </Link>
                <Link href="/rider-payments" className={secondaryClass}>
                    View compensation
                </Link>
            </DashboardWelcome>

            <section aria-label="Rider summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardMetric
                    label="Assigned pickups"
                    value={queues.pickups}
                    hint="Current assigned pickup workload"
                    icon={PackageOpen}
                    href="/deliveries?stage=pickups"
                />
                <DashboardMetric
                    label="Assigned deliveries"
                    value={queues.dispatch + queues.monitoring}
                    hint="Dispatch handovers and out-for-delivery parcels"
                    icon={Truck}
                    href="/deliveries"
                />
                <DashboardMetric
                    label="Completed deliveries"
                    value={queues.completed}
                    hint="All-time delivered parcels in your assignment history"
                    icon={PackageCheck}
                    href="/deliveries?stage=completed"
                />
                <DashboardMetric
                    label="Pending COD handover"
                    value={money(pendingCod)}
                    hint="Collected cash awaiting handover; separate from compensation"
                    icon={Wallet}
                    href="/deliveries?stage=cash"
                />
            </section>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <DashboardOverview
                    title="Assignment activity"
                    description="Current assignment queues, shown separately. Completed deliveries are all time."
                    items={[
                        { label: 'Pickups', value: queues.pickups },
                        { label: 'Dispatch', value: queues.dispatch },
                        { label: 'Out for delivery', value: queues.monitoring },
                        { label: 'Completed', value: queues.completed },
                    ]}
                />
                <div className="space-y-6">
                    <DashboardFinance
                        title="Compensation overview"
                        description="Recorded amounts only. Task fees and weekly compensation retain their existing accounting. COD is excluded."
                        rows={[
                            { label: 'Recorded task fees · all time', value: money(summary.fees) },
                            { label: 'Recorded weekly compensation · all time', value: money(summary.weekly) },
                            { label: 'Marked paid · all time', value: money(summary.paid) },
                        ]}
                        href="/rider-payments"
                        action="View compensation"
                    />
                    <DashboardMetric
                        label="Pending return assignments"
                        value={summary.returns}
                        hint="Assigned physical return tasks awaiting completion"
                        icon={ClipboardCheck}
                        href="/returns"
                    />
                </div>
            </div>

            <div className="workspace-priorities bg-card rounded-xl border p-5">
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
            <div className="space-y-6">
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
                                        {parcel.codResponsibility !== false && (
                                            <p className="mt-2 text-sm tabular-nums">Parcel COD: {money(parcel.cod)}</p>
                                        )}
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
            </div>
        </Page>
    );
}
