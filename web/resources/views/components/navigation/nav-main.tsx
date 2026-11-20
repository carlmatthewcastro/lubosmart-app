import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [], title = 'Your workspace', admin = false }: { items: NavItem[]; title?: string; admin?: boolean }) {
    const page = usePage();
    const { isMobile, setOpenMobile } = useSidebar();
    const isActive = (item: NavItem) => {
        if (item.url === '/dashboard') return page.url.split('?')[0] === '/dashboard' || page.url.split('?')[0].startsWith('/dashboard/');
        const [path, query] = item.url.split('?');
        const currentPath = page.url.split('?')[0];
        if (
            path === '/logistics/riders' &&
            currentPath === '/reviews' &&
            (page.props.auth as { user: { role: string } } | undefined)?.user.role === 'logistics'
        )
            return true;
        if (item.title === 'Finance Center' && ['/finance', '/logistics-settlements', '/rider-payments'].includes(currentPath)) return true;
        if (path === '/logistics/rider-coverage' && currentPath === '/logistics/shipping-rates') return true;
        if (currentPath !== path && !currentPath.startsWith(path + '/')) return false;
        if (!query) return true;
        const expected = new URLSearchParams(query);
        const actual = new URLSearchParams(page.url.split('?')[1] ?? '');
        if (path === '/deliveries' && page.props.auth && (page.props.auth as { user: { role: string } }).user.role === 'logistics') {
            const records = actual.get('view') === 'records';
            if (expected.get('view') === 'records') return records;
            if (records) return false;
            if (expected.get('stage') === 'all') return !['dispatch', 'monitoring', 'exceptions'].includes(actual.get('stage') ?? 'all');
            if (expected.get('stage') === 'dispatch') return ['dispatch', 'monitoring', 'exceptions'].includes(actual.get('stage') ?? '');
        }
        const conversation = page.props.case as { kind?: string } | undefined;
        return [...expected].every(([key, value]) => (key === 'kind' && conversation ? conversation.kind : actual.get(key)) === value);
    };
    return (
        <SidebarGroup role="navigation" aria-label={title} className="px-2 py-0">
            <SidebarGroupLabel className="text-primary mb-2 px-3 text-xs font-semibold tracking-wide uppercase">{title}</SidebarGroupLabel>
            <SidebarMenu className={admin ? 'gap-1.5' : 'gap-1'}>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            className="text-foreground/90 hover:bg-sidebar-accent/60 hover:text-primary data-[active=true]:bg-sidebar-accent data-[active=true]:text-primary h-auto min-h-11 rounded-xl px-3 py-3 transition-colors group-data-[collapsible=icon]:mx-auto data-[active=true]:font-semibold group-data-[collapsible=icon]:[&>span]:hidden [&>span:last-child]:text-clip [&>span:last-child]:whitespace-normal [&>svg]:size-5 [&>svg]:shrink-0"
                            tooltip={item.title}
                            asChild
                            isActive={isActive(item)}
                        >
                            <Link
                                href={item.url}
                                prefetch
                                onClick={() => {
                                    if (isMobile) setOpenMobile(false);
                                }}
                                aria-current={isActive(item) ? 'page' : undefined}
                            >
                                {item.icon && <item.icon aria-hidden="true" />}
                                <span className="min-w-0 break-words whitespace-normal group-data-[collapsible=icon]:hidden">{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                        {!!item.badge && (
                            <SidebarMenuBadge
                                className={`rounded-full text-[10px] tabular-nums ${admin ? 'bg-background text-primary ring-primary/10 ring-1' : 'bg-accent text-primary'}`}
                            >
                                {item.badge > 99 ? '99+' : item.badge}
                            </SidebarMenuBadge>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
