import { Badge, Card, Empty, Page } from '@/components/shared/marketplace-ui';
import DashboardBanner from '@/components/workspace/dashboard-banner';
import { DashboardMetric, DashboardQueues } from '@/components/workspace/dashboard-panels';
import { type UserRole } from '@/types';
import { Link, usePoll } from '@inertiajs/react';
import { CheckCheck, Clock3, Package, ShoppingBag, Store, Truck, type LucideIcon } from 'lucide-react';

export interface WorkspaceDashboardProps {
    role: Exclude<UserRole, 'admin'>;
    stats: Record<string, number>;
    records: { id: number; label: string; status: string; detail: string; href?: string }[];
    storeStatus?: string;
    companyName?: string | null;
}
export interface WorkspaceDashboardContent {
    title: string;
    description: string;
    primary: string;
    href: string;
    steps: string[];
    links: { title: string; text: string; href: string; icon?: LucideIcon }[];
}
export default function WorkspaceDashboard({
    role,
    stats,
    records,
    storeStatus,
    content,
}: WorkspaceDashboardProps & { content: WorkspaceDashboardContent }) {
    usePoll(30000, { only: ['stats', 'records'] });
    const activityHref = ['rider', 'logistics'].includes(role) ? '/deliveries' : '/orders';
    const RoleIcon = role === 'buyer' ? ShoppingBag : role === 'seller' ? Store : Truck;
    const metrics = Object.entries(stats);
    return (
        <Page title={content.title} description={content.description}>
            <DashboardBanner role={role} />
            {role === 'seller' && storeStatus !== 'approved' && (
                <Card>Your store is awaiting approval. Product publishing requires an approved store.</Card>
            )}
            <section aria-label="Account overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(([label, value], index) => (
                    <DashboardMetric
                        compact={role === 'buyer'}
                        key={label}
                        label={label}
                        value={value}
                        hint={label === 'Available Lubos Coins' ? 'Available wallet credits · 1 coin = ₱1' : 'Current account totals'}
                        href={label === 'Available Lubos Coins' ? '/wallet' : activityHref}
                        icon={index === 0 ? RoleIcon : index === 1 ? Clock3 : CheckCheck}
                    />
                ))}
            </section>
            {role !== 'buyer' && (
                <section aria-label="Quick actions" className={'grid gap-4 ' + (content.links.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
                    {content.links.map((item) => (
                        <Link
                            key={item.title}
                            href={item.href}
                            className="group bg-card hover:border-primary/40 flex min-w-0 items-center gap-4 rounded-2xl border p-5 transition-colors"
                        >
                            {item.icon && (
                                <span aria-hidden="true" className="bg-accent text-primary rounded-xl p-3">
                                    <item.icon className="size-5" />
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <h2 className="font-semibold">{item.title}</h2>
                                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{item.text}</p>
                            </div>
                        </Link>
                    ))}
                </section>
            )}
            <div className={role === 'buyer' ? 'grid min-w-0 gap-6' : 'grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'}>
                <Card>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">{role === 'rider' ? 'Recent deliveries' : 'Recent orders'}</h2>
                        <Link href={activityHref} className="text-primary inline-flex min-h-11 items-center gap-1 text-sm font-medium">
                            View all
                        </Link>
                    </div>
                    {records.length ? (
                        <ul className="divide-y">
                            {records.map((record) => (
                                <li key={record.id}>
                                    <Link
                                        href={record.href ?? activityHref}
                                        className="hover:bg-accent/30 flex flex-wrap items-center justify-between gap-3 rounded-xl py-4"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span aria-hidden="true" className="bg-accent text-primary rounded-xl p-3">
                                                <Package className="size-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium break-words">{record.label}</p>
                                                <p className="text-muted-foreground mt-1 text-xs">{record.detail}</p>
                                            </div>
                                        </div>
                                        <Badge status={record.status} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty
                            title="No recent activity"
                            description="Your latest updates will appear here."
                            href={content.href}
                            label={content.primary}
                        />
                    )}
                </Card>
                {role !== 'buyer' && (
                    <div className="space-y-6">
                        <DashboardQueues
                            title={role === 'rider' ? 'Delivery overview' : 'Account snapshot'}
                            description="Current totals for your account. Counts may describe overlapping groups."
                            items={metrics.map(([label, value]) => ({ label, value, href: label === 'Products' ? '/inventory' : activityHref }))}
                        />
                        <Card>
                            <h2 className="text-lg font-semibold">Your next steps</h2>
                            <ol className="mt-5 space-y-4">
                                {content.steps.map((step, index) => (
                                    <li key={step} className="flex items-center gap-3 text-sm leading-relaxed">
                                        <span className="bg-accent text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                                            {index + 1}
                                        </span>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </Card>
                    </div>
                )}
            </div>
        </Page>
    );
}
