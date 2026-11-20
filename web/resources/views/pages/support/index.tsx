import '@/../css/support-inbox.css';
import { Card, Page, Pager, Select, buttonClass, secondaryClass, type Pagination } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { NewConversation } from '@/components/support/new-conversation';
import Conversation from '@/pages/support/show';
import { type SharedData } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Circle, Headphones, Mail, MessageCircle, Search, ShieldCheck, SlidersHorizontal, SquarePen } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentProps } from 'react';

type Case = {
    id: number;
    kind: string;
    subject: string;
    status: string;
    seller_order_id: number | null;
    participants: { id: number; name: string; role: string }[];
    unread_count: number;
    latest_message: { body: string; created_at: string; author: { id: number; name: string } } | null;
};
type Thread = ComponentProps<typeof Conversation>;
export default function Support({
    cases,
    filters,
}: {
    cases: Pagination<Case>;
    filters: { kind?: string; status?: string; search?: string; unread?: string };
}) {
    const { auth } = usePage<SharedData>().props;
    const canChooseRecipient = ['admin', 'logistics'].includes(auth.user.role);
    const [creating, setCreating] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [thread, setThread] = useState<Thread | null>(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [pageUrl, setPageUrl] = useState<string | null>(null);
    const [composing, setComposing] = useState(false);
    const initialized = useRef(false);
    useEffect(() => {
        if (initialized.current || !cases.data.length) return;
        initialized.current = true;
        if (window.matchMedia('(min-width: 1024px)').matches) setSelected(cases.data[0].id);
    }, [cases.data]);
    const heading = useRef<HTMLHeadingElement>(null);
    const inboxHeading = useRef<HTMLHeadingElement>(null);
    const search = useForm({
        kind: filters.kind ?? '',
        status: filters.status ?? '',
        search: filters.search ?? '',
        unread: filters.unread ? '1' : '',
    });
    const filtered = !!(search.data.kind || search.data.status || search.data.search || search.data.unread);
    const { data: filterData, get: getConversations } = search;
    useEffect(() => {
        if (composing) return;
        if (
            filterData.kind === (filters.kind ?? '') &&
            filterData.status === (filters.status ?? '') &&
            filterData.search === (filters.search ?? '') &&
            filterData.unread === (filters.unread ? '1' : '')
        )
            return;
        const timer = setTimeout(() => getConversations('/support', { preserveState: true, preserveScroll: true, replace: true }), 350);
        return () => clearTimeout(timer);
    }, [composing, filterData, getConversations, filters.kind, filters.status, filters.search, filters.unread]);
    useEffect(() => {
        if (creating || search.processing) return;
        const timer = setInterval(() => {
            if (document.hidden) return;
            if (selected && !pageUrl && document.hasFocus()) setAttempt((value) => value + 1);
            else router.reload({ only: ['cases', 'adminWorkspace'] });
        }, 30000);
        return () => clearInterval(timer);
    }, [selected, creating, pageUrl, search.processing, search.data.kind, search.data.status, search.data.search, search.data.unread]);
    useEffect(() => {
        if (!selected) return;
        const controller = new AbortController();
        setError('');
        fetch(pageUrl ?? `/support/${selected}`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal })
            .then(async (response) => {
                if (!response.ok)
                    throw Error(
                        response.status === 403
                            ? 'You no longer have access to this conversation.'
                            : 'Could not load this conversation. Please try again.',
                    );
                return response.json();
            })
            .then((data) => {
                if (controller.signal.aborted) return;
                setThread(data);
                router.reload({ only: ['cases', 'adminWorkspace'] });
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(reason.message);
            });
        return () => controller.abort();
    }, [selected, attempt, pageUrl]);
    useEffect(() => {
        if (selected) heading.current?.focus({ preventScroll: true });
    }, [selected]);
    const refresh = () => {
        setPageUrl(null);
        setAttempt((value) => value + 1);
    };
    const clear = () => {
        search.setData({ kind: '', status: '', search: '', unread: '' });
        router.get('/support', {}, { preserveState: true, preserveScroll: true, replace: true });
    };
    return (
        <Page title="Messages" showLogisticsBanner={false}>
            <div className="support-reference">
                <NewConversation open={creating} onOpenChange={setCreating} admin={canChooseRecipient} kind={filters.kind} />
                <section className="support-hero">
                    <div className="support-hero-copy">
                        <h2>How can we help you?</h2>
                        <p>Get support for your orders, deliveries, returns, and more.</p>
                    </div>
                    <img src="/images/support-agent.svg" alt="" width="420" height="210" className="support-hero-agent" />
                </section>
                <div className="support-controls">
                    <div role="group" aria-label="Conversation filters" className="support-tabs">
                        {[
                            { label: 'All', kind: '', unread: '', icon: MessageCircle },
                            { label: 'Unread', kind: '', unread: '1', icon: Circle },
                            { label: 'General', kind: 'message', unread: '', icon: Mail },
                            { label: 'Complaints & Disputes', kind: 'complaint', unread: '', icon: ShieldCheck },
                        ].map((item) => {
                            const active = search.data.kind === item.kind && search.data.unread === item.unread;
                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => {
                                        search.cancel();
                                        search.setData({ search: '', status: '', kind: item.kind, unread: item.unread });
                                    }}
                                    className="support-tab"
                                >
                                    <item.icon aria-hidden="true" className="size-5" />
                                    {item.label}
                                    {item.label === 'All' && !filtered ? ' (' + cases.total + ')' : ''}
                                </button>
                            );
                        })}
                    </div>
                    <ValidatedForm
                        className="support-search"
                        aria-busy={search.processing}
                        onCompositionStart={() => setComposing(true)}
                        onCompositionEnd={() => setComposing(false)}
                        onSubmit={(event) => {
                            event.preventDefault();
                            search.get('/support', { preserveState: true, preserveScroll: true, replace: true });
                        }}
                    >
                        <Search aria-hidden="true" className="size-5" />
                        <label htmlFor="support-search" className="sr-only">
                            Search conversations
                        </label>
                        <input
                            id="support-search"
                            type="search"
                            maxLength={100}
                            placeholder="Search conversations..."
                            value={search.data.search}
                            onChange={(event) => search.setData('search', event.target.value)}
                            aria-invalid={!!search.errors.search}
                            aria-describedby={search.errors.search ? 'support-search-error' : undefined}
                        />
                    </ValidatedForm>
                    <button type="button" className={buttonClass + ' support-contact'} onClick={() => setCreating(true)}>
                        <SquarePen aria-hidden="true" className="size-5" />
                        {canChooseRecipient ? 'New conversation' : 'Contact Support'}
                    </button>
                    <details className="support-more-filters">
                        <summary>
                            <SlidersHorizontal aria-hidden="true" className="size-4" /> More filters
                            {search.data.status ? ' / ' + search.data.status.replaceAll('_', ' ') : ''}
                        </summary>
                        <div className="grid gap-4 pt-4 sm:grid-cols-3">
                            <Select
                                label="Topic"
                                reserveFeedback={false}
                                value={search.data.kind}
                                onChange={(e) => search.setData('kind', e.target.value)}
                            >
                                <option value="">All conversations</option>
                                <option value="message">General</option>
                                <option value="complaint">Complaints &amp; disputes</option>
                            </Select>
                            <Select
                                label="Status"
                                reserveFeedback={false}
                                value={search.data.status}
                                onChange={(e) => search.setData('status', e.target.value)}
                            >
                                <option value="">All statuses</option>
                                <option value="open">Open</option>
                                <option value="in_review">In review</option>
                                <option value="resolved">Resolved</option>
                            </Select>
                            <Select
                                label="Read status"
                                reserveFeedback={false}
                                value={search.data.unread}
                                onChange={(e) => search.setData('unread', e.target.value)}
                            >
                                <option value="">All conversations</option>
                                <option value="1">Unread</option>
                            </Select>
                        </div>
                        {filtered && (
                            <button type="button" className={secondaryClass + ' mt-4'} onClick={clear}>
                                Clear filters
                            </button>
                        )}
                    </details>
                    {search.errors.search && (
                        <p id="support-search-error" role="alert" className="text-destructive text-sm">
                            {search.errors.search}
                        </p>
                    )}
                    <p role="status" className="sr-only">
                        {search.processing ? 'Updating conversations...' : ''}
                    </p>
                </div>
                <div className="support-panels grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)]">
                    <section aria-label="Conversation inbox" className={selected ? 'hidden min-w-0 lg:block' : 'min-w-0'}>
                        <Card className="border-primary/15 bg-card/90 support-inbox min-h-96 overflow-hidden !p-0 shadow-sm lg:min-h-[34rem]">
                            <div className="sr-only">
                                <h2 ref={inboxHeading} tabIndex={-1} className="font-semibold">
                                    Inbox
                                </h2>
                                <p className="text-muted-foreground text-xs">{cases.total} conversations · Latest activity first</p>
                            </div>
                            {cases.data.length ? (
                                <ul className="grid gap-1 p-3">
                                    {cases.data.map((item) => (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                aria-current={selected === item.id ? 'true' : undefined}
                                                className={`hover:bg-accent/40 focus-visible:ring-ring flex w-full min-w-0 gap-3 rounded-2xl border p-4 text-left focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${selected === item.id ? 'border-primary bg-accent shadow-sm' : 'border-transparent'}`}
                                                onClick={() => {
                                                    if (selected === item.id) return;
                                                    setSelected(item.id);
                                                    setThread(null);
                                                    setPageUrl(null);
                                                    setError('');
                                                }}
                                            >
                                                <span aria-hidden="true" className="support-avatar">
                                                    {item.kind === 'complaint' ? (
                                                        <ShieldCheck className="size-7" />
                                                    ) : (
                                                        <Headphones className="size-7" />
                                                    )}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="truncate font-semibold">{item.subject}</h3>
                                                    <p className="mt-1 truncate text-sm">{item.latest_message?.body || 'No messages yet'}</p>
                                                    <span className="sr-only">
                                                        {item.status.replaceAll('_', ' ')}. Conversation #{item.id}.{' '}
                                                        {item.participants
                                                            .filter((person) => person.id !== auth.user.id)
                                                            .map((person) => person.name)
                                                            .join(', ')}
                                                        {item.seller_order_id ? '. Parcel #' + item.seller_order_id : ''}
                                                    </span>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-2">
                                                    {item.latest_message && (
                                                        <time dateTime={item.latest_message.created_at} className="text-muted-foreground text-xs">
                                                            {new Date(item.latest_message.created_at).toDateString() === new Date().toDateString()
                                                                ? new Date(item.latest_message.created_at).toLocaleTimeString('en-PH', {
                                                                      hour: 'numeric',
                                                                      minute: '2-digit',
                                                                  })
                                                                : new Date(item.latest_message.created_at).toLocaleDateString('en-PH', {
                                                                      month: 'short',
                                                                      day: 'numeric',
                                                                  })}
                                                        </time>
                                                    )}
                                                    {item.unread_count > 0 && (
                                                        <span
                                                            className="bg-primary text-primary-foreground flex min-h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs"
                                                            aria-label={item.unread_count + ' unread messages'}
                                                        >
                                                            {item.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="grid justify-items-center gap-3 p-6 text-center">
                                    <MessageCircle aria-hidden="true" className="text-primary size-8" />
                                    <h3 className="font-semibold">{filtered ? 'No matching conversations' : 'No conversations yet'}</h3>
                                    <p className="text-muted-foreground text-sm">
                                        {filtered
                                            ? 'Try another search or clear your filters.'
                                            : 'Your messages and support replies will appear here.'}
                                    </p>
                                    <button type="button" className={secondaryClass} onClick={filtered ? clear : () => setCreating(true)}>
                                        {filtered ? 'Clear Filters' : 'New Conversation'}
                                    </button>
                                </div>
                            )}
                        </Card>
                        <Pager links={cases.links} />
                    </section>
                    <section aria-label="Selected conversation" className={selected ? 'min-w-0' : 'hidden min-w-0 lg:block'}>
                        {selected ? (
                            <Card className="support-thread border-primary/15 bg-card/90 overflow-hidden !p-0 shadow-sm">
                                <div
                                    className={
                                        canChooseRecipient
                                            ? 'support-thread-actions flex flex-wrap items-center gap-3 p-3'
                                            : 'flex flex-wrap items-center gap-3 p-3 lg:sr-only'
                                    }
                                >
                                    <button
                                        type="button"
                                        className={secondaryClass + ' lg:hidden'}
                                        onClick={() => {
                                            setSelected(null);
                                            setThread(null);
                                            requestAnimationFrame(() => inboxHeading.current?.focus());
                                        }}
                                    >
                                        <ArrowLeft aria-hidden="true" className="size-4" />
                                        Back to Inbox
                                    </button>
                                    <h2 ref={heading} tabIndex={-1} className="sr-only">
                                        Conversation #{selected}
                                    </h2>
                                    {canChooseRecipient && (
                                        <button className={secondaryClass} type="button" onClick={refresh}>
                                            Refresh
                                        </button>
                                    )}
                                </div>
                                {error && (
                                    <div role="alert" className="grid gap-3 p-6">
                                        <p>{error}</p>
                                        <button type="button" className={secondaryClass} onClick={refresh}>
                                            Try again
                                        </button>
                                    </div>
                                )}
                                {thread ? (
                                    <Conversation
                                        key={selected}
                                        {...thread}
                                        embedded
                                        onSaved={refresh}
                                        onRefresh={refresh}
                                        onPageChange={(url) => {
                                            setPageUrl(url);
                                        }}
                                    />
                                ) : !error ? (
                                    <p role="status" className="text-muted-foreground p-6 text-sm">
                                        Loading conversation…
                                    </p>
                                ) : null}
                            </Card>
                        ) : (
                            <Card className="border-primary/15 bg-card/90 grid min-h-96 content-center justify-items-center gap-3 text-center shadow-sm lg:min-h-[34rem]">
                                <MessageCircle aria-hidden="true" className="text-primary size-8" />
                                <h2 className="font-semibold">Select a conversation</h2>
                                <p className="text-muted-foreground max-w-xs text-sm">
                                    Choose a message from your inbox to read replies and continue the conversation.
                                </p>
                            </Card>
                        )}
                    </section>
                </div>
            </div>
        </Page>
    );
}
