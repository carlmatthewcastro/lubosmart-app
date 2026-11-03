import { LogisticsCharts } from '@/components/logistics/logistics-charts';
import SellerNavigation from '@/components/seller/seller-navigation';
import { Badge, buttonClass, Card, Empty, money, Page, secondaryClass } from '@/components/shared/marketplace-ui';
import { DashboardMetric } from '@/components/workspace/dashboard-panels';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Boxes, ClipboardCheck, MessageCircle, Package, PackageCheck, Truck, Wallet } from 'lucide-react';

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
    productCount,
    completedProceeds,
    activeCount,
    recentOrders,
}: {
    store: { name: string; status: string } | null;
    queues: Record<string, number>;
    productCount: number;
    completedProceeds: string;
    activeCount: number;
    recentOrders: RecentOrder[];
}) {
    const { auth } = usePage<SharedData>().props;
    const cards = [
        { label: 'New orders', value: queues.pending, href: '/orders?stage=pending', hint: 'Start preparing these parcels', icon: Package },
        { label: 'Preparing', value: queues.processing, href: '/orders?stage=processing', hint: 'Pack and mark ready for pickup', icon: Boxes },
        {
            label: 'Ready for pickup',
            value: queues.ready,
            href: '/orders?stage=ready',
            hint: 'Print labels for logistics collection',
            icon: ClipboardCheck,
        },
        { label: 'In delivery', value: queues.transit, href: '/orders?stage=transit', hint: 'Follow your parcels to the buyer', icon: Truck },
    ];
    return (
        <Page title="Seller dashboard" headerInNavbar description="Your inventory, order preparation, deliveries, and sales.">
            <section
                aria-label="Welcome and priorities"
                className="border-primary/15 from-accent via-card to-background rounded-2xl border bg-linear-to-br p-6 sm:p-8"
            >
                <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <div className="min-w-0">
                        <p className="text-primary text-xs font-semibold tracking-widest uppercase">Store overview</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight break-words sm:text-3xl">
                            Welcome back, {auth.user.name.trim().split(/\s+/)[0]}.
                        </h2>
                        <p className="text-muted-foreground mt-3 text-sm break-words">{store?.name ?? 'Your store'}</p>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                            Keep stock current, prepare incoming orders, and follow each parcel through delivery.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link href="/orders?stage=pending" className={buttonClass}>
                                Prepare orders
                            </Link>
                            <Link href="/inventory" className={secondaryClass}>
                                Manage inventory
                            </Link>
                        </div>
                    </div>
                    <div className="bg-card/90 rounded-xl border p-5">
                        <h3 className="text-sm font-semibold">Needs attention</h3>
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
                </div>
            </section>
            {!store || store.status !== 'approved' ? (
                <Empty
                    title="Store approval required"
                    description="Contact support to check your store approval before publishing products."
                    href="/support"
                    label="Contact support"
                />
            ) : null}
            <SellerNavigation />
            <section aria-label="Order workload" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <DashboardMetric key={card.label} {...card} />
                ))}
            </section>
            <LogisticsCharts
                queues={cards}
                delivered={queues.completed}
                active={activeCount}
                activeDescription="Active includes all your orders awaiting delivery, including preparation and delivery issues. Cancelled orders are excluded."
            />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
                <div className="space-y-6">
                    <Card>
                        <div className="flex items-center gap-3">
                            <Wallet aria-hidden="true" className="text-primary size-5" />
                            <h2 className="text-lg font-semibold">Completed seller proceeds</h2>
                        </div>
                        <p className="mt-4 text-3xl font-semibold tabular-nums">{money(completedProceeds)}</p>
                        <p className="text-muted-foreground mt-2 text-sm">
                            All-time completed product sales minus commission. These figures do not confirm a payout.
                        </p>
                        <Link href="/reports" className={`${secondaryClass} mt-5`}>
                            View sales reports
                        </Link>
                    </Card>
                    <Card>
                        <h2 className="text-lg font-semibold">Fulfillment checklist</h2>
                        <ol className="text-muted-foreground mt-4 list-inside list-decimal space-y-3 text-sm leading-relaxed">
                            <li>Check stock and packed weight across your {productCount.toLocaleString()} products.</li>
                            <li>Start preparing, pack the items, and mark the parcel ready.</li>
                            <li>Print its waybill and attach the label to one physical parcel.</li>
                            <li>Follow delivery progress and keep the buyer informed.</li>
                        </ol>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link href="/support?kind=message" className={secondaryClass}>
                                <MessageCircle aria-hidden="true" className="size-4" />
                                Messages
                            </Link>
                            <Link href="/settings/profile" className={secondaryClass}>
                                Account settings
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </Page>
    );
}
