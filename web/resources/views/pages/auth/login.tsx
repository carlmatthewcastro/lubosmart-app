import AuthFeedback from '@/components/auth/auth-feedback';
import GoogleContinueButton from '@/components/auth/google-continue-button';
import { AuthInput, Password } from '@/components/auth/registration-form';
import { notify } from '@/components/shared/action-feedback';
import { useAuthRequestFeedback } from '@/hooks/use-auth-request-feedback';
import AccountAccessLayout from '@/layouts/auth/account-access-layout';
import type { SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function Login({ canResetPassword = true, status }: { canResetPassword?: boolean; status?: string }) {
    const form = useForm<{ email: string; password: string; remember: boolean }>({ email: '', password: '', remember: false });
    const google = useForm<{ intent: 'login'; google?: string }>({ intent: 'login' });
    const { errors: sharedErrors } = usePage<SharedData>().props;
    const ref = useRef<HTMLFormElement>(null);
    const [notification, setNotification] = useState('');
    const busy = form.processing || google.processing;
    const { requestError: connectionError, setRequestError: setConnectionError } = useAuthRequestFeedback(busy);
    const googleError = google.errors.google ?? sharedErrors?.google;
    useEffect(() => {
        const message = connectionError || googleError;
        if (message) setNotification(message);
    }, [connectionError, googleError]);
    const focus = (field: string) =>
        requestAnimationFrame(() => {
            const input = ref.current?.querySelector<HTMLElement>(`[name="${field}"]`);
            input?.focus();
            input?.scrollIntoView({ block: 'center', behavior: 'auto' });
        });
    return (
        <AccountAccessLayout title="Welcome back" description="Sign in to continue to your account." compactLogin hideBackLink>
            <AuthFeedback message={status} tone="success" />
            <AuthFeedback message={notification} />
            <form
                ref={ref}
                noValidate
                className="space-y-4"
                aria-busy={busy}
                onSubmit={(event) => {
                    event.preventDefault();
                    if (busy) return;
                    setConnectionError('');
                    setNotification('');
                    form.post(route('login'), {
                        onSuccess: () => notify('Welcome back!'),
                        onError: (errors) => {
                            setNotification([...new Set(Object.values(errors))].join(' '));
                            focus(Object.keys(errors)[0]);
                        },
                        onFinish: () => form.reset('password'),
                        onCancel: () => setConnectionError('Sign-in was interrupted. Your email is saved; please try again.'),
                    });
                }}
            >
                <AuthInput
                    label="Email"
                    placeholder="name@example.com"
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    maxLength={160}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={form.data.email}
                    disabled={busy}
                    inlineFeedback={false}
                    error={form.errors.email}
                    onChange={(e) => {
                        form.setData('email', e.target.value);
                        form.clearErrors('email');
                    }}
                />
                <Password
                    label="Password"
                    labelAction={
                        canResetPassword ? (
                            <Link
                                href={route('password.request')}
                                className="text-primary inline-flex min-h-6 items-center text-sm font-medium hover:underline"
                            >
                                Forgot password?
                            </Link>
                        ) : undefined
                    }
                    placeholder="Enter your password"
                    id="login-password"
                    name="password"
                    required
                    autoComplete="current-password"
                    value={form.data.password}
                    disabled={busy}
                    inlineFeedback={false}
                    error={form.errors.password}
                    onChange={(e) => {
                        form.setData('password', e.target.value);
                        form.clearErrors('password');
                    }}
                />
                <div className="auth-login-options flex flex-wrap items-center justify-between gap-x-4 gap-y-0 text-sm">
                    <label className="flex min-h-11 cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            className="accent-primary size-4"
                            checked={form.data.remember}
                            disabled={busy}
                            onChange={(e) => form.setData('remember', e.target.checked)}
                        />
                        Remember me on this device
                    </label>
                </div>
                <button type="submit" className="auth-reference-primary auth-action-button w-full" disabled={busy}>
                    {form.processing ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                    <span>{form.processing ? 'Signing in...' : 'Sign in'}</span>
                </button>
            </form>
            <div className="text-muted-foreground my-4 flex items-center gap-3 text-xs">
                <span className="bg-border h-px flex-1" />
                or continue with
                <span className="bg-border h-px flex-1" />
            </div>
            <div className="auth-reference-google">
                <GoogleContinueButton
                    processing={google.processing}
                    disabled={busy}
                    onClick={() => {
                        if (!busy) google.post(route('auth.google.redirect'));
                    }}
                />
            </div>
        </AccountAccessLayout>
    );
}
