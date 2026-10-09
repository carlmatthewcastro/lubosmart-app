import { InfoModal } from '@/components/info-modal';
import { Badge, buttonClass, Card, Empty, Field, Page, Pager, secondaryClass, Select, type Pagination } from '@/components/marketplace-ui';
import { activityAction, activityDate, activityDescription, activitySubject, titleCase } from '@/lib/admin-display';
import { Link, useForm } from '@inertiajs/react';
import { History } from 'lucide-react';
type AuditEvent = {
    id: number;
    actor_name: string | null;
    subject_name: string;
    subject_type: string;
    subject_id: number;
    action: string;
    old_status: string | null;
    new_status: string | null;
    reason: string | null;
    occurred_at: string;
};
export default function AuditLog({
    events,
    filters,
    actions,
}: {
    events: Pagination<AuditEvent>;
    filters: { action?: string; search?: string };
    actions: string[];
}) {
    const form = useForm({ action: filters.action ?? '', search: filters.search ?? '' });
    return (
        <Page title="Activity History" description="A record of registration decisions, account access, and platform changes.">
            <Card>
                <form
                    className="grid items-end gap-4 sm:grid-cols-[1fr_220px_auto_auto]"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.get('/admin/audit-log');
                    }}
                >
                    <Field
                        label="Search Activity"
                        placeholder="Name, email, listing or conversation"
                        value={form.data.search}
                        onChange={(event) => form.setData('search', event.target.value)}
                    />
                    <Select label="Action" value={form.data.action} onChange={(event) => form.setData('action', event.target.value)}>
                        <option value="">All Actions</option>
                        {actions.map((action) => (
                            <option key={action} value={action}>
                                {activityAction(action)}
                            </option>
                        ))}
                    </Select>
                    <button className={buttonClass} disabled={form.processing}>
                        Apply Filters
                    </button>
                    <Link href="/admin/audit-log" className={secondaryClass}>
                        Reset
                    </Link>
                </form>
            </Card>
            {events.data.length ? (
                <Card className="!py-2">
                    <ul className="divide-y">
                        {events.data.map((event) => (
                            <li key={event.id} className="flex gap-4 py-6">
                                <span className="bg-accent text-primary mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl">
                                    <History className="size-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <Badge status={event.action} label={activityAction(event.action)} />
                                        <time className="text-muted-foreground text-xs">{activityDate(event.occurred_at)}</time>
                                    </div>
                                    <p className="mt-3 text-base font-semibold break-words">{event.subject_name}</p>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        {activitySubject(event.subject_type)} &middot;{' '}
                                        {activityDescription(event.action, event.actor_name ?? 'System')}
                                    </p>
                                    {event.new_status && (
                                        <p className="mt-2 text-sm capitalize">
                                            {titleCase(event.old_status ?? 'New')} &rarr; {titleCase(event.new_status)}
                                        </p>
                                    )}
                                    {event.reason && (
                                        <p className="text-muted-foreground mt-2 text-sm break-words whitespace-pre-wrap">{event.reason}</p>
                                    )}
                                    {['user', 'registration_application', 'support_case'].includes(event.subject_type) && (
                                        <div className="mt-4">
                                            <InfoModal
                                                kind={
                                                    event.subject_type === 'user'
                                                        ? 'account'
                                                        : event.subject_type === 'support_case'
                                                          ? 'conversation'
                                                          : 'registration'
                                                }
                                                id={event.subject_id}
                                                label={event.subject_type === 'support_case' ? 'View Conversation' : 'View Details'}
                                            />
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            ) : (
                <Empty title="No Matching Activity" description="Try another name or select All Actions." />
            )}
            <Pager links={events.links} />
        </Page>
    );
}
