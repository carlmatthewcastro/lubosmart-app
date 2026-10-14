import { Card } from '@/components/shared/marketplace-ui';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function DashboardWelcome({
    label,
    title,
    description,
    icon: Icon,
    children,
}: {
    label: string;
    title: string;
    description: string;
    icon: LucideIcon;
    children?: ReactNode;
}) {
    return (
        <section className="border-primary/15 from-accent via-card to-accent/40 relative isolate overflow-hidden rounded-2xl border bg-gradient-to-br p-6 sm:p-8">
            <div
                aria-hidden="true"
                className="border-primary/5 pointer-events-none absolute -right-12 -bottom-24 size-72 rounded-full border-[40px]"
            />
            <div className="relative flex items-start justify-between gap-5">
                <div className="max-w-xl min-w-0">
                    <p className="text-primary text-xs font-semibold tracking-widest uppercase">{label}</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight break-words sm:text-3xl">{title}</h2>
                    <p className="text-muted-foreground mt-3 text-sm leading-relaxed break-words">{description}</p>
                    {children && <div className="mt-5 flex flex-wrap items-center gap-3">{children}</div>}
                </div>
                <span
                    aria-hidden="true"
                    className="border-primary/10 bg-card/80 text-primary hidden size-20 shrink-0 rotate-6 items-center justify-center rounded-3xl border shadow-sm sm:flex"
                >
                    <Icon className="size-9" />
                </span>
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
}: {
    label: string;
    value: number;
    hint: string;
    icon: LucideIcon;
    href?: string;
}) {
    const content = (
        <>
            <div className="flex items-center justify-between gap-3">
                <span aria-hidden="true" className="bg-accent text-primary flex size-11 items-center justify-center rounded-xl">
                    <Icon className="size-5" />
                </span>
                {href && <ArrowUpRight aria-hidden="true" className="text-muted-foreground size-4" />}
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</p>
            <h2 className="mt-1 text-sm font-medium">{label}</h2>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{hint}</p>
        </>
    );
    const className = 'bg-card min-w-0 rounded-2xl border p-5 shadow-sm shadow-black/[.02]';
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
