import { Badge, Card, Empty, money, Page } from '@/components/shared/marketplace-ui';
import DashboardBanner from '@/components/workspace/dashboard-banner';
import { DashboardFinance, DashboardOverview } from '@/components/workspace/dashboard-overview';
import { DashboardMetric } from '@/components/workspace/dashboard-panels';
import { Link, usePoll } from '@inertiajs/react';
import { Boxes, ClipboardCheck, Package, PackageCheck, Wallet } from 'lucide-react';

type RecentOrder = {
    id: number;
    status: string;
    deliveryStatus: string | null;
    exception: string | null;
    tracking: string | null;
    recipient: string;
    destination: string;
    subtotal: string;
};

export default function SellerDashboard({
    store,
    queues,
    completedProceeds,
    summary,
    recentOrders,
}: {
    store: { name: string; status: string } | null;
    queues: Record<string, number>;
    productCount: number;
    completedProceeds: string;
    activeCount: number;
    summary: { sales: string; activeProducts: number; returns: number; received: string; series: { label: string; value: number }[]; period: string };
    recentOrders: RecentOrder[];
}) {
    usePoll(30000, { only: ['summary', 'queues', 'recentOrders', 'completedProceeds'] });
    return (
        <Page title="Seller dashboard" headerInNavbar description="Your inventory, order preparation, deliveries, and sales.">
            <DashboardBanner role="seller" />

            {!store || store.status !== 'approved' ? (
                <Empty
                    title="Store approval required"
                    description="Contact support to check your store approval before publishing products."
                    href="/support"
                    label="Contact support"
                />
            ) : null}
            <section aria-label="Store summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardMetric
                    compact
                    label="Store sales"
                    value={money(summary.sales)}
                    hint="All-time completed product sales, excluding shipping"
                    icon={Wallet}
                    href="/reports"
                />
                <DashboardMetric
                    compact
                    label="Pending orders"
                    value={queues.pending}
                    hint="Orders awaiting preparation"
                    icon={Package}
                    href="/orders?stage=pending"
                />
                <DashboardMetric
                    compact
                    label="Active products"
                    value={summary.activeProducts}
                    hint="Active listings without a compliance block"
                    icon={Boxes}
                    href="/inventory"
                />
                <DashboardMetric
                    compact
                    label="Return requests"
                    value={summary.returns}
                    hint="All recorded store return and refund requests"
                    icon={ClipboardCheck}
                    href="/returns"
                />
            </section>
            <div className="bg-card rounded-xl border p-5">
                <h2 className="text-lg font-semibold">Needs attention</h2>
                <p className="text-muted-foreground mt-1 text-xs">Current store tasks</p>
                <ul className="mt-3 divide-y">
                    {[
                        { label: 'New orders', value: queues.pending, href: '/orders?stage=pending' },
                        { label: 'Low stock (under 5)', value: queues.lowStock, href: '/inventory?status=low-stock' },
                        { label: 'Delivery issues', value: queues.issues, href: '/orders?stage=issues' },
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
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <DashboardOverview
                    compact
                    title="Sales performance"
                    description={'Completed product sales by delivery date · ' + summary.period}
                    items={summary.series}
                    line
                    currency
                />
                <DashboardFinance
                    title="Settlement summary"
                    description="Recorded payouts are separate from sales. Review settlements for pending eligibility and refund holds."
                    rows={[
                        { label: 'Received settlements · all time', value: money(summary.received) },
                        { label: 'Completed proceeds · before refund deductions', value: money(completedProceeds) },
                    ]}
                    href="/settlements"
                    action="View settlements"
                />
            </div>

            <div className="space-y-6">
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">Recent orders</h2>
                        <Link href="/orders" className="text-primary min-h-11 content-center text-sm underline">
                            View all orders
                        </Link>
                    </div>
                    {recentOrders.length ? (
                        <div className="mt-3 divide-y">
                            {recentOrders.map((order) => (
                                <Link
                                    key={order.id}
                                    href={`/orders?search=${order.id}`}
                                    className="hover:bg-accent/40 focus-visible:ring-ring flex flex-wrap items-start gap-3 rounded-xl py-4 focus-visible:ring-2"
                                >
                                    <PackageCheck aria-hidden="true" className="text-primary mt-1 size-5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold break-words">{order.tracking ?? `Parcel #${order.id}`}</p>
                                        <p className="text-muted-foreground mt-1 text-sm break-words">
                                            {order.recipient} · {order.destination}
                                        </p>
                                        <p className="mt-2 text-sm tabular-nums">Product sales: {money(order.subtotal)}</p>
                                        {order.exception && (
                                            <p className="text-destructive mt-2 text-sm">Issue: {order.exception.replaceAll('_', ' ')}</p>
                                        )}
                                    </div>
                                    <Badge
                                        status={
                                            ['completed', 'cancelled', 'pending', 'processing'].includes(order.status)
                                                ? order.status
                                                : order.deliveryStatus === 'unassigned'
                                                  ? 'shipped'
                                                  : (order.deliveryStatus ?? order.status)
                                        }
                                    />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Empty
                            title="No orders yet"
                            description="Publish products with stock and packed weights so buyers can order."
                            href="/inventory"
                            label="Manage inventory"
                        />
                    )}
                </Card>
            </div>
        </Page>
    );
}
