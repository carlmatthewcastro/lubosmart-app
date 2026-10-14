import { UserMenuContent } from '@/components/navigation/user-menu-content';
import { inputClass, secondaryClass } from '@/components/shared/marketplace-ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useInitials } from '@/hooks/use-initials';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, MessageCircle, Search, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

export function WorkspaceToolbar() {
    const { auth } = usePage<SharedData>().props;
    const initials = useInitials();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const buyer = auth.user.role === 'buyer';
    const seller = auth.user.role === 'seller';
    const queues = buyer
        ? [
              { label: 'Your orders', url: '/orders' },
              { label: 'Shopping bag', url: '/cart' },
          ]
        : seller
          ? [
                { label: 'Fulfillment', url: '/orders' },
                { label: 'Inventory', url: '/inventory' },
                { label: 'Sales reports', url: '/reports' },
            ]
          : [
                { label: 'Your assigned deliveries', url: '/deliveries' },
                { label: 'Delivery reports', url: '/reports' },
            ];
    return (
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {buyer && (
                <button
                    type="button"
                    aria-label="Search products"
                    onClick={() => setOpen(true)}
                    className="text-muted-foreground hover:bg-accent hover:text-primary flex size-11 items-center justify-center rounded-xl"
                >
                    <Search className="size-5" aria-hidden="true" />
                </button>
            )}
            {buyer && (
                <Link
                    href="/cart"
                    aria-label="Open shopping bag"
                    className="text-muted-foreground hover:bg-accent hover:text-primary flex size-11 items-center justify-center rounded-xl"
                >
                    <ShoppingCart aria-hidden="true" className="size-5" />
                </Link>
            )}
            <Link
                href="/support?kind=message"
                aria-label="Open messages"
                className="text-muted-foreground hover:bg-accent hover:text-primary flex size-11 items-center justify-center rounded-xl"
            >
                <MessageCircle className="size-5" aria-hidden="true" />
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label="Open workspace queues"
                        className="text-muted-foreground hover:bg-accent hover:text-primary flex size-11 items-center justify-center rounded-xl"
                    >
                        <Bell className="size-5" aria-hidden="true" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
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
                        aria-label="Open account menu"
                        className="hover:bg-accent focus-visible:ring-ring flex size-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
                    >
                        <Avatar className="size-10" aria-hidden="true">
                            <AvatarFallback className="bg-muted text-foreground text-base font-normal">{initials(auth.user.name)}</AvatarFallback>
                        </Avatar>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <UserMenuContent user={auth.user} />
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Search products</DialogTitle>
                        <DialogDescription>Find products in the marketplace.</DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            setOpen(false);
                            router.get('/shop', { search: search.trim() });
                        }}
                    >
                        <label htmlFor="workspace-search" className="text-sm font-medium">
                            Product name
                        </label>
                        <input
                            id="workspace-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            maxLength={100}
                            className={inputClass}
                        />
                        <button type="submit" className={secondaryClass}>
                            Search
                        </button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
