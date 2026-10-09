import { Badge, Card, Field, Page, Pager, Select, buttonClass, inputClass, secondaryClass, type Pagination } from '@/components/marketplace-ui';
import { ReasonConfirmation } from '@/components/reason-confirmation';
import { type SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
type Case = {
    id: number;
    subject: string;
    status: string;
    kind: string;
    resolution: string | null;
    participants: { id: number; name: string; role: string }[];
    seller_order_id: number | null;
};
type Message = {
    id: number;
    body: string;
    user_id: number;
    attachment_name: string | null;
    created_at: string;
    author: { name: string; role: string };
};
export default function Conversation({
    case: thread,
    messages,
    embedded = false,
    onSaved,
    onPageChange,
}: {
    case: Case;
    messages: Pagination<Message>;
    embedded?: boolean;
    onSaved?: () => void;
    onPageChange?: (url: string) => void;
}) {
    const { auth } = usePage<SharedData>().props;
    const admin = auth.user.role === 'admin';
    const form = useForm({ body: '', attachment: null as File | null });
    const [confirming, setConfirming] = useState(false);
    const decision = useForm({ status: thread.status, resolution: thread.resolution ?? '' });
    const [fileKey, setFileKey] = useState(0);
    return (
        <Page
            embedded={embedded}
            title={thread.subject}
            description={`Conversation #${thread.id}${thread.seller_order_id ? ` · Parcel #${thread.seller_order_id}` : ''}`}
            action={
                !embedded && (
                    <Link href="/support" className={secondaryClass}>
                        Back to Inbox
                    </Link>
                )
            }
        >
            <Card>
                <div className="flex flex-wrap items-center gap-3">
                    <Badge status={thread.status} />
                    <span className="text-muted-foreground text-sm">{thread.participants.map((person) => person.name).join(', ')}</span>
                </div>
                {thread.resolution && (
                    <p className="mt-4 text-sm break-words whitespace-pre-wrap">
                        <span className="font-medium">Resolution: </span>
                        {thread.resolution}
                    </p>
                )}
            </Card>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="grid gap-4">
                    <Card>
                        <h2 className="mb-5 font-semibold">Conversation</h2>
                        <ol className="max-h-[48dvh] space-y-4 overflow-y-auto overscroll-contain pr-2">
                            {[...messages.data].reverse().map((message) => (
                                <li
                                    key={message.id}
                                    className={`rounded-xl border p-4 ${message.author.role === 'admin' ? 'border-primary/15 bg-accent/40' : 'bg-background'}`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold">
                                            {message.author.name}
                                            {message.author.role === 'admin' && (
                                                <span className="text-primary ml-2 text-xs font-medium">LubosMart admin</span>
                                            )}
                                        </p>
                                        <time className="text-muted-foreground text-xs" dateTime={message.created_at}>
                                            {new Date(message.created_at).toLocaleString('en-PH')}
                                        </time>
                                    </div>
                                    <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-wrap">{message.body}</p>
                                    {message.attachment_name && (
                                        <a
                                            href={`/support/${thread.id}/evidence/${message.id}`}
                                            className="text-primary mt-3 inline-flex text-sm font-medium hover:underline"
                                        >
                                            Download Evidence
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </Card>
                    {embedded ? (
                        <nav aria-label="Message pages" className="flex flex-wrap justify-center gap-2">
                            {messages.links.length > 3 &&
                                messages.links.map((link, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        disabled={!link.url || link.active}
                                        className={secondaryClass}
                                        onClick={() => {
                                            if (link.url) onPageChange?.(link.url);
                                        }}
                                    >
                                        {link.label.replace(/&laquo;|&raquo;/g, '').trim()}
                                    </button>
                                ))}
                        </nav>
                    ) : (
                        <Pager links={messages.links} />
                    )}
                    {thread.status !== 'resolved' ? (
                        <Card>
                            <form
                                noValidate
                                className="grid gap-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    form.post(`/support/${thread.id}/messages`, {
                                        forceFormData: true,
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            form.reset();
                                            onSaved?.();
                                            setFileKey((key) => key + 1);
                                        },
                                    });
                                }}
                            >
                                <label className="grid gap-2 text-sm font-medium">
                                    Your Reply
                                    <textarea
                                        className={`${inputClass} min-h-28 resize-none font-normal`}
                                        required
                                        placeholder="Write a reply with the next step or update."
                                        maxLength={5000}
                                        value={form.data.body}
                                        onChange={(e) => form.setData('body', e.target.value)}
                                    />
                                </label>
                                <p className="text-muted-foreground text-xs">{form.data.body.length}/5,000 characters</p>
                                <p className="text-destructive text-sm" role={form.errors.body ? 'alert' : undefined}>
                                    {form.errors.body}
                                </p>
                                <Field
                                    key={fileKey}
                                    label="Evidence (optional, JPG/PNG/PDF, up to 5 MB)"
                                    type="file"
                                    accept="image/jpeg,image/png,application/pdf"
                                    onChange={(e) => form.setData('attachment', e.target.files?.[0] ?? null)}
                                    error={form.errors.attachment}
                                />
                                <button className={`${buttonClass} justify-self-start`} disabled={form.processing}>
                                    {form.processing ? 'Sending…' : 'Send Reply'}
                                </button>
                            </form>
                        </Card>
                    ) : (
                        <Card>
                            <p className="text-muted-foreground text-sm">This conversation is resolved. Admin can reopen it if needed.</p>
                        </Card>
                    )}
                </div>
                {admin && (
                    <Card>
                        <h2 className="font-semibold">Case Management</h2>
                        <form
                            noValidate
                            className="mt-5 grid gap-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                setConfirming(true);
                            }}
                        >
                            <Select label="Status" value={decision.data.status} onChange={(e) => decision.setData('status', e.target.value)}>
                                <option value="open">Open / reopen</option>
                                <option value="in_review">In Review</option>
                                <option value="resolved">Resolved</option>
                            </Select>
                            <label className="grid gap-2 text-sm font-medium">
                                Resolution Notes
                                <textarea
                                    className={`${inputClass} min-h-32 resize-none font-normal`}
                                    maxLength={5000}
                                    value={decision.data.resolution}
                                    onChange={(e) => decision.setData('resolution', e.target.value)}
                                />
                            </label>
                            <p className="text-muted-foreground text-xs">
                                Add an outcome before resolving the case. Notes are shared with participants.
                            </p>
                            <button className={buttonClass} disabled={decision.processing}>
                                Save case status
                            </button>
                        </form>
                    </Card>
                )}
            </div>
            <ReasonConfirmation
                open={confirming}
                onOpenChange={setConfirming}
                title="Confirm case status change?"
                reason={decision.data.resolution}
                onReasonChange={(value) => decision.setData('resolution', value)}
                required={decision.data.status === 'resolved'}
                processing={decision.processing}
                onConfirm={() =>
                    decision.patch(`/support/${thread.id}`, {
                        preserveScroll: true,
                        onSuccess: () => {
                            setConfirming(false);
                            onSaved?.();
                        },
                        onError: () => setConfirming(false),
                    })
                }
            />
        </Page>
    );
}
