import AuthFeedback from '@/components/auth-feedback';
import { buttonClass, inputClass, secondaryClass } from '@/components/marketplace-ui';
import OnboardingLayout from '@/layouts/onboarding-layout';
import { useForm, usePoll } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function VerifyEmail({ status, email, cooldown }: { status?: string; email: string; cooldown: number }) {
    usePoll(5000, { only: ['email', 'cooldown'] });
    const resend = useForm({});
    const change = useForm({ email, current_password: '' });
    const [editing, setEditing] = useState(false);
    const [remaining, setRemaining] = useState(cooldown);
    useEffect(() => setRemaining(cooldown), [cooldown]);
    useEffect(() => {
        const timer = window.setInterval(() => setRemaining((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => window.clearInterval(timer);
    }, []);

    return (
        <OnboardingLayout title="Verify email" step={2}>
            <div className="space-y-6">
                <span className="bg-accent text-primary flex size-12 items-center justify-center rounded-xl">
                    <Mail className="size-6" />
                </span>
                <div>
                    <h1 className="text-2xl font-semibold">Verify your email</h1>
                    <p className="text-muted-foreground mt-3 text-sm">
                        Open the verification link sent to <strong className="text-foreground break-all">{email}</strong>. The link expires in 24
                        hours.
                    </p>
                </div>
                {status === 'verification-link-sent' && (
                    <p role="status" className="text-primary text-sm">
                        Verification email sent. Please check your inbox.
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
                    disabled={resend.processing || remaining > 0}
                    onClick={() => resend.post(route('verification.send'), { preserveScroll: true })}
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
                                    className={inputClass}
                                    type="email"
                                    required
                                    maxLength={160}
                                    autoComplete="email"
                                    value={change.data.email}
                                    onChange={(event) => change.setData('email', event.target.value)}
                                />
                            </label>
                            <AuthFeedback message={change.errors.email} />
                            <label className="grid gap-2 text-sm">
                                Confirm your password
                                <input
                                    className={inputClass}
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    value={change.data.current_password}
                                    onChange={(event) => change.setData('current_password', event.target.value)}
                                />
                            </label>
                            <AuthFeedback message={change.errors.current_password ?? (change.errors as Record<string, string>).code} />
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
