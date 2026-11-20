import { UserMenuContent } from '@/components/navigation/user-menu-content';
import { NotificationBell } from '@/components/shared/notification-inbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useInitials } from '@/hooks/use-initials';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';

export function LogisticsToolbar() {
    const { auth } = usePage<SharedData>().props;
    const getInitials = useInitials();
    return (
        <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
                href="/support?kind=message"
                className="text-muted-foreground hover:bg-accent hover:text-primary flex size-11 items-center justify-center rounded-xl"
                aria-label="Open messages"
                title="Messages"
            >
                <MessageCircle className="size-5" />
            </Link>
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
