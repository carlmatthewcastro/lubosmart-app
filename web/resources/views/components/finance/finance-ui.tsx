import { Card, money, secondaryClass } from '@/components/shared/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Check, Copy, Info } from 'lucide-react';
import { Children, useEffect, useState, type ReactNode } from 'react';

export function FinanceNavigation({ section = 'overview' }: { section?: string }) {
    const page = usePage<SharedData>();
    const { auth, adminWorkspace } = page.props;
    const role = auth.user.role;
    const permissions = adminWorkspace?.permissions ?? [];
    const financeAllowed = role !== 'admin' || permissions.includes('finance');
    const query = new URLSearchParams(page.url.split('?')[1] ?? '');
    query.delete('page');
    query.delete('tab');
    const overviewQuery = page.url.split('?')[0] === '/finance' ? query.toString() : '';
    const overviewUrl = '/finance' + (overviewQuery ? '?' + overviewQuery : '');
    const links = [
        ...(financeAllowed
            ? [
                  ['overview', 'Overview', overviewUrl],
                  ['transactions', 'Transactions', '/finance?tab=transactions' + (overviewQuery ? '&' + overviewQuery : '')],
              ]
            : []),
        ...(['admin', 'logistics'].includes(role) && financeAllowed ? [['shipping', 'Shipping & Remittances', '/logistics-settlements']] : []),
        ...(['logistics', 'rider'].includes(role) ? [['riders', 'Rider Payments', '/rider-payments']] : []),
        ...(['admin', 'seller'].includes(role) && financeAllowed ? [['settlements', 'Seller settlements', '/settlements']] : []),
        ...(role === 'admin' && financeAllowed
            ? [
                  ['commission', 'Commission', '/admin/commission'],
                  ['refunds', 'Refund funding', '/refund-funding'],
              ]
            : []),
        ...(role === 'seller' ? [['costs', 'Costs & profit', '/seller/costs']] : []),
        ...(role === 'admin' && permissions.includes('disputes') ? [['returns', 'Refunds & adjustments', '/returns']] : []),
        ...(role !== 'logistics' && (role !== 'admin' || permissions.includes('reports')) ? [['reports', 'Reports', '/reports']] : []),
    ];
    return (
        <nav aria-label="Finance Center" className="flex min-w-0 flex-wrap gap-2 border-b pb-4">
            {links.map(([id, label, href]) => (
                <Link
                    key={id}
                    href={href}
                    aria-current={section === id ? 'page' : undefined}
                    className={cn(
                        secondaryClass,
                        'min-w-0 text-center whitespace-normal',
                        section === id && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                    )}
                >
                    {label}
                </Link>
            ))}
        </nav>
    );
}

export function FinanceSummary({ items }: { items: { label: string; cents: number; hint?: string }[] }) {
    return (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map(({ label, cents, hint }) => (
                <Card key={label} className="!p-4">
                    <p className="text-muted-foreground text-sm">{label}</p>
                    <p className="mt-2 text-2xl font-semibold break-words tabular-nums">{money(cents / 100)}</p>
                    {hint && <p className="text-muted-foreground mt-2 text-xs">{hint}</p>}
                </Card>
            ))}
        </div>
    );
}

export function FinanceStatus({ children }: { children: ReactNode }) {
    return <span className="bg-accent text-accent-foreground inline-flex rounded-lg px-2 py-1 text-xs font-medium">{children}</span>;
}

export function FinanceExplanation({ title, children }: { title: string; children: ReactNode }) {
    return (
        <details className="bg-card min-w-0 rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-semibold">
                <Info aria-hidden="true" className="text-primary mr-2 inline size-4" />
                {title}
            </summary>
            <div className="text-muted-foreground mt-3 space-y-3 text-sm leading-relaxed">{children}</div>
        </details>
    );
}

export function FinanceTable({ label, headers, children }: { label: string; headers: string[]; children: ReactNode }) {
    return (
        <div
            role="region"
            aria-label={label}
            tabIndex={0}
            className="bg-card focus-visible:ring-ring min-w-0 overflow-x-auto rounded-2xl border focus-visible:ring-2 focus-visible:outline-none"
        >
            <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">{label}</caption>
                <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                        {headers.map((header) => (
                            <th
                                key={header}
                                scope="col"
                                className={cn(
                                    'px-4 py-3 font-medium',
                                    /cash|collected|received|amount|total|paid|balance|fee/i.test(header) && !/status/i.test(header) && 'text-right',
                                )}
                            >
                                {header}
                            </th>
                        ))}
                        <th scope="col" className="px-4 py-3">
                            Details
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {Children.toArray(children).length ? (
                        children
                    ) : (
                        <tr>
                            <td colSpan={headers.length + 1} className="text-muted-foreground px-4 py-4">
                                No records in this section.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export function FinanceRecord({ title, cells, children }: { title: string; cells: ReactNode[]; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        let recording = false;
        const stopStart = router.on('start', (event) => {
            recording = event.detail.visit.method !== 'get';
        });
        const stopSuccess = router.on('success', () => {
            if (recording) setOpen(false);
        });
        return () => {
            stopStart();
            stopSuccess();
        };
    }, []);
    return (
        <tr className="hover:bg-muted/30">
            {cells.map((cell, index) =>
                index === 0 ? (
                    <th scope="row" key={index} className="max-w-64 px-4 py-2 align-middle font-medium break-words">
                        {cell}
                    </th>
                ) : (
                    <td
                        key={index}
                        className={cn(
                            'max-w-64 px-4 py-2 align-middle break-words tabular-nums',
                            typeof cell === 'string' && /^-?\u20b1/.test(cell) && 'text-right whitespace-nowrap',
                        )}
                    >
                        {cell}
                    </td>
                ),
            )}
            <td className="bg-card sticky right-0 px-4 py-2">
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <button
                            type="button"
                            className={cn(secondaryClass, 'min-h-8 px-3 py-1.5 text-xs whitespace-nowrap')}
                            aria-label={`View details: ${title}`}
                        >
                            View details
                        </button>
                    </DialogTrigger>
                    <DialogContent className="bg-card space-y-5 motion-reduce:animate-none motion-reduce:transition-none sm:max-w-3xl">
                        <DialogHeader className="min-w-0 border-b pb-4 text-left">
                            <DialogTitle className="break-all">{title}</DialogTitle>
                            <DialogDescription>
                                Recorded financial details and available actions. Missing evidence remains unconfirmed.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="min-w-0 space-y-4 break-words">{children}</div>
                    </DialogContent>
                </Dialog>
            </td>
        </tr>
    );
}

export function FinanceReference({ value }: { value: string | null | undefined }) {
    const [feedback, setFeedback] = useState('');
    if (!value) return <span className="text-muted-foreground">Not recorded</span>;
    return (
        <span className="inline-flex max-w-full items-center gap-1">
            <span title={value} className="max-w-48 truncate text-xs">
                {value}
            </span>
            <button
                type="button"
                className="hover:bg-accent focus-visible:ring-ring inline-flex size-8 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2"
                aria-label={`Copy reference ${value}`}
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(value);
                        setFeedback('Reference copied');
                    } catch {
                        setFeedback('Copy unavailable. Full reference: ' + value);
                    }
                }}
            >
                {feedback === 'Reference copied' ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
            </button>
            <span role="status" className="text-muted-foreground min-w-0 text-xs break-all">
                {feedback}
            </span>
        </span>
    );
}
