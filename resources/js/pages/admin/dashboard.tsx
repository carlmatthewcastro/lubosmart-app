import { InfoModal } from '@/components/info-modal';
import { Badge, Card, Page, roleLabel, secondaryClass } from '@/components/marketplace-ui';
import { activityAction, activityDate, titleCase } from '@/lib/admin-display';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ChartNoAxesCombined,
    CheckCheck,
    ClipboardCheck,
    History,
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
}: {
    stats: Record<string, number>;
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
        <Page
            title="Admin Dashboard"
            description="A clear view of your platform, review queue, and account activity."
            action={
                <Link href="/reports" className={secondaryClass}>
                    <ChartNoAxesCombined className="size-4" />
                    View Reports
                </Link>
            }
        >
            <section className="border-primary/10 from-accent/80 via-accent/30 to-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-gradient-to-r px-6 py-5">
                <div>
                    <p className="text-lg font-semibold tracking-tight">Welcome back, {auth.user.name.split(' ')[0]}.</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {attentionTotal
                            ? attentionTotal + ' items need your attention. Start with the review queue below.'
                            : 'Your review queues are clear. You can manage accounts or update the platform.'}
                    </p>
                </div>
                <span
                    className={
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ' +
                        (attentionTotal ? 'border-primary/15 bg-card text-primary' : 'border-success/30 bg-success/5 text-success')
                    }
                >
                    <CheckCheck className="size-4" />
                    {attentionTotal ? 'Review Required' : 'All Caught Up'}
                </span>
            </section>
            <section aria-label="Platform summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <Link
                        key={metric.label}
                        href={metric.href}
                        className="group bg-card hover:border-primary/30 hover:shadow-primary/[.04] rounded-2xl border p-5 shadow-sm shadow-black/[.02] transition hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <span className="bg-accent/70 text-primary rounded-xl p-2.5">
                                <metric.icon className="size-5" />
                            </span>
                            <ArrowRight className="text-muted-foreground/50 group-hover:text-primary size-4 transition-colors" />
                        </div>
                        <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{metric.value.toLocaleString()}</p>
                        <p className="text-muted-foreground mt-1 text-xs font-medium">{metric.label}</p>
                    </Link>
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
                            <div className="bg-success/5 mt-5 flex items-start gap-3 rounded-xl p-4">
                                <CheckCheck className="text-success mt-0.5 size-5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">Nothing is waiting for review</p>
                                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                        New applications, flagged listings, disputes, and unread replies will appear here.
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
