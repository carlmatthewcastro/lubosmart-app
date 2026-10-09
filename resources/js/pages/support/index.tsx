import { InfoModal } from '@/components/info-modal';
import { Badge, Card, Empty, Page, Pager, Select, buttonClass, secondaryClass, type Pagination } from '@/components/marketplace-ui';
import { NewConversation } from '@/components/new-conversation';
import { type SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
type Case = { id: number; kind: string; subject: string; status: string; seller_order_id: number | null; participants: { name: string }[] };
export default function Support({ cases, filters }: { cases: Pagination<Case>; filters: { kind?: string; status?: string } }) {
    const { auth } = usePage<SharedData>().props;
    const admin = auth.user.role === 'admin';
    const [creating, setCreating] = useState(false);
    const search = useForm({ kind: filters.kind ?? '', status: filters.status ?? '' });
    return (
        <Page
            title={
                admin
                    ? filters.kind === 'message'
                        ? 'Messages'
                        : filters.kind === 'complaint'
                          ? 'Complaints & Disputes'
                          : 'Support Inbox'
                    : 'Help & Support'
            }
            description={admin ? 'Review cases and coordinate with the people involved.' : 'Contact the LubosMart team or raise an order concern.'}
            action={
                <button className={buttonClass} onClick={() => setCreating(true)}>
                    {admin ? 'New Conversation' : 'Contact Support'}
                </button>
            }
        >
            <NewConversation open={creating} onOpenChange={setCreating} admin={admin} kind={filters.kind} />
            <Card>
                <form
                    className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
                    onSubmit={(e) => {
                        e.preventDefault();
                        search.get('/support');
                    }}
                >
                    <Select label="Topic" value={search.data.kind} onChange={(e) => search.setData('kind', e.target.value)}>
                        <option value="">All Conversations</option>
                        <option value="complaint">Complaints & Disputes</option>
                        <option value="message">General Messages</option>
                    </Select>
                    <Select label="Status" value={search.data.status} onChange={(e) => search.setData('status', e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="in_review">In Review</option>
                        <option value="resolved">Resolved</option>
                    </Select>
                    <button className={buttonClass} disabled={search.processing}>
                        Apply Filters
                    </button>
                </form>
            </Card>
            {cases.data.length ? (
                <Card className="!p-0">
                    <ul className="divide-y">
                        {cases.data.map((item) => (
                            <li key={item.id}>
                                <div className="hover:bg-accent/40 flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
                                    <div className="min-w-0">
                                        <p className="text-muted-foreground text-xs capitalize">
                                            {item.kind} · #{item.id}
                                            {item.seller_order_id && ` · Parcel #${item.seller_order_id}`}
                                        </p>
                                        <h2 className="mt-1 text-sm font-semibold break-words">{item.subject}</h2>
                                        <p className="text-muted-foreground mt-1 text-xs break-words">
                                            {item.participants.map((person) => person.name).join(', ')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge status={item.status} />
                                        {admin ? (
                                            <InfoModal kind="conversation" id={item.id} label="Open Conversation" />
                                        ) : (
                                            <Link href={`/support/${item.id}`} className={secondaryClass}>
                                                Open
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            ) : (
                <Empty title="No Conversations Yet" description="New support messages and complaints will appear here." />
            )}
            <Pager links={cases.links} />
        </Page>
    );
}
