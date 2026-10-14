import InputError from '@/components/auth/input-error';
import { Password } from '@/components/auth/registration-form';
import { buttonClass } from '@/components/shared/marketplace-ui';
import AuthLayout from '@/layouts/auth-layout';
import { Head, Link, useForm } from '@inertiajs/react';
export default function ActivateRider({ token, valid, requiresLogout = false }: { token: string; valid: boolean; requiresLogout?: boolean }) {
    const form = useForm({ password: '', password_confirmation: '' });
    return (
        <AuthLayout title="Activate rider account" description="Set your own password to join your logistics company.">
            <Head title="Activate rider account" />
            {valid ? (
                <form
                    className="space-y-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!form.processing) form.post(route('rider.activation.store', token), { onFinish: () => form.reset() });
                    }}
                >
                    {requiresLogout && (
                        <p role="status">
                            Company preview only. The rider must open this invitation in a signed-out browser to set their own password.
                        </p>
                    )}
                    <Password
                        id="activation-password"
                        name="password"
                        label="Password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        disabled={form.processing || requiresLogout}
                        value={form.data.password}
                        error={form.errors.password}
                        hint="At least 8 characters with uppercase, lowercase, a number and a symbol."
                        onChange={(event) => form.setData('password', event.target.value)}
                    />
                    <Password
                        id="activation-confirmation"
                        name="password_confirmation"
                        label="Confirm password"
                        autoComplete="new-password"
                        required
                        disabled={form.processing || requiresLogout}
                        value={form.data.password_confirmation}
                        onChange={(event) => form.setData('password_confirmation', event.target.value)}
                    />
                    <InputError message={(form.errors as Record<string, string>).activation} />
                    <button className={buttonClass} disabled={form.processing || requiresLogout}>
                        {form.processing ? 'Activating…' : 'Activate account'}
                    </button>
                </form>
            ) : (
                <div role="alert" className="space-y-4">
                    <p>This activation link is invalid, expired or already used. Contact your logistics company for a new invitation.</p>
                    <Link href={route('login')} className="underline">
                        Go to login
                    </Link>
                </div>
            )}
        </AuthLayout>
    );
}
