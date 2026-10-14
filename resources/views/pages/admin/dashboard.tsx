import { DashboardAnalytics, type DashboardAnalyticsData } from '@/components/admin/dashboard-analytics';
import { InfoModal } from '@/components/shared/info-modal';
import { Badge, buttonClass, Card, Page, roleLabel, secondaryClass } from '@/components/shared/marketplace-ui';
import { DashboardMetric } from '@/components/workspace/dashboard-panels';
import { activityAction, activityDate, titleCase } from '@/lib/admin-display';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ChartNoAxesCombined,
    ClipboardCheck,
    History,
    Inbox,
    Megaphone,
    MessageCircle,
    MessageSquareWarning,
    Percent,
    ShieldCheck,
    Users,
} from 'lucide-react';

type AdminOverviewData = {
    applications: { id: number; name: string; role: string; submittedAt: string | null }[];
    openComplaints: number | null;
    unreadConversations: number | null;
    blockedListings: number | null;
};
export default function AdminDashboard({
    stats,
    adminOverview: overview,
    records,
    analytics,
}: {
    stats: Record<string, number>;
    analytics?: DashboardAnalyticsData | null;
    adminOverview: AdminOverviewData;
    records: { id: number; label: string; status: string; detail: string; occurredAt?: string }[];
}) {
    const { auth, adminWorkspace } = usePage<SharedData>().props;
    const permissions = adminWorkspace?.permissions ?? [];
    const metrics = [
        {
            label: 'Pending Registrations',
            value: stats['Pending review'] ?? 0,
            href: '/reviews',
            permission: 'registrations',
            icon: ClipboardCheck,
            action: 'Review applications',
            hint: 'Check requirements and approve eligible applicants.',
        },
        {
            label: 'User Accounts',
            value: stats.Accounts ?? 0,
            href: '/accounts',
            permission: 'accounts',
            icon: Users,
            action: 'Manage accounts',
            hint: 'View profiles and account access.',
        },
        {
            label: 'Flagged Listings',
            value: overview.blockedListings ?? 0,
            href: '/admin/compliance',
            permission: 'compliance',
            icon: ShieldCheck,
            action: 'Review listings',
            hint: 'Check category mismatches and address violations.',
        },
        {
            label: 'Open Disputes',
            value: overview.openComplaints ?? 0,
            href: '/support?kind=complaint',
            permission: 'disputes',
            icon: MessageSquareWarning,
            action: 'Review disputes',
            hint: 'Read the evidence and coordinate a resolution.',
        },
    ].filter((item) => permissions.includes(item.permission));
    const attention = [
        ...metrics.filter((item) => item.permission !== 'accounts'),
        {
            label: 'Unread Messages',
            value: overview.unreadConversations ?? 0,
            href: '/support?kind=message',
            permission: 'messages',
            icon: MessageCircle,
            action: 'Reply to messages',
            hint: 'Respond to account, registration, or order concerns.',
        },
    ].filter((item) => item.value > 0 && permissions.includes(item.permission));
    const attentionTotal = attention.reduce((total, item) => total + item.value, 0);
    const shortcuts = [
        { title: 'Commission', detail: 'Set the platform share for new orders.', href: '/admin/commission', icon: Percent, permission: 'finance' },
        {
            title: 'Sales & Commission Reports',
            detail: 'Review delivered sales and export records.',
            href: '/reports',
            icon: ChartNoAxesCombined,
            permission: 'reports',
        },
        {
            title: 'Announcements & Policies',
            detail: 'Prepare and publish platform updates.',
            href: '/admin/platform',
            icon: Megaphone,
            permission: 'system',
        },
    ].filter((item) => permissions.includes(item.permission));
    return (
        <Page headerInNavbar title="Admin Dashboard" description="Track sales, commission, and delivery progress, then act on your review queues.">
            <section
                aria-label="Welcome and priorities"
                className="border-primary/15 from-accent via-card to-background relative overflow-hidden rounded-2xl border bg-linear-to-br p-6 sm:p-8"
            >
                <div
                    aria-hidden="true"
                    className="border-primary/5 pointer-events-none absolute -top-24 -right-24 size-80 rounded-full border-[48px]"
                />
                <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-8">
                    <div className="min-w-0">
                        <h2 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
                            Welcome back, {auth.user.name.trim().split(/\s+/)[0]}.
                        </h2>
                        <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
                            {attentionTotal
                                ? 'See how your platform is performing, then take care of the items waiting for review.'
                                : 'Your review queues are clear. Take a look at sales, commission, and delivery progress below.'}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            {attention[0] && (
                                <Link href={attention[0].href} className={buttonClass}>
                                    {attention[0].action}
                                    <ArrowRight aria-hidden="true" className="size-4" />
                                </Link>
                            )}
                            {permissions.includes('accounts') && (
                                <Link href="/accounts" className={secondaryClass}>
                                    <Users aria-hidden="true" className="size-4" />
                                    Manage accounts
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="bg-card/90 min-w-0 rounded-2xl border p-5 shadow-sm sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-muted-foreground text-xs font-medium">Review priorities</p>
                                <p className="mt-2 text-3xl font-semibold tabular-nums">
                                    {attentionTotal.toLocaleString()}
                                    <span className="text-muted-foreground ml-2 text-sm font-normal">pending items</span>
                                </p>
                            </div>
                        </div>
                        {attention.length ? (
                            <ul className="mt-4 divide-y border-t">
                                {attention.slice(0, 3).map((item) => (
                                    <li key={item.label}>
                                        <Link
                                            href={item.href}
                                            className="hover:text-primary focus-visible:ring-ring flex min-h-11 items-center justify-between gap-3 rounded py-3 text-sm focus-visible:ring-2"
                                        >
                                            <span className="min-w-0">{item.label}</span>
                                            <span className="font-semibold tabular-nums">{item.value.toLocaleString()}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="mt-4 border-t pt-4">
                                <p className="text-primary text-sm font-medium">All caught up</p>
                                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                                    New registrations, flagged listings, disputes, and unread messages will appear when action is needed.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            {analytics && <DashboardAnalytics data={analytics} />}
            <section aria-label="Platform summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <DashboardMetric
                        key={metric.label}
                        label={metric.label}
                        value={metric.value}
                        hint={metric.hint}
                        href={metric.href}
                        icon={metric.icon}
                    />
                ))}
            </section>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
                <div className="space-y-6">
                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="font-semibold">Needs Attention</h2>
                                <p className="text-muted-foreground mt-1 text-xs">Focus on the next action that moves things forward.</p>
                            </div>
                            <span className="bg-accent text-primary rounded-full px-3 py-1 text-xs font-semibold tabular-nums">{attentionTotal}</span>
                        </div>
                        {attention.length ? (
                            <div className="mt-5 divide-y">
                                {attention.map((item) => (
                                    <Link key={item.label} href={item.href} className="group flex items-center gap-3 py-4">
                                        <span className="bg-accent/60 text-primary rounded-xl p-2.5">
                                            <item.icon className="size-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold">{item.action}</span>
                                            <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">{item.hint}</span>
                                        </span>
                                        <span className="text-primary text-sm font-semibold tabular-nums">{item.value}</span>
                                        <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0" />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-accent/50 mt-5 flex items-start gap-3 rounded-xl p-4">
                                <span className="bg-card text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                                    <Inbox aria-hidden="true" className="size-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-medium">Your review queue is clear</p>
                                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                        New applications, flagged listings, disputes, and unread replies will appear here when they need attention.
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>
                    <Card>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="font-semibold">Registration Queue</h2>
                                <p className="text-muted-foreground mt-1 text-xs">Oldest submissions are shown first.</p>
                            </div>
                            <Link href="/reviews" className="text-primary flex items-center gap-1 text-xs font-semibold hover:underline">
                                View Registrations <ArrowRight className="size-3" />
                            </Link>
                        </div>
                        {overview.applications.length ? (
                            <ul className="mt-5 divide-y">
                                {overview.applications.map((item) => (
                                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold">
                                                {item.name.charAt(0).toUpperCase()}
                                            </span>
                                            <div>
                                                <p className="text-sm font-semibold break-words">{item.name}</p>
                                                <p className="text-muted-foreground mt-1 text-xs">{roleLabel(item.role)}</p>
                                            </div>
                                        </div>
                                        <InfoModal kind="registration" id={item.id} label="Review Application" />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed px-5 py-8 text-center">
                                <ClipboardCheck className="text-muted-foreground/50 mb-3 size-7" />
                                <p className="text-sm font-medium">No pending applications</p>
                                <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
                                    Submitted applications will appear here when they are ready for your review.
                                </p>
                            </div>
                        )}
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <h2 className="font-semibold">Platform Management</h2>
                        <div className="mt-4 divide-y">
                            {shortcuts.map((item) => (
                                <Link key={item.title} href={item.href} className="group flex items-center gap-3 py-4">
                                    <span className="bg-accent/60 text-primary rounded-xl p-2.5">
                                        <item.icon className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold">{item.title}</span>
                                        <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">{item.detail}</span>
                                    </span>
                                    <ArrowRight className="text-muted-foreground/60 group-hover:text-primary size-4 shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </Card>
                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-semibold">Recent Activity</h2>
                            <History className="text-muted-foreground size-4" />
                        </div>
                        {records.length ? (
                            <ul className="mt-4 divide-y">
                                {records.slice(0, 5).map((item) => (
                                    <li key={item.id} className="py-3">
                                        <p className="text-sm font-medium break-words">{titleCase(item.label)}</p>
                                        <div className="mt-2">
                                            <Badge status={item.status} label={activityAction(item.status)} />
                                        </div>
                                        {item.occurredAt && (
                                            <time className="text-muted-foreground mt-2 block text-[11px]" dateTime={item.occurredAt}>
                                                {activityDate(item.occurredAt)}
                                            </time>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground py-6 text-xs leading-relaxed">
                                Account reviews and platform updates will appear here.
                            </p>
                        )}
                        <Link
                            href="/admin/audit-log"
                            className="text-primary mt-4 flex items-center justify-between border-t pt-4 text-xs font-semibold"
                        >
                            View Activity History <ArrowRight className="size-3.5" />
                        </Link>
                    </Card>
                </div>
            </div>
        </Page>
    );
}
