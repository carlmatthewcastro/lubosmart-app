import AuthFeedback from '@/components/auth/auth-feedback';
import GoogleContinueButton from '@/components/auth/google-continue-button';
import { AuthInput, Password } from '@/components/auth/registration-form';
import { buttonClass } from '@/components/shared/marketplace-ui';
import { useAuthRequestFeedback } from '@/hooks/use-auth-request-feedback';
import AccountAccessLayout from '@/layouts/auth/account-access-layout';
import type { SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useRef } from 'react';

export default function Login({ canResetPassword = true, status }: { canResetPassword?: boolean; status?: string }) {
    const form = useForm<{ email: string; password: string; remember: boolean }>({ email: '', password: '', remember: false });
    const google = useForm<{ intent: 'login'; google?: string }>({ intent: 'login' });
    const { errors: sharedErrors } = usePage<SharedData>().props;
    const ref = useRef<HTMLFormElement>(null);
    const busy = form.processing || google.processing;
    const { requestError: connectionError, setRequestError: setConnectionError } = useAuthRequestFeedback(busy);
    const focus = (field: string) =>
        requestAnimationFrame(() => {
            const input = ref.current?.querySelector<HTMLElement>(`[name="${field}"]`);
            input?.focus();
            input?.scrollIntoView({ block: 'center', behavior: 'auto' });
        });
    return (
        <AccountAccessLayout title="Welcome back" description="Sign in to your LubosMart account to continue.">
            {status && (
                <p role="status" className="border-success/30 bg-success/5 text-success mb-6 rounded-xl border p-4 text-sm">
                    {status}
                </p>
            )}
            <form
                ref={ref}
                noValidate
                className="space-y-4"
                aria-busy={busy}
                onSubmit={(event) => {
                    event.preventDefault();
                    if (busy) return;
                    setConnectionError('');
                    form.post(route('login'), {
                        onError: (errors) => focus(Object.keys(errors)[0]),
                        onFinish: () => form.reset('password'),
                        onCancel: () => setConnectionError('Sign-in was interrupted. Your email is saved; please try again.'),
                    });
                }}
            >
                <AuthFeedback message={connectionError} />
                <AuthInput
                    label="Email address"
                    reserveFeedback={false}
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
                    error={form.errors.email}
                    onBlur={(event) => {
                        if (!form.data.email.trim()) form.setError('email', 'Enter your email address.');
                        else if (event.currentTarget.validity.typeMismatch) form.setError('email', 'Enter a valid email address.');
                    }}
                    onChange={(e) => {
                        form.setData('email', e.target.value);
                        form.clearErrors('email');
                    }}
                />
                <Password
                    label="Password"
                    reserveFeedback={false}
                    id="login-password"
                    name="password"
                    required
                    autoComplete="current-password"
                    value={form.data.password}
                    disabled={busy}
                    error={form.errors.password}
                    onBlur={() => {
                        if (!form.data.password) form.setError('password', 'Enter your password.');
                    }}
                    onChange={(e) => {
                        form.setData('password', e.target.value);
                        form.clearErrors('password');
                    }}
                />
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                    <label className="flex min-h-11 cursor-pointer items-center gap-3">
                        <input
                            type="checkbox"
                            className="accent-primary size-4"
                            checked={form.data.remember}
                            disabled={busy}
                            onChange={(e) => form.setData('remember', e.target.checked)}
                        />
                        Remember me
                    </label>
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-primary flex min-h-11 items-center font-medium underline underline-offset-4"
                        >
                            Forgot password?
                        </Link>
                    )}
                </div>
                <button type="submit" className={buttonClass + ' auth-action-button w-full'} disabled={busy}>
                    {form.processing && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                    {form.processing ? 'Signing in...' : 'Sign In'}
                </button>
            </form>
            <div className="text-muted-foreground my-4 flex items-center gap-3 text-xs">
                <span className="bg-border h-px flex-1" />
                or continue with
                <span className="bg-border h-px flex-1" />
            </div>
            <GoogleContinueButton
                processing={google.processing}
                disabled={busy}
                onClick={() => {
                    if (!busy) google.post(route('auth.google.redirect'));
                }}
            />
            <div className="mt-4">
                <AuthFeedback message={google.errors.google ?? sharedErrors?.google} />
            </div>
        </AccountAccessLayout>
    );
}
