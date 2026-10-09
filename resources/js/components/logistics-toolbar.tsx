import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useAppearance } from '@/hooks/use-appearance';
import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CircleUserRound, MessageCircle } from 'lucide-react';
import { useEffect } from 'react';

export function LogisticsToolbar() {
    const { auth } = usePage<SharedData>().props;
    const { appearance, updateAppearance } = useAppearance();
    useEffect(() => {
        if (appearance !== 'light') updateAppearance('light');
    }, [appearance, updateAppearance]);
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                className="text-muted-foreground hover:bg-accent hover:text-primary flex size-10 items-center justify-center rounded-xl"
                aria-label="Open messages"
                title="Messages"
                onClick={() => window.dispatchEvent(new Event('admin-messages:open'))}
            >
                <MessageCircle className="size-5" />
            </button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="bg-accent/60 text-primary hover:bg-accent flex size-10 items-center justify-center rounded-xl"
                        aria-label="Open account menu"
                        title="My Account"
                    >
                        <CircleUserRound className="size-5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <UserMenuContent user={auth.user} />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
