import LogisticsMobileNavigation from '@/components/logistics/mobile-navigation';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { AppSidebarHeader } from '@/components/navigation/app-sidebar-header';
import { AppContent } from '@/components/shell/app-content';
import { AppShell } from '@/components/shell/app-shell';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
    pageHeader,
}: {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    pageHeader?: React.ReactNode;
}) {
    const logistics = usePage<SharedData>().props.auth.user?.role === 'logistics';
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" {...(logistics ? { className: 'min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0' } : {})}>
                <AppSidebarHeader breadcrumbs={breadcrumbs} pageHeader={pageHeader} />
                {children}
                {logistics && <LogisticsMobileNavigation />}
            </AppContent>
        </AppShell>
    );
}
