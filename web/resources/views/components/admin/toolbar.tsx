import { UserMenuContent } from '@/components/navigation/user-menu-content';
import { notify } from '@/components/shared/action-feedback';
import { InfoModal } from '@/components/shared/info-modal';
import { inputClass } from '@/components/shared/marketplace-ui';
import { NotificationBell } from '@/components/shared/notification-inbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useInitials } from '@/hooks/use-initials';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { MessageCircle, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

type Result = { id: number; kind: 'account' | 'registration' | 'conversation'; label: string; detail: string; url?: string };
export function AdminToolbar() {
    const { auth, adminWorkspace } = usePage<SharedData>().props;
    useEffect(() => {
        let mutation = false;
        const stopStart = router.on('start', (event) => {
            mutation = event.detail.visit.method !== 'get';
        });
        const stopSuccess = router.on('success', (event) => {
            if (mutation && typeof event.detail.page.props.status === 'string') notify(event.detail.page.props.status);
        });
        return () => {
            stopStart();
            stopSuccess();
        };
    }, []);
    const getInitials = useInitials();
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
            <NotificationBell />
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
