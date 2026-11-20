import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { LoaderCircle, MoreHorizontal, type LucideIcon } from 'lucide-react';
import type { RefObject } from 'react';

export type DropdownAction = {
    id: string;
    label: string;
    icon?: LucideIcon;
    visible?: boolean;
    disabled?: boolean;
    loading?: boolean;
    destructive?: boolean;
    onSelect?: () => void;
    href?: string;
    download?: boolean;
};

export function ActionDropdown({
    label,
    actions,
    open,
    onOpenChange,
    triggerRef,
    onCloseAutoFocus,
    onActionSelect,
}: {
    label: string;
    actions: DropdownAction[];
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    triggerRef?: RefObject<HTMLButtonElement | null>;
    onCloseAutoFocus?: (event: Event) => void;
    onActionSelect?: (id: string) => void;
}) {
    return (
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>
                <button
                    ref={triggerRef}
                    type="button"
                    aria-label={label}
                    className="hover:bg-accent focus-visible:ring-ring inline-flex size-11 shrink-0 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
                >
                    <MoreHorizontal className="size-5" aria-hidden="true" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                onCloseAutoFocus={onCloseAutoFocus}
                align="end"
                collisionPadding={8}
                className="max-h-[var(--radix-dropdown-menu-content-available-height)] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl motion-reduce:animate-none"
            >
                {actions
                    .filter((action) => action.visible !== false)
                    .map((action) => {
                        const Icon = action.loading ? LoaderCircle : action.icon;
                        return (
                            <DropdownMenuItem
                                key={action.id}
                                asChild={!!action.href}
                                disabled={action.disabled || action.loading}
                                className={cn('min-h-11 rounded-lg px-3', action.destructive && 'text-destructive focus:text-destructive')}
                                onSelect={() => {
                                    onActionSelect?.(action.id);
                                    // Let the menu finish closing before a callback opens a focus-trapping dialog.
                                    if (action.onSelect) requestAnimationFrame(action.onSelect);
                                }}
                            >
                                {action.href ? (
                                    action.download ? (
                                        <a href={action.href}>
                                            {Icon && <Icon aria-hidden="true" />}
                                            {action.label}
                                        </a>
                                    ) : (
                                        <Link href={action.href}>
                                            {Icon && <Icon aria-hidden="true" />}
                                            {action.label}
                                        </Link>
                                    )
                                ) : (
                                    <>
                                        {Icon && (
                                            <Icon
                                                aria-hidden="true"
                                                className={action.loading ? 'animate-spin motion-reduce:animate-none' : undefined}
                                            />
                                        )}
                                        {action.label}
                                    </>
                                )}
                            </DropdownMenuItem>
                        );
                    })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
