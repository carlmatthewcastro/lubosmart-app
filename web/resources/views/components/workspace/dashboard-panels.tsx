import { Card } from '@/components/shared/marketplace-ui';
import { WorkspaceIllustration } from '@/components/workspace/workspace-illustration';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function DashboardWelcome({
    label,
    title,
    description,
    context,
    icon: Icon,
    illustration = 'delivery',
    compact = false,
    children,
}: {
    label: string;
    title: string;
    description: string;
    context?: string;
    icon?: LucideIcon;
    illustration?: 'delivery' | 'store' | 'platform';
    compact?: boolean;
    children?: ReactNode;
}) {
    if (compact) {
        return (
            <section aria-label={label} className="flex min-w-0 flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold break-words">{title}</h2>
                    {context && <p className="text-muted-foreground mt-1 text-sm break-words">{context}</p>}
                </div>
                {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
            </section>
        );
    }
    return (
        <section aria-label={label} className="workspace-welcome relative isolate overflow-hidden rounded-2xl border p-6 sm:p-8 lg:px-10">
            <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                    <p className="text-primary mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                        {Icon && <Icon aria-hidden="true" className="size-4" />}
                        {label}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl lg:text-4xl">{title}</h2>
                    {context && <p className="text-primary mt-2 text-sm font-medium break-words">{context}</p>}
                    <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed break-words sm:text-base">{description}</p>
                    {children && <div className="mt-5 flex flex-wrap items-center gap-3">{children}</div>}
                </div>
                <div className="pointer-events-none hidden min-w-0 md:block">
                    <WorkspaceIllustration variant={illustration} />
                </div>
            </div>
        </section>
    );
}

export function DashboardMetric({
    label,
    value,
    hint,
    icon: Icon,
    href,
    compact = false,
}: {
    label: string;
    value: number | string;
    hint: string;
    icon?: LucideIcon;
    href?: string;
    compact?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const content = (
        <>
            <div className="flex items-center gap-4">
                {Icon && (
                    <span
                        aria-hidden="true"
                        className={
                            compact
                                ? 'text-primary flex size-5 shrink-0 items-center justify-center'
                                : 'bg-accent text-primary flex size-11 items-center justify-center rounded-xl'
                        }
                    >
                        <Icon className="size-5" />
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <h2 className="text-muted-foreground text-sm font-medium">{label}</h2>
                    <p className="mt-1 text-2xl font-semibold tracking-tight break-words tabular-nums">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                </div>
                {href && auth.user.role === 'admin' && <ArrowUpRight aria-hidden="true" className="text-primary size-4 shrink-0" />}
            </div>
            <p className={compact ? 'sr-only' : 'text-muted-foreground mt-3 text-xs leading-relaxed'}>{hint}</p>
        </>
    );
    const className = compact
        ? 'bg-card min-w-0 rounded-xl border p-4'
        : 'workspace-card bg-card min-w-0 rounded-2xl border border-primary/15 p-4 shadow-sm motion-safe:transition-shadow motion-safe:hover:shadow-md sm:p-5';
    return href ? (
        <Link href={href} className={`${className} hover:border-primary/40 focus-visible:outline-ring transition-colors focus-visible:outline-2`}>
            {content}
        </Link>
    ) : (
        <section className={className}>{content}</section>
    );
}

// Independent queues may overlap. Bars use their own scale, never a fabricated total.
export function DashboardQueues({
    title,
    description,
    items,
}: {
    title: string;
    description: string;
    items: { label: string; value: number; href: string }[];
}) {
    const maximum = Math.max(1, ...items.map((item) => item.value));
    return (
        <Card>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{description}</p>
            <ul className="mt-5 space-y-2">
                {items.map((item) => (
                    <li key={item.label}>
                        <Link href={item.href} className="hover:bg-accent/40 block rounded-xl px-2 py-3 transition-colors">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span>{item.label}</span>
                                <span className="font-semibold tabular-nums">{item.value.toLocaleString()}</span>
                            </div>
                            <div aria-hidden="true" className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                                <div className="bg-primary h-full rounded-full" style={{ width: `${(item.value / maximum) * 100}%` }} />
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
