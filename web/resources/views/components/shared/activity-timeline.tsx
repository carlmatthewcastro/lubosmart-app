import { cn } from '@/lib/utils';
import { Check, ClipboardList, Coins, Package, Search, ShieldCheck, Truck, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const returnEvents: Record<string, [string, LucideIcon]> = {
    requested: ['Refund requested', ClipboardList],
    review_responsibility: ['Responsibility reviewed', Search],
    approve: ['Return approved', Check],
    rejected: ['Refund request declined', ShieldCheck],
    assign: ['Collection rider assigned', Truck],
    collect: ['Collected from buyer', Package],
    facility_receive: ['Received at logistics center', Package],
    assign_seller: ['Return delivery rider assigned', Truck],
    accept_seller_dispatch: ['Seller delivery dispatch accepted', Truck],
    deliver_seller: ['Return delivered to seller', Package],
    receive: ['Seller confirmed receipt', Package],
    discrepancy: ['Return discrepancy reported', Search],
    record_return_fee: ['Return transport cost recorded', Coins],
    refund_offered: ['Refund offer submitted', Coins],
    refund_approved: ['Refund approved and credited', Coins],
};

export function returnEventPresentation(action: string) {
    const [label, icon] = returnEvents[action] ?? [action.replaceAll('_', ' '), ClipboardList];
    return { label, icon };
}

export type ActivityEntry = {
    id: string | number;
    label: string;
    at?: string | null;
    icon?: LucideIcon;
    state?: 'recorded' | 'completed' | 'current' | 'pending';
    content?: ReactNode;
};

export default function ActivityTimeline({ entries, label, className }: { entries: ActivityEntry[]; label: string; className?: string }) {
    if (!entries.length) return <p className="text-muted-foreground text-sm">No activity recorded yet.</p>;
    return (
        <ol aria-label={label} className={cn('min-w-0', className)}>
            {entries.map((entry, index) => {
                const Icon = entry.icon ?? ClipboardList;
                const state = entry.state ?? 'recorded';
                const validDate = entry.at && !Number.isNaN(Date.parse(entry.at));
                return (
                    <li key={entry.id} className="relative flex min-w-0 gap-3 pb-5 last:pb-0" aria-current={state === 'current' ? 'step' : undefined}>
                        {index < entries.length - 1 && <span aria-hidden="true" className="bg-primary/25 absolute top-8 bottom-0 left-4 w-px" />}
                        <span
                            className={cn(
                                'relative flex size-8 shrink-0 items-center justify-center rounded-full',
                                state === 'pending' ? 'bg-muted text-muted-foreground border' : 'bg-primary text-primary-foreground',
                            )}
                        >
                            <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                            <p className="text-sm font-semibold break-words">{entry.label}</p>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                <span
                                    className={cn(
                                        'rounded-md px-1.5 py-0.5 text-xs',
                                        state === 'completed' ? 'bg-success/10 text-success' : 'bg-accent text-accent-foreground',
                                    )}
                                >
                                    {state === 'completed'
                                        ? 'Completed'
                                        : state === 'pending'
                                          ? 'Pending'
                                          : state === 'current'
                                            ? 'In progress'
                                            : 'Recorded'}
                                </span>
                                {validDate ? (
                                    <time dateTime={entry.at!} className="text-muted-foreground text-xs tabular-nums">
                                        {new Date(entry.at!).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </time>
                                ) : (
                                    <span className="text-muted-foreground text-xs">
                                        {state === 'pending' ? 'Awaiting this step' : 'Timestamp not recorded'}
                                    </span>
                                )}
                            </div>
                            {entry.content && (
                                <div className="text-muted-foreground mt-2 space-y-2 text-sm break-words whitespace-pre-wrap">{entry.content}</div>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
