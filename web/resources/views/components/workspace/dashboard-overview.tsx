import { Card, money, secondaryClass } from '@/components/shared/marketplace-ui';
import { Link } from '@inertiajs/react';
import { ArrowRight, Wallet } from 'lucide-react';
import { useId } from 'react';

export function DashboardOverview({
    title,
    description,
    items,
    currency = false,
    line = false,
    compact = false,
}: {
    title: string;
    description: string;
    items: { label: string; value: number }[];
    currency?: boolean;
    line?: boolean;
    compact?: boolean;
}) {
    const id = useId();
    const maximum = Math.max(1, ...items.map((item) => item.value));
    const points = items.map((item, index) => ({
        ...item,
        x: 32 + (index / Math.max(1, items.length - 1)) * 536,
        y: 190 - (item.value / maximum) * 160,
    }));
    const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
    return (
        <Card className="border-primary/15 min-w-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{description}</p>
            <svg
                viewBox="0 0 600 220"
                className={compact ? 'text-primary mt-5 h-48 w-full sm:h-56' : 'text-primary mt-5 h-auto w-full'}
                role="img"
                aria-label={`${title}. Exact values listed below.`}
            >
                <defs>
                    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity=".22" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity=".02" />
                    </linearGradient>
                </defs>
                {[30, 70, 110, 150, 190].map((y) => (
                    <line key={y} x1="12" x2="588" y1={y} y2={y} className="stroke-border" strokeDasharray="4 5" />
                ))}
                {line ? (
                    <>
                        {!!points.length && <path d={`${path} L${points[points.length - 1].x},190 L32,190 Z`} fill={`url(#${id})`} />}
                        <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" />
                        {points.map((point) => (
                            <circle key={point.label} cx={point.x} cy={point.y} r="4" className="fill-card" stroke="currentColor" strokeWidth="2" />
                        ))}
                    </>
                ) : (
                    items.map((item, index) => {
                        const width = 560 / Math.max(1, items.length);
                        const height = (item.value / maximum) * 160;
                        return (
                            <g key={item.label}>
                                <rect
                                    x={20 + index * width + width * 0.18}
                                    y={190 - height}
                                    width={width * 0.64}
                                    height={height}
                                    rx="8"
                                    fill="currentColor"
                                    opacity={0.55 + (index / Math.max(1, items.length)) * 0.4}
                                />
                                <text x={20 + index * width + width / 2} y={180 - height} textAnchor="middle" fill="currentColor" fontSize="14">
                                    {item.value.toLocaleString()}
                                </text>
                            </g>
                        );
                    })
                )}
            </svg>
            <dl className="mt-2 grid grid-cols-2 gap-3 sm:flex sm:justify-between">
                {items.map((item) => (
                    <div key={item.label} className="min-w-0 text-center">
                        <dt className="text-muted-foreground text-xs break-words">
                            {line ? new Date(item.label + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : item.label}
                        </dt>
                        <dd className="mt-1 text-xs font-semibold break-words tabular-nums">
                            {currency ? money(item.value) : item.value.toLocaleString()}
                        </dd>
                    </div>
                ))}
            </dl>
            {!items.some((item) => item.value) && <p className="text-muted-foreground mt-4 text-sm">No recorded activity for this overview yet.</p>}
        </Card>
    );
}

export function DashboardFinance({
    title,
    description,
    rows,
    href,
    action,
}: {
    title: string;
    description: string;
    rows: { label: string; value: string }[];
    href: string;
    action: string;
}) {
    return (
        <Card className="border-primary/15 min-w-0">
            <div className="flex items-center gap-3">
                <Wallet aria-hidden className="text-primary size-5 shrink-0" />
                <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{description}</p>
            <dl className="mt-4 space-y-3">
                {rows.map((row) => (
                    <div key={row.label} className="bg-accent/50 flex flex-wrap items-center justify-between gap-2 rounded-xl p-4">
                        <dt className="text-sm">{row.label}</dt>
                        <dd className="text-primary text-xl font-semibold break-words tabular-nums">{row.value}</dd>
                    </div>
                ))}
            </dl>
            <Link href={href} className={`${secondaryClass} mt-4 w-full`}>
                {action}
                <ArrowRight aria-hidden className="size-4" />
            </Link>
        </Card>
    );
}
