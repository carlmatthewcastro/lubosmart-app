import { FinanceReference } from '@/components/finance/finance-ui';
import { Card, money, Page, Pager, secondaryClass, type Pagination } from '@/components/shared/marketplace-ui';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Coins,
    History,
    PackageCheck,
    RotateCcw,
    ShieldCheck,
    ShoppingBag,
    Store,
    Tag,
    WalletCards,
} from 'lucide-react';

function CoinArtwork({ className = '' }: { className?: string }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 200 140" className={className} fill="none">
            <g className="fill-coin-gold stroke-coin-gold" strokeWidth="3">
                <path d="M88 45v60c0 22 86 22 86 0V45" />
                <ellipse cx="131" cy="45" rx="43" ry="16" />
                <path d="M88 65c0 22 86 22 86 0M88 85c0 22 86 22 86 0M88 105c0 22 86 22 86 0" className="stroke-primary-foreground/60" />
                <ellipse cx="131" cy="45" rx="33" ry="10" className="stroke-primary-foreground/60" />
                <circle cx="65" cy="93" r="40" />
                <circle cx="65" cy="93" r="32" className="stroke-primary-foreground/70" />
            </g>
            <path d="M53 85h24l5 24H48l5-24Zm7-5-4-8 9 3 8-3-3 8" className="fill-primary/60" />
            <path d="m23 30 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm160 65 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" className="fill-primary-foreground/90" />
        </svg>
    );
}

const transactionLabels: Record<string, string> = {
    approved_refund_credit: 'Refund credited',
    checkout_redemption: 'Used at checkout',
    cancellation_restoration: 'Cancelled order credit',
    return_restoration: 'Returned order credit',
    corrective_credit: 'Wallet correction · credit',
    corrective_debit: 'Wallet correction · debit',
};
const coins = (cents: number) => (cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Wallet({
    balance_cents,
    entries,
}: {
    balance_cents: number;
    entries: Pagination<{ id: number; type: string; amount_cents: number; balance_after_cents: number; reference: string; created_at: string }>;
}) {
    return (
        <Page title="Lubos Coins" description="Your refund credits and spending activity in one place.">
            <div className="from-primary/10 to-background flex min-w-0 items-center gap-4 overflow-hidden rounded-2xl bg-linear-to-r p-5 sm:p-6">
                <span className="bg-primary/10 text-primary flex size-16 shrink-0 items-center justify-center rounded-2xl">
                    <Coins aria-hidden="true" className="size-9" />
                </span>
                <div className="min-w-0">
                    <p className="text-xl font-semibold sm:text-2xl">Your Lubos Coins wallet</p>
                    <p className="text-muted-foreground mt-1 text-sm">Keep your refund credits ready for your next purchase.</p>
                </div>
                <CoinArtwork className="ml-auto hidden h-24 w-36 shrink-0 sm:block" />
            </div>
            <div className="grid min-w-0 gap-6 lg:grid-cols-5">
                <section
                    aria-labelledby="wallet-balance"
                    className="bg-primary text-primary-foreground relative isolate min-w-0 overflow-hidden rounded-3xl p-6 shadow-sm sm:p-8 lg:col-span-3"
                >
                    <div
                        aria-hidden="true"
                        className="border-primary-foreground/10 pointer-events-none absolute -top-24 -right-24 -z-10 size-80 rounded-full border-[40px]"
                    />
                    <CoinArtwork className="pointer-events-none absolute top-6 right-6 -z-10 h-36 w-44 opacity-20 sm:opacity-100" />
                    <h2 id="wallet-balance" className="text-base font-semibold">
                        My coin balance
                    </h2>
                    <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="min-w-0 text-4xl font-semibold tracking-tight break-all tabular-nums sm:text-5xl">
                            {coins(balance_cents)}
                        </span>
                        <span className="text-xl font-medium">Coins</span>
                    </p>
                    <p className="mt-3 text-sm">{money(balance_cents / 100)} spending value</p>
                    <div className="border-primary-foreground/20 mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                        <p className="bg-primary-foreground/10 rounded-full px-4 py-2 text-sm">1 Coin = {money(1)}</p>
                        <div className="flex flex-wrap gap-3">
                            <a
                                href="#wallet-history"
                                className={cn(
                                    buttonVariants({ variant: 'outline' }),
                                    'border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground',
                                )}
                            >
                                <History aria-hidden="true" className="size-4" />
                                View history
                            </a>
                            <Link href="/shop" className={buttonVariants({ variant: 'secondary' })}>
                                <ShoppingBag aria-hidden="true" className="size-4" /> Shop with Coins
                            </Link>
                        </div>
                    </div>
                </section>
                <Card className="flex flex-col justify-between gap-6 shadow-sm lg:col-span-2">
                    <div className="flex items-start gap-4">
                        <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl">
                            <RotateCcw aria-hidden="true" className="size-7" />
                        </span>
                        <div>
                            <h2 className="text-lg font-semibold">Refunds & returns</h2>
                            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                                Approved refund credits appear here after you accept Lubos Coins and the refund is funded and issued.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <Link href="/returns" className={secondaryClass}>
                            View returns & refunds
                        </Link>
                        <PackageCheck aria-hidden="true" className="text-primary/30 ml-auto size-20" strokeWidth={1} />
                    </div>
                </Card>
            </div>
            <div className="bg-primary/5 grid gap-6 rounded-2xl p-5 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { icon: Coins, title: 'From refunds', text: 'Receive coins for approved and issued refunds.' },
                    { icon: Tag, title: 'Use as payment', text: 'Apply coins to merchandise at checkout.' },
                    { icon: History, title: 'No expiry', text: 'Keep your credits for your next purchase.' },
                    { icon: ShieldCheck, title: 'Safe & secure', text: 'Coins cannot be withdrawn or transferred.' },
                ].map(({ icon: Icon, title, text }) => (
                    <div key={title} className="flex min-w-0 items-start gap-4">
                        <Icon aria-hidden="true" className="text-primary size-9 shrink-0" strokeWidth={1.7} />
                        <div>
                            <h2 className="text-sm font-semibold">{title}</h2>
                            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{text}</p>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-muted-foreground -mt-3 text-xs leading-relaxed">Shipping and any remaining amount are paid by cash on delivery.</p>
            <section aria-labelledby="wallet-history" className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 id="wallet-history" className="flex items-center gap-2 text-lg font-semibold">
                        <History aria-hidden="true" className="text-primary size-5" /> Transaction history
                    </h2>
                    <p className="text-muted-foreground text-sm">Latest activity first</p>
                </div>
                {entries.data.length === 0 ? (
                    <Card className="flex flex-col items-center gap-4 py-10 text-center sm:py-12">
                        <span className="relative flex h-24 w-32 items-end justify-center">
                            <CoinArtwork className="absolute -top-4 right-0 h-24 w-32" />
                            <WalletCards aria-hidden="true" className="text-primary fill-accent relative size-20" strokeWidth={1.2} />
                        </span>
                        <div>
                            <h3 className="text-lg font-semibold">No transactions yet</h3>
                            <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
                                No wallet transactions yet. Refund credits and purchases using coins will appear here, with a record of every balance
                                change.
                            </p>
                        </div>
                        <Link href="/shop" className={secondaryClass}>
                            <Store aria-hidden="true" className="size-4" /> Explore the marketplace
                        </Link>
                    </Card>
                ) : (
                    <ul className="bg-card divide-y overflow-hidden rounded-2xl border">
                        {entries.data.map((entry) => {
                            const credited = entry.amount_cents > 0;
                            const Icon = credited ? ArrowDownLeft : ArrowUpRight;
                            return (
                                <li key={entry.id} className="flex min-w-0 items-start gap-3 p-4 sm:gap-4 sm:p-6">
                                    <span
                                        className={cn(
                                            'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                            credited ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        <Icon aria-hidden="true" className="size-5" />
                                    </span>
                                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:gap-6">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold">
                                                {transactionLabels[entry.type] ?? entry.type.replaceAll('_', ' ')}
                                            </h3>
                                            <time dateTime={entry.created_at} className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                                                {new Date(entry.created_at).toLocaleString('en-PH')}
                                            </time>
                                            <div className="text-muted-foreground mt-2 text-xs">
                                                Reference: <FinanceReference value={entry.reference} />
                                            </div>
                                        </div>
                                        <div className="min-w-0 shrink-0 sm:text-right">
                                            <p className={cn('text-base font-semibold break-all tabular-nums', credited && 'text-success')}>
                                                {credited ? '+' : ''}
                                                {coins(entry.amount_cents)} coins
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                                                Balance after: {money(entry.balance_after_cents / 100)}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <Pager links={entries.links} />
            </section>
        </Page>
    );
}
