import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage, usePoll } from '@inertiajs/react';
import {
    ChartNoAxesCombined,
    ClipboardCheck,
    History,
    LayoutGrid,
    Megaphone,
    MessageCircle,
    MessageSquareWarning,
    Package,
    Percent,
    Settings,
    ShieldCheck,
    ShoppingBag,
    ShoppingCart,
    Store,
    Truck,
    Users,
} from 'lucide-react';
import { useEffect } from 'react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'LubosMart home',
        url: '/',
        icon: Store,
    },
];

export function AppSidebar() {
    const { state } = useSidebar();
    const { auth, adminWorkspace } = usePage<SharedData>().props;
    const poll = usePoll(30000, { only: ['adminWorkspace'] }, { autoStart: false });
    const badges = adminWorkspace?.badges ?? {};
    const adminItems: NavItem[] = [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
        { title: 'Registrations', url: '/reviews', icon: ClipboardCheck, badge: badges.registrations },
        { title: 'User Accounts', url: '/accounts', icon: Users },
        { title: 'Seller Compliance', url: '/admin/compliance', icon: ShieldCheck, badge: badges.compliance },
        { title: 'Complaints & Disputes', url: '/support?kind=complaint', icon: MessageSquareWarning, badge: badges.disputes },
        { title: 'Commission', url: '/admin/commission', icon: Percent },
        { title: 'Reports', url: '/reports', icon: ChartNoAxesCombined },
        { title: 'Platform Settings', url: '/admin/platform', icon: Megaphone },
        { title: 'Messages', url: '/support?kind=message', icon: MessageCircle, badge: badges.messages },
        { title: 'Activity History', url: '/admin/audit-log', icon: History },
        { title: 'My Account', url: '/settings/profile', icon: Settings },
    ];
    const logisticsItems: NavItem[] = [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
        { title: 'Parcel Operations', url: '/deliveries', icon: Package },
        { title: 'Rider Applications', url: '/reviews', icon: ClipboardCheck },
        { title: 'Rider Management', url: '/accounts', icon: Users },
        { title: 'Shipping Rates', url: '/logistics/shipping-rates', icon: Truck },
        { title: 'Delivery Reports', url: '/reports', icon: ChartNoAxesCombined },
        { title: 'Messages', url: '/support?kind=message', icon: MessageCircle },
        { title: 'My Account', url: '/settings/profile', icon: Settings },
    ];
    const role = auth.user.role;
    useEffect(() => {
        if (role === 'admin' && auth.user.status === 'approved') poll.start();
        return () => poll.stop();
    }, [role, auth.user.status, poll]);
    const items: NavItem[] = [...mainNavItems];
    if (role === 'buyer')
        items.push({ title: 'Discover', url: '/shop', icon: ShoppingBag }, { title: 'Shopping bag', url: '/cart', icon: ShoppingCart });
    if (role === 'seller') items.push({ title: 'Inventory', url: '/inventory', icon: Package });
    if (['buyer', 'seller'].includes(role)) items.push({ title: role === 'seller' ? 'Fulfillment' : 'Orders', url: '/orders', icon: Package });
    if (['courier', 'sorting_center', 'admin'].includes(role))
        items.push({ title: role === 'courier' ? 'My deliveries' : 'Parcel operations', url: '/deliveries', icon: Truck });
    if (role === 'sorting_center')
        items.push(
            { title: 'Courier applications', url: '/reviews', icon: ClipboardCheck },
            { title: 'Courier management', url: '/accounts', icon: Users },
        );
    if (role !== 'admin') items.push({ title: 'Support', url: '/support', icon: MessageCircle });
    if (role !== 'buyer') items.push({ title: 'Reports', url: '/reports', icon: ChartNoAxesCombined });
    items.push({ title: 'Settings', url: '/settings/profile', icon: Settings });
    if (auth.user.status !== 'approved')
        items.splice(0, items.length, { title: 'Registration & approval', url: '/application', icon: ClipboardCheck });
    if (auth.user.status === 'pending')
        items.splice(0, items.length, { title: 'Waiting for approval', url: '/application/waiting', icon: ClipboardCheck });
    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className={['admin', 'sorting_center'].includes(role) ? '[&_[data-sidebar=sidebar]]:bg-card' : undefined}
        >
            <SidebarHeader className="border-b px-3 py-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:p-1! hover:bg-transparent active:bg-transparent"
                            asChild
                        >
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="pt-2">
                <div className="space-y-5 py-3">
                    {role === 'admin' && auth.user.status === 'approved' ? (
                        <>
                            <NavMain title="Workspace" items={adminItems.slice(0, 5)} />
                            <NavMain title="Platform" items={adminItems.slice(5, 8)} />
                            <NavMain title="Communication & Account" items={adminItems.slice(8)} />
                        </>
                    ) : role === 'sorting_center' && auth.user.status === 'approved' ? (
                        <>
                            <NavMain title="Operations" items={logisticsItems.slice(0, 2)} />
                            <NavMain title="Center Management" items={logisticsItems.slice(2, 6)} />
                            <NavMain title="Communication & Account" items={logisticsItems.slice(6)} />
                        </>
                    ) : (
                        <NavMain items={items} />
                    )}
                </div>
            </SidebarContent>

            <SidebarFooter className="border-t p-3">
                {role !== 'admin' && <NavFooter items={footerNavItems} className="mt-auto" />}
                <NavUser />
            </SidebarFooter>
            {['admin', 'sorting_center'].includes(role) && (
                <SidebarRail
                    tabIndex={0}
                    aria-expanded={state === 'expanded'}
                    aria-label={state === 'expanded' ? 'Collapse navigation' : 'Expand navigation'}
                    title={state === 'expanded' ? 'Click edge to collapse navigation (Ctrl+B)' : 'Click edge to expand navigation (Ctrl+B)'}
                    className="after:bg-border/50 hover:after:bg-primary/50 focus-visible:after:bg-primary focus-visible:outline-none"
                />
            )}
        </Sidebar>
    );
}
