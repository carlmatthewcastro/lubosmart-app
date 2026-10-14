// Components
import { Head, Link, useForm } from '@inertiajs/react';
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
        <AccountAccessLayout recovery hideBackLink title="Forgot password" description="Enter your email to receive a 6-digit password reset code.">
            <Head title="Forgot password" />

            {status && (
                <div className="mb-4">
                    <AuthFeedback message={status} tone="success" />
                </div>
            )}

            <div className="space-y-6">
                <form onSubmit={submit} noValidate aria-busy={processing}>
                    <div className="grid gap-2">
                        <AuthInput
                            label="Email address"
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            required
                            error={errors.email}
                            disabled={processing}
                            value={data.email}
                            autoFocus
                            onChange={(e) => {
                                setData('email', e.target.value);
                                clearErrors('email');
                            }}
                            placeholder="email@example.com"
                        />
                    </div>

                    <div className="mt-6 grid gap-3">
                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                            {processing ? 'Sending email code…' : 'Send email code'}
                        </Button>
                        <Link
                            href={route('login')}
                            className="text-primary focus-visible:ring-ring mx-auto inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </AccountAccessLayout>
    );
}
