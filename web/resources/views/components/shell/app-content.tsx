import { SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import * as React from 'react';

interface AppContentProps extends React.ComponentProps<'div'> {
    variant?: 'header' | 'sidebar';
}

export function AppContent({ variant = 'header', children, className, ...props }: AppContentProps) {
    if (variant === 'sidebar') {
        return (
            <SidebarInset id="main-content" tabIndex={-1} className={cn('min-w-0', className)} {...props}>
                {children}
            </SidebarInset>
        );
    }

    return (
        <main id="main-content" tabIndex={-1} className={cn('flex h-full w-full min-w-0 flex-1 flex-col gap-4 rounded-xl', className)} {...props}>
            {children}
        </main>
    );
}
