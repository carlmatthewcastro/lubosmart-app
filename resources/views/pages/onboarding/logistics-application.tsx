import InputError from '@/components/auth/input-error';
import SellerRegistrationFields, { emptyCompanyDetails, emptySellerDetails } from '@/components/auth/seller-registration-fields';
import { buttonClass, inputClass } from '@/components/shared/marketplace-ui';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
export default function LogisticsApplication({
    application,
    profile,
    address,
    documents,
}: {
    application: {
        business_name: string;
        tin: string;
        sec_number: string;
        position: string;
        service_regions: string[];
        region_code: string;
        rejection_reason: string | null;
    };
    profile: Record<string, string> | null;
    address: { line1: string; zip: string } | null;
    documents: { kind: string }[];
}) {
    const { auth } = usePage<SharedData>().props;
    const form = useForm({
        ...emptySellerDetails,
        ...emptyCompanyDetails,
        ...application,
        first_name: profile?.first_name ?? '',
        last_name: profile?.last_name ?? '',
        phone: auth.user.phone ?? '',
        province_code: profile?.province_code ?? '',
        city_code: profile?.city_code ?? '',
        barangay_code: profile?.barangay_code ?? '',
        line1: address?.line1 ?? '',
        zip: address?.zip ?? '',
        policy_accepted: false as boolean,
    });
    return (
        <AppLayout>
            <Head title="Company application" />
            <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
                <h1 className="text-2xl font-semibold">Company application</h1>
                {application.rejection_reason && <p role="alert">Changes requested: {application.rejection_reason}</p>}
                <form
                    noValidate
                    className="space-y-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!form.processing) form.post(route('application.store'), { forceFormData: true });
                    }}
                >
                    {(['first_name', 'last_name', 'phone'] as const).map((key) => (
                        <div key={key} className="grid gap-2">
                            <label htmlFor={key}>{key.replaceAll('_', ' ')}</label>
                            <input
                                id={key}
                                name={key}
                                className={inputClass}
                                required
                                disabled={form.processing}
                                value={form.data[key]}
                                onChange={(event) => form.setData(key, event.target.value)}
                            />
                            <InputError message={form.errors[key]} />
                        </div>
                    ))}
                    <SellerRegistrationFields
                        company
                        data={form.data}
                        errors={form.errors}
                        existing={documents.map((doc) => doc.kind)}
                        disabled={form.processing}
                        set={(key, value) => form.setData((old) => ({ ...old, [key]: value }))}
                    />
                    <label className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            name="policy_accepted"
                            required
                            disabled={form.processing}
                            checked={form.data.policy_accepted}
                            onChange={(event) => form.setData('policy_accepted', event.target.checked)}
                        />
                        I accept the Terms and Privacy Policy.
                    </label>
                    <InputError message={form.errors.policy_accepted} />
                    <InputError message={(form.errors as Record<string, string>).application} />
                    <button className={buttonClass} disabled={form.processing}>
                        {form.processing ? 'Submitting…' : application.rejection_reason ? 'Resubmit for review' : 'Submit for review'}
                    </button>
                </form>
            </div>
        </AppLayout>
    );
}
