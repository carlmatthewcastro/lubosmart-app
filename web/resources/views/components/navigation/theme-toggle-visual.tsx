import { cn } from '@/lib/utils';
import { Cloud, Moon, Sun } from 'lucide-react';

export function ThemeModeIcon({ dark, className }: { dark: boolean; className?: string }) {
    return (
        <span aria-hidden="true" className={cn('relative inline-flex size-7 shrink-0 items-center justify-center', className)}>
            <span
                className={cn(
                    'absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-300 motion-reduce:transition-none',
                    dark ? 'scale-50 rotate-45 opacity-0' : 'scale-100 rotate-0 opacity-100',
                )}
            >
                <Sun className="text-brand-orange size-6" />
                <Cloud className="text-muted-foreground fill-card absolute right-0 bottom-0 size-4" />
            </span>
            <span
                className={cn(
                    'text-warning absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-300 motion-reduce:transition-none',
                    dark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-45 opacity-0',
                )}
            >
                <Moon className="size-6 fill-current" />
                <span className="absolute top-0 right-0 text-xs leading-none">✦</span>
            </span>
        </span>
    );
}

export function ThemeSwitchTrack({ dark, compact = false, className }: { dark: boolean; compact?: boolean; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-300 motion-reduce:transition-none',
                compact ? 'h-4 w-7 p-px' : 'h-7 w-12 p-0.5',
                dark ? 'border-primary bg-primary' : 'border-muted-foreground bg-muted',
                className,
            )}
        >
            <span
                className={cn(
                    'bg-card dark:bg-foreground relative rounded-full shadow-sm transition-transform duration-300 ease-in-out motion-reduce:transition-none',
                    compact ? 'size-3' : 'size-5',
                    dark ? (compact ? 'translate-x-3' : 'translate-x-5') : 'translate-x-0',
                )}
            />
        </span>
    );
}
