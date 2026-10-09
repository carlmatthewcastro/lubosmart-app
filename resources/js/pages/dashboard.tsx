import AdminOverview, { type AdminOverviewData } from '@/components/admin-overview';
import { Badge, Card, Empty, Page, buttonClass, secondaryClass } from '@/components/marketplace-ui';
import { type SharedData, type UserRole } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChartNoAxesCombined, ClipboardCheck, Package, ShoppingBag, Truck } from 'lucide-react';

const roles = {
    buyer: {
        title: 'Your shopping space',
        description: 'Little finds. Local favorites. Everything you need, closer to home.',
        primary: 'Discover products',
        href: '/shop',
        steps: ['Discover something you love', 'Choose an address & check out', 'Track your delivery'],
        links: [
            { title: 'Shopping bag', text: 'Review items and place a COD order.', href: '/cart', icon: ShoppingBag },
            { title: 'Your orders', text: 'Follow parcels and message your sellers.', href: '/orders', icon: Package },
        ],
    },
    seller: {
        title: 'Store overview',
        description: 'A clear view of your inventory, customer orders, and daily progress.',
        primary: 'Manage inventory',
        href: '/inventory',
        steps: ['Add products to your catalog', 'Prepare incoming orders', 'Mark parcels ready for pickup'],
        links: [
            { title: 'Inventory', text: 'Update products, prices, and stock.', href: '/inventory', icon: ShoppingBag },
            { title: 'Fulfillment', text: 'Prepare orders and reply to buyers.', href: '/orders', icon: Package },
            { title: 'Sales reports', text: 'View completed sales and commission.', href: '/reports', icon: ChartNoAxesCombined },
        ],
    },
    sorting_center: {
        title: 'Center overview',
        description: 'Move every parcel forward with a clear, organized dispatch workflow.',
        primary: 'Open parcel operations',
        href: '/deliveries',
        steps: ['Receive ready seller parcels', 'Assign an approved courier', 'Receive collected cash'],
        links: [
            { title: 'Parcel operations', text: 'Receive, assign, and monitor deliveries.', href: '/deliveries', icon: Truck },
            { title: 'Courier applications', text: 'Review couriers joining your center.', href: '/reviews', icon: ClipboardCheck },
            { title: 'Center reports', text: 'Follow completed parcels and sales.', href: '/reports', icon: ChartNoAxesCombined },
        ],
    },
    courier: {
        title: 'Ready for your next delivery',
        description: 'Your assigned parcels, delivery details, and COD responsibilities in one place.',
        primary: 'View my deliveries',
        href: '/deliveries',
        steps: ['Confirm parcel pickup', 'Start your delivery route', 'Upload proof & collect COD'],
        links: [
            { title: 'My deliveries', text: 'Pick up, deliver, and record proof.', href: '/deliveries', icon: Truck },
            { title: 'Delivery history', text: 'Review your completed parcels.', href: '/reports', icon: ChartNoAxesCombined },
        ],
    },
    admin: {
        title: 'Platform overview',
        description: 'Keep the community running smoothly with thoughtful oversight.',
        primary: 'Review applications',
        href: '/reviews',
        steps: ['Approve eligible applications', 'Monitor accounts & orders', 'Reconcile COD & review rates'],
        links: [
            { title: 'Applications', text: 'Review buyers, sellers, and centers.', href: '/reviews', icon: ClipboardCheck },
            { title: 'Parcel operations', text: 'Monitor deliveries and reconcile COD.', href: '/deliveries', icon: Truck },
            { title: 'Platform reports', text: 'Review sales, shipping, and commission.', href: '/reports', icon: ChartNoAxesCombined },
        ],
    },
};
export default function Dashboard({
    role,
    stats,
    records,
    storeStatus,
    adminOverview,
}: {
    role: UserRole;
    stats: Record<string, number>;
    records: { id: number; label: string; status: string; detail: string }[];
    storeStatus?: string;
    adminOverview?: AdminOverviewData | null;
}) {
    const { auth } = usePage<SharedData>().props;
    const content = roles[role];
    if (role === 'admin' && adminOverview) {
        return <AdminOverview stats={stats} overview={adminOverview} records={records} />;
    }
    return (
        <Page
            title={content.title}
            description={content.description}
            action={
                <Link href={content.href} className={buttonClass}>
                    {content.primary}
                </Link>
            }
        >
            <section className="border-primary/10 bg-accent/40 rounded-2xl border p-5 sm:p-6">
                <div className="max-w-xl">
                    <p className="text-primary mb-2 text-xs font-medium capitalize">
                        {role === 'courier' ? 'Courier' : role === 'sorting_center' ? 'Sorting center' : role} workspace
                    </p>
                    <h2 className="text-xl font-semibold tracking-tight">
                        {auth.user.name === 'LubosMart member' ? 'Welcome to LubosMart.' : `Hello, ${auth.user.name.split(' ')[0]}.`}
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                        {role === 'buyer' ? 'Your shopping and orders, all in one place.' : 'Here’s the latest in your workspace.'}
                    </p>
                    <Link href="/settings/profile" className="text-primary mt-4 inline-flex min-h-8 items-center text-sm font-medium hover:underline">
                        Edit profile
                    </Link>
                </div>
            </section>
            {role === 'seller' && storeStatus !== 'approved' && (
                <Card>Your store is awaiting approval. Product publishing requires an approved store.</Card>
            )}
            <section aria-label="Overview" className="grid gap-4 sm:grid-cols-3">
                {Object.entries(stats).map(([label, count]) => (
                    <Card key={label}>
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-sm">{label}</p>
                        </div>
                        <p className="mt-4 text-3xl font-semibold tracking-tight">{count.toLocaleString()}</p>
                    </Card>
                ))}
            </section>
            <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold">Recent activity</h2>
                        <Link
                            className="text-primary text-sm"
                            href={role === 'admin' ? '/reviews' : ['courier', 'sorting_center'].includes(role) ? '/deliveries' : '/orders'}
                        >
                            View workspace
                        </Link>
                    </div>
                    {records.length ? (
                        <Card className="overflow-hidden !p-0">
                            <ul className="divide-y">
                                {records.map((record) => (
                                    <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-muted text-muted-foreground rounded-xl p-3">
                                                <Package className="size-4" />
                                            </span>
                                            <div>
                                                <p className="text-sm font-medium">{record.label}</p>
                                                <p className="text-muted-foreground mt-1 text-xs">{record.detail}</p>
                                            </div>
                                        </div>
                                        <Badge status={record.status} />
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    ) : (
                        <Empty
                            title="No recent activity"
                            description="Your latest updates will appear here."
                            href={content.href}
                            label={content.primary}
                        />
                    )}
                </div>
                <Card>
                    <h2 className="text-lg font-semibold">Your workflow</h2>
                    <ol className="mt-6 space-y-5">
                        {content.steps.map((step, index) => (
                            <li key={step} className="flex items-center gap-3 text-sm">
                                <span className="bg-accent text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                                    0{index + 1}
                                </span>
                                {step}
                            </li>
                        ))}
                    </ol>
                    <Link href={content.href} className={`${secondaryClass} mt-7 w-full`}>
                        {content.primary}
                    </Link>
                </Card>
            </div>
            <section className="grid gap-4 md:grid-cols-3">
                {content.links.map((item) => (
                    <Link
                        key={item.title}
                        href={item.href}
                        className="group bg-card hover:border-primary/30 rounded-2xl border p-5 transition hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <item.icon className="text-primary size-5" />
                        </div>
                        <h2 className="mt-5 font-semibold">{item.title}</h2>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{item.text}</p>
                    </Link>
                ))}
            </section>
        </Page>
    );
}
