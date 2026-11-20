import InputError from '@/components/auth/input-error';
import SellerRegistrationFields, { emptySellerDetails, type SellerDetails } from '@/components/auth/seller-registration-fields';
import { buttonClass, inputClass } from '@/components/shared/marketplace-ui';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';

export default function SellerApplication({
    application,
    profile,
    address,
    store,
    documents,
}: {
    application: { business_name: string; seller_type: string; tin: string; region_code: string; rejection_reason: string | null };
    profile: Record<string, string> | null;
    address: { line1: string; zip: string } | null;
    store: { business_category_id: number | null } | null;
    documents: { kind: string }[];
}) {
    const { auth } = usePage<SharedData>().props;
    const form = useForm<SellerDetails & { first_name: string; last_name: string; phone: string; policy_accepted: boolean }>({
        ...emptySellerDetails,
        first_name: profile?.first_name ?? '',
        last_name: profile?.last_name ?? '',
        phone: auth.user.phone ?? '',
        policy_accepted: false,
        business_name: application.business_name,
        seller_type: application.seller_type,
        tin: application.tin,
        region_code: application.region_code,
        business_category_id: String(store?.business_category_id ?? ''),
        province_code: profile?.province_code ?? '',
        city_code: profile?.city_code ?? '',
        barangay_code: profile?.barangay_code ?? '',
        line1: address?.line1 ?? '',
        zip: address?.zip ?? '',
    });
    return (
        <AppLayout>
            <Head title="Update seller application" />
            <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-8">
                <h1 className="text-2xl font-semibold">Update seller application</h1>
                {application.rejection_reason && (
                    <p role="alert" className="rounded-xl border p-4">
                        Changes requested: {application.rejection_reason}
                    </p>
                )}
                <p className="text-muted-foreground text-sm">Correct your details or replace documents, then resubmit for administrator review.</p>
                <form
                    className="space-y-5"
                    aria-busy={form.processing}
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!form.processing) form.post(route('application.store'), { forceFormData: true });
                    }}
                >
                    {(['first_name', 'last_name', 'phone'] as const).map((key) => (
                        <div key={key} className="grid gap-2">
                            <label htmlFor={key}>{key === 'first_name' ? 'First name' : key === 'last_name' ? 'Last name' : 'Mobile number'}</label>
                            <input
                                className={inputClass}
                                id={key}
                                name={key}
                                value={form.data[key]}
                                disabled={form.processing}
                                required
                                aria-invalid={!!form.errors[key]}
                                aria-describedby={`${key}-error`}
                                onChange={(event) => form.setData(key, event.target.value)}
                            />
                            <InputError id={`${key}-error`} message={form.errors[key]} />
                        </div>
                    ))}
                    <SellerRegistrationFields
                        data={form.data}
                        errors={form.errors}
                        disabled={form.processing}
                        existing={documents.map((document) => document.kind)}
                        set={(key, value) => form.setData((previous) => ({ ...previous, [key]: value }))}
                    />
                    <label className="flex items-start gap-3">
                        <input
                            name="policy_accepted"
                            type="checkbox"
                            checked={form.data.policy_accepted}
                            disabled={form.processing}
                            required
                            onChange={(event) => form.setData('policy_accepted', event.target.checked)}
                        />
                        I accept the Terms and Privacy Policy.
                    </label>
                    <InputError message={form.errors.policy_accepted} />
                    <InputError message={(form.errors as Record<string, string>).application} />
                    <button className={buttonClass} disabled={form.processing}>
                        {form.processing ? 'Submitting…' : 'Resubmit for review'}
                    </button>
                </form>
            </div>
        </AppLayout>
    );
}
