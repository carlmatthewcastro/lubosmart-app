import InputError from '@/components/auth/auth-feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AccountAccessLayout from '@/layouts/auth/account-access-layout';
import { Link, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

export default function VerifyCode({ email, status }: { email: string; status?: string }) {
    const form = useForm({ email, code: '' });
    const resend = useForm({ email });
    const busy = form.processing || resend.processing;
    const [remaining, setRemaining] = useState(30);
    const codeRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const timer = window.setInterval(() => setRemaining((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        form.post(route('password.code.verify'), {
            onError: () => codeRef.current?.focus(),
            onFinish: () => form.reset('code'),
        });
    };

    return (
        <AccountAccessLayout
            recovery
            compactRecovery
            hideBackLink
            title="Verify it�s you"
            description={
                <>
                    Enter the 6-digit code for <strong className="text-foreground break-all">{form.data.email || 'your email address'}</strong>.
                </>
            }
        >
            <InputError message={status} tone="success" />
            <form noValidate onSubmit={submit} className="grid gap-4" aria-busy={busy}>
                {!email && (
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            disabled={busy}
                            value={form.data.email}
                            aria-invalid={!!form.errors.email}
                            aria-describedby={form.errors.email ? 'reset-code-email-error' : undefined}
                            onChange={(event) => {
                                form.setData('email', event.target.value);
                                resend.setData('email', event.target.value);
                            }}
                        />
                    </div>
                )}
                <InputError id="reset-code-email-error" message={form.errors.email} />
                <div className="grid gap-2">
                    <Label htmlFor="code" className="sr-only">
                        6-digit email code
                    </Label>
                    <div className="group relative">
                        <Input
                            ref={codeRef}
                            id="code"
                            name="code"
                            className="auth-code-entry"
                            aria-invalid={!!form.errors.code}
                            aria-describedby={form.errors.code ? 'reset-code-hint reset-code-error' : 'reset-code-hint'}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            required
                            disabled={busy}
                            value={form.data.code}
                            onChange={(event) => {
                                form.setData('code', event.target.value.replace(/\D/g, '').slice(0, 6));
                                form.clearErrors('code');
                            }}
                        />
                        <div aria-hidden="true" className="pointer-events-none grid grid-cols-6 gap-2">
                            {Array.from({ length: 6 }, (_, index) => (
                                <span
                                    key={index}
                                    className={`bg-card border-input flex h-12 min-w-0 items-center justify-center rounded-lg border text-xl font-semibold tabular-nums ${index === Math.min(form.data.code.length, 5) ? 'group-focus-within:border-primary group-focus-within:ring-primary group-focus-within:ring-1' : ''}`}
                                >
                                    {form.data.code[index] || ''}
                                </span>
                            ))}
                        </div>
                    </div>
                    <p className="text-muted-foreground text-xs" id="reset-code-hint">
                        Code expires in 10 minutes and locks after 5 wrong attempts.
                    </p>
                    <InputError id="reset-code-error" message={form.errors.code} />
                </div>
                <Button type="submit" disabled={busy} className="auth-action-button w-full">
                    {form.processing && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                    {form.processing ? 'Verifying�' : 'Verify'}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || remaining > 0}
                    className="text-primary mx-auto min-h-11 max-w-full px-2 text-sm whitespace-normal"
                    onClick={() => {
                        if (!busy && remaining === 0) resend.post(route('password.email'), { onSuccess: () => setRemaining(30) });
                    }}
                >
                    {resend.processing
                        ? 'Sending�'
                        : remaining > 0
                          ? `Didn't get a code? Resend in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
                          : "Didn't get a code? Resend code"}
                </Button>
                <InputError message={resend.errors.email} />
            </form>
            <div className="flex justify-center">
                <Link href={route('login')} className="text-primary inline-flex min-h-11 items-center text-sm font-medium hover:underline">
                    Back to sign in
                </Link>
            </div>
        </AccountAccessLayout>
    );
}
