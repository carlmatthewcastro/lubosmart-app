import {
    Badge,
    Card,
    Field,
    Page,
    Pager,
    Select,
    Textarea,
    buttonClass,
    roleLabel,
    secondaryClass,
    type Pagination,
} from '@/components/shared/marketplace-ui';
import { ReasonConfirmation } from '@/components/shared/reason-confirmation';
import ValidatedForm from '@/components/shared/validated-form';
import { fulfillmentConcerns } from '@/components/support/fulfillment-concerns';
import { type SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { BadgeCheck, Headphones, Info, Paperclip, Send, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ComponentProps } from 'react';

function EmbeddedConversation({ title, description, children }: ComponentProps<typeof Page>) {
    return (
        <div className="grid min-w-0 gap-4 p-4">
            <header className="border-primary/10 flex min-w-0 items-center gap-3 border-b pb-4">
                <span aria-hidden="true" className="bg-accent text-primary flex size-12 shrink-0 items-center justify-center rounded-full">
                    <Headphones className="size-6" />
                </span>
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold break-words">{title}</h3>
                    <p className="text-muted-foreground mt-1 text-xs">{description}</p>
                </div>
            </header>
            {children}
        </div>
    );
}
type Case = {
    id: number;
    subject: string;
    status: string;
    kind: string;
    resolution: string | null;
    participants: { id: number; name: string; role: string }[];
    seller_order_id: number | null;
    fulfillment_concern?: string | null;
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
    onRefresh,
    onPageChange,
}: {
    case: Case;
    messages: Pagination<Message> & { current_page?: number };
    embedded?: boolean;
    onSaved?: () => void;
    onRefresh?: () => void;
    onPageChange?: (url: string) => void;
}) {
    const { auth } = usePage<SharedData>().props;
    const admin = auth.user.role === 'admin';
    const form = useForm({ body: '', attachment: null as File | null });
    const [confirming, setConfirming] = useState(false);
    const decision = useForm({ status: thread.status, resolution: thread.resolution ?? '' });
    const [fileKey, setFileKey] = useState(0);
    const composerId = useId();
    const attachmentInput = useRef<HTMLInputElement>(null);
    const end = useRef<HTMLLIElement>(null);
    const historyElement = useRef<HTMLOListElement>(null);
    const latestId = messages.data[0]?.id;
    useEffect(() => {
        if ((messages.current_page ?? 1) !== 1) return;
        if (embedded && !admin && historyElement.current) historyElement.current.scrollTop = historyElement.current.scrollHeight;
        else end.current?.scrollIntoView({ block: 'nearest' });
    }, [latestId, messages.current_page, embedded, admin]);
    const Container = embedded ? EmbeddedConversation : Page;
    if (embedded && !admin) {
        const others = thread.participants.filter((person) => person.id !== auth.user.id);
        const support = others.some((person) => person.role === 'admin');
        const name = support ? 'LubosMart Support' : others.map((person) => person.name).join(', ') || thread.subject;
        const history = [...messages.data].reverse();
        return (
            <div className="support-chat">
                <header className="support-chat-header">
                    <span className="support-avatar" aria-hidden="true">
                        <Headphones className="size-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                            <span className="truncate">{name}</span>
                            {support && <BadgeCheck aria-label="LubosMart team" className="text-primary size-5 shrink-0" />}
                        </h3>
                        <p className="text-muted-foreground mt-1 truncate text-sm">
                            {thread.subject} &middot; {thread.status.replaceAll('_', ' ')}
                        </p>
                    </div>
                    <details className="support-info">
                        <summary aria-label="Conversation details">
                            <Info className="size-5" aria-hidden="true" />
                        </summary>
                        <div className="support-info-content">
                            <h4 className="font-semibold">Conversation #{thread.id}</h4>
                            <p className="mt-2 text-sm">{thread.subject}</p>
                            <p className="text-muted-foreground mt-2 text-xs">
                                {thread.participants.map((person) => person.name + ' (' + roleLabel(person.role) + ')').join(', ')}
                            </p>
                            {thread.seller_order_id && <p className="mt-2 text-sm">Parcel #{thread.seller_order_id}</p>}
                            {thread.fulfillment_concern && (
                                <p className="mt-3 text-sm">
                                    Reported concern: {fulfillmentConcerns[thread.fulfillment_concern] ?? thread.fulfillment_concern}. For admin
                                    review; reporting does not create a charge or account penalty.
                                </p>
                            )}
                            {onRefresh && (
                                <button type="button" className={secondaryClass + ' mt-4'} onClick={onRefresh}>
                                    Refresh conversation
                                </button>
                            )}
                        </div>
                    </details>
                </header>
                <ol ref={historyElement} aria-label="Message history" className="support-chat-history">
                    {!history.length && (
                        <li className="text-muted-foreground py-16 text-center text-sm">No messages yet. Send your first message below.</li>
                    )}
                    {history.map((message, index) => {
                        const own = message.user_id === auth.user.id;
                        const newDay =
                            index === 0 || new Date(history[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString();
                        return (
                            <li key={message.id} className="support-chat-entry">
                                {newDay && (
                                    <div className="support-date">
                                        <time dateTime={message.created_at}>
                                            {new Date(message.created_at).toLocaleDateString('en-PH', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </time>
                                    </div>
                                )}
                                <div className={'support-message-row' + (own ? ' support-message-row-own' : '')}>
                                    {!own && (
                                        <span className="support-avatar support-avatar-small" aria-hidden="true">
                                            <Headphones className="size-6" />
                                        </span>
                                    )}
                                    <div className={'support-bubble' + (own ? ' support-bubble-own' : '')}>
                                        <span className="sr-only">{own ? 'You' : message.author.name}: </span>
                                        {!own && <p className="sr-only">{message.author.name}</p>}
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap sm:text-base">{message.body}</p>
                                        {message.attachment_name && (
                                            <a
                                                href={'/support/' + thread.id + '/evidence/' + message.id}
                                                className="text-primary mt-2 inline-flex items-center gap-2 text-sm underline"
                                            >
                                                <Paperclip aria-hidden="true" className="size-4" />
                                                {message.attachment_name}
                                            </a>
                                        )}
                                        <time dateTime={message.created_at} className="support-message-time">
                                            {new Date(message.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                                        </time>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                    <li ref={end} aria-hidden="true" />
                </ol>
                {messages.links.length > 3 && (
                    <nav aria-label="Message pages" className="flex flex-wrap justify-center gap-2 px-4 pb-3">
                        {messages.links.map((link, index) => (
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
                )}
                {thread.resolution && (
                    <p className="bg-accent/40 mx-4 mb-3 rounded-xl p-3 text-sm whitespace-pre-wrap">
                        <span className="font-semibold">Resolution: </span>
                        {thread.resolution}
                    </p>
                )}
                {thread.status === 'resolved' ? (
                    <p className="text-muted-foreground border-t p-4 text-sm">This conversation is resolved. Admin can reopen it if needed.</p>
                ) : (
                    <ValidatedForm
                        noValidate
                        className="support-composer"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (form.processing || !form.data.body.trim()) return;
                            form.post('/support/' + thread.id + '/messages', {
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
                        <div className="support-compose-row">
                            <button
                                type="button"
                                className="support-attach"
                                aria-label="Attach evidence (JPG, PNG or PDF, up to 5 MB)"
                                onClick={() => attachmentInput.current?.click()}
                            >
                                <Paperclip aria-hidden="true" className="size-6" />
                            </button>
                            <input
                                key={fileKey}
                                ref={attachmentInput}
                                type="file"
                                className="sr-only"
                                tabIndex={-1}
                                aria-label="Evidence (optional, JPG/PNG/PDF, up to 5 MB)"
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={(event) => form.setData('attachment', event.target.files?.[0] ?? null)}
                            />
                            <label htmlFor={composerId} className="sr-only">
                                Your message
                            </label>
                            <textarea
                                id={composerId}
                                rows={1}
                                required
                                maxLength={5000}
                                placeholder="Type your message..."
                                value={form.data.body}
                                aria-invalid={!!form.errors.body}
                                aria-describedby={composerId + '-feedback'}
                                onChange={(event) => form.setData('body', event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                        event.preventDefault();
                                        if (!form.processing && form.data.body.trim()) event.currentTarget.form?.requestSubmit();
                                    }
                                }}
                            />
                            <button
                                type="submit"
                                className={buttonClass + ' support-send'}
                                disabled={form.processing || !form.data.body.trim()}
                                aria-label={form.processing ? 'Sending message' : 'Send message'}
                            >
                                <Send className="size-5" aria-hidden="true" />
                            </button>
                        </div>
                        <div id={composerId + '-feedback'}>
                            <p className="sr-only">
                                Up to 5,000 characters. Enter to send; Shift+Enter for a new line. Evidence: JPG, PNG or PDF, up to 5 MB.
                            </p>
                            {form.errors.body && (
                                <p role="alert" className="text-destructive mt-2 text-sm">
                                    {form.errors.body}
                                </p>
                            )}
                            {form.errors.attachment && (
                                <p role="alert" className="text-destructive mt-2 text-sm">
                                    {form.errors.attachment}
                                </p>
                            )}
                        </div>
                        {form.data.attachment && (
                            <div className="mt-2 flex min-w-0 items-center gap-2 text-xs">
                                <Paperclip aria-hidden="true" className="size-4 shrink-0" />
                                <span className="truncate">{form.data.attachment.name}</span>
                                <button
                                    type="button"
                                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                                    aria-label="Remove attachment"
                                    onClick={() => {
                                        form.setData('attachment', null);
                                        setFileKey((key) => key + 1);
                                    }}
                                >
                                    <X aria-hidden="true" className="size-4" />
                                </button>
                            </div>
                        )}
                        <span role="status" className="sr-only">
                            {form.processing ? 'Sending message...' : ''}
                        </span>
                    </ValidatedForm>
                )}
            </div>
        );
    }
    return (
        <Container
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
                    <span className="text-muted-foreground text-sm">
                        {thread.participants.map((person) => `${person.name} (${roleLabel(person.role)})`).join(', ')}
                    </span>
                </div>
                {thread.fulfillment_concern && (
                    <p className="mt-4 text-sm">
                        Reported concern: {fulfillmentConcerns[thread.fulfillment_concern] ?? thread.fulfillment_concern}. This is an allegation for
                        Admin review; reporting or resolving it does not create a charge or account penalty.
                    </p>
                )}
                {thread.resolution && (
                    <p className="mt-4 text-sm break-words whitespace-pre-wrap">
                        <span className="font-medium">Resolution: </span>
                        {thread.resolution}
                    </p>
                )}
            </Card>
            <div className="grid items-start gap-6">
                <div className="grid gap-4">
                    <Card>
                        <h2 className="mb-5 font-semibold">Conversation</h2>
                        <ol aria-label="Message history" className="max-h-[48dvh] min-h-48 space-y-5 overflow-y-auto overscroll-contain pr-2">
                            {!messages.data.length && (
                                <li className="text-muted-foreground py-6 text-center text-sm">No messages yet. Send a reply below.</li>
                            )}
                            {[...messages.data].reverse().map((message, index, history) => (
                                <li
                                    key={message.id}
                                    className={`border-primary/15 w-fit max-w-[95%] rounded-2xl border p-4 [overflow-wrap:anywhere] sm:max-w-[85%] ${message.user_id === auth.user.id ? 'bg-accent text-accent-foreground ml-auto rounded-br-sm' : 'bg-card mr-auto rounded-bl-sm shadow-sm'}`}
                                >
                                    {(index === 0 ||
                                        new Date(history[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString()) && (
                                        <p className="text-muted-foreground mb-3 text-xs font-medium">
                                            {new Date(message.created_at).toLocaleDateString('en-PH', { dateStyle: 'long' })}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold">
                                            {message.user_id === auth.user.id ? 'You' : message.author.name}
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
                                            Download {message.attachment_name}
                                        </a>
                                    )}
                                </li>
                            ))}
                            <li ref={end} aria-hidden="true" />
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
                            <ValidatedForm
                                noValidate
                                className="grid gap-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (form.processing || !form.data.body.trim()) return;
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
                                <Textarea
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                            event.preventDefault();
                                            if (!form.processing && form.data.body.trim()) event.currentTarget.form?.requestSubmit();
                                        }
                                    }}
                                    label="Your reply"
                                    error={form.errors.body}
                                    className="min-h-20 rounded-2xl font-normal"
                                    required
                                    placeholder="Type your message…"
                                    maxLength={5000}
                                    value={form.data.body}
                                    onChange={(e) => form.setData('body', e.target.value)}
                                />
                                <p className="text-muted-foreground text-xs">
                                    {form.data.body.length}/5,000 characters. Enter to send, Shift+Enter for a new line
                                </p>

                                <Field
                                    key={fileKey}
                                    label="Evidence (optional, JPG/PNG/PDF, up to 5 MB)"
                                    type="file"
                                    accept="image/jpeg,image/png,application/pdf"
                                    onChange={(e) => form.setData('attachment', e.target.files?.[0] ?? null)}
                                    error={form.errors.attachment}
                                />
                                <button className={`${buttonClass} justify-self-start`} disabled={form.processing || !form.data.body.trim()}>
                                    <Send aria-hidden="true" className="size-4" />
                                    {form.processing ? 'Sending…' : 'Send Reply'}
                                </button>
                            </ValidatedForm>
                        </Card>
                    ) : (
                        <Card>
                            <p className="text-muted-foreground text-sm">This conversation is resolved. Admin can reopen it if needed.</p>
                        </Card>
                    )}
                </div>
                {admin && (
                    <Card>
                        <h2 className="font-semibold">{thread.kind === 'complaint' ? 'Case Management' : 'Conversation status'}</h2>
                        <ValidatedForm
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
                            <Textarea
                                label="Resolution notes"
                                error={decision.errors.resolution}
                                className="min-h-32 font-normal"
                                maxLength={5000}
                                value={decision.data.resolution}
                                onChange={(e) => decision.setData('resolution', e.target.value)}
                            />
                            <p className="text-muted-foreground text-xs">
                                Add an outcome before resolving the case. Notes are shared with participants.
                            </p>
                            <button className={buttonClass} disabled={decision.processing}>
                                Save case status
                            </button>
                        </ValidatedForm>
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
        </Container>
    );
}
