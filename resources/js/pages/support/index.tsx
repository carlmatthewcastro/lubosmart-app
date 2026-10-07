import {
    Badge,
    Card,
    Empty,
    Field,
    Page,
    Pager,
    Select,
    buttonClass,
    inputClass,
    secondaryClass,
    type Pagination,
} from '@/components/marketplace-ui';
import { type SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
type Case = { id: number; kind: string; subject: string; status: string; seller_order_id: number | null; participants: { name: string }[] };
export default function Support({ cases, filters }: { cases: Pagination<Case>; filters: { kind?: string; status?: string } }) {
    const { auth } = usePage<SharedData>().props;
    const admin = auth.user.role === 'admin';
    const [creating, setCreating] = useState(false);
    const [fileKey, setFileKey] = useState(0);
    const form = useForm({
        kind: filters.kind ?? 'complaint',
        subject: '',
        body: '',
        recipient_email: '',
        seller_order_id: '',
        attachment: null as File | null,
    });
    const search = useForm({ kind: filters.kind ?? '', status: filters.status ?? '' });
    return (
        <Page
            title={
                admin
                    ? filters.kind === 'message'
                        ? 'Messages'
                        : filters.kind === 'complaint'
                          ? 'Complaints & disputes'
                          : 'Support inbox'
                    : 'Help & support'
            }
            description={admin ? 'Review cases and coordinate with the people involved.' : 'Contact the LubosMart team or raise an order concern.'}
            action={
                <button className={buttonClass} onClick={() => setCreating(true)}>
                    {admin ? 'New conversation' : 'Contact support'}
                </button>
            }
        >
            {creating && (
                <Card>
                    <h2 className="mb-5 font-semibold">New conversation</h2>
                    <form
                        noValidate
                        className="grid gap-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/support', {
                                forceFormData: true,
                                onSuccess: () => {
                                    form.reset();
                                    setFileKey((key) => key + 1);
                                    setCreating(false);
                                },
                            });
                        }}
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select label="Topic" value={form.data.kind} onChange={(e) => form.setData('kind', e.target.value)}>
                                <option value="complaint">Complaint or dispute</option>
                                <option value="message">General message</option>
                            </Select>
                            <Field
                                label="Parcel order number (optional)"
                                type="number"
                                min="1"
                                value={form.data.seller_order_id}
                                onChange={(e) => form.setData('seller_order_id', e.target.value)}
                                error={form.errors.seller_order_id}
                            />
                        </div>
                        {admin && (
                            <Field
                                label="Recipient email (or use a parcel order number)"
                                type="email"
                                value={form.data.recipient_email}
                                onChange={(e) => form.setData('recipient_email', e.target.value)}
                                error={form.errors.recipient_email}
                            />
                        )}
                        <Field
                            label="Subject"
                            maxLength={160}
                            value={form.data.subject}
                            onChange={(e) => form.setData('subject', e.target.value)}
                            error={form.errors.subject}
                        />
                        <label className="grid gap-2 text-sm font-medium">
                            Message
                            <textarea
                                className={`${inputClass} min-h-32 font-normal`}
                                maxLength={5000}
                                value={form.data.body}
                                onChange={(e) => form.setData('body', e.target.value)}
                            />
                        </label>
                        <Field
                            key={fileKey}
                            label="Supporting evidence (optional, JPG/PNG/PDF, up to 5 MB)"
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(e) => form.setData('attachment', e.target.files?.[0] ?? null)}
                            error={form.errors.attachment}
                        />
                        <div className="flex flex-wrap gap-3">
                            <button className={buttonClass} disabled={form.processing}>
                                {form.processing ? 'Opening…' : 'Open conversation'}
                            </button>
                            <button className={secondaryClass} type="button" onClick={() => setCreating(false)}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </Card>
            )}
            <Card>
                <form
                    className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
                    onSubmit={(e) => {
                        e.preventDefault();
                        search.get('/support');
                    }}
                >
                    <Select label="Topic" value={search.data.kind} onChange={(e) => search.setData('kind', e.target.value)}>
                        <option value="">All conversations</option>
                        <option value="complaint">Complaints & disputes</option>
                        <option value="message">General messages</option>
                    </Select>
                    <Select label="Status" value={search.data.status} onChange={(e) => search.setData('status', e.target.value)}>
                        <option value="">All statuses</option>
                        <option value="open">Open</option>
                        <option value="in_review">In review</option>
                        <option value="resolved">Resolved</option>
                    </Select>
                    <button className={buttonClass} disabled={search.processing}>
                        Apply filters
                    </button>
                </form>
            </Card>
            {cases.data.length ? (
                <Card className="!p-0">
                    <ul className="divide-y">
                        {cases.data.map((item) => (
                            <li key={item.id}>
                                <Link
                                    href={`/support/${item.id}`}
                                    className="hover:bg-accent/40 flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6"
                                >
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
                                    <Badge status={item.status} />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Card>
            ) : (
                <Empty title="No conversations yet" description="New support messages and complaints will appear here." />
            )}
            <Pager links={cases.links} />
        </Page>
    );
}
