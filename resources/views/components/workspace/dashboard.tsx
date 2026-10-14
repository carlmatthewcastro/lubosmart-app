import { Badge, Card, Empty, Page, buttonClass, secondaryClass } from '@/components/shared/marketplace-ui';
import { DashboardMetric, DashboardQueues, DashboardWelcome } from '@/components/workspace/dashboard-panels';
import { assets } from '@/config/assets';
import { type SharedData, type UserRole } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, CheckCheck, Clock3, Package, ShoppingBag, Store, Truck, type LucideIcon } from 'lucide-react';

export interface WorkspaceDashboardProps {
    role: Exclude<UserRole, 'admin'>;
    stats: Record<string, number>;
    records: { id: number; label: string; status: string; detail: string }[];
    storeStatus?: string;
    companyName?: string | null;
}
export interface WorkspaceDashboardContent {
    title: string;
    description: string;
    primary: string;
    href: string;
    steps: string[];
    links: { title: string; text: string; href: string; icon: LucideIcon }[];
}
export default function WorkspaceDashboard({
    role,
    stats,
    records,
    storeStatus,
    companyName,
    content,
}: WorkspaceDashboardProps & { content: WorkspaceDashboardContent }) {
    const { auth } = usePage<SharedData>().props;
    const activityHref = ['courier', 'sorting_center'].includes(role) ? '/deliveries' : '/orders';
    const roleTitle = role === 'courier' ? 'Rider' : role === 'sorting_center' ? 'Logistics' : role === 'seller' ? 'Seller' : 'Buyer';
    const RoleIcon = role === 'buyer' ? ShoppingBag : role === 'seller' ? Store : Truck;
    const metrics = Object.entries(stats);
    return (
        <Page title={content.title} description={content.description}>
            {role === 'buyer' ? (
                <section className="bg-card relative isolate overflow-hidden rounded-2xl border">
                    <img src={assets.marketplace.hero} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
                    <div className="bg-card/95 p-6 sm:w-3/5 sm:p-8">
                        <p className="text-primary text-xs font-semibold tracking-widest uppercase">Your local marketplace</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Shop local.
                            <br />
                            Find your everyday favorites.
                        </h2>
                        <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed">
                            Discover products from local sellers and keep every order close at hand.
                        </p>
                        <Link href={content.href} className={buttonClass + ' mt-5'}>
                            {content.primary}
                            <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                    </div>
                </section>
            ) : (
                <DashboardWelcome
                    label={roleTitle + ' portal'}
                    title={'Welcome back, ' + auth.user.name.split(' ')[0] + '.'}
                    description={companyName ? 'Your deliveries with ' + companyName + '.' : content.description}
                    icon={RoleIcon}
                >
                    <Link href={content.href} className={buttonClass}>
                        {content.primary}
                        <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                    <Link href="/settings/profile" className={secondaryClass}>
                        My account
                    </Link>
                </DashboardWelcome>
            )}
            {role === 'seller' && storeStatus !== 'approved' && (
                <Card>Your store is awaiting approval. Product publishing requires an approved store.</Card>
            )}
            <section aria-label="Account overview" className="grid gap-4 sm:grid-cols-3">
                {metrics.map(([label, value], index) => (
                    <DashboardMetric
                        key={label}
                        label={label}
                        value={value}
                        hint="Current account totals"
                        icon={index === 0 ? RoleIcon : index === 1 ? Clock3 : CheckCheck}
                    />
                ))}
            </section>
            <section aria-label="Quick actions" className={'grid gap-4 ' + (content.links.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
                {content.links.map((item) => (
                    <Link
                        key={item.title}
                        href={item.href}
                        className="group bg-card hover:border-primary/40 flex min-w-0 items-center gap-4 rounded-2xl border p-5 transition-colors"
                    >
                        <span aria-hidden="true" className="bg-accent text-primary rounded-xl p-3">
                            <item.icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-semibold">{item.title}</h2>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{item.text}</p>
                        </div>
                        <ArrowRight aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                ))}
            </section>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <Card>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">{role === 'courier' ? 'Recent deliveries' : 'Recent orders'}</h2>
                        <Link href={activityHref} className="text-primary inline-flex min-h-11 items-center gap-1 text-sm font-medium">
                            View all
                            <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                    </div>
                    {records.length ? (
                        <ul className="divide-y">
                            {records.map((record) => (
                                <li key={record.id}>
                                    <Link
                                        href={activityHref}
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
                <div className="space-y-6">
                    <DashboardQueues
                        title={role === 'courier' ? 'Delivery overview' : 'Account snapshot'}
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
            </div>
        </Page>
    );
}
