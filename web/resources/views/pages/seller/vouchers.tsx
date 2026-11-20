import { useConfirmAction } from '@/components/shared/action-feedback';
import { buttonClass, Card, Field, money, Page, Pager, secondaryClass, type Pagination } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DashboardWelcome } from '@/components/workspace/dashboard-panels';
import { Link, useForm } from '@inertiajs/react';
import { ArrowUpRight, Eye, EyeOff, Sparkles, Ticket } from 'lucide-react';
import { useState } from 'react';

type Voucher = {
    id: number;
    code: string;
    amount_cents: number;
    minimum_cents: number;
    usage_limit: number;
    expires_at: string;
    is_active: boolean;
    is_public: boolean;
    used_count: number;
    used_discount: string | null;
};
function VoucherRow({ voucher }: { voucher: Voucher }) {
    const confirm = useConfirmAction();
    const form = useForm({ is_active: !voucher.is_active });
    const expired = new Date(voucher.expires_at) <= new Date();
    const exhausted = voucher.used_count >= voucher.usage_limit;
    const state = expired ? 'Expired' : exhausted ? 'Exhausted' : voucher.is_active ? 'Active' : 'Paused';
    const visibility = useForm({ is_public: !voucher.is_public });
    return (
        <Card className="flex min-w-0 flex-col overflow-hidden !p-0">
            <div className="bg-primary/5 flex items-start justify-between gap-3 border-b border-dashed px-4 py-3">
                <div className="min-w-0">
                    <p className="text-primary text-2xl font-semibold tracking-tight tabular-nums">
                        {money(voucher.amount_cents / 100)} <span className="text-base">off</span>
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">Minimum purchase {money(voucher.minimum_cents / 100)}</p>
                </div>
                <Ticket aria-hidden="true" className="text-primary/60 size-6 shrink-0" />
            </div>
            <div className="flex flex-1 flex-col p-4">
                <h3 className="text-sm font-semibold break-all">{voucher.code}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span
                        className={`${state === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'} rounded-full border px-3 py-1 font-semibold`}
                    >
                        {state}
                    </span>
                    <span className="text-muted-foreground">Expires {new Date(voucher.expires_at).toLocaleString()}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm tabular-nums">
                    <div>
                        <dt className="text-muted-foreground text-xs">Used / remaining</dt>
                        <dd className="mt-1 font-medium">
                            {voucher.used_count} / {Math.max(0, voucher.usage_limit - voucher.used_count)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground text-xs">Actual discount usage</dt>
                        <dd className="mt-1 font-medium">{money(voucher.used_discount ?? '0')}</dd>
                    </div>
                    <div className="col-span-2">
                        <dt className="text-muted-foreground text-xs">Maximum promotional budget</dt>
                        <dd className="mt-1 font-medium">{money((voucher.amount_cents * voucher.usage_limit) / 100)}</dd>
                    </div>
                </dl>
                <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
                    {voucher.is_public ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
                    <p>{voucher.is_public ? 'Visible to buyers' : 'Hidden from buyer voucher lists'}</p>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                    <button
                        type="button"
                        className={secondaryClass}
                        disabled={visibility.processing || form.processing}
                        onClick={() => {
                            visibility.transform(() => ({ is_public: !voucher.is_public }));
                            visibility.patch('/seller/vouchers/' + voucher.id, { preserveScroll: true });
                        }}
                    >
                        {visibility.processing ? 'Updating...' : voucher.is_public ? 'Hide from buyers' : 'Show to buyers'}
                    </button>
                    {!expired && !exhausted && (
                        <button
                            className={secondaryClass}
                            disabled={form.processing || visibility.processing}
                            onClick={async () => {
                                if (
                                    !(await confirm({
                                        title: voucher.is_active ? 'Disable this voucher?' : 'Enable this voucher?',
                                        description: `Voucher ${voucher.code}. This changes whether buyers can apply it at checkout.`,
                                        confirmLabel: 'Update voucher',
                                    }))
                                )
                                    return;
                                form.transform(() => ({ is_active: !voucher.is_active }));
                                form.patch(`/seller/vouchers/${voucher.id}`, { preserveScroll: true });
                            }}
                        >
                            {form.processing ? 'Updating…' : voucher.is_active ? 'Pause voucher' : 'Resume voucher'}
                        </button>
                    )}
                </div>
            </div>
        </Card>
    );
}
type Redemption = { id: number; voucher_code: string; discount_amount: string; status: string; created_at: string };
export default function Vouchers({
    vouchers,
    history,
    storeApproved,
    templates,
}: {
    vouchers: Pagination<Voucher>;
    history: Pagination<Redemption>;
    storeApproved: boolean;
    templates: Record<string, { amount_cents: number; minimum_cents: number; usage_limit: number; days: number }>;
}) {
    const [creating, setCreating] = useState(false);
    const form = useForm({
        template_id: '',
        activation_confirmed: false as boolean,
        is_public: true as boolean,
        code: '',
        amount: '',
        minimum: '0',
        usage_limit: 100,
        expires_at: '',
    });
    const summary = vouchers.data.reduce(
        (total, voucher) => ({
            active: total.active + Number(voucher.is_active && new Date(voucher.expires_at) > new Date() && voucher.used_count < voucher.usage_limit),
            uses: total.uses + voucher.used_count,
            actual: total.actual + Number(voucher.used_discount ?? 0),
            budget: total.budget + (voucher.amount_cents * voucher.usage_limit) / 100,
        }),
        { active: 0, uses: 0, actual: 0, budget: 0 },
    );
    return (
        <Sheet>
            <Page title="Store vouchers" description="Create fixed peso discounts for your store.">
                <DashboardWelcome
                    label="Store promotions"
                    title="Make your next offer count."
                    description="Build your next store offer, set a spending limit, and keep track of every redemption."
                    icon={Ticket}
                    illustration="store"
                />
                <section aria-label="Voucher summary for this page" className="space-y-3">
                    <p className="text-muted-foreground text-xs">Summary of vouchers on this page</p>
                    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            ['Active vouchers', summary.active],
                            ['Redeemed uses', summary.uses],
                            ['Actual discount usage', money(summary.actual)],
                            ['Maximum promotional budget', money(summary.budget)],
                        ].map(([label, value]) => (
                            <div key={label} className="bg-card rounded-xl border p-4">
                                <dt className="text-muted-foreground text-sm">{label}</dt>
                                <dd className="mt-2 text-2xl font-semibold tabular-nums">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
                <Card>
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <Sparkles aria-hidden="true" className="text-primary size-5" /> Start with a template
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Select a suggestion, review the maximum cost, customize the form, and confirm activation.
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {Object.entries(templates).map(([id, t]) => (
                            <button
                                className="group border-primary/20 bg-accent/30 hover:bg-accent focus-visible:ring-ring min-h-24 rounded-xl border p-5 text-left transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={!storeApproved}
                                key={id}
                                onClick={() => {
                                    form.clearErrors();
                                    setCreating(true);
                                    const expiry = new Date(Date.now() + t.days * 86400000);
                                    const local = new Date(expiry.getTime() - expiry.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    form.setData({
                                        ...form.data,
                                        template_id: id,
                                        is_public: true,
                                        code: '',
                                        amount: (t.amount_cents / 100).toFixed(2),
                                        minimum: (t.minimum_cents / 100).toFixed(2),
                                        usage_limit: t.usage_limit,
                                        expires_at: local,
                                    });
                                }}
                            >
                                <span className="text-primary flex items-center justify-between gap-2 text-xl font-semibold tabular-nums">
                                    {money(t.amount_cents / 100)} off <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
                                </span>
                                <span className="text-muted-foreground mt-3 block text-sm leading-relaxed">
                                    Min. {money(t.minimum_cents / 100)} &middot; {t.usage_limit} uses &middot; {t.days} days
                                </span>
                            </button>
                        ))}
                    </div>
                </Card>
                <Dialog open={creating} onOpenChange={setCreating}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{form.data.template_id ? 'Review template voucher' : 'Create a voucher'}</DialogTitle>
                            <DialogDescription>Review your seller-funded discount before activation.</DialogDescription>
                        </DialogHeader>
                        <p className="text-muted-foreground mt-2 text-sm">
                            You fund the discount. It reduces product sales before commission; shipping stays unchanged. One voucher per checkout, one
                            use per buyer. Cancelled purchases release the use. Existing orders retain their agreed amounts.
                        </p>
                        <ValidatedForm
                            confirmation={{
                                title: 'Activate seller-funded voucher?',
                                description:
                                    'Maximum promotional cost: ' +
                                    money((Math.round(Number(form.data.amount || 0) * 100) * form.data.usage_limit) / 100) +
                                    '. This discount reduces your merchandise proceeds; shipping stays unchanged.',
                                confirmLabel: 'Activate voucher',
                            }}
                            className="mt-5 grid gap-4 sm:grid-cols-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (form.processing) return;
                                form.transform((data) => ({
                                    ...data,
                                    activation_confirmed: true,
                                    expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : '',
                                }));
                                form.post('/seller/vouchers', {
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        form.reset();
                                        setCreating(false);
                                    },
                                });
                            }}
                        >
                            <p className="text-muted-foreground text-sm sm:col-span-2">
                                A voucher code is generated automatically. Buyers select public vouchers without typing a code.
                            </p>
                            <Field
                                reserveFeedback={false}
                                label="Discount (PHP)"
                                required
                                type="number"
                                min="0.01"
                                max="999999.99"
                                step="0.01"
                                value={form.data.amount}
                                onChange={(event) => form.setData('amount', event.target.value)}
                                error={form.errors.amount}
                            />
                            <Field
                                reserveFeedback={false}
                                label="Minimum store subtotal (PHP)"
                                required
                                type="number"
                                min="0"
                                max="999999.99"
                                step="0.01"
                                value={form.data.minimum}
                                onChange={(event) => form.setData('minimum', event.target.value)}
                                error={form.errors.minimum}
                            />
                            <Field
                                reserveFeedback={false}
                                label="Total usage limit"
                                required
                                type="number"
                                min={1}
                                max={1000000}
                                step={1}
                                value={form.data.usage_limit}
                                onChange={(event) => form.setData('usage_limit', Number(event.target.value))}
                                error={form.errors.usage_limit}
                            />
                            <Field
                                reserveFeedback={false}
                                label="Expires at (your local time)"
                                required
                                type="datetime-local"
                                value={form.data.expires_at}
                                onChange={(event) => form.setData('expires_at', event.target.value)}
                                error={form.errors.expires_at}
                            />
                            <div className="bg-accent/40 rounded-xl border p-4 sm:col-span-2" aria-live="polite">
                                <p className="text-sm">Maximum promotional budget</p>
                                <p className="text-primary mt-1 text-xl font-semibold tabular-nums">
                                    {money((Math.round(Number(form.data.amount || 0) * 100) * form.data.usage_limit) / 100)}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    Discount &times; total uses. Potential spend, separate from actual discount usage.
                                </p>
                            </div>
                            <label className="flex min-h-11 items-center gap-3 text-sm">
                                <input type="checkbox" checked={form.data.is_public} onChange={(e) => form.setData('is_public', e.target.checked)} />
                                Show voucher publicly to buyers
                            </label>
                            <button className={buttonClass} disabled={!storeApproved || form.processing}>
                                {form.processing ? 'Creating…' : 'Create voucher'}
                            </button>
                        </ValidatedForm>
                    </DialogContent>
                </Dialog>
                {!storeApproved && <p role="status">Store approval is required to create or change vouchers.</p>}
                {!vouchers.data.length && (
                    <p className="text-muted-foreground text-sm">No vouchers yet. Select a template or set a discount to create one.</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold">
                        Your vouchers <span className="text-muted-foreground text-sm font-normal">({vouchers.data.length} on this page)</span>
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            className={buttonClass}
                            disabled={!storeApproved}
                            onClick={() => {
                                form.reset();
                                form.clearErrors();
                                setCreating(true);
                            }}
                        >
                            Create voucher
                        </button>
                        <SheetTrigger asChild>
                            <button type="button" className={secondaryClass}>
                                Usage history
                            </button>
                        </SheetTrigger>
                        <Link className={secondaryClass} href="/inventory">
                            Inventory
                        </Link>
                    </div>
                </div>
                <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {vouchers.data.map((voucher) => (
                        <VoucherRow key={voucher.id} voucher={voucher} />
                    ))}
                </div>
                <Pager links={vouchers.links} />
                <SheetContent side="right" className="w-full motion-reduce:animate-none motion-reduce:transition-none sm:max-w-lg">
                    <SheetHeader className="pr-10 text-left">
                        <SheetTitle>Voucher usage history</SheetTitle>
                        <SheetDescription>
                            Cancelled parcels release the use. Returned parcels retain the original discount snapshot.
                        </SheetDescription>
                    </SheetHeader>
                    {!history.data.length && <p className="mt-4 text-sm">No recorded voucher redemptions.</p>}
                    <ul aria-label="Voucher redemptions" className="mt-4 divide-y">
                        {history.data.map((entry) => (
                            <li key={entry.id} className="grid min-w-0 gap-3 py-4 text-sm sm:grid-cols-2">
                                <div className="min-w-0">
                                    <p className="font-medium">Parcel #{entry.id}</p>
                                    <p className="text-muted-foreground mt-1 break-all">{entry.voucher_code}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Discount</p>
                                    <p className="mt-1 font-medium tabular-nums">{money(entry.discount_amount)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Redemption status</p>
                                    <p className="mt-1">{entry.status === 'cancelled' ? 'Cancelled - use released' : 'Use retained'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Redeemed at</p>
                                    <time dateTime={entry.created_at} className="mt-1 block tabular-nums">
                                        {new Date(entry.created_at).toLocaleString()}
                                    </time>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {history.links.length > 3 && (
                        <nav aria-label="Voucher history pagination" className="mt-4 flex flex-wrap gap-2">
                            {history.links.map((link, index) =>
                                link.url ? (
                                    <Link
                                        key={index}
                                        href={link.url}
                                        preserveScroll
                                        preserveState
                                        className={secondaryClass}
                                        aria-current={link.active ? 'page' : undefined}
                                    >
                                        {link.label.replace(/&laquo;|&raquo;/g, '').trim()}
                                    </Link>
                                ) : (
                                    <span key={index} className={secondaryClass + ' opacity-40'}>
                                        {link.label.replace(/&laquo;|&raquo;/g, '').trim()}
                                    </span>
                                ),
                            )}
                        </nav>
                    )}
                </SheetContent>
            </Page>
        </Sheet>
    );
}
