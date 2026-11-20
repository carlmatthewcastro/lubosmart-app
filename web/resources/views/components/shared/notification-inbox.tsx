import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { Bell, CheckCheck, ClipboardCheck, Info, Package, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

export type InboxCategory = 'all' | 'action_required' | 'updates';
type Entry = {
    id: string;
    title: string;
    message: string;
    kind: string;
    category: string;
    requires_action: boolean;
    created_at: string;
    read_at: string | null;
    url: string | null;
    action_label: string | null;
};
type Inbox = { unread_count: number; notifications: { data: Entry[]; current_page: number; last_page: number } };
const filters: { value: InboxCategory; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'action_required', label: 'Action required' },
    { value: 'updates', label: 'Updates' },
];
const fetchInbox = async (url: string): Promise<Inbox> => {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Notifications could not be loaded.');
    return response.json();
};
function relativeTime(value: string) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    const [amount, unit] =
        seconds < 3600
            ? [Math.floor(seconds / 60), 'minute']
            : seconds < 86400
              ? [Math.floor(seconds / 3600), 'hour']
              : [Math.floor(seconds / 86400), 'day'];
    return `${amount} ${unit}${amount === 1 ? '' : 's'} ago`;
}

export function NotificationList({ preview = false, close }: { preview?: boolean; close?: () => void }) {
    const [category, setCategory] = useState<InboxCategory>('all');
    const [page, setPage] = useState(1);
    const [pending, setPending] = useState(false);
    const [mutationError, setMutationError] = useState('');
    const { mutate } = useSWRConfig();
    const {
        data,
        error,
        isLoading,
        mutate: refresh,
    } = useSWR<Inbox>(`/notifications?category=${category}&page=${page}&per_page=${preview ? 5 : 15}`, fetchInbox, {
        refreshInterval: 30000,
        shouldRetryOnError: false,
    });
    const markRead = async (id?: string) => {
        if (pending) return;
        setPending(true);
        setMutationError('');
        try {
            const token = document.cookie
                .split('; ')
                .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
                ?.slice(11);
            const response = await fetch(id ? `/notifications/${id}/read` : '/notifications/read-all', {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(token ?? '') },
            });
            if (!response.ok) throw new Error();
            await mutate((key) => typeof key === 'string' && key.startsWith('/notifications'));
            return true;
        } catch {
            setMutationError('Could not mark notifications as read. Please try again.');
            return false;
        } finally {
            setPending(false);
        }
    };
    return (
        <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
                <p className="font-semibold">
                    Notifications <span className="text-muted-foreground text-sm font-normal">({data?.unread_count ?? '…'} unread)</span>
                </p>
                <Button variant="ghost" size="sm" disabled={pending || !data?.unread_count} onClick={() => void markRead()}>
                    <CheckCheck aria-hidden className="size-4" /> Mark all as read
                </Button>
            </div>
            <div role="group" aria-label="Filter notifications" className="flex flex-wrap gap-1 border-b p-2">
                {filters.map((filter) => (
                    <Button
                        key={filter.value}
                        variant={category === filter.value ? 'secondary' : 'ghost'}
                        size="sm"
                        aria-pressed={category === filter.value}
                        onClick={() => {
                            setCategory(filter.value);
                            setPage(1);
                        }}
                    >
                        {filter.label}
                    </Button>
                ))}
            </div>
            {mutationError && (
                <p role="alert" className="text-destructive p-4 text-sm">
                    {mutationError}
                </p>
            )}
            {isLoading && (
                <p role="status" className="text-muted-foreground p-6 text-sm">
                    Loading notifications…
                </p>
            )}
            {error && (
                <div role="alert" className="p-4 text-sm">
                    <p>Notifications could not be loaded.</p>
                    <Button variant="outline" onClick={() => void refresh()}>
                        Try again
                    </Button>
                </div>
            )}
            {!isLoading && !error && data?.notifications.data.length === 0 && (
                <div className="text-muted-foreground flex flex-col items-center gap-2 p-8 text-center text-sm">
                    <Bell aria-hidden className="size-6" />
                    <p>{category === 'all' ? "You're all caught up. New notifications will appear here." : 'No notifications in this category.'}</p>
                </div>
            )}
            <ul aria-label="Notification history" className="divide-y">
                {data?.notifications.data.map((entry) => {
                    const Icon =
                        (
                            { order: Package, delivery: Truck, return: RotateCcw, application: ClipboardCheck, account: ShieldCheck } as Record<
                                string,
                                typeof Bell
                            >
                        )[entry.kind] ?? Info;
                    return (
                        <li key={entry.id} className={cn('flex min-w-0 gap-3 p-4', !entry.read_at && 'bg-primary/5')}>
                            <span className="bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                                <Icon aria-hidden className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1 space-y-2">
                                <p className="text-sm font-semibold break-words">
                                    {entry.title} {!entry.read_at && <span className="text-primary text-xs font-medium"> · Unread</span>}
                                </p>
                                {entry.requires_action && <p className="text-primary text-xs font-medium">Action required</p>}
                                {entry.category === 'action_required' && !entry.requires_action && (
                                    <p className="text-muted-foreground text-xs">Task completed or changed</p>
                                )}
                                <p className="text-muted-foreground text-sm break-words">{entry.message}</p>
                                {!entry.url && (
                                    <p className="text-muted-foreground text-xs">The related record is no longer available to your account.</p>
                                )}
                                <time
                                    dateTime={entry.created_at}
                                    title={new Date(entry.created_at).toLocaleString()}
                                    className="text-muted-foreground block text-xs"
                                >
                                    {relativeTime(entry.created_at)}
                                </time>
                                <div className="flex flex-wrap gap-2">
                                    {entry.url && (
                                        <Button asChild variant="outline" size="sm">
                                            <Link
                                                href={entry.url}
                                                onClick={() => {
                                                    if (!entry.read_at) void markRead(entry.id);
                                                    close?.();
                                                }}
                                            >
                                                {entry.action_label}
                                            </Link>
                                        </Button>
                                    )}
                                    {!entry.read_at && (
                                        <Button variant="ghost" size="sm" disabled={pending} onClick={() => void markRead(entry.id)}>
                                            Mark as read
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
            {preview ? (
                <Link
                    href="/notifications"
                    onClick={close}
                    className="text-primary flex min-h-11 items-center justify-center border-t p-3 text-sm font-medium hover:underline"
                >
                    View all notifications
                </Link>
            ) : (
                data &&
                data.notifications.last_page > 1 && (
                    <nav aria-label="Notification pages" className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                            Previous
                        </Button>
                        <p className="text-muted-foreground text-sm">
                            Page {page} of {data.notifications.last_page}
                        </p>
                        <Button variant="outline" disabled={page >= data.notifications.last_page} onClick={() => setPage(page + 1)}>
                            Next
                        </Button>
                    </nav>
                )
            )}
        </div>
    );
}

export function NotificationBell() {
    const { data } = useSWR<{ unread_count: number }>(
        '/notifications/unread-count',
        async (url: string) => {
            const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
            if (!response.ok) throw new Error('Unable to load unread count.');
            return response.json();
        },
        { refreshInterval: 30000, shouldRetryOnError: false },
    );
    const count = data?.unread_count ?? 0;
    return (
        <Popover className="relative">
            <PopoverButton
                aria-label={data ? `Notifications, ${count} unread` : 'Notifications'}
                className="text-muted-foreground hover:bg-accent focus-visible:ring-ring relative flex size-11 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
            >
                <Bell aria-hidden className="size-5" />
                {count > 0 && (
                    <span
                        aria-hidden
                        className="bg-primary text-primary-foreground absolute top-0 right-0 min-w-5 rounded-full px-1 text-xs leading-5 tabular-nums"
                    >
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </PopoverButton>
            <span role="status" aria-live="polite" className="sr-only">
                {data ? `${count} unread notifications` : ''}
            </span>
            <PopoverPanel
                anchor="bottom end"
                focus
                className="bg-card text-card-foreground z-50 max-h-[70dvh] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border shadow-lg [--anchor-gap:0.5rem]"
            >
                {({ close }) => <NotificationList preview close={close} />}
            </PopoverPanel>
        </Popover>
    );
}
