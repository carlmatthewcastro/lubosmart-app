import InputError from '@/components/auth/input-error';
import { Page, buttonClass, inputClass } from '@/components/shared/marketplace-ui';
import AppLayout from '@/layouts/app-layout';
import { useForm } from '@inertiajs/react';
export default function CreateRider() {
    const form = useForm({
        first_name: '',
        last_name: '',
        birthday: '',
        email: '',
        phone: '',
        license_number: '',
        license_expires_at: '',
        vehicle_type: '',
        plate_number: '',
        license: null as File | null,
        vehicle_registration: null as File | null,
    });
    const fields: [keyof typeof form.data, string, string][] = [
        ['first_name', 'First name', 'text'],
        ['last_name', 'Last name', 'text'],
        ['birthday', 'Date of birth', 'date'],
        ['email', 'Email', 'email'],
        ['phone', 'Mobile number', 'tel'],
        ['license_number', 'Driver’s license number (N01-23-456789)', 'text'],
        ['license_expires_at', 'License expiry', 'date'],
        ['plate_number', 'Plate number', 'text'],
    ];
    return (
        <AppLayout>
            <Page title="Add rider" description="The rider will receive a 24-hour activation link to set a password.">
                <form
                    noValidate
                    className="max-w-2xl space-y-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!form.processing) form.post(route('logistics.riders.store'), { forceFormData: true });
                    }}
                >
                    {fields.map(([key, label, type]) => (
                        <div key={key} className="grid gap-2">
                            <label htmlFor={key}>{label}</label>
                            <input
                                id={key}
                                name={key}
                                type={type}
                                className={inputClass}
                                required
                                disabled={form.processing}
                                value={String(form.data[key] ?? '')}
                                aria-invalid={!!form.errors[key]}
                                aria-describedby={`${key}-error`}
                                onChange={(event) => form.setData((old) => ({ ...old, [key]: event.target.value }))}
                            />
                            <InputError id={`${key}-error`} message={form.errors[key]} />
                        </div>
                    ))}
                    <div className="grid gap-2">
                        <label htmlFor="vehicle_type">Vehicle type</label>
                        <select
                            id="vehicle_type"
                            name="vehicle_type"
                            className={inputClass}
                            required
                            disabled={form.processing}
                            value={form.data.vehicle_type}
                            onChange={(event) => form.setData('vehicle_type', event.target.value)}
                        >
                            <option value="">Choose vehicle</option>
                            {['motorcycle', 'car', 'van'].map((type) => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.vehicle_type} />
                    </div>
                    {(['license', 'vehicle_registration'] as const).map((key) => (
                        <div key={key} className="grid gap-2">
                            <label htmlFor={key}>{key === 'license' ? 'Driver’s license' : 'Vehicle OR/CR'}</label>
                            <input
                                id={key}
                                name={key}
                                className={inputClass}
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                required
                                disabled={form.processing}
                                onChange={(event) => form.setData(key, event.target.files?.[0] ?? null)}
                            />
                            <p className="text-muted-foreground text-xs">JPG, PNG or PDF, up to 5 MB. {form.data[key]?.name}</p>
                            <InputError message={form.errors[key]} />
                        </div>
                    ))}
                    <button className={buttonClass} disabled={form.processing}>
                        {form.processing ? 'Saving…' : 'Save rider'}
                    </button>
                </form>
            </Page>
        </AppLayout>
    );
}
