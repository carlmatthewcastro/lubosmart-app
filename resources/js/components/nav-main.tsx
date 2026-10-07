import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
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
            <SidebarGroupLabel>Your workspace</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton className="h-11 rounded-xl" asChild isActive={isActive(item)}>
                            <Link href={item.url} prefetch aria-current={isActive(item) ? 'page' : undefined}>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
