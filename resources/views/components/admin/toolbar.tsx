import { UserMenuContent } from '@/components/navigation/user-menu-content';
import { InfoModal } from '@/components/shared/info-modal';
import { inputClass } from '@/components/shared/marketplace-ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useInitials } from '@/hooks/use-initials';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell, ClipboardCheck, MessageCircle, MessageSquareWarning, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

type Result = { id: number; kind: 'account' | 'registration' | 'conversation'; label: string; detail: string; url?: string };
export function AdminToolbar() {
    const { auth, adminWorkspace } = usePage<SharedData>().props;
    const [workspace, setWorkspace] = useState(adminWorkspace);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notificationError, setNotificationError] = useState('');
    const [notificationAttempt, setNotificationAttempt] = useState(0);
    useEffect(() => setWorkspace(adminWorkspace), [adminWorkspace]);
    useEffect(() => {
        const controller = new AbortController();
        const refresh = async () => {
            if (document.visibilityState === 'hidden') return;
            try {
                const response = await fetch('/admin/notifications', {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                    cache: 'no-store',
                });
                if (!response.ok) throw new Error('Notifications could not be refreshed.');
                const data = await response.json();
                if (!controller.signal.aborted) {
                    setWorkspace(data);
                    setNotificationError('');
                }
            } catch {
                if (!controller.signal.aborted) setNotificationError('Notifications could not be refreshed.');
            }
        };
        void refresh();
        const interval = setInterval(() => void refresh(), 30000);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [notificationsOpen, notificationAttempt]);
    const getInitials = useInitials();
    const alerts = [
        { key: 'registrations', label: 'Registrations', description: 'Applications waiting for review', url: '/reviews', icon: ClipboardCheck },
        { key: 'compliance', label: 'Seller Compliance', description: 'Blocked or mismatched listings', url: '/admin/compliance', icon: ShieldCheck },
        {
            key: 'disputes',
            label: 'Complaints & Disputes',
            description: 'Unresolved cases',
            url: '/support?kind=complaint',
            icon: MessageSquareWarning,
        },
        { key: 'messages', label: 'Messages', description: 'Conversations with unread replies', url: '/support?kind=message', icon: MessageCircle },
    ];
    const visibleAlerts = alerts.filter((item) => workspace?.permissions.includes(item.key));
    const alertCount = visibleAlerts.reduce((total, item) => total + (workspace?.badges[item.key] ?? 0), 0);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Result[] | null>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        if (!open || query.trim().length < 2) return;
        const controller = new AbortController();
        const timeout = setTimeout(
            () =>
                fetch(`/admin/search?search=${encodeURIComponent(query.trim())}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                    cache: 'no-store',
                })
                    .then(async (response) => {
                        if (!response.ok) throw new Error('Search could not be loaded.');
                        return response.json();
                    })
                    .then((data) => {
                        if (!controller.signal.aborted) setResults(data.results);
                    })
                    .catch((reason) => {
                        if (!controller.signal.aborted) setError(reason.message);
                    }),
            300,
        );
        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [open, query]);
    const close = (value: boolean) => {
        setOpen(value);
        setQuery('');
        setResults(null);
        setError('');
    };
    return (
        <div className="flex min-w-0 items-center gap-1 sm:gap-2 [&>button]:shrink-0">
            <button
                type="button"
                className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring flex size-11 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                aria-label="Search Admin Workspace"
                title="Search workspace"
                onClick={() => close(true)}
            >
                <Search aria-hidden="true" className="size-5" />
            </button>
            {adminWorkspace?.permissions.includes('messages') && (
                <Link
                    href="/support?kind=message"
                    aria-label={`Messages, ${adminWorkspace.badges.messages ?? 0} unread`}
                    className="hover:bg-accent relative flex size-11 items-center justify-center rounded-xl"
                >
                    <MessageCircle className="size-5" />
                    {!!adminWorkspace.badges.messages && (
                        <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 rounded-full px-1 text-[10px]">
                            {adminWorkspace.badges.messages > 99 ? '99+' : adminWorkspace.badges.messages}
                        </span>
                    )}
                </Link>
            )}
            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={'Notifications, ' + alertCount + ' items need attention'}
                        className="hover:bg-accent relative flex size-11 items-center justify-center rounded-xl"
                    >
                        <Bell className="size-5" />
                        {!!alertCount && (
                            <span className="bg-primary text-primary-foreground absolute top-0 right-0 rounded-full px-1.5 text-[10px]">
                                {alertCount > 99 ? '99+' : alertCount}
                            </span>
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[min(360px,calc(100vw_-_32px))] rounded-2xl p-2">
                    <div className="border-b px-3 py-3">
                        <p className="font-semibold">Notifications</p>
                        <p className="text-muted-foreground mt-1 text-xs">Grouped by what needs your attention.</p>
                    </div>
                    {notificationError && (
                        <div role="alert" className="p-3 text-sm">
                            <p>{notificationError}</p>
                            <button
                                type="button"
                                className="text-primary mt-2 min-h-11 underline"
                                onClick={() => setNotificationAttempt((value) => value + 1)}
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    {!alertCount && !notificationError && <p className="text-muted-foreground p-3 text-sm">You're all caught up.</p>}
                    {visibleAlerts.map((item) => (
                        <DropdownMenuItem key={item.key} asChild>
                            <Link href={item.url} className="hover:bg-accent/50 flex items-center gap-3 rounded-xl p-3">
                                <span className="bg-accent text-primary rounded-lg p-2">
                                    <item.icon className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium">{item.label}</span>
                                    <span className="text-muted-foreground block text-xs">{item.description}</span>
                                </span>
                                <span className="bg-accent text-primary rounded-full px-2 py-1 text-xs font-semibold">
                                    {workspace?.badges[item.key] ?? 0}
                                </span>
                            </Link>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="hover:bg-accent focus-visible:ring-primary flex size-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        aria-label="Open account menu"
                        title="My Account"
                    >
                        <Avatar aria-hidden="true" className="size-10">
                            <AvatarFallback className="bg-muted text-foreground text-base font-normal">{getInitials(auth.user.name)}</AvatarFallback>
                        </Avatar>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <UserMenuContent user={auth.user} />
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={open} onOpenChange={close}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Search Admin Workspace</DialogTitle>
                        <DialogDescription>Find accounts, registrations, and conversations.</DialogDescription>
                    </DialogHeader>
                    <input
                        autoFocus
                        type="search"
                        className={inputClass}
                        placeholder="Enter at least 2 characters"
                        maxLength={100}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setResults(null);
                            setError('');
                        }}
                        aria-label="Search term"
                    />
                    {error ? (
                        <p role="alert">{error}</p>
                    ) : query.trim().length < 2 ? (
                        <p className="text-muted-foreground text-sm">Type a name, email address, or conversation subject.</p>
                    ) : results === null ? (
                        <div role="status" aria-label="Searching workspace">
                            <span className="sr-only">Searching workspace...</span>
                            <Skeleton className="h-32 w-full" />
                        </div>
                    ) : !results.length ? (
                        <p className="text-muted-foreground text-sm">No matching items found.</p>
                    ) : (
                        <ul className="max-h-[50dvh] space-y-3 overflow-y-auto">
                            {results.map((result) => (
                                <li
                                    key={`${result.kind}-${result.id}`}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium break-words">{result.label}</p>
                                        <p className="text-muted-foreground text-xs break-all">{result.detail}</p>
                                    </div>
                                    <InfoModal
                                        kind={result.kind}
                                        id={result.id}
                                        label={result.kind === 'conversation' ? 'Open Conversation' : 'View Details'}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
