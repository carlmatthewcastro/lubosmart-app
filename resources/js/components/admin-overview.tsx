import { InfoModal } from '@/components/info-modal';
import { Card, Empty, Page, secondaryClass } from '@/components/marketplace-ui';
import { activityAction, activityDate, titleCase } from '@/lib/admin-display';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ClipboardCheck, MessageSquareWarning, ShieldCheck, Users } from 'lucide-react';

export type AdminOverviewData = {
    applications: { id: number; name: string; role: string; submittedAt: string | null }[];
    openComplaints: number | null;
    unreadConversations: number | null;
    blockedListings: number | null;
};
export default function AdminOverview({
    stats,
    overview,
    records,
}: {
    stats: Record<string, number>;
    overview: AdminOverviewData;
    records: { id: number; label: string; status: string; detail: string; occurredAt?: string }[];
}) {
    const { adminWorkspace } = usePage<SharedData>().props;
    const permissions = adminWorkspace?.permissions ?? [];
    const metrics = [
        { label: 'Pending Registrations', value: stats['Pending review'], href: '/reviews', permission: 'registrations', icon: ClipboardCheck },
        { label: 'User Accounts', value: stats.Accounts, href: '/accounts', permission: 'accounts', icon: Users },
        { label: 'Flagged Listings', value: overview.blockedListings, href: '/admin/compliance', permission: 'compliance', icon: ShieldCheck },
        {
            label: 'Open Disputes',
            value: overview.openComplaints,
            href: '/support?kind=complaint',
            permission: 'disputes',
            icon: MessageSquareWarning,
        },
    ].filter((item) => permissions.includes(item.permission));
    return (
        <Page
            title="Admin Dashboard"
            description="Manage the platform and review items that need your attention."
            action={
                permissions.includes('reports') && (
                    <Link href="/reports" className={secondaryClass}>
                        View Reports
                    </Link>
                )
            }
        >
            {!!metrics.length && (
                <section aria-label="Platform summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => (
                        <Link
                            key={metric.label}
                            href={metric.href}
                            className="bg-card hover:border-primary/30 rounded-2xl border p-5 transition-colors"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-muted-foreground text-sm">{metric.label}</p>
                                <span className="bg-accent text-primary rounded-lg p-2">
                                    <metric.icon className="size-4" />
                                </span>
                            </div>
                            <p className="mt-3 text-3xl font-semibold tabular-nums">{(metric.value ?? 0).toLocaleString()}</p>
                        </Link>
                    ))}
                </section>
            )}
            {permissions.includes('finance') && (
                <Card>
                    <h2 className="font-semibold">Commission & Reports</h2>
                    <p className="text-muted-foreground mt-2 text-sm">Manage platform rates or review sales and commission reports.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link href="/admin/commission" className={secondaryClass}>
                            Commission
                        </Link>
                        <Link href="/reports" className={secondaryClass}>
                            Reports
                        </Link>
                    </div>
                </Card>
            )}
            {!!metrics.length && (
                <Card>
                    <h2 className="font-semibold">Recommended Actions</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {metrics
                            .filter((item) => item.permission !== 'accounts')
                            .map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className="bg-background flex justify-between gap-3 rounded-xl border p-4 text-sm"
                                >
                                    <span>
                                        <span className="block font-medium">{item.label}</span>
                                        <span className="text-muted-foreground mt-1 block text-xs">
                                            {item.permission === 'registrations'
                                                ? 'Check documents and approve or request corrections.'
                                                : item.permission === 'compliance'
                                                  ? 'Check categories, warn sellers or review blocked listings.'
                                                  : 'Review the complaint, check supporting evidence, and contact the parties involved.'}
                                        </span>
                                    </span>
                                    <span className="text-primary font-semibold">{item.value ?? 0}</span>
                                </Link>
                            ))}
                        {permissions.includes('messages') && (
                            <Link href="/support?kind=message" className="bg-background flex justify-between gap-3 rounded-xl border p-4 text-sm">
                                <span>
                                    <span className="block font-medium">Unread Messages</span>
                                    <span className="text-muted-foreground mt-1 block text-xs">
                                        Read new replies and respond to account or order concerns.
                                    </span>
                                </span>
                                <span className="text-primary font-semibold">{overview.unreadConversations ?? 0}</span>
                            </Link>
                        )}
                    </div>
                </Card>
            )}
            {permissions.includes('registrations') && (
                <Card>
                    <h2 className="font-semibold">Application Queue</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Oldest submissions first.</p>
                    {overview.applications.length ? (
                        <ul className="mt-4 divide-y">
                            {overview.applications.map((item) => (
                                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-muted-foreground mt-1 text-xs capitalize">{item.role.replaceAll('_', ' ')}</p>
                                    </div>
                                    <InfoModal kind="registration" id={item.id} label="Review Application" />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground mt-4 text-sm">No applications awaiting review.</p>
                    )}
                </Card>
            )}
            <Card>
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Recent Activity</h2>
                    <Link href="/admin/audit-log" className="text-primary text-sm hover:underline">
                        View Activity History
                    </Link>
                </div>
                {records.length ? (
                    <ul className="mt-4 divide-y">
                        {records.map((item) => (
                            <li key={item.id} className="py-4 text-sm">
                                <p className="font-medium">{titleCase(item.label)}</p>
                                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-muted-foreground">{activityAction(item.status)}</p>
                                    {item.occurredAt && (
                                        <time className="text-muted-foreground text-xs" dateTime={item.occurredAt}>
                                            {activityDate(item.occurredAt)}
                                        </time>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <Empty title="No Activity Yet" description="Admin actions will appear here." />
                )}
            </Card>
        </Page>
    );
}
