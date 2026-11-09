import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { Boxes, LayoutDashboard, Menu, ScanLine } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function LogisticsMobileNavigation() {
    const { url } = usePage();
    const { toggleSidebar, openMobile } = useSidebar();
    const menuButton = useRef<HTMLButtonElement>(null);
    const wasOpen = useRef(openMobile);
    useEffect(() => {
        if (wasOpen.current && !openMobile) menuButton.current?.focus();
        wasOpen.current = openMobile;
    }, [openMobile]);
    const pathname = url.split('?')[0];
    const items = [
        {
            label: 'Dashboard',
            href: '/dashboard/logistics',
            icon: LayoutDashboard,
            active: ['/dashboard', '/dashboard/logistics'].includes(pathname),
        },
        { label: 'Scan', href: '/logistics/scan', icon: ScanLine, active: pathname === '/logistics/scan' },
        { label: 'Parcels', href: '/deliveries?stage=all', icon: Boxes, active: pathname === '/deliveries' },
    ];
    return (
        <nav
            aria-label="Logistics mobile navigation"
            className="bg-card/95 fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
        >
            {items.map(({ label, href, icon: Icon, active }) => (
                <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                        'text-muted-foreground hover:bg-accent hover:text-primary focus-visible:ring-ring flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none',
                        active && 'bg-primary/10 text-primary',
                    )}
                >
                    <Icon className="size-5" aria-hidden="true" />
                    {label}
                </Link>
            ))}
            <button
                ref={menuButton}
                type="button"
                aria-label="Open Logistics menu"
                aria-expanded={openMobile}
                onClick={toggleSidebar}
                className="text-muted-foreground hover:bg-accent hover:text-primary focus-visible:ring-ring flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
                <Menu className="size-5" aria-hidden="true" />
                Menu
            </button>
        </nav>
    );
}
