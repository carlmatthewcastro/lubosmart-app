import { Card, money, secondaryClass } from '@/components/shared/marketplace-ui';
import { titleCase } from '@/lib/admin-display';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, ChartNoAxesCombined, PackageCheck, Wallet } from 'lucide-react';
import { useState } from 'react';

export type DashboardAnalyticsData = {
    from: string;
    to: string;
    timezone: string;
    sales: number;
    commission: number;
    completedParcels: number;
    series: { date: string; sales: number; commission: number; parcels: number }[];
    deliveryStatuses: { status: string; total: number }[];
};

const dayLabel = (date: string) => new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

export function DashboardAnalytics({ data }: { data: DashboardAnalyticsData }) {
    const [measure, setMeasure] = useState<'sales' | 'commission'>('sales');
    const maximum = Math.max(1, ...data.series.map((day) => day[measure]));
    const totalDeliveries = data.deliveryStatuses.reduce((sum, item) => sum + item.total, 0);
    const delivered = data.deliveryStatuses.find((item) => item.status === 'delivered')?.total ?? 0;
    const deliveredShare = totalDeliveries ? (delivered / totalDeliveries) * 100 : 0;
    const circumference = 2 * Math.PI * 48;
    const reportUrl = `/reports?from=${data.from}&to=${data.to}`;

    return (
        <section aria-label="Sales and delivery performance" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Business performance</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Last 7 days · {dayLabel(data.from)} – {dayLabel(data.to)} · {data.timezone}
                    </p>
                </div>
                <Link href={reportUrl} className={secondaryClass}>
                    View report <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
                {[
                    { label: 'Product sales', value: money(data.sales), hint: 'Completed parcels · excludes shipping', icon: ChartNoAxesCombined },
                    { label: 'Platform commission', value: money(data.commission), hint: 'Recorded commission on completed parcels', icon: Wallet },
                    { label: 'Completed parcels', value: data.completedParcels.toLocaleString(), hint: 'Based on delivery date', icon: PackageCheck },
                ].map((item) => (
                    <Card key={item.label} className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-muted-foreground text-sm">{item.label}</p>
                            <item.icon aria-hidden="true" className="text-primary size-5 shrink-0" />
                        </div>
                        <p className="mt-4 text-2xl font-semibold break-words tabular-nums">{item.value}</p>
                        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{item.hint}</p>
                    </Card>
                ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <Card className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold">Daily {measure}</h3>
                        <div role="group" aria-label="Chart measure" className="bg-muted flex rounded-xl p-1">
                            {(['sales', 'commission'] as const).map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={measure === value}
                                    onClick={() => setMeasure(value)}
                                    className={`focus-visible:ring-ring min-h-11 rounded-lg px-3 text-sm focus-visible:ring-2 focus-visible:outline-none ${measure === value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
                                >
                                    {titleCase(value)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs">PHP · completed parcels, grouped by delivery date</p>
                    <div className="mt-6" role="img" aria-label={`Daily ${measure} chart. Exact values are available in the data table below.`}>
                        <div className="text-muted-foreground mb-2 flex justify-between text-xs tabular-nums">
                            <span>{money(maximum === 1 && !data[measure] ? 0 : maximum)}</span>
                            <span>Daily total</span>
                        </div>
                        <div className="grid h-44 grid-cols-7 items-end gap-2 border-b pt-4 sm:gap-4">
                            {data.series.map((day) => (
                                <div
                                    key={day.date}
                                    className="flex h-full items-end justify-center"
                                    title={`${dayLabel(day.date)}: ${money(day[measure])}`}
                                >
                                    <div
                                        className="bg-primary w-full max-w-12 rounded-t-lg"
                                        style={{ height: `${(day[measure] / maximum) * 100}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="text-muted-foreground mt-3 grid grid-cols-7 gap-2 text-center text-[10px] sm:gap-4 sm:text-xs">
                            {data.series.map((day) => (
                                <span key={day.date}>{dayLabel(day.date)}</span>
                            ))}
                        </div>
                    </div>
                    {!data[measure] && <p className="text-muted-foreground mt-4 text-sm">No completed {measure} recorded during this period.</p>}
                    <details className="mt-5 border-t pt-4">
                        <summary className="text-primary focus-visible:ring-ring cursor-pointer rounded text-sm font-medium focus-visible:ring-2">
                            View exact figures
                        </summary>
                        <div
                            role="region"
                            aria-label="Daily sales data"
                            tabIndex={0}
                            className="focus-visible:ring-ring mt-3 overflow-x-auto focus-visible:ring-2"
                        >
                            <table className="w-full text-left text-xs">
                                <caption className="sr-only">Daily sales, commission and completed parcels in the selected period</caption>
                                <thead>
                                    <tr>
                                        {['Date', 'Sales (PHP)', 'Commission (PHP)', 'Parcels'].map((heading) => (
                                            <th key={heading} scope="col" className="px-2 py-3 font-medium">
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.series.map((day) => (
                                        <tr key={day.date} className="border-t">
                                            <th scope="row" className="px-2 py-3 font-normal whitespace-nowrap">
                                                {dayLabel(day.date)}
                                            </th>
                                            <td className="px-2 py-3 whitespace-nowrap tabular-nums">{money(day.sales)}</td>
                                            <td className="px-2 py-3 whitespace-nowrap tabular-nums">{money(day.commission)}</td>
                                            <td className="px-2 py-3 tabular-nums">{day.parcels}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </details>
                </Card>
                <Card className="min-w-0">
                    <h3 className="font-semibold">Delivery progress</h3>
                    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">Current status of parcels created in these 7 days.</p>
                    <div className="relative mx-auto my-6 size-40">
                        <svg aria-hidden="true" viewBox="0 0 120 120" className="size-full -rotate-90">
                            <circle cx="60" cy="60" r="48" fill="none" className="stroke-muted" strokeWidth="10" />
                            <circle
                                cx="60"
                                cy="60"
                                r="48"
                                fill="none"
                                className="stroke-primary"
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeDashoffset={circumference * (1 - deliveredShare / 100)}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-semibold tabular-nums">{Math.round(deliveredShare)}%</span>
                            <span className="text-muted-foreground mt-1 text-xs">delivered</span>
                        </div>
                    </div>
                    <p className="text-muted-foreground text-center text-sm">
                        {delivered.toLocaleString()} of {totalDeliveries.toLocaleString()} parcels delivered
                    </p>
                    {totalDeliveries ? (
                        <ul className="mt-5 space-y-3">
                            {data.deliveryStatuses.map((item) => (
                                <li key={item.status}>
                                    <div className="mb-2 flex justify-between gap-3 text-xs">
                                        <span>{titleCase(item.status)}</span>
                                        <span className="font-medium tabular-nums">{item.total.toLocaleString()}</span>
                                    </div>
                                    <div aria-hidden="true" className="bg-muted h-1.5 overflow-hidden rounded-full">
                                        <div
                                            className="bg-primary h-full rounded-full"
                                            style={{ width: `${(item.total / totalDeliveries) * 100}%` }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground mt-5 text-center text-sm">No parcels created during this period.</p>
                    )}
                </Card>
            </div>
        </section>
    );
}
