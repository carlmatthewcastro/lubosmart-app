import { AppSidebar } from '@/components/navigation/app-sidebar';
import { AppSidebarHeader } from '@/components/navigation/app-sidebar-header';
import { AppContent } from '@/components/shell/app-content';
import { AppShell } from '@/components/shell/app-shell';
import { type BreadcrumbItem } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
    pageHeader,
}: {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    pageHeader?: React.ReactNode;
}) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} pageHeader={pageHeader} />
                {children}
            </AppContent>
        </AppShell>
    );
}
