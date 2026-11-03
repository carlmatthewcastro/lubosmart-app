import EmailCodeConfirmation from '@/components/auth/email-code-confirmation';
import DeleteUser from '@/components/settings/delete-user';
import PersonalDetails from '@/components/settings/personal-details';
import { SettingsSections, roleSettingsItems } from '@/components/settings/settings-sections';
import { Badge, Card, Field, Page, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Button } from '@/components/ui/button';
import type { SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const riderCategories = [
    { id: 'personal-information', title: 'Personal details' },
    { id: 'rider-details', title: 'Rider details' },
    { id: 'registered-address', title: 'Registered address' },
    { id: 'submitted-documents', title: 'Submitted documents' },
    { id: 'contact-details', title: 'Contact and security' },
];
const riderDocumentLabels: Record<string, string> = {
    identity: 'Government-issued ID',
    license: 'Driver’s license',
    vehicle_registration: 'Vehicle registration (OR/CR)',
};
const sellerCategories = riderCategories.map((item) =>
    item.id === 'rider-details' ? { id: 'business-details', title: 'Store and bank details' } : item,
);

export default function OperationalProfile({
    personalDetails,
    registeredAddress,
    companyName = null,
    vehicleType = null,
    plateNumber = null,
    businessName = null,
    sellerType = null,
    requiredDocuments = [],
    bankAccount,
    sensitiveConfirmed,
    googleOnly,
    documents,
}: {
    personalDetails: Record<string, string | null>;
    registeredAddress: Record<string, string | null>;
    companyName?: string | null;
    vehicleType?: string | null;
    plateNumber?: string | null;
    businessName?: string | null;
    sellerType?: string | null;
    requiredDocuments?: string[];
    bankAccount: string | null;
    sensitiveConfirmed: boolean;
    googleOnly: boolean;
    documents: { id: number; kind: string }[];
}) {
    const { auth } = usePage<SharedData>().props;
    const seller = auth.user.role === 'seller';
    const categories = seller ? sellerCategories : riderCategories;
    const sellerDocumentLabels: Record<string, string> = {
        identity: 'Government-issued ID',
        business_permit: 'Business permit',
        dti_certificate: 'DTI certificate',
        sec_certificate: 'SEC certificate',
        bir_2303: 'BIR Form 2303',
    };
    const documentLabels = seller
        ? Object.fromEntries(
              [...new Set([...requiredDocuments, ...documents.map((document) => document.kind)])].map((kind) => [
                  kind,
                  sellerDocumentLabels[kind] ?? kind.replaceAll('_', ' '),
              ]),
          )
        : riderDocumentLabels;
    const [category, setCategory] = useState('personal-information');
    useEffect(() => {
        const update = () => {
            const hash = window.location.hash.slice(1);
            setCategory(categories.some((item) => item.id === hash) ? hash : 'personal-information');
        };
        update();
        window.addEventListener('hashchange', update);
        return () => window.removeEventListener('hashchange', update);
    }, [categories]);
    const form = useForm({
        name: auth.user.name,
        email: auth.user.email,
        phone: auth.user.phone ?? '',
        bank_account: bankAccount ?? '',
        ...(seller && businessName ? { business_name: businessName } : {}),
        ...(plateNumber ? { plate_number: plateNumber } : {}),
        current_password: '',
        identity: null as File | null,
        _method: 'patch',
    });
    const editing = ['rider-details', 'business-details', 'submitted-documents', 'contact-details'].includes(category);
    const details = (values: Record<string, string | null>) => (
        <dl className="grid gap-4 sm:grid-cols-2">
            {Object.entries(values).map(([label, value]) => (
                <div key={label} className="min-w-0">
                    <dt className="text-muted-foreground text-sm">{label}</dt>
                    <dd className="mt-1 text-sm break-words">{value || 'Not provided'}</dd>
                </div>
            ))}
        </dl>
    );
    return (
        <Page
            title={seller ? 'Seller settings' : 'Rider settings'}
            description={
                seller
                    ? 'Your registration, store and bank details, contact information, and account security.'
                    : 'Your registration details, delivery contact information, and account security.'
            }
        >
            <SettingsSections items={roleSettingsItems(auth.user.role)}>
                <div id={category} tabIndex={-1} className="min-w-0 flex-1 scroll-mt-28 space-y-6">
                    <Card>
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold">{categories.find((item) => item.id === category)?.title}</h2>
                            <Badge status={auth.user.status} />
                        </div>
                        {category === 'personal-information' && (
                            <div className="space-y-4">
                                <p className="text-muted-foreground text-sm">
                                    Your submitted personal information. Contact {seller ? 'support' : 'your logistics company'} if your registration
                                    needs correction.
                                </p>
                                <PersonalDetails
                                    firstName={personalDetails['First name']}
                                    middleInitial={personalDetails['Middle initial (optional)']}
                                    lastName={personalDetails['Last name']}
                                    sex={personalDetails.Sex}
                                    dateOfBirth={personalDetails['Date of birth']}
                                    age={personalDetails.Age}
                                />
                            </div>
                        )}
                        {category === 'registered-address' && (
                            <div className="space-y-4">
                                {details(registeredAddress)}
                                <Link href="/settings/addresses" className={secondaryClass}>
                                    Manage addresses
                                </Link>
                            </div>
                        )}
                        {category === 'rider-details' && (
                            <div className="mb-6 space-y-4">
                                {details({ 'Logistics company': companyName, 'Vehicle type': vehicleType })}
                                <p className="text-muted-foreground text-sm">
                                    Your logistics company manages affiliation and delivery coverage. Plate number and bank detail changes require
                                    confirmation and another review.
                                </p>
                            </div>
                        )}
                        {seller && category === 'business-details' && (
                            <div className="mb-6 space-y-4">
                                {details({ 'Seller type': sellerType?.replaceAll('_', ' ') ?? null })}
                                <p className="text-muted-foreground text-sm">
                                    Changing your store name or bank details requires confirmation and another admin review.
                                </p>
                            </div>
                        )}
                        {category === 'submitted-documents' && (
                            <div className="mb-6 space-y-4">
                                <ul className="grid gap-3">
                                    {Object.entries(documentLabels).map(([kind, label]) => {
                                        const document = documents.find((item) => item.kind === kind);
                                        return (
                                            <li key={kind} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                                                <span className="text-sm">{label}</span>
                                                {document ? (
                                                    <span className="text-sm">Submitted</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Not submitted</span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                                <p className="text-muted-foreground text-xs">
                                    Registration documents remain private.{' '}
                                    {seller
                                        ? 'Contact support for business document corrections.'
                                        : 'Contact Logistics for license or vehicle document corrections.'}
                                </p>
                            </div>
                        )}
                        {editing && (
                            <div className="space-y-6">
                                <EmailCodeConfirmation purpose="profile" confirmed={sensitiveConfirmed} />
                                <ValidatedForm
                                    className="space-y-4"
                                    aria-busy={form.processing}
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        form.transform((values) => ({
                                            name: category === 'contact-details' ? values.name : auth.user.name,
                                            email: category === 'contact-details' ? values.email : auth.user.email,
                                            ...(category === 'contact-details' ? { phone: values.phone } : {}),
                                            current_password: values.current_password,
                                            _method: values._method,
                                            ...(category === 'rider-details'
                                                ? { bank_account: values.bank_account, ...(plateNumber ? { plate_number: values.plate_number } : {}) }
                                                : {}),
                                            ...(seller && category === 'business-details'
                                                ? {
                                                      bank_account: values.bank_account,
                                                      ...(businessName ? { business_name: values.business_name } : {}),
                                                  }
                                                : {}),
                                            ...(category === 'submitted-documents' ? { identity: values.identity } : {}),
                                        }));
                                        form.post('/settings/profile', {
                                            forceFormData: true,
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                form.reset('current_password', 'identity');
                                            },
                                        });
                                    }}
                                >
                                    <fieldset disabled={form.processing} className="grid gap-4 disabled:opacity-70">
                                        <legend className="sr-only">Update {categories.find((item) => item.id === category)?.title}</legend>
                                        {category === 'contact-details' && (
                                            <>
                                                <Field
                                                    id="name"
                                                    label="Display name"
                                                    autoComplete="name"
                                                    required
                                                    maxLength={160}
                                                    minLength={2}
                                                    pattern={"(?=(?:[^\\p{L}]*\\p{L}){2})[\\p{L}\\p{M} .'\\-]+"}
                                                    value={form.data.name}
                                                    onChange={(event) => form.setData('name', event.target.value)}
                                                    error={form.errors.name}
                                                />
                                                <Field
                                                    id="email"
                                                    label="Email address"
                                                    type="email"
                                                    autoComplete="email"
                                                    required
                                                    maxLength={160}
                                                    value={form.data.email}
                                                    onChange={(event) => form.setData('email', event.target.value)}
                                                    error={form.errors.email}
                                                />
                                                <p className="text-muted-foreground text-sm">
                                                    Changing your email requires email verification again.
                                                </p>
                                                <Field
                                                    id="phone"
                                                    label="Contact number"
                                                    type="tel"
                                                    autoComplete="tel"
                                                    maxLength={30}
                                                    value={form.data.phone}
                                                    onChange={(event) => form.setData('phone', event.target.value)}
                                                    error={form.errors.phone}
                                                />
                                            </>
                                        )}
                                        {['rider-details', 'business-details'].includes(category) && (
                                            <>
                                                {seller && businessName && (
                                                    <Field
                                                        label="Store name"
                                                        maxLength={160}
                                                        required
                                                        value={form.data.business_name ?? ''}
                                                        onChange={(event) => form.setData('business_name', event.target.value)}
                                                        error={form.errors.business_name}
                                                    />
                                                )}
                                                {plateNumber && (
                                                    <Field
                                                        label="Plate number"
                                                        maxLength={30}
                                                        required
                                                        value={form.data.plate_number ?? ''}
                                                        onChange={(event) => form.setData('plate_number', event.target.value)}
                                                        error={form.errors.plate_number}
                                                    />
                                                )}
                                                <Field
                                                    label="Bank account details"
                                                    maxLength={500}
                                                    value={form.data.bank_account}
                                                    onChange={(event) => form.setData('bank_account', event.target.value)}
                                                    error={form.errors.bank_account}
                                                />
                                            </>
                                        )}
                                        {category === 'submitted-documents' && (
                                            <>
                                                <Field
                                                    label="Replace photo ID (JPG, PNG or PDF, up to 5 MB)"
                                                    type="file"
                                                    accept="image/jpeg,image/png,application/pdf"
                                                    onChange={(event) => form.setData('identity', event.target.files?.[0] ?? null)}
                                                    error={form.errors.identity}
                                                />
                                                <p className="text-muted-foreground text-sm">
                                                    Replacing your ID sends your account back to {seller ? 'admin' : 'your logistics company'} for
                                                    approval.
                                                </p>
                                            </>
                                        )}
                                        {!googleOnly && (
                                            <Field
                                                label="Current password (or confirm an email code above)"
                                                type="password"
                                                autoComplete="current-password"
                                                value={form.data.current_password}
                                                onChange={(event) => form.setData('current_password', event.target.value)}
                                                error={form.errors.current_password}
                                            />
                                        )}
                                        <Button disabled={form.processing}>{form.processing ? 'Saving…' : 'Save changes'}</Button>
                                        {form.recentlySuccessful && (
                                            <p role="status" className="text-primary text-sm">
                                                Changes saved.
                                            </p>
                                        )}
                                    </fieldset>
                                </ValidatedForm>
                            </div>
                        )}
                        {category === 'contact-details' && (
                            <Link className={`${secondaryClass} mt-5`} href="/settings/password">
                                Change password
                            </Link>
                        )}
                    </Card>
                    {category === 'contact-details' && <DeleteUser />}
                </div>
            </SettingsSections>
        </Page>
    );
}
