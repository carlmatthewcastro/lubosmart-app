import AuthFeedback from '@/components/auth/auth-feedback';
import { buttonClass, inputClass, secondaryClass } from '@/components/shared/marketplace-ui';
import { useAuthRequestFeedback } from '@/hooks/use-auth-request-feedback';
import OnboardingLayout from '@/layouts/onboarding-layout';
import { useForm, usePoll } from '@inertiajs/react';
import { LoaderCircle, Mail } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function VerifyEmail({ status, email, cooldown }: { status?: string; email: string; cooldown: number }) {
    usePoll(5000, { only: ['email', 'cooldown'] });
    const resend = useForm({});
    const verification = useForm({ code: '' });
    const change = useForm({ email, current_password: '' });
    const [editing, setEditing] = useState(false);
    const [remaining, setRemaining] = useState(cooldown);
    const codeRef = useRef<HTMLInputElement>(null);
    const busy = verification.processing || resend.processing || change.processing;
    const { requestError, setRequestError } = useAuthRequestFeedback(busy);
    useEffect(() => {
        codeRef.current?.focus();
    }, []);
    useEffect(() => setRemaining(cooldown), [cooldown]);
    useEffect(() => {
        const timer = window.setInterval(() => setRemaining((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => window.clearInterval(timer);
    }, []);

    return (
        <OnboardingLayout title="Verify email" step={2}>
            <div className="space-y-6">
                <span className="bg-accent text-primary flex size-12 items-center justify-center rounded-xl">
                    <Mail className="size-6" aria-hidden="true" />
                </span>
                <div>
                    <h1 className="text-2xl font-semibold">Verify your email</h1>
                    <p className="text-muted-foreground mt-3 text-sm">
                        Enter the six-digit code sent to <strong className="text-foreground break-all">{email}</strong>. The code expires in five
                        minutes. You can also use the verification link in the email.
                    </p>
                </div>
                <AuthFeedback message={requestError} />
                <form
                    className="space-y-4"
                    noValidate
                    aria-busy={verification.processing}
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (busy) return;
                        setRequestError('');
                        if (!/^[0-9]{6}$/.test(verification.data.code)) {
                            verification.setError('code', 'Enter the six-digit code from your email.');
                            codeRef.current?.focus();
                            return;
                        }
                        verification.post(route('verification.code'), {
                            onError: () => codeRef.current?.focus(),
                            onFinish: () => verification.reset('code'),
                        });
                    }}
                >
                    <label htmlFor="verification-code" className="grid gap-2 text-sm">
                        Verification code
                        <input
                            id="verification-code"
                            ref={codeRef}
                            name="code"
                            className={`${inputClass} text-center text-2xl tracking-widest tabular-nums`}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]{6}"
                            minLength={6}
                            maxLength={6}
                            required
                            disabled={busy}
                            value={verification.data.code}
                            onChange={(event) => {
                                verification.setData('code', event.target.value);
                                verification.clearErrors('code');
                            }}
                            onPaste={(event) => {
                                event.preventDefault();
                                const code = event.clipboardData.getData('text').trim();
                                if (/^[0-9]{6}$/.test(code)) {
                                    verification.setData('code', code);
                                    verification.clearErrors('code');
                                } else verification.setError('code', 'Paste exactly six digits from your verification email.');
                            }}
                            aria-invalid={!!verification.errors.code}
                            aria-describedby={verification.errors.code ? 'verification-code-error' : undefined}
                        />
                    </label>
                    <AuthFeedback id="verification-code-error" message={verification.errors.code} />
                    <button type="submit" className={`${buttonClass} w-full`} disabled={busy}>
                        {verification.processing && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                        {verification.processing ? 'Verifying…' : 'Verify email'}
                    </button>
                </form>
                {status === 'verification-link-sent' && (
                    <p role="status" className="text-primary text-sm">
                        Your account details are saved. Check your inbox for the six-digit verification code. Buyer, Seller and Logistics applications
                        need administrator approval after verification.
                    </p>
                )}
                {status === 'verification-mail-unavailable' && (
                    <AuthFeedback message="Your account is saved, but we could not send the verification email. Try resending shortly or contact support." />
                )}
                <p className="text-muted-foreground text-sm">
                    Check your Spam or Promotions folder. This page checks automatically and continues once your email is verified, even on another
                    tab or device.
                </p>
                <button
                    className={buttonClass}
                    disabled={busy || remaining > 0}
                    onClick={() => {
                        if (busy || remaining > 0) return;
                        setRequestError('');
                        resend.post(route('verification.send'), {
                            preserveScroll: true,
                            onSuccess: () => {
                                verification.reset('code');
                                verification.clearErrors('code');
                                codeRef.current?.focus();
                            },
                        });
                    }}
                >
                    {resend.processing ? 'Sending…' : remaining > 0 ? `Resend in ${remaining}s` : 'Resend verification email'}
                </button>
                <AuthFeedback message={(resend.errors as Record<string, string>).email} />
                <div className="border-t pt-5">
                    <button type="button" className="text-primary text-sm underline" onClick={() => setEditing(!editing)}>
                        Wrong email? Change it
                    </button>
                    {editing && (
                        <form
                            className="mt-4 space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                change.patch(route('verification.email.update'), {
                                    onSuccess: () => {
                                        setEditing(false);
                                        change.reset('current_password');
                                    },
                                });
                            }}
                        >
                            <label className="grid gap-2 text-sm">
                                Correct email
                                <input
                                    id="corrected-email"
                                    className={inputClass}
                                    aria-invalid={!!change.errors.email}
                                    aria-describedby={change.errors.email ? 'corrected-email-error' : undefined}
                                    type="email"
                                    required
                                    maxLength={160}
                                    autoComplete="email"
                                    value={change.data.email}
                                    onChange={(event) => change.setData('email', event.target.value)}
                                />
                            </label>
                            <AuthFeedback id="corrected-email-error" message={change.errors.email} />
                            <label className="grid gap-2 text-sm">
                                Confirm your password
                                <input
                                    id="email-change-password"
                                    className={inputClass}
                                    aria-invalid={!!change.errors.current_password || !!(change.errors as Record<string, string>).code}
                                    aria-describedby={
                                        change.errors.current_password || (change.errors as Record<string, string>).code
                                            ? 'email-change-password-error'
                                            : undefined
                                    }
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    value={change.data.current_password}
                                    onChange={(event) => change.setData('current_password', event.target.value)}
                                />
                            </label>
                            <AuthFeedback
                                id="email-change-password-error"
                                message={change.errors.current_password ?? (change.errors as Record<string, string>).code}
                            />
                            <button className={secondaryClass} disabled={change.processing}>
                                Save email and send a new link
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </OnboardingLayout>
    );
}
