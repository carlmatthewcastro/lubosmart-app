import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

export default function VerifyCode({ email, status }: { email: string; status?: string }) {
    const form = useForm({ email, code: '' });
    const resend = useForm({ email });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('password.code.verify'), { onFinish: () => form.reset('code') });
    };

    return (
        <AuthLayout title="Check your email" description="Enter the 6-digit code. It expires in 10 minutes and locks after 5 wrong attempts.">
            <Head title="Verify password code" />
            {status && (
                <p role="status" className="text-primary mb-4 text-sm">
                    {status}
                </p>
            )}
            <form onSubmit={submit} className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        value={form.data.email}
                        onChange={(event) => {
                            form.setData('email', event.target.value);
                            resend.setData('email', event.target.value);
                        }}
                    />
                    <InputError message={form.errors.email} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="code">Email code</Label>
                    <Input
                        id="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        value={form.data.code}
                        onChange={(event) => form.setData('code', event.target.value)}
                    />
                    <InputError message={form.errors.code} />
                </div>
                <Button disabled={form.processing}>Verify code</Button>
                <Button type="button" variant="outline" disabled={resend.processing} onClick={() => resend.post(route('password.email'))}>
                    Send another code
                </Button>
                <InputError message={resend.errors.email} />
            </form>
            <p className="text-muted-foreground mt-5 text-sm">
                If your account uses Google only, sign in with Google.{' '}
                <Link href={route('login')} className="underline">
                    Return to sign in
                </Link>
            </p>
        </AuthLayout>
    );
}
