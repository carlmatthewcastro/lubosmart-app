import AccountRoleOptions from '@/components/auth/account-role-options';
import InputError from '@/components/auth/input-error';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth/account-access-layout';
import { Head, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

export default function ChooseRole() {
    const form = useForm({ role: '' });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('role.store'));
    };

    return (
        <AuthLayout title="Choose your role" description="Finish setting up your existing account, then complete your application for review.">
            <Head title="Choose your role" />
            <form noValidate onSubmit={submit} className="grid gap-4">
                <AccountRoleOptions value={form.data.role} disabled={form.processing} onChange={(role) => form.setData('role', role)} />
                <InputError message={form.errors.role} />
                <Button type="submit" disabled={form.processing || !form.data.role}>
                    Continue
                </Button>
            </form>
        </AuthLayout>
    );
}
