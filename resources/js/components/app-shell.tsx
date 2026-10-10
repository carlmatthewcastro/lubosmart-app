import { SkipLink } from '@/components/skip-link';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { type CSSProperties, useState } from 'react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    const { auth } = usePage<SharedData>().props;
    const [isOpen, setIsOpen] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('sidebar') !== 'false' : true));

    const handleSidebarChange = (open: boolean) => {
        setIsOpen(open);

        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar', String(open));
        }
    };

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">
                <SkipLink />
                {children}
            </div>
        );
    }

    return (
        <SidebarProvider
            style={['admin', 'sorting_center'].includes(auth.user?.role) ? ({ '--sidebar-width-icon': '4.5rem' } as CSSProperties) : undefined}
            defaultOpen={isOpen}
            open={isOpen}
            onOpenChange={handleSidebarChange}
        >
            <SkipLink />
            {children}
        </SidebarProvider>
    );
}
