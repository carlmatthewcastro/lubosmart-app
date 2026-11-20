import { SkipLink } from '@/components/shell/skip-link';
import { SidebarProvider } from '@/components/ui/sidebar';
import { WorkspaceRuntime } from '@/components/workspace/workspace-runtime';
import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    const admin = usePage<SharedData>().props.auth.user?.role === 'admin';
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
                <WorkspaceRuntime>{children}</WorkspaceRuntime>
            </div>
        );
    }

    return (
        <SidebarProvider
            className={admin ? 'workspace-shell admin-workspace' : 'workspace-shell'}
            defaultOpen={isOpen}
            open={isOpen}
            onOpenChange={handleSidebarChange}
        >
            <SkipLink />
            <WorkspaceRuntime>{children}</WorkspaceRuntime>
        </SidebarProvider>
    );
}
