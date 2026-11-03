import { UserMenuContent } from '@/components/navigation/user-menu-content';
import { inputClass, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useWorkspaceStatus } from '@/components/workspace/workspace-runtime';
import { useInitials } from '@/hooks/use-initials';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, Boxes, ClipboardCheck, MessageCircle, PackageOpen, Search, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';

type QueueCounts = Record<string, number>;

export function LogisticsToolbar() {
    const { auth } = usePage<SharedData>().props;
    const isRider = auth.user.role === 'rider';
    const isSeller = auth.user.role === 'seller';
    const getInitials = useInitials();
    const [searchOpen, setSearchOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [target, setTarget] = useState('parcels');
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const workspace = useWorkspaceStatus();
    const [fallbackCounts, setCounts] = useState<QueueCounts | null>(null);
    const [notificationError, setNotificationError] = useState('');
    const [notificationAttempt, setNotificationAttempt] = useState(0);
    useEffect(() => {
        if (workspace) return;
        const controller = new AbortController();
        const refresh = async () => {
            if (document.visibilityState === 'hidden') return;
            try {
                const response = await fetch(isSeller ? '/seller/notifications' : isRider ? '/rider/notifications' : '/logistics/notifications', {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                    cache: 'no-store',
                });
                if (!response.ok) throw new Error('Notifications could not be refreshed.');
                const data: QueueCounts = await response.json();
                if (!controller.signal.aborted) {
                    setCounts(data);
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
    }, [notificationsOpen, notificationAttempt, isRider, isSeller, workspace]);
    const counts = workspace?.queues ?? fallbackCounts;
    const attentionCount = counts
        ? isSeller
            ? counts.pending + counts.processing + counts.issues + counts.lowStock
            : isRider
              ? counts.pickups + counts.dispatch + counts.monitoring + counts.exceptions + counts.cash
              : counts.riderApplications +
                counts.pickupRequests +
                counts.incoming +
                counts.sorting +
                (counts.dispatch ?? 0) +
                (counts.exceptions ?? 0) +
                (counts.cash ?? 0)
        : 0;
    const queues = isSeller
        ? [
              {
                  key: 'pending',
                  label: 'New orders',
                  description: 'Start preparing incoming orders',
                  url: '/orders?stage=pending',
                  icon: PackageOpen,
              },
              { key: 'processing', label: 'Preparing', description: 'Pack and mark ready for pickup', url: '/orders?stage=processing', icon: Boxes },
              {
                  key: 'ready',
                  label: 'Ready for pickup',
                  description: 'Print waybills for logistics collection',
                  url: '/orders?stage=ready',
                  icon: Truck,
              },
              {
                  key: 'issues',
                  label: 'Delivery issues',
                  description: 'Follow up with Logistics or support',
                  url: '/orders?stage=issues',
                  icon: ClipboardCheck,
              },
              {
                  key: 'lowStock',
                  label: 'Low stock',
                  description: 'Products with fewer than 5 units',
                  url: '/inventory?status=low-stock',
                  icon: Boxes,
              },
          ]
        : isRider
          ? [
                {
                    key: 'pickups',
                    label: 'My pickups',
                    description: 'Collect from sellers and bring to the center',
                    url: '/deliveries?stage=pickups',
                    icon: PackageOpen,
                },
                {
                    key: 'dispatch',
                    label: 'Dispatch handovers',
                    description: 'Accept handover and start delivery',
                    url: '/deliveries?stage=dispatch',
                    icon: Truck,
                },
                {
                    key: 'monitoring',
                    label: 'Out for delivery',
                    description: 'Record delivery proof and COD',
                    url: '/deliveries?stage=monitoring',
                    icon: Truck,
                },
                {
                    key: 'exceptions',
                    label: 'Delivery issues',
                    description: 'Follow up with Logistics',
                    url: '/deliveries?stage=exceptions',
                    icon: ClipboardCheck,
                },
                { key: 'cash', label: 'COD handover', description: 'Cash awaiting Logistics receipt', url: '/deliveries?stage=cash', icon: Boxes },
            ]
          : [
                {
                    key: 'riderApplications',
                    label: 'Rider applications',
                    description: 'Applications waiting for your review',
                    url: '/reviews',
                    icon: ClipboardCheck,
                },
                {
                    key: 'pickupRequests',
                    label: 'Pickup requests',
                    description: 'Approve pickups and assign collection riders',
                    url: '/deliveries?stage=pickups',
                    icon: PackageOpen,
                },
                {
                    key: 'incoming',
                    label: 'Incoming parcels',
                    description: 'Assigned or collected, awaiting center receipt',
                    url: '/deliveries?stage=incoming',
                    icon: Truck,
                },
                {
                    key: 'sorting',
                    label: 'Parcel sorting',
                    description: 'Received parcels waiting to be sorted',
                    url: '/deliveries?stage=sorting',
                    icon: Boxes,
                },
                {
                    key: 'activeDeliveries',
                    label: 'Delivery monitoring',
                    description: 'Parcels in transit or out for delivery',
                    url: '/deliveries?stage=monitoring',
                    icon: Truck,
                },
                {
                    key: 'dispatch',
                    label: 'Delivery assignments',
                    description: 'Assign a delivery rider and confirm handover',
                    url: '/deliveries?stage=dispatch',
                    icon: Truck,
                },
                {
                    key: 'exceptions',
                    label: 'Delivery exceptions',
                    description: 'Resolve failed attempts, holds and returns',
                    url: '/deliveries?stage=exceptions',
                    icon: ClipboardCheck,
                },
                {
                    key: 'cash',
                    label: 'COD handovers',
                    description: 'Receive actual cash and resolve shortages',
                    url: '/deliveries?stage=cash',
                    icon: Boxes,
                },
            ];
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                className="text-muted-foreground hover:bg-accent hover:text-primary flex size-11 items-center justify-center rounded-xl"
                aria-label={isSeller ? 'Search seller workspace' : isRider ? 'Search rider workspace' : 'Search logistics workspace'}
                onClick={() => setSearchOpen(true)}
            >
                <Search className="size-5" aria-hidden="true" />
            </button>
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Search your workspace</DialogTitle>
                        <DialogDescription>
                            {isSeller
                                ? 'Find your orders by parcel number, order number, tracking reference, or recipient. Search inventory by product name.'
                                : isRider
                                  ? 'Find your assigned parcels by tracking reference or store name.'
                                  : 'Find seller parcels or approved rider accounts in your company.'}
                        </DialogDescription>
                    </DialogHeader>
                    <ValidatedForm
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            setSearchOpen(false);
                            router.get(
                                isSeller
                                    ? target === 'inventory'
                                        ? '/inventory'
                                        : '/orders'
                                    : !isRider && target === 'riders'
                                      ? '/accounts'
                                      : '/deliveries',
                                { search: search.trim() },
                            );
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
                                <option value="parcels">{isSeller ? 'Orders and tracking' : 'Parcels by seller/store name'}</option>
                                {isSeller && <option value="inventory">Inventory by product name</option>}
                                {!isRider && !isSeller && <option value="riders">Rider accounts by name or email</option>}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="logistics-search" className="text-sm font-medium">
                                {isSeller
                                    ? target === 'inventory'
                                        ? 'Product name'
                                        : 'Parcel, order, tracking reference, or recipient'
                                    : isRider
                                      ? 'Tracking reference or store name'
                                      : 'Name or email'}
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
                    </ValidatedForm>
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
            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="text-muted-foreground hover:bg-accent hover:text-primary focus-visible:ring-ring relative flex size-11 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                        aria-label={`${isSeller ? 'Seller' : isRider ? 'Rider' : 'Logistics'} notifications${counts ? `, ${attentionCount} items need attention` : ''}`}
                        title="Notifications"
                    >
                        <Bell className="size-5" aria-hidden="true" />
                        {attentionCount > 0 && (
                            <span
                                className="bg-primary text-primary-foreground absolute top-0 right-0 rounded-full px-1.5 text-[10px]"
                                aria-hidden="true"
                            >
                                {attentionCount > 99 ? '99+' : attentionCount}
                            </span>
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="max-h-[min(80dvh,36rem)] w-[min(360px,calc(100vw_-_32px))] overflow-y-auto rounded-2xl p-2"
                >
                    <div className="border-b px-3 py-3">
                        <p className="font-semibold">Notifications</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                            {isSeller
                                ? 'Order and inventory tasks for your store.'
                                : isRider
                                  ? 'Tasks for your assigned parcels.'
                                  : 'Operational queues for your company.'}
                        </p>
                    </div>
                    {notificationError ? (
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
                    ) : !counts ? (
                        <p role="status" className="text-muted-foreground p-3 text-sm">
                            Loading notifications…
                        </p>
                    ) : (
                        !attentionCount && <p className="text-muted-foreground p-3 text-sm">No pending review or handling tasks.</p>
                    )}
                    {queues.map((queue) => (
                        <DropdownMenuItem key={queue.url} asChild>
                            <Link href={queue.url} className="hover:bg-accent/50 flex min-h-11 items-center gap-3 rounded-xl p-3">
                                <span className="bg-accent text-primary shrink-0 rounded-lg p-2">
                                    <queue.icon className="size-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium">{queue.label}</span>
                                    <span className="text-muted-foreground block text-xs leading-relaxed">{queue.description}</span>
                                </span>
                                <span className="bg-accent text-primary shrink-0 rounded-full px-2 py-1 text-xs font-semibold tabular-nums">
                                    {counts ? counts[queue.key as keyof QueueCounts] : '—'}
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
        </div>
    );
}
