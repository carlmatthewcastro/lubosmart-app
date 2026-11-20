// Components
import { Link, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, type FormEventHandler } from 'react';

import AuthFeedback from '@/components/auth/auth-feedback';
import { AuthInput } from '@/components/auth/registration-form';
import { Button } from '@/components/ui/button';
import AccountAccessLayout from '@/layouts/auth/account-access-layout';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        email: '',
    });
    useEffect(() => {
        if (errors.email && !processing) document.getElementById('email')?.focus();
    }, [errors.email, processing]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (processing) return;
        post(route('password.email'));
    };

    return (
        <AccountAccessLayout
            recovery
            compactRecovery
            hideBackLink
            title="Forgot your password?"
            description="Enter the email you signed up with and we'll send you a code to reset it."
        >
            <AuthFeedback message={status} tone="success" />

            <div className="space-y-6">
                <form onSubmit={submit} noValidate aria-busy={processing}>
                    <div className="grid gap-2">
                        <AuthInput
                            label="Email"
                            reserveFeedback={false}
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            required
                            error={errors.email}
                            disabled={processing}
                            value={data.email}
                            autoCapitalize="none"
                            spellCheck={false}
                            onChange={(e) => {
                                setData('email', e.target.value);
                                clearErrors('email');
                            }}
                            placeholder="name@example.com"
                        />
                    </div>

                    <div className="mt-6 grid gap-3">
                        <Button type="submit" className="auth-action-button" disabled={processing}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                            {processing ? 'Sending reset code…' : 'Send reset code'}
                        </Button>
                    </div>
                </form>
            </div>
            <p className="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-x-1 text-sm">
                Remembered it?
                <Link href={route('login')} className="text-primary inline-flex min-h-11 items-center font-semibold hover:underline">
                    Back to sign in
                </Link>
            </p>
        </AccountAccessLayout>
    );
}
