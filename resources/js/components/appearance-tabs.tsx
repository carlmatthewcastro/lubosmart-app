import { cn } from '@/lib/utils';
import { Sun } from 'lucide-react';
import { type HTMLAttributes } from 'react';

export default function AppearanceToggleTab({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('bg-accent text-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium', className)} {...props}>
            <Sun aria-hidden="true" className="size-4" />
            Light theme
        </div>
    );
}
