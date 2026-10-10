import { Badge, buttonClass, inputClass, roleLabel, secondaryClass } from '@/components/marketplace-ui';
import { NewConversation } from '@/components/new-conversation';
import type { SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowUpRight, LoaderCircle, MessageCircle, Minus, SendHorizontal, SquarePen, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Conversation = {
    id: number;
    subject: string;
    status: string;
    participants: { id: number; name: string; role: string }[];
    latest_message?: Message | null;
};
type Message = { id: number; body: string; author: { id: number; name: string }; attachment_name?: string };
type Thread = { case: Conversation; messages: { data: Message[]; next_page_url: string | null } };
export function AdminFloatingMessages() {
    const { auth, adminWorkspace } = usePage<SharedData>().props;
    const enabled = ['admin', 'sorting_center'].includes(auth.user.role) && auth.user.status === 'approved';
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [thread, setThread] = useState<Thread | null>(null);
    const [conversations, setConversations] = useState<Conversation[] | null>(null);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [older, setOlder] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const end = useRef<HTMLDivElement>(null);
    const launcher = useRef<HTMLButtonElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const form = useForm({ body: '' });
    const unread = adminWorkspace?.badges.messages ?? 0;
    useEffect(() => {
        const show = () => setOpen(true);
        window.addEventListener('admin-messages:open', show);
        return () => window.removeEventListener('admin-messages:open', show);
    }, []);
    useEffect(() => {
        if (!open || !enabled) return;
        heading.current?.focus();
        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !creating) {
                setOpen(false);
                launcher.current?.focus();
            }
        };
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, [open, enabled, creating]);
    useEffect(() => {
        if (!open || !enabled || creating) return;
        const controller = new AbortController();
        const load = async () => {
            try {
                const response = await fetch(selected ? '/support/' + selected : '/support?kind=message', {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                    signal: controller.signal,
                });
                if (!response.ok) throw Error('Could not load messages. Please try again.');
                const data = await response.json();
                if (!controller.signal.aborted) {
                    if (selected)
                        setThread((current) =>
                            older && current && current.case.id === data.case.id
                                ? {
                                      ...data,
                                      messages: {
                                          ...current.messages,
                                          data: [
                                              ...data.messages.data,
                                              ...current.messages.data.filter(
                                                  (message: Message) => !data.messages.data.some((latest: Message) => latest.id === message.id),
                                              ),
                                          ],
                                      },
                                  }
                                : data,
                        );
                    else setConversations(data.cases.data);
                    setError('');
                }
            } catch (reason) {
                if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load messages.');
            }
        };
        void load();
        const timer = setInterval(() => {
            if (!document.hidden) void load();
        }, 30000);
        return () => {
            controller.abort();
            clearInterval(timer);
        };
    }, [open, enabled, creating, selected, refresh, older]);
    useEffect(() => {
        if (!older) end.current?.scrollIntoView({ block: 'nearest' });
    }, [thread, older]);
    const close = () => {
        setOpen(false);
        launcher.current?.focus();
    };
    if (!enabled) return null;
    return (
        <>
            {!open && (
                <button
                    ref={launcher}
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label={'Open quick messages, ' + unread + ' unread conversations'}
                    className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 focus-visible:ring-primary/25 fixed right-4 bottom-4 z-30 flex min-h-12 items-center gap-2 rounded-full px-5 py-3 shadow-lg transition focus-visible:ring-4 sm:right-6 sm:bottom-6"
                >
                    <MessageCircle className="size-5" />
                    <span className="text-sm font-semibold">Messages</span>
                    {!!unread && <span className="rounded-full bg-white/20 px-2 text-xs">{unread > 99 ? '99+' : unread}</span>}
                </button>
            )}
            {open && (
                <section
                    role="region"
                    aria-label="Quick messages"
                    className="bg-card fixed right-3 bottom-3 z-40 flex h-[min(600px,calc(100dvh_-_6rem))] w-[calc(100vw_-_1.5rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl shadow-black/15 sm:right-6 sm:bottom-6 sm:w-96"
                >
                    <header className="bg-accent/50 flex shrink-0 items-center gap-2 border-b p-4">
                        {selected && (
                            <button
                                type="button"
                                className="hover:bg-accent rounded-lg p-2"
                                aria-label="Back to conversations"
                                onClick={() => {
                                    setSelected(null);
                                    setThread(null);
                                    setOlder(false);
                                    form.reset();
                                    form.clearErrors();
                                    setError('');
                                }}
                            >
                                <ArrowLeft className="size-4" />
                            </button>
                        )}
                        <div className="min-w-0 flex-1">
                            <h2 ref={heading} tabIndex={-1} className="truncate text-sm font-semibold outline-none">
                                {thread?.case.subject ?? 'Quick Messages'}
                            </h2>
                            <p className="text-muted-foreground mt-0.5 text-xs">{selected ? 'Conversation' : 'Stay connected while you work'}</p>
                        </div>
                        <button type="button" onClick={close} aria-label="Minimize messages" className="hover:bg-accent rounded-lg p-2">
                            <Minus className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                close();
                                setSelected(null);
                                setThread(null);
                                setOlder(false);
                                form.reset();
                                form.clearErrors();
                            }}
                            aria-label="Close messages"
                            className="hover:bg-accent rounded-lg p-2"
                        >
                            <X className="size-4" />
                        </button>
                    </header>
                    {error && (
                        <div role="alert" className="border-b p-3 text-sm">
                            {error}{' '}
                            <button type="button" className="text-primary font-medium underline" onClick={() => setRefresh((value) => value + 1)}>
                                Retry
                            </button>
                        </div>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                        {selected ? (
                            !thread ? (
                                <p className="text-muted-foreground text-sm">Loading conversation...</p>
                            ) : (
                                <>
                                    <div className="mb-4 flex flex-wrap items-center gap-2">
                                        <Badge status={thread.case.status} />
                                        <Link
                                            href={'/support/' + selected}
                                            className="text-primary ml-auto flex items-center gap-1 text-xs font-medium"
                                        >
                                            Full Conversation <ArrowUpRight className="size-3" />
                                        </Link>
                                    </div>
                                    <p className="text-muted-foreground mb-4 text-xs">
                                        {thread.case.participants
                                            .filter((person) => person.id !== auth.user.id)
                                            .map((person) => person.name)
                                            .join(', ')}
                                    </p>
                                    {thread.messages.next_page_url && (
                                        <button
                                            type="button"
                                            disabled={loadingOlder}
                                            className={secondaryClass + ' mb-4 w-full'}
                                            onClick={async () => {
                                                setLoadingOlder(true);
                                                try {
                                                    const response = await fetch(thread.messages.next_page_url!, {
                                                        headers: { Accept: 'application/json' },
                                                        cache: 'no-store',
                                                    });
                                                    if (!response.ok) throw Error('Earlier messages could not be loaded.');
                                                    const data: Thread = await response.json();
                                                    setOlder(true);
                                                    setThread((current) =>
                                                        current?.case.id === data.case.id
                                                            ? {
                                                                  ...current,
                                                                  messages: {
                                                                      ...data.messages,
                                                                      data: [
                                                                          ...current.messages.data,
                                                                          ...data.messages.data.filter(
                                                                              (message) =>
                                                                                  !current.messages.data.some(
                                                                                      (existing) => existing.id === message.id,
                                                                                  ),
                                                                          ),
                                                                      ],
                                                                  },
                                                              }
                                                            : current,
                                                    );
                                                } catch {
                                                    setError('Earlier messages could not be loaded. Please try again.');
                                                } finally {
                                                    setLoadingOlder(false);
                                                }
                                            }}
                                        >
                                            {loadingOlder ? 'Loading...' : 'Load Earlier Messages'}
                                        </button>
                                    )}
                                    <div className="space-y-3">
                                        {[...thread.messages.data].reverse().map((message) => (
                                            <div
                                                key={message.id}
                                                className={
                                                    'max-w-[90%] rounded-2xl px-3 py-2.5 ' +
                                                    (message.author.id === auth.user.id
                                                        ? 'bg-primary/10 ml-auto rounded-br-sm'
                                                        : 'bg-muted rounded-bl-sm')
                                                }
                                            >
                                                <p className="text-muted-foreground mb-1 text-[11px] font-medium">
                                                    {message.author.id === auth.user.id ? 'You' : message.author.name}
                                                </p>
                                                <p className="text-sm break-words whitespace-pre-wrap">{message.body}</p>
                                                {message.attachment_name && (
                                                    <a
                                                        className="text-primary mt-2 block text-xs underline"
                                                        href={'/support/' + selected + '/evidence/' + message.id}
                                                    >
                                                        Download Attachment
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div ref={end} />
                                </>
                            )
                        ) : conversations === null ? (
                            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
                                <LoaderCircle className="size-4 animate-spin" />
                                Loading messages...
                            </div>
                        ) : conversations.length ? (
                            <div className="space-y-2">
                                {conversations.map((conversation) => (
                                    <button
                                        key={conversation.id}
                                        type="button"
                                        className="hover:border-primary/30 hover:bg-accent/40 w-full rounded-xl border p-3 text-left transition-colors"
                                        onClick={() => {
                                            setSelected(conversation.id);
                                            setThread(null);
                                            setOlder(false);
                                            setError('');
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="min-w-0 text-sm font-semibold break-words">{conversation.subject}</p>
                                        </div>
                                        <p className="text-muted-foreground mt-1 truncate text-xs">
                                            {conversation.participants
                                                .filter((person) => person.id !== auth.user.id)
                                                .map((person) => person.name + ' (' + roleLabel(person.role) + ')')
                                                .join(', ')}
                                        </p>
                                        <p className="text-muted-foreground mt-2 line-clamp-1 text-xs">
                                            {conversation.latest_message
                                                ? (conversation.latest_message.author.id === auth.user.id ? 'You: ' : '') +
                                                  conversation.latest_message.body
                                                : 'Open conversation'}
                                        </p>
                                        <div className="mt-2">
                                            <Badge status={conversation.status} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <MessageCircle className="text-primary mx-auto mb-3 size-8" />
                                <p className="text-sm font-medium">No conversations yet</p>
                                <p className="text-muted-foreground mt-1 text-xs">Start a conversation with a registered user.</p>
                            </div>
                        )}
                    </div>
                    <footer className="shrink-0 border-t p-3">
                        {selected ? (
                            thread?.case.status === 'resolved' ? (
                                <p className="text-muted-foreground p-2 text-xs">
                                    This conversation is resolved. Reopen it in the full conversation to reply.
                                </p>
                            ) : (
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        form.post('/support/' + selected + '/messages', {
                                            preserveScroll: true,
                                            preserveState: true,
                                            onSuccess: () => {
                                                form.reset();
                                                setOlder(false);
                                                setRefresh((value) => value + 1);
                                            },
                                        });
                                    }}
                                >
                                    <label htmlFor="quick-message" className="sr-only">
                                        Reply
                                    </label>
                                    <textarea
                                        id="quick-message"
                                        className={inputClass + ' h-20 resize-none'}
                                        maxLength={5000}
                                        placeholder="Write a reply..."
                                        value={form.data.body}
                                        onChange={(event) => form.setData('body', event.target.value)}
                                        disabled={form.processing || !thread}
                                    />
                                    {form.errors.body && (
                                        <p role="alert" className="text-destructive mt-1 text-xs">
                                            {form.errors.body}
                                        </p>
                                    )}
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground text-[11px]">{form.data.body.length.toLocaleString()} / 5,000</span>
                                        <button className={buttonClass} disabled={form.processing || !form.data.body.trim() || !thread}>
                                            <SendHorizontal className="size-4" />
                                            {form.processing ? 'Sending...' : 'Send Reply'}
                                        </button>
                                    </div>
                                </form>
                            )
                        ) : (
                            <div className="flex justify-end">
                                <button type="button" className={buttonClass} onClick={() => setCreating(true)}>
                                    <SquarePen className="size-4" />
                                    New Message
                                </button>
                            </div>
                        )}
                    </footer>
                </section>
            )}
            <NewConversation
                open={creating}
                onOpenChange={(value) => {
                    setCreating(value);
                    if (!value) setRefresh((count) => count + 1);
                }}
                admin
                kind="message"
            />
        </>
    );
}
