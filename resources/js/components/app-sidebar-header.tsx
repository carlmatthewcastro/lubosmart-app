import { AdminToolbar } from '@/components/admin/toolbar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LogisticsToolbar } from '@/components/logistics-toolbar';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, Menu } from 'lucide-react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { auth } = usePage<SharedData>().props;
    const { setOpenMobile } = useSidebar();
    return (
        <header className="bg-card/95 sticky top-0 z-20 flex h-18 shrink-0 items-center justify-between gap-2 border-b px-3 shadow-sm shadow-black/[.02] backdrop-blur md:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                {['admin', 'sorting_center'].includes(auth.user.role) ? (
                    <button
                        type="button"
                        onClick={() => setOpenMobile(true)}
                        className="hover:bg-accent flex size-10 shrink-0 items-center justify-center rounded-xl md:hidden"
                        aria-label="Open navigation"
                    >
                        <Menu className="size-5" />
                    </button>
                ) : (
                    <SidebarTrigger className="hover:bg-accent size-10 shrink-0 rounded-xl border" />
                )}
                <div className="min-w-0 truncate [&_li]:truncate [&_nav]:overflow-hidden [&_ol]:flex-nowrap">
                    <p className="text-muted-foreground hidden text-[10px] font-medium tracking-widest uppercase sm:block">
                        {auth.user.role === 'admin' ? 'Administration' : auth.user.role === 'sorting_center' ? 'Logistics Workspace' : 'LubosMart'}
                    </p>
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>
            {auth.user.role === 'admin' && <AdminToolbar />}
            {auth.user.role === 'sorting_center' && <LogisticsToolbar />}
            {!['admin', 'sorting_center'].includes(auth.user.role) && (
                <Link href="/shop" className="text-muted-foreground hover:text-primary flex shrink-0 items-center gap-1 text-xs">
                    Marketplace <ArrowUpRight className="size-4" />
                </Link>
            )}
        </header>
    );
}
