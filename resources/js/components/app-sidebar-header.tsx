import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    return (
        <header className="bg-card/95 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1 size-10" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <Link href="/shop" className="text-muted-foreground hover:text-primary flex shrink-0 items-center gap-1 text-xs">
                Marketplace <ArrowUpRight className="size-4" />
            </Link>
        </header>
    );
}
