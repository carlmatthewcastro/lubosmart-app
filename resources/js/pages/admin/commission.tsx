import { Card, Field, Page, buttonClass, money, secondaryClass } from '@/components/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, Check, Percent, Wallet } from 'lucide-react';
import { useState } from 'react';
export default function Commission({ settings }: { settings: { platform_commission_basis_points: number } }) {
    const [confirming, setConfirming] = useState(false);
    const current = settings.platform_commission_basis_points / 100;
    const form = useForm({ commission_percent: String(current) });
    const proposed = Number(form.data.commission_percent);
    const valid = /^\d+(\.\d{1,2})?$/.test(form.data.commission_percent) && proposed >= 0 && proposed <= 100;
    const changed = valid && Math.round(proposed * 100) !== settings.platform_commission_basis_points;
    const save = () => {
        form.transform((data) => ({ platform_commission_basis_points: valid ? Math.round(Number(data.commission_percent) * 100) : null }));
        form.patch('/reports/settings', { preserveScroll: true, onSuccess: () => setConfirming(false), onError: () => setConfirming(false) });
    };
    return (
        <Page
            title="Commission"
            description="Set the platform's share of product sales for new orders."
            action={
                <Link href="/reports" className={secondaryClass}>
                    Commission Reports <ArrowRight className="size-4" />
                </Link>
            }
        >
            <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
                <Card className="overflow-hidden !p-0">
                    <div className="bg-accent/40 flex items-center gap-4 border-b p-6">
                        <span className="bg-card text-primary border-primary/10 rounded-2xl border p-3">
                            <Percent className="size-6" />
                        </span>
                        <div>
                            <p className="text-muted-foreground text-xs font-medium">Current Commission</p>
                            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{current}%</p>
                        </div>
                        <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Active</span>
                    </div>
                    <form
                        className="space-y-6 p-6"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (changed) setConfirming(true);
                        }}
                    >
                        <div>
                            <h2 className="font-semibold">Update Commission</h2>
                            <p className="text-muted-foreground mt-1 text-sm">Choose a rate or enter a percentage with up to two decimal places.</p>
                        </div>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Common commission rates">
                            {[5, 10, 15, 20].map((rate) => (
                                <button
                                    key={rate}
                                    type="button"
                                    aria-pressed={proposed === rate && valid}
                                    onClick={() => form.setData('commission_percent', String(rate))}
                                    className={secondaryClass + (proposed === rate && valid ? ' border-primary/40 bg-accent text-primary' : '')}
                                >
                                    {rate}%
                                </button>
                            ))}
                        </div>
                        <Field
                            label="Commission Percentage"
                            required
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={form.data.commission_percent}
                            onChange={(event) => form.setData('commission_percent', event.target.value)}
                            error={(form.errors as Record<string, string>).platform_commission_basis_points}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                            <p className="text-muted-foreground text-xs">Applies to new orders after saving.</p>
                            <button className={buttonClass} disabled={form.processing || !changed}>
                                Review Change <ArrowRight className="size-4" />
                            </button>
                        </div>
                    </form>
                </Card>
                <div className="space-y-5">
                    <Card>
                        <div className="flex items-center gap-3">
                            <span className="bg-accent text-primary rounded-xl p-2.5">
                                <Wallet className="size-5" />
                            </span>
                            <div>
                                <h2 className="font-semibold">Calculation Preview</h2>
                                <p className="text-muted-foreground mt-1 text-xs">Example based on {money(1000)} in product sales</p>
                            </div>
                        </div>
                        <div className="mt-6 space-y-4 text-sm">
                            <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">Product sales</span>
                                <span className="font-medium tabular-nums">{money(1000)}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">Platform commission {valid ? '(' + proposed + '%)' : ''}</span>
                                <span className="font-medium tabular-nums">{valid ? money(proposed * 10) : '--'}</span>
                            </div>
                            <div className="flex justify-between gap-3 border-t pt-4">
                                <span className="font-semibold">Seller proceeds</span>
                                <span className="text-primary text-xl font-semibold tabular-nums">{valid ? money(1000 - proposed * 10) : '--'}</span>
                            </div>
                        </div>
                    </Card>
                    <div className="border-primary/10 bg-accent/30 rounded-2xl border p-5">
                        <h3 className="text-sm font-semibold">How changes apply</h3>
                        <ul className="text-muted-foreground mt-3 space-y-3 text-xs leading-relaxed">
                            {[
                                'Existing orders retain their recorded commission.',
                                'Commission is calculated when delivery is completed.',
                                'Saved changes appear in Activity History.',
                            ].map((text) => (
                                <li key={text} className="flex gap-2">
                                    <Check className="text-primary mt-0.5 size-3.5 shrink-0" />
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            <Dialog
                open={confirming}
                onOpenChange={(value) => {
                    if (!form.processing) setConfirming(value);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Commission Change</DialogTitle>
                        <DialogDescription>New orders will use {form.data.commission_percent}% platform commission.</DialogDescription>
                    </DialogHeader>
                    <div className="bg-accent/40 flex items-center justify-center gap-5 rounded-xl p-5">
                        <span className="text-muted-foreground text-2xl font-semibold">{current}%</span>
                        <ArrowRight className="text-primary size-5" />
                        <span className="text-primary text-2xl font-semibold">{form.data.commission_percent}%</span>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button className={secondaryClass} disabled={form.processing} onClick={() => setConfirming(false)}>
                            Keep Editing
                        </button>
                        <button className={buttonClass} disabled={form.processing || !changed} onClick={save}>
                            {form.processing ? 'Saving...' : 'Save Commission'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </Page>
    );
}
