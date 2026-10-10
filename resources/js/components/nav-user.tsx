import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronsUpDown, CircleUserRound } from 'lucide-react';

export function NavUser() {
    const { auth } = usePage<SharedData>().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className={`text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent group ${['admin', 'sorting_center'].includes(auth.user.role) ? 'bg-accent/50 size-11! justify-center rounded-xl border p-2!' : ''}`}
                            tooltip="Account menu"
                        >
                            {['admin', 'sorting_center'].includes(auth.user.role) ? (
                                <>
                                    <CircleUserRound className="size-5" />
                                    <span className="sr-only">Open account menu</span>
                                </>
                            ) : (
                                <>
                                    <UserInfo user={auth.user} />
                                    <ChevronsUpDown className="ml-auto size-4" />
                                </>
                            )}
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="end"
                        side={isMobile ? 'bottom' : state === 'collapsed' ? 'left' : 'bottom'}
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
