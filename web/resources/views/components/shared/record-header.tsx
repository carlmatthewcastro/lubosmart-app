import { ActionDropdown, type DropdownAction } from '@/components/shared/action-dropdown';
import { cn } from '@/lib/utils';
import { Package, type LucideIcon } from 'lucide-react';
import { forwardRef, useRef, type ComponentPropsWithoutRef, type MouseEvent, type ReactNode, type RefObject } from 'react';

export function RecordHeader({
    label,
    title,
    reference,
    status,
    actions,
    actionsClassName,
    triggerRef,
    onOpen,
    open,
    onOpenChange,
    icon: Icon = Package,
    showIcon = true,
}: {
    label: string;
    title: string;
    reference?: string | null;
    status: ReactNode;
    actions: DropdownAction[];
    actionsClassName?: string;
    triggerRef?: RefObject<HTMLButtonElement | null>;
    onOpen?: (event: MouseEvent<HTMLButtonElement>) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    icon?: LucideIcon;
    showIcon?: boolean;
}) {
    const actionSelected = useRef(false);
    return (
        <>
            <div className="flex min-w-0 items-start gap-3">
                {showIcon && (
                    <span className="bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <Icon aria-hidden="true" className="size-5" />
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-muted-foreground text-xs">{label}</p>
                        {status}
                    </div>
                    <h2 className="text-sm font-semibold [overflow-wrap:anywhere] sm:text-base">
                        {onOpen ? (
                            <button
                                type="button"
                                aria-label={`View ${label.toLowerCase()}: ${title}`}
                                onClick={onOpen}
                                className="hover:text-primary focus-visible:ring-ring min-h-11 rounded text-left focus-visible:ring-2"
                            >
                                {title}
                            </button>
                        ) : (
                            <span className="mt-2 block">{title}</span>
                        )}
                    </h2>
                </div>
                {actions.some((action) => action.visible !== false) && (
                    <div className={cn('shrink-0', actionsClassName)}>
                        <ActionDropdown
                            label={`Actions for ${label.toLowerCase()}`}
                            actions={actions}
                            triggerRef={triggerRef}
                            open={open}
                            onOpenChange={onOpenChange}
                            onActionSelect={(id) => {
                                actionSelected.current = !!actions.find((action) => action.id === id)?.onSelect;
                            }}
                            onCloseAutoFocus={(event) => {
                                if (actionSelected.current) {
                                    event.preventDefault();
                                    actionSelected.current = false;
                                }
                            }}
                        />
                    </div>
                )}
            </div>
            {reference && (
                <p className="text-muted-foreground mt-2 font-mono text-xs [overflow-wrap:anywhere]">
                    <span className="sr-only">Tracking reference: </span>
                    {reference}
                </p>
            )}
        </>
    );
}

/** Open an existing disclosure without submitting any form or changing record state. */
export function openRecordSection(section: HTMLDetailsElement | null) {
    if (!section) return;
    section.open = true;
    requestAnimationFrame(() => {
        section.scrollIntoView({ block: 'nearest' });
        section.querySelector('summary')?.focus({ preventScroll: true });
    });
}

/** Secondary sections are revealed by the record menu; closing returns focus there. */
export const RecordDisclosure = forwardRef<HTMLDetailsElement, ComponentPropsWithoutRef<'details'>>(({ className, onToggle, ...props }, ref) => (
    <details
        {...props}
        ref={ref}
        className={cn('mt-3 border-t pt-2 [&:not([open])]:hidden', className)}
        onToggle={(event) => {
            onToggle?.(event);
            const section = event.currentTarget;
            if (!section.open && (document.activeElement === document.body || section.contains(document.activeElement))) {
                section.closest('section.workspace-card')?.querySelector<HTMLButtonElement>('button[aria-label^="Actions for "]')?.focus();
            }
        }}
    />
));
RecordDisclosure.displayName = 'RecordDisclosure';
