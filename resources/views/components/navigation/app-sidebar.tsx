import AppWordmark from '@/components/branding/app-wordmark';
import { NavMain } from '@/components/navigation/nav-main';
import { SidebarLogoToggle } from '@/components/navigation/sidebar-logo-toggle';
import { SidebarThemeToggle } from '@/components/navigation/sidebar-theme-toggle';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage, usePoll } from '@inertiajs/react';
import {
    BadgePercent,
    ChartNoAxesCombined,
    ClipboardCheck,
    ClipboardList,
    Heart,
    History,
    LayoutDashboard,
    MapPinned,
    MessageCircle,
    MessageSquareWarning,
    Package,
    ScanLine,
    Settings,
    ShieldAlert,
    ShoppingBag,
    ShoppingCart,
    SlidersHorizontal,
    Truck,
    UsersRound,
} from 'lucide-react';
import { useEffect } from 'react';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
    },
];

export function AppSidebar() {
    const {
        props: { auth, adminWorkspace },
        component,
    } = usePage<SharedData>();
    const poll = usePoll(
        5000,
        {
            only: ['adminWorkspace', ...(component === 'management/registrations/index' ? ['applications'] : [])],
            onBefore: () => !document.hidden && navigator.onLine && !document.querySelector('[role="dialog"]'),
        },
        { autoStart: false },
    );
    const badges = adminWorkspace?.badges ?? {};
    const adminItems: NavItem[] = [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
        { title: 'Registrations', url: '/reviews', icon: ClipboardList, badge: badges.registrations },
        { title: 'Company change requests', url: '/admin/change-requests', icon: ClipboardCheck, badge: badges.accountChanges },
        { title: 'User Accounts', url: '/accounts', icon: UsersRound },
        { title: 'Seller Compliance', url: '/admin/compliance', icon: ShieldAlert, badge: badges.compliance },
        { title: 'Complaints & Disputes', url: '/support?kind=complaint', icon: MessageSquareWarning, badge: badges.disputes },
        { title: 'Commission', url: '/admin/commission', icon: BadgePercent },
        { title: 'Seller settlements', url: '/settlements', icon: BadgePercent },
        { title: 'Returns & refunds', url: '/returns', icon: Package },
        { title: 'Reports', url: '/reports', icon: ChartNoAxesCombined },
        { title: 'Platform Settings', url: '/admin/platform', icon: SlidersHorizontal },
        { title: 'Messages', url: '/support?kind=message', icon: MessageCircle, badge: badges.messages },
        { title: 'Activity History', url: '/admin/audit-log', icon: History },
    ];
    const logisticsItems: NavItem[] = [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
        { title: 'Scan Parcel', url: '/logistics/scan', icon: ScanLine },
        { title: 'Pickup Requests', url: '/deliveries?stage=pickups', icon: Package },
        { title: 'Incoming Parcels', url: '/deliveries?stage=incoming', icon: Truck },
        { title: 'Parcel Sorting', url: '/deliveries?stage=sorting', icon: Package },
        { title: 'Delivery Assignment', url: '/deliveries?stage=dispatch', icon: Truck },
        { title: 'Delivery Monitoring', url: '/deliveries?stage=monitoring', icon: Truck },
        { title: 'Rider Applications', url: '/reviews', icon: ClipboardCheck },
        { title: 'Rider Management', url: '/logistics/riders', icon: UsersRound },
        { title: 'Rider Coverage', url: '/logistics/rider-coverage', icon: MapPinned },
        { title: 'Shipping Rates', url: '/logistics/shipping-rates', icon: Truck },
        { title: 'Rider payments', url: '/rider-payments', icon: BadgePercent },
        { title: 'Return assignments', url: '/returns', icon: Package },
        { title: 'Delivery Reports', url: '/reports', icon: ChartNoAxesCombined },
        { title: 'Messages', url: '/support?kind=message', icon: MessageCircle },
    ];
    const riderItems: NavItem[] = [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
        { title: 'My pickups', url: '/deliveries?stage=pickups', icon: Package },
        { title: 'Dispatch handovers', url: '/deliveries?stage=dispatch', icon: Truck },
        { title: 'Out for delivery', url: '/deliveries?stage=monitoring', icon: Truck },
        { title: 'Delivery issues', url: '/deliveries?stage=exceptions', icon: ShieldAlert },
        { title: 'All my parcels', url: '/deliveries?stage=all', icon: Package },
        { title: 'COD handover', url: '/deliveries?stage=cash', icon: BadgePercent },
        { title: 'Completed deliveries', url: '/deliveries?stage=completed', icon: ClipboardCheck },
        { title: 'Delivery reports', url: '/reports', icon: ChartNoAxesCombined },
        { title: 'Earnings & payments', url: '/rider-payments', icon: BadgePercent },
        { title: 'Assigned returns', url: '/returns', icon: Package },
        { title: 'Messages', url: '/support?kind=message', icon: MessageCircle },
        { title: 'Account settings', url: '/settings/profile', icon: Settings },
    ];
    const role = auth.user.role;
    const sellerItems: NavItem[] = [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
        { title: 'New orders', url: '/orders?stage=pending', icon: ShoppingBag },
        { title: 'Preparing', url: '/orders?stage=processing', icon: Package },
        { title: 'Ready for pickup', url: '/orders?stage=ready', icon: ClipboardCheck },
        { title: 'In delivery', url: '/orders?stage=transit', icon: Truck },
        { title: 'Delivery issues', url: '/orders?stage=issues', icon: ShieldAlert },
        { title: 'All orders', url: '/orders?stage=all', icon: Package },
        { title: 'Inventory', url: '/inventory', icon: ShoppingBag },
        { title: 'Store vouchers', url: '/seller/vouchers', icon: BadgePercent },
        { title: 'Sales reports', url: '/reports', icon: ChartNoAxesCombined },
        { title: 'Costs & profit', url: '/seller/costs', icon: ChartNoAxesCombined },
        { title: 'Settlement history', url: '/settlements', icon: BadgePercent },
        { title: 'Returned goods', url: '/returns', icon: Package },
        { title: 'Messages', url: '/support?kind=message', icon: MessageCircle },
        { title: 'Support', url: '/support?kind=complaint', icon: MessageSquareWarning },
        { title: 'Account settings', url: '/settings/profile', icon: Settings },
    ];
    useEffect(() => {
        if (role === 'admin' && auth.user.status === 'approved') poll.start();
        return () => poll.stop();
    }, [role, auth.user.status, poll]);
    const items: NavItem[] = [...mainNavItems];
    if (role === 'buyer')
        items.push(
            { title: 'Discover', url: '/shop', icon: ShoppingBag },
            { title: 'Shopping bag', url: '/cart', icon: ShoppingCart },
            { title: 'Saved products', url: '/wishlist', icon: Heart },
            { title: 'Returns & refunds', url: '/returns', icon: Package },
        );
    if (role === 'seller') items.push({ title: 'Inventory', url: '/inventory', icon: Package });
    if (['buyer', 'seller'].includes(role)) items.push({ title: role === 'seller' ? 'Fulfillment' : 'Orders', url: '/orders', icon: Package });
    if (['rider', 'logistics', 'admin'].includes(role))
        items.push({ title: role === 'rider' ? 'My deliveries' : 'Parcel operations', url: '/deliveries', icon: Truck });
    if (role === 'logistics')
        items.push(
            { title: 'Rider applications', url: '/reviews', icon: ClipboardCheck },
            { title: 'Rider management', url: '/accounts', icon: UsersRound },
        );
    if (role !== 'admin') items.push({ title: 'Support', url: '/support', icon: MessageCircle });
    if (role !== 'buyer') items.push({ title: 'Reports', url: '/reports', icon: ChartNoAxesCombined });
    items.push({ title: 'Settings', url: '/settings/profile', icon: Settings });
    if (auth.user.status !== 'approved')
        items.splice(0, items.length, { title: 'Registration & approval', url: '/application', icon: ClipboardCheck });
    if (auth.user.status === 'pending')
        items.splice(0, items.length, { title: 'Waiting for approval', url: '/application/waiting', icon: ClipboardCheck });
    return (
        <Sidebar collapsible="icon" variant="inset" className="[&_[data-sidebar=sidebar]]:bg-card">
            <SidebarHeader className="h-18 shrink-0 flex-row items-center gap-2 border-b px-3">
                <SidebarLogoToggle className="group-data-[collapsible=icon]:mx-auto" />
                <Link
                    href="/dashboard"
                    prefetch
                    aria-label="LubosMart dashboard"
                    className="focus-visible:ring-ring flex min-w-0 items-center gap-2 rounded-xl group-data-[collapsible=icon]:hidden focus-visible:ring-2 focus-visible:outline-none"
                >
                    <AppWordmark className="truncate text-sm" />
                </Link>
            </SidebarHeader>
            <SidebarContent className="pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="space-y-5 py-3">
                    {role === 'admin' && auth.user.status === 'approved' ? (
                        <>
                            <NavMain title="Workspace" items={adminItems.slice(0, 5)} admin />
                            <NavMain title="Platform" items={adminItems.slice(5, 8)} admin />
                            <NavMain title="Communication" items={adminItems.slice(8)} admin />
                        </>
                    ) : role === 'logistics' && auth.user.status === 'approved' ? (
                        <>
                            <NavMain title="Operations" items={logisticsItems.slice(0, 7)} admin />
                            <NavMain title="Riders & Coverage" items={logisticsItems.slice(7, 11)} admin />
                            <NavMain title="Workspace" items={logisticsItems.slice(11)} admin />
                        </>
                    ) : role === 'rider' && auth.user.status === 'approved' ? (
                        <>
                            <NavMain title="My deliveries" items={riderItems.slice(0, 6)} admin />
                            <NavMain title="Cash & history" items={riderItems.slice(6, 9)} admin />
                            <NavMain title="Workspace" items={riderItems.slice(9)} admin />
                        </>
                    ) : role === 'seller' && auth.user.status === 'approved' ? (
                        <>
                            <NavMain title="Order fulfillment" items={sellerItems.slice(0, 7)} admin />
                            <NavMain title="Store" items={sellerItems.slice(7, 9)} admin />
                            <NavMain title="Workspace" items={sellerItems.slice(9)} admin />
                        </>
                    ) : (
                        <NavMain title="Workspace" items={items} admin />
                    )}
                </div>
            </SidebarContent>

            <SidebarFooter className="border-t p-3">
                <SidebarThemeToggle />
            </SidebarFooter>
        </Sidebar>
    );
}
