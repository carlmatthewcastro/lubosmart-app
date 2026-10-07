import { buttonClass, Card, Field, secondaryClass } from '@/components/marketplace-ui';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

const fields = {
    label: 'Address label',
    recipient_name: 'Recipient name',
    phone: 'Phone number',
    line1: 'Street, house & building',
    line2: 'Apartment / floor (optional)',
    barangay: 'Barangay',
    city: 'City / municipality',
    province: 'Province',
    region: 'Region',
    zip: 'Postal code',
};
type Details = Record<keyof typeof fields, string> & { is_default: boolean };
type Address = Omit<Details, 'line2'> & { id: number; line2: string | null };

export default function Addresses({ addresses, registrationAddressId }: { addresses: Address[]; registrationAddressId: number | null }) {
    const { auth, status, errors } = usePage<SharedData>().props;
    const initial: Details = {
        label: 'Home',
        recipient_name: auth.user.name,
        phone: auth.user.phone ?? '',
        line1: '',
        line2: '',
        barangay: '',
        city: '',
        province: '',
        region: '',
        zip: '',
        is_default: addresses.length === 0,
    };
    const form = useForm(initial);
    const [editing, setEditing] = useState<number | 'new' | null>(addresses.length ? null : 'new');
    const [deleting, setDeleting] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const start = (address?: Address) => {
        form.setData(address ? { ...address, line2: address.line2 ?? '' } : initial);
        form.clearErrors();
        setEditing(address?.id ?? 'new');
        setDeleting(null);
        requestAnimationFrame(() => document.getElementById('address-label')?.focus());
    };
    return (
        <AppLayout breadcrumbs={[{ title: 'Address settings', href: '/settings/addresses' }]}>
            <Head title="My addresses" />
            <SettingsLayout>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">My addresses</h2>
                        <p className="text-muted-foreground mt-1 text-sm">Save delivery details and choose your default address.</p>
                    </div>
                    <button type="button" className={buttonClass} disabled={form.processing || busy} onClick={() => start()}>
                        <Plus className="size-4" />
                        Add address
                    </button>
                </div>
                {status && (
                    <p role="status" className="bg-accent text-accent-foreground rounded-xl p-4 text-sm">
                        {status}
                    </p>
                )}
                {errors?.address && (
                    <p role="alert" className="text-destructive text-sm">
                        {errors.address}
                    </p>
                )}
                {editing !== null && (
                    <Card>
                        <h3 className="mb-5 font-semibold">{editing === 'new' ? 'New address' : 'Edit address'}</h3>
                        <form
                            className="grid gap-4 sm:grid-cols-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                const options = {
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        setEditing(null);
                                        form.reset();
                                    },
                                };
                                if (editing === 'new') form.post('/settings/addresses', options);
                                else form.put(`/settings/addresses/${editing}`, options);
                            }}
                        >
                            {(Object.keys(fields) as (keyof typeof fields)[]).map((key) => (
                                <Field
                                    key={key}
                                    id={`address-${key}`}
                                    label={fields[key]}
                                    required={key !== 'line2'}
                                    disabled={form.processing}
                                    maxLength={
                                        key === 'label'
                                            ? 40
                                            : key === 'phone'
                                              ? 30
                                              : key === 'zip'
                                                ? 10
                                                : key === 'recipient_name'
                                                  ? 160
                                                  : key.startsWith('line')
                                                    ? 200
                                                    : 100
                                    }
                                    type={key === 'phone' ? 'tel' : 'text'}
                                    value={form.data[key]}
                                    onChange={(event) => form.setData(key, event.target.value)}
                                    error={form.errors[key]}
                                />
                            ))}
                            <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
                                <input
                                    type="checkbox"
                                    className="accent-primary size-4"
                                    checked={form.data.is_default}
                                    disabled={form.processing || (editing !== 'new' && addresses.find((item) => item.id === editing)?.is_default)}
                                    onChange={(event) => form.setData('is_default', event.target.checked)}
                                />
                                Use as my default address
                            </label>
                            <div className="flex flex-wrap gap-3 sm:col-span-2">
                                <button className={buttonClass} disabled={form.processing}>
                                    {form.processing ? 'Saving…' : 'Save address'}
                                </button>
                                <button type="button" className={secondaryClass} disabled={form.processing} onClick={() => setEditing(null)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </Card>
                )}
                <div className="space-y-4">
                    {addresses.map((address) => (
                        <Card key={address.id}>
                            <div className="flex gap-3">
                                <MapPin className="text-primary mt-1 size-5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold">{address.label}</h3>
                                        {address.is_default && (
                                            <span className="bg-accent text-primary rounded-full px-2.5 py-1 text-xs font-medium">Default</span>
                                        )}
                                    </div>
                                    <p className="mt-3 text-sm">
                                        {address.recipient_name} · {address.phone}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-sm break-words">
                                        {[address.line1, address.line2, address.barangay, address.city, address.province, address.region, address.zip]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                    {address.id === registrationAddressId && (
                                        <p className="text-muted-foreground mt-3 text-xs">
                                            This address belongs to your registration application. Add another address for deliveries.
                                        </p>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {!address.is_default && (
                                            <button
                                                type="button"
                                                className={secondaryClass}
                                                disabled={busy || form.processing}
                                                onClick={() =>
                                                    router.patch(
                                                        `/settings/addresses/${address.id}/default`,
                                                        {},
                                                        { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) },
                                                    )
                                                }
                                            >
                                                Set as default
                                            </button>
                                        )}
                                        {address.id !== registrationAddressId && (
                                            <>
                                                <button
                                                    type="button"
                                                    className={secondaryClass}
                                                    disabled={busy || form.processing}
                                                    onClick={() => start(address)}
                                                >
                                                    <Pencil className="size-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`${secondaryClass} text-destructive`}
                                                    disabled={busy || form.processing}
                                                    onClick={() => setDeleting(address.id)}
                                                >
                                                    <Trash2 className="size-4" />
                                                    Remove
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {deleting === address.id && (
                                        <div className="bg-muted mt-4 space-y-3 rounded-xl p-4">
                                            <p className="text-sm">Remove this address? Existing orders keep their original delivery details.</p>
                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    className={buttonClass}
                                                    disabled={busy}
                                                    onClick={() =>
                                                        router.delete(`/settings/addresses/${address.id}`, {
                                                            preserveScroll: true,
                                                            onStart: () => setBusy(true),
                                                            onFinish: () => setBusy(false),
                                                            onSuccess: () => {
                                                                setDeleting(null);
                                                                if (editing === address.id) setEditing(null);
                                                            },
                                                        })
                                                    }
                                                >
                                                    Confirm removal
                                                </button>
                                                <button type="button" className={secondaryClass} disabled={busy} onClick={() => setDeleting(null)}>
                                                    Keep address
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                    {!addresses.length && editing === null && (
                        <Card>
                            <p className="text-muted-foreground text-sm">No saved addresses yet. Add one to make checkout easier.</p>
                        </Card>
                    )}
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
