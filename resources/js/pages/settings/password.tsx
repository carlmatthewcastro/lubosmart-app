import EmailCodeConfirmation from '@/components/email-code-confirmation';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Card } from '@/components/marketplace-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { type FormEvent, useState } from 'react';

export default function Password({ googleOnly, confirmed, status }: { googleOnly: boolean; confirmed: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;
    const admin = auth.user.role === 'admin';
    const form = useForm({ current_password: '', password: '', password_confirmation: '' });
    const [confirmingChange, setConfirmingChange] = useState(false);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('password.confirm-change'), {
            preserveScroll: true,
            onSuccess: () => setConfirmingChange(true),
        });
    };
    const save = () => {
        form.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setConfirmingChange(false);
            },
        });
    };
    const cancel = () => {
        form.reset();
        form.clearErrors();
        setConfirmingChange(false);
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Password Settings', href: '/settings/password' }]}>
            <Head title="Password Settings" />
            <SettingsLayout>
                <Card className="grid gap-6">
                    <HeadingSmall
                        title="Change Password"
                        description={
                            admin
                                ? 'Confirm your current password, then choose a new one. An email code verifies the change.'
                                : 'Choose a new password. An email code verifies the change.'
                        }
                    />
                    {status && (
                        <p role="status" className="text-primary text-sm">
                            {status}
                        </p>
                    )}
                    {googleOnly ? (
                        <p className="text-muted-foreground">This account uses Google only. Sign in with Google.</p>
                    ) : confirmingChange ? (
                        <div className="grid gap-5">
                            <EmailCodeConfirmation purpose="password" confirmed={confirmed} codeSent />
                            <InputError message={(form.errors as Record<string, string>).code} />
                            <InputError message={form.errors.password} />
                            <p className="text-muted-foreground text-sm">Saving your new password will sign out your other devices.</p>
                            <div className="flex flex-wrap gap-3">
                                <Button type="button" disabled={form.processing || !confirmed} onClick={save}>
                                    {form.processing ? 'Saving…' : 'Save New Password'}
                                </Button>
                                <Button type="button" variant="outline" disabled={form.processing} onClick={cancel}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="grid gap-5">
                            {admin && (
                                <div className="grid gap-2">
                                    <Label htmlFor="current_password">Current Password</Label>
                                    <Input
                                        id="current_password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        disabled={form.processing}
                                        value={form.data.current_password}
                                        onChange={(event) => form.setData('current_password', event.target.value)}
                                    />
                                    <InputError message={form.errors.current_password} />
                                </div>
                            )}
                            <InputError message={(form.errors as Record<string, string>).code} />
                            <div className="grid gap-2">
                                <Label htmlFor="password">New Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                    disabled={form.processing}
                                    aria-invalid={!!form.errors.password}
                                    value={form.data.password}
                                    onChange={(event) => form.setData('password', event.target.value)}
                                />
                                <InputError message={form.errors.password} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    disabled={form.processing}
                                    aria-invalid={!!form.errors.password_confirmation}
                                    value={form.data.password_confirmation}
                                    onChange={(event) => form.setData('password_confirmation', event.target.value)}
                                />
                                <InputError message={form.errors.password_confirmation} />
                            </div>
                            <Button disabled={form.processing}>{form.processing ? 'Sending code...' : 'Change Password'}</Button>
                        </form>
                    )}
                </Card>
            </SettingsLayout>
        </AppLayout>
    );
}
