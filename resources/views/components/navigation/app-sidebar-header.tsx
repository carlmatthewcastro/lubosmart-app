import { AdminToolbar } from '@/components/admin/toolbar';
import { LogisticsToolbar } from '@/components/logistics/logistics-toolbar';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { SidebarLogoToggle } from '@/components/navigation/sidebar-logo-toggle';
import { WorkspaceToolbar } from '@/components/workspace/workspace-toolbar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export function AppSidebarHeader({ breadcrumbs = [], pageHeader }: { breadcrumbs?: BreadcrumbItemType[]; pageHeader?: React.ReactNode }) {
    const { auth } = usePage<SharedData>().props;
    return (
        <header
            className={`bg-card/95 sticky top-0 z-20 flex shrink-0 items-center justify-between gap-2 border-b px-3 shadow-sm shadow-black/[.02] backdrop-blur md:px-8 ${pageHeader ? 'min-h-18 flex-wrap gap-y-4 py-3 md:h-18 md:flex-nowrap md:py-0' : 'h-18'}`}
        >
            <div className={`flex min-w-0 flex-1 items-center gap-3 ${pageHeader ? 'basis-full sm:basis-0' : ''}`}>
                <SidebarLogoToggle className="md:hidden" />
                {pageHeader}
                {!pageHeader && auth.user.role === 'admin' && (
                    <div className="min-w-0">
                        <p className="text-muted-foreground hidden text-xs font-bold tracking-widest uppercase sm:block">Admin workspace</p>
                        <div className="min-w-0 truncate text-sm font-semibold [&_li]:truncate [&_nav]:overflow-hidden [&_ol]:flex-nowrap">
                            {breadcrumbs.length ? <Breadcrumbs breadcrumbs={breadcrumbs} /> : 'Overview'}
                        </div>
                    </div>
                )}
                {!pageHeader && auth.user.role !== 'admin' && (
                    <div className="min-w-0 truncate [&_li]:truncate [&_nav]:overflow-hidden [&_ol]:flex-nowrap">
                        <p className="text-muted-foreground hidden text-xs font-bold tracking-widest uppercase sm:block">
                            {auth.user.role === 'sorting_center'
                                ? 'Logistics portal'
                                : auth.user.role === 'courier'
                                  ? 'Rider portal'
                                  : `${auth.user.role} portal`}
                        </p>
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                )}
            </div>
            {auth.user.role === 'admin' && <AdminToolbar />}
            {auth.user.role === 'sorting_center' && <LogisticsToolbar />}
            {!['admin', 'sorting_center'].includes(auth.user.role) && <WorkspaceToolbar />}
        </header>
    );
}
