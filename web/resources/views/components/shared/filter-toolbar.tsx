import { secondaryClass } from '@/components/shared/marketplace-ui';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, X } from 'lucide-react';
import { Children, isValidElement, useId, useState, type ReactNode } from 'react';

export type ActiveFilter = { key: string; label: string; value: string; onRemove: () => void };

function optionLabels(nodes: ReactNode, labels = new Map<string, ReactNode>()) {
    Children.forEach(nodes, (node) => {
        if (!isValidElement<{ value?: string; children?: ReactNode }>(node)) return;
        if (node.type === 'option' && node.props.value !== undefined) labels.set(String(node.props.value), node.props.children);
        else optionLabels(node.props.children, labels);
    });
    return labels;
}

export function FilterToolbar({
    primary,
    children,
    activeFilters = [],
    autoSubmit = true,
    primaryClassName,
    hasErrors = false,
}: {
    primary?: ReactNode;
    children?: ReactNode;
    activeFilters?: ActiveFilter[];
    autoSubmit?: boolean;
    primaryClassName?: string;
    hasErrors?: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const filtersId = useId();
    const controls = Children.toArray(children);
    const labels = optionLabels(children);
    const count = activeFilters.filter((filter) => filter.key !== 'search').length;
    return (
        <div data-filter-toolbar className="min-w-0 space-y-3 [&_input]:py-2 [&_select]:py-2">
            <div className="flex flex-wrap items-end gap-3">
                {primary && <div className={cn('w-full min-w-0 md:w-80 lg:w-96', primaryClassName)}>{primary}</div>}
                {!!controls.length && (
                    <>
                        <button
                            type="button"
                            aria-expanded={expanded || hasErrors}
                            aria-controls={filtersId}
                            className={cn(secondaryClass, 'md:hidden')}
                            onClick={() => setExpanded((value) => !value)}
                        >
                            <SlidersHorizontal aria-hidden="true" className="size-4" />
                            Filters{count ? ` (${count})` : ''}
                        </button>
                        <div
                            id={filtersId}
                            className={cn('w-full min-w-0 flex-wrap items-end gap-3 md:flex md:w-auto', expanded || hasErrors ? 'flex' : 'hidden')}
                        >
                            {controls.map((control, index) => (
                                <div key={index} className="w-full min-w-0 md:w-48 [&>div]:w-full">
                                    {control}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
            {!!activeFilters.length && (
                <div role="group" aria-label="Active filters" className="flex flex-wrap gap-2">
                    {activeFilters.map((filter) => {
                        const value = filter.key === 'search' ? filter.value : (labels.get(filter.value) ?? filter.value);
                        return (
                            <button
                                key={filter.key}
                                type="button"
                                aria-label={`Remove ${filter.label}: ${typeof value === 'string' ? value : filter.value}`}
                                className="border-primary/15 bg-accent/40 text-foreground hover:bg-accent focus-visible:ring-ring inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs focus-visible:ring-2"
                                onClick={(event) => {
                                    const button = event.currentTarget;
                                    const form = button.form;
                                    const toolbar = button.closest('[data-filter-toolbar]');
                                    const neighbor = button.nextElementSibling ?? button.previousElementSibling;
                                    filter.onRemove();
                                    requestAnimationFrame(() => {
                                        if (!button.isConnected) {
                                            const target = neighbor?.isConnected ? neighbor : toolbar?.querySelector('input, button');
                                            if (target instanceof HTMLElement) target.focus({ preventScroll: true });
                                        }
                                        if (autoSubmit && form?.isConnected) form.requestSubmit();
                                    });
                                }}
                            >
                                <span className="min-w-0 [overflow-wrap:anywhere]">
                                    <span className="text-muted-foreground">{filter.label}:</span> <span className="font-medium">{value}</span>
                                </span>
                                <X aria-hidden="true" className="size-3 shrink-0" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
