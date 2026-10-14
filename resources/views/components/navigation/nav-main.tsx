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
        if (currentPath !== path && !currentPath.startsWith(path + '/')) return false;
        if (!query) return true;
        const expected = new URLSearchParams(query);
        const actual = new URLSearchParams(page.url.split('?')[1] ?? '');
        const conversation = page.props.case as { kind?: string } | undefined;
        return [...expected].every(([key, value]) => (key === 'kind' && conversation ? conversation.kind : actual.get(key)) === value);
    };
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel
                className={`mb-2 px-3 text-xs font-semibold tracking-widest uppercase ${admin ? 'text-primary/80' : 'text-muted-foreground'}`}
            >
                {title}
            </SidebarGroupLabel>
            <SidebarMenu className={admin ? 'gap-1.5' : 'gap-1'}>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            className={`h-11 rounded-xl px-3 transition-colors group-data-[collapsible=icon]:mx-auto [&>svg]:size-5 [&>svg]:shrink-0 ${
                                admin
                                    ? 'text-muted-foreground hover:bg-accent/60 hover:text-foreground data-[active=true]:border-primary/15 data-[active=true]:bg-accent data-[active=true]:text-primary data-[active=true]:ring-primary/10 data-[active=true]:border data-[active=true]:font-semibold data-[active=true]:shadow-sm data-[active=true]:ring-1'
                                    : 'text-muted-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:ring-primary/10 data-[active=true]:font-semibold data-[active=true]:shadow-sm data-[active=true]:ring-1'
                            }`}
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
                                <span className="min-w-0 truncate">{item.title}</span>
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
