import { UserMenuContent } from '@/components/navigation/user-menu-content';
import { inputClass, secondaryClass } from '@/components/shared/marketplace-ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useInitials } from '@/hooks/use-initials';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, MessageCircle, Search } from 'lucide-react';
import { useState } from 'react';

export function LogisticsToolbar() {
    const { auth } = usePage<SharedData>().props;
    const getInitials = useInitials();
    const [searchOpen, setSearchOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [target, setTarget] = useState('parcels');
    const queues = [
        { label: 'Review rider applications', url: '/reviews' },
        { label: 'Approve pickup requests', url: '/deliveries?stage=pickups' },
        { label: 'Receive incoming parcels', url: '/deliveries?stage=incoming' },
        { label: 'Sort received parcels', url: '/deliveries?stage=sorting' },
        { label: 'Monitor deliveries', url: '/deliveries?stage=monitoring' },
    ];
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                className="text-muted-foreground hover:bg-accent hover:text-primary flex size-11 items-center justify-center rounded-xl"
                aria-label="Search logistics workspace"
                onClick={() => setSearchOpen(true)}
            >
                <Search className="size-5" aria-hidden="true" />
            </button>
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Search your workspace</DialogTitle>
                        <DialogDescription>Find seller parcels or approved rider accounts in your company.</DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            setSearchOpen(false);
                            router.get(target === 'riders' ? '/accounts' : '/deliveries', { search: search.trim() });
                        }}
                    >
                        <div className="space-y-2">
                            <label htmlFor="logistics-search-target" className="text-sm font-medium">
                                Search in
                            </label>
                            <select
                                id="logistics-search-target"
                                className={inputClass}
                                value={target}
                                onChange={(event) => setTarget(event.target.value)}
                            >
                                <option value="parcels">Parcels by seller/store name</option>
                                <option value="riders">Rider accounts by name or email</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="logistics-search" className="text-sm font-medium">
                                Name or email
                            </label>
                            <input
                                id="logistics-search"
                                type="search"
                                className={inputClass}
                                maxLength={100}
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                        <button type="submit" className={secondaryClass}>
                            <Search className="size-4" aria-hidden="true" /> Search
                        </button>
                    </form>
                </DialogContent>
            </Dialog>
            <Link
                href="/support?kind=message"
                className="text-muted-foreground hover:bg-accent hover:text-primary flex size-11 items-center justify-center rounded-xl"
                aria-label="Open messages"
                title="Messages"
            >
                <MessageCircle className="size-5" />
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="text-muted-foreground hover:bg-accent hover:text-primary flex size-11 items-center justify-center rounded-xl"
                        aria-label="Open logistics queues"
                    >
                        <Bell className="size-5" aria-hidden="true" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                    {queues.map((queue) => (
                        <DropdownMenuItem key={queue.url} asChild>
                            <Link href={queue.url} className="min-h-11">
                                {queue.label}
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
        </div>
    );
}
