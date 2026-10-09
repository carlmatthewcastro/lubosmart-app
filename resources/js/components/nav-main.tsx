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

export function NavMain({ items = [], title = 'Your workspace' }: { items: NavItem[]; title?: string }) {
    const page = usePage();
    const { isMobile, setOpenMobile } = useSidebar();
    const isActive = (item: NavItem) => {
        if (item.url === '/dashboard') return page.url.startsWith('/dashboard');
        const [path, query] = item.url.split('?');
        if (!page.url.split('?')[0].startsWith(path)) return false;
        if (!query) return true;
        const expected = new URLSearchParams(query);
        const actual = new URLSearchParams(page.url.split('?')[1] ?? '');
        const conversation = page.props.case as { kind?: string } | undefined;
        return [...expected].every(([key, value]) => (key === 'kind' && conversation ? conversation.kind : actual.get(key)) === value);
    };
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="text-muted-foreground/70 mb-2 text-[10px] font-semibold tracking-widest uppercase">
                {title}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            className="text-muted-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:ring-primary/10 h-11 rounded-xl px-3 transition-colors group-data-[collapsible=icon]:mx-auto data-[active=true]:font-semibold data-[active=true]:shadow-sm data-[active=true]:ring-1 [&>svg]:size-[18px]"
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
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                        {!!item.badge && (
                            <SidebarMenuBadge className="bg-accent text-primary rounded-full text-[10px] tabular-nums">
                                {item.badge > 99 ? '99+' : item.badge}
                            </SidebarMenuBadge>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
