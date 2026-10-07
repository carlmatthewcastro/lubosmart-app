import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ChartNoAxesCombined,
    ClipboardCheck,
    LayoutGrid,
    Megaphone,
    MessageSquareWarning,
    MessagesSquare,
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
    const { auth } = usePage<SharedData>().props;
    const role = auth.user.role;
    const items: NavItem[] = [...mainNavItems];
    if (role === 'buyer')
        items.push({ title: 'Discover', url: '/shop', icon: ShoppingBag }, { title: 'Shopping bag', url: '/cart', icon: ShoppingCart });
    if (role === 'seller') items.push({ title: 'Inventory', url: '/inventory', icon: Package });
    if (['buyer', 'seller'].includes(role)) items.push({ title: role === 'seller' ? 'Fulfillment' : 'Orders', url: '/orders', icon: Package });
    if (['rider', 'logistics', 'admin'].includes(role))
        items.push({ title: role === 'rider' ? 'My deliveries' : 'Parcel operations', url: '/deliveries', icon: Truck });
    if (['admin', 'logistics'].includes(role))
        items.push({ title: 'Applications', url: '/reviews', icon: ClipboardCheck }, { title: 'Accounts', url: '/accounts', icon: Users });
    if (role === 'admin')
        items.push(
            { title: 'Seller compliance', url: '/admin/compliance', icon: ShieldCheck },
            { title: 'Complaints & disputes', url: '/support?kind=complaint', icon: MessageSquareWarning },
            { title: 'Messages', url: '/support?kind=message', icon: MessagesSquare },
            { title: 'Commission', url: '/admin/commission', icon: Percent },
            { title: 'Platform settings', url: '/admin/platform', icon: Megaphone },
        );
    else items.push({ title: 'Support', url: '/support', icon: MessagesSquare });
    if (role !== 'buyer') items.push({ title: 'Reports', url: '/reports', icon: ChartNoAxesCombined });
    items.push({ title: 'Settings', url: '/settings/profile', icon: Settings });
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={items} />
            </SidebarContent>

            <SidebarFooter>
                {role !== 'admin' && <NavFooter items={footerNavItems} className="mt-auto" />}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
