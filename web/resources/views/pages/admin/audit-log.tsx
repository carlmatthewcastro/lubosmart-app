import AutoFilterForm from '@/components/shared/auto-filter-form';
import { FilterToolbar } from '@/components/shared/filter-toolbar';
import { InfoModal } from '@/components/shared/info-modal';
import { Badge, Card, Empty, Field, Page, Pager, Select, type Pagination } from '@/components/shared/marketplace-ui';
import { activityAction, activityDate, activityDescription, activitySubject, titleCase } from '@/lib/admin-display';
import { useForm } from '@inertiajs/react';
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
            <Card className="!p-4">
                <AutoFilterForm
                    processing={form.processing}
                    cancel={form.cancel}
                    className="relative"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.get('/admin/audit-log', { preserveState: true, preserveScroll: true, replace: true });
                    }}
                >
                    <FilterToolbar
                        hasErrors={Object.keys(form.errors).length > 0}
                        primary={
                            <Field
                                reserveFeedback={false}
                                label="Search Activity"
                                placeholder="Name, email, listing or conversation"
                                value={form.data.search}
                                onChange={(event) => form.setData('search', event.target.value)}
                            />
                        }
                        activeFilters={[
                            { key: 'search', label: 'Search', value: form.data.search ?? '', onRemove: () => form.setData('search', '') },
                            {
                                key: 'action',
                                label: 'Action',
                                value: form.data.action ? activityAction(form.data.action) : '',
                                onRemove: () => form.setData('action', ''),
                            },
                        ].filter((filter) => !!filter.value)}
                    >
                        <Select
                            reserveFeedback={false}
                            label="Action"
                            value={form.data.action}
                            onChange={(event) => form.setData('action', event.target.value)}
                        >
                            <option value="">All Actions</option>
                            {actions.map((action) => (
                                <option key={action} value={action}>
                                    {activityAction(action)}
                                </option>
                            ))}
                        </Select>
                    </FilterToolbar>
                </AutoFilterForm>
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
