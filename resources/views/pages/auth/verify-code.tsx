import InputError from '@/components/auth/auth-feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AccountAccessLayout from '@/layouts/auth/account-access-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, LoaderCircle, RotateCw } from 'lucide-react';
import { type FormEvent } from 'react';

export default function VerifyCode({ email }: { email: string; status?: string }) {
    const form = useForm({ email, code: '' });
    const resend = useForm({ email });
    const busy = form.processing || resend.processing;
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        form.post(route('password.code.verify'), { onFinish: () => form.reset('code') });
    };

    return (
        <AccountAccessLayout
            recovery
            hideBackLink
            title="Check your email"
            description="Enter the 6-digit code. It expires in 10 minutes and locks after 5 wrong attempts."
        >
            <Head title="Verify password code" />
            <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        disabled={busy}
                        aria-invalid={!!form.errors.email}
                        aria-describedby={form.errors.email ? 'reset-code-email-error' : undefined}
                        value={form.data.email}
                        onChange={(event) => {
                            form.setData('email', event.target.value);
                            resend.setData('email', event.target.value);
                        }}
                    />
                    <InputError id="reset-code-email-error" message={form.errors.email} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="code">Email code</Label>
                    <Input
                        id="code"
                        aria-invalid={!!form.errors.code}
                        aria-describedby={form.errors.code ? 'reset-code-error' : undefined}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        disabled={busy}
                        value={form.data.code}
                        onChange={(event) => form.setData('code', event.target.value)}
                    />
                    <InputError id="reset-code-error" message={form.errors.code} />
                </div>
                <div className="mt-2 grid gap-2">
                    <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl font-semibold shadow-sm">
                        {form.processing && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                        {form.processing ? 'Verifying...' : 'Verify code'}
                        {!form.processing && <ArrowRight className="size-4" aria-hidden="true" />}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        className="text-primary hover:bg-accent h-11 w-full rounded-xl font-medium"
                        onClick={() => resend.post(route('password.email'))}
                    >
                        {resend.processing ? (
                            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        ) : (
                            <RotateCw className="size-4" aria-hidden="true" />
                        )}
                        {resend.processing ? 'Sending...' : 'Send another code'}
                    </Button>
                </div>
                <InputError message={resend.errors.email} />
            </form>
            <div className="mt-3 flex justify-center">
                <Link
                    href={route('login')}
                    className="text-primary focus-visible:ring-ring mx-auto inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                    Back to Login
                </Link>
            </div>
        </AccountAccessLayout>
    );
}
