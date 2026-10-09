import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

const roles = [
    { value: 'buyer', title: 'Buyer', description: 'Browse local products and shop after registration approval.' },
    { value: 'seller', title: 'Seller', description: 'Submit business documents to open your store.' },
    { value: 'courier', title: 'Courier', description: 'Submit your ID, license, and vehicle details for your sorting center to review.' },
    { value: 'sorting_center', title: 'Sorting center', description: 'Submit company documents to manage a sorting center.' },
];

export default function ChooseRole() {
    const form = useForm({ role: '' });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('role.store'));
    };

    return (
        <AuthLayout title="Choose your role" description="Finish setting up your existing account, then complete your application for review.">
            <Head title="Choose your role" />
            <form onSubmit={submit} className="grid gap-4">
                <fieldset className="grid gap-3" disabled={form.processing}>
                    <legend className="sr-only">Account role</legend>
                    {roles.map((role) => (
                        <label
                            key={role.value}
                            className="bg-card has-checked:border-primary flex cursor-pointer items-start gap-3 rounded-xl border p-4"
                        >
                            <input
                                type="radio"
                                name="role"
                                value={role.value}
                                checked={form.data.role === role.value}
                                onChange={() => form.setData('role', role.value)}
                                required
                                className="mt-1"
                            />
                            <span>
                                <span className="block font-semibold">{role.title}</span>
                                <span className="text-muted-foreground text-sm">{role.description}</span>
                            </span>
                        </label>
                    ))}
                </fieldset>
                <InputError message={form.errors.role} />
                <Button disabled={form.processing || !form.data.role}>Continue</Button>
            </form>
        </AuthLayout>
    );
}
