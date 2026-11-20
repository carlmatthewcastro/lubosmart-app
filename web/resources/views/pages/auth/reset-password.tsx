import InputError from '@/components/auth/auth-feedback';
import { Password } from '@/components/auth/registration-form';
import { Button } from '@/components/ui/button';
import AccountAccessLayout from '@/layouts/auth/account-access-layout';
import { passwordRequirements } from '@/lib/registration-validation';
import { Link, useForm } from '@inertiajs/react';
import { CheckCircle2, Circle, LoaderCircle } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

export default function ResetPassword({ token, email }: { token: string; email: string }) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({ token, email, password: '', password_confirmation: '' });
    const [confirmationBlurred, setConfirmationBlurred] = useState(false);
    const mismatch = confirmationBlurred && data.password_confirmation && data.password !== data.password_confirmation;
    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        if (processing) return;
        post(route('password.store'), {
            onError: (validation) => requestAnimationFrame(() => document.getElementById(Object.keys(validation)[0])?.focus()),
            onFinish: () => {
                reset('password', 'password_confirmation');
                setConfirmationBlurred(false);
            },
        });
    };
    return (
        <AccountAccessLayout recovery compactRecovery hideBackLink title="Set a new password" description="Enter your new password below.">
            <form noValidate onSubmit={submit} className="grid gap-4" aria-busy={processing}>
                <InputError message={(errors as Record<string, string>).code} />
                <InputError message={errors.email} />
                <Password
                    label="New password"
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    required
                    disabled={processing}
                    reserveFeedback={false}
                    value={data.password}
                    error={errors.password}
                    placeholder="Create a new password"
                    onChange={(event) => {
                        setData('password', event.target.value);
                        clearErrors('password');
                    }}
                />
                <ul className="text-muted-foreground grid grid-cols-1 gap-2 text-xs sm:grid-cols-2" aria-label="Password requirements">
                    {passwordRequirements(data.password).map((rule) => {
                        const Icon = rule.met ? CheckCircle2 : Circle;
                        return (
                            <li key={rule.label} className={`flex items-start gap-2 ${rule.met ? 'text-success' : ''}`}>
                                <Icon className="size-4 shrink-0" aria-hidden="true" />
                                <span>
                                    <span className="sr-only">{rule.met ? 'Met: ' : 'Needed: '}</span>
                                    {rule.label}
                                </span>
                            </li>
                        );
                    })}
                </ul>
                <Password
                    label="Confirm new password"
                    id="password_confirmation"
                    name="password_confirmation"
                    autoComplete="new-password"
                    required
                    disabled={processing}
                    reserveFeedback={false}
                    value={data.password_confirmation}
                    error={errors.password_confirmation || (mismatch ? "Passwords don't match." : undefined)}
                    placeholder="Re-enter your new password"
                    onBlur={() => setConfirmationBlurred(true)}
                    onChange={(event) => {
                        setData('password_confirmation', event.target.value);
                        clearErrors('password_confirmation');
                    }}
                />
                <Button type="submit" className="auth-action-button w-full" disabled={processing}>
                    {processing && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                    {processing ? 'Resetting password�' : 'Reset password'}
                </Button>
            </form>
            <div className="mt-2 flex justify-center">
                <Link href={route('login')} className="text-primary inline-flex min-h-11 items-center text-sm font-medium hover:underline">
                    Back to sign in
                </Link>
            </div>
        </AccountAccessLayout>
    );
}
