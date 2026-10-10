import { InfoModal } from '@/components/info-modal';
import { inputClass } from '@/components/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { UserMenuContent } from '@/components/user-menu-content';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell, CircleUserRound, ClipboardCheck, MessageCircle, MessageSquareWarning, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

type Result = { id: number; kind: 'account' | 'registration' | 'conversation'; label: string; detail: string; url?: string };
export function AdminToolbar() {
    const { auth, adminWorkspace } = usePage<SharedData>().props;
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
    const alertCount = alerts.reduce((total, item) => total + (adminWorkspace?.badges[item.key] ?? 0), 0);
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
        <div className="flex items-center gap-1 sm:gap-2">
            <button
                type="button"
                className="text-muted-foreground hover:text-foreground hover:bg-accent lg:bg-background flex min-h-11 items-center gap-2 rounded-xl p-2 lg:border lg:px-3"
                aria-label="Search Admin Workspace"
                onClick={() => close(true)}
            >
                <Search className="size-4" />
                <span className="hidden text-xs lg:block">Search workspace</span>
            </button>
            {adminWorkspace?.permissions.includes('messages') && (
                <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('admin-messages:open'))}
                    aria-label={`Messages, ${adminWorkspace.badges.messages ?? 0} unread`}
                    className="hover:bg-accent relative flex size-11 items-center justify-center rounded-xl"
                >
                    <MessageCircle className="size-5" />
                    {!!adminWorkspace.badges.messages && (
                        <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 rounded-full px-1 text-[10px]">
                            {adminWorkspace.badges.messages > 99 ? '99+' : adminWorkspace.badges.messages}
                        </span>
                    )}
                </button>
            )}
            <DropdownMenu>
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
                    {alerts.map((item) => (
                        <Link key={item.key} href={item.url} className="hover:bg-accent/50 flex items-center gap-3 rounded-xl p-3">
                            <span className="bg-accent text-primary rounded-lg p-2">
                                <item.icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">{item.label}</span>
                                <span className="text-muted-foreground block text-xs">{item.description}</span>
                            </span>
                            <span className="bg-accent text-primary rounded-full px-2 py-1 text-xs font-semibold">
                                {adminWorkspace?.badges[item.key] ?? 0}
                            </span>
                        </Link>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="bg-accent/60 text-primary hover:bg-accent focus-visible:ring-primary flex size-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        aria-label="Open account menu"
                        title="My Account"
                    >
                        <CircleUserRound className="size-5" />
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
