import AppLogoIcon from '@/components/branding/app-logo-icon';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function SidebarLogoToggle({ className }: { className?: string }) {
    const { isMobile, openMobile, state, toggleSidebar } = useSidebar();
    const expanded = isMobile ? openMobile : state === 'expanded';
    const label = expanded ? 'Collapse navigation' : 'Expand navigation';

    return (
        <button
            type="button"
            onClick={toggleSidebar}
            aria-label={label}
            aria-expanded={expanded}
            title={label + ' (Ctrl+B)'}
            className={cn(
                'hover:bg-accent focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none',
                className,
            )}
        >
            <AppLogoIcon className="size-10" />
        </button>
    );
}
