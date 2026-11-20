import EmailCodeConfirmation from '@/components/auth/email-code-confirmation';
import InputError from '@/components/auth/input-error';
import PersonalDetails from '@/components/settings/personal-details';
import RegisteredAddress from '@/components/settings/registered-address';
import { SettingsSections, roleSettingsItems } from '@/components/settings/settings-sections';
import { Badge, Card, Field, Page, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Button } from '@/components/ui/button';
import type { SharedData } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { ExternalLink, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

const riderCategories = [
    { id: 'personal-information', title: 'Personal details' },
    { id: 'rider-details', title: 'Rider details' },
    { id: 'registered-address', title: 'Registered address' },
    { id: 'submitted-documents', title: 'Submitted documents' },
    { id: 'contact-details', title: 'Contact and security' },
];
const buyerCategories = riderCategories.filter((item) => item.id !== 'rider-details');
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
    documents,
    googleConnected = false,
    status,
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
    googleConnected?: boolean;
    status?: string;
    documents: { id: number; kind: string; url: string }[];
}) {
    const { auth } = usePage<SharedData>().props;
    const buyer = auth.user.role === 'buyer';
    const seller = auth.user.role === 'seller';
    const categories = buyer ? buyerCategories : seller ? sellerCategories : riderCategories;
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
        : buyer
          ? { identity: 'Government-issued ID' }
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
        _method: 'patch',
    });
    const [refreshingDocuments, setRefreshingDocuments] = useState(false);
    const editing = ['rider-details', 'business-details', 'contact-details'].includes(category);
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
            title={buyer ? 'Buyer settings' : seller ? 'Seller settings' : 'Rider settings'}
            description={
                seller
                    ? 'Your registration, store and bank details, contact information, and account security.'
                    : 'Your registration details, delivery contact information, and account security.'
            }
        >
            {status && (
                <p role="status" className="text-primary text-sm">
                    {status}
                </p>
            )}
            <SettingsSections items={roleSettingsItems(auth.user.role)}>
                <div id={category} tabIndex={-1} className="min-w-0 flex-1 scroll-mt-28 space-y-6">
                    <Card>
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold">{categories.find((item) => item.id === category)?.title}</h2>
                            {!['personal-information', 'contact-details'].includes(category) && <Badge status={auth.user.status} />}
                        </div>
                        {category === 'personal-information' && (
                            <div className="space-y-4">
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
                                <RegisteredAddress details={registeredAddress} />
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
                                            <li key={kind} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                                                <span className="flex min-w-0 items-center gap-3 text-sm font-medium">
                                                    <FileText aria-hidden="true" className="text-primary size-5 shrink-0" />
                                                    {label}
                                                </span>
                                                {document ? (
                                                    <a
                                                        href={document.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded text-sm font-medium underline focus-visible:ring-2"
                                                    >
                                                        View document <ExternalLink aria-hidden="true" className="size-4" />
                                                        <span className="sr-only"> (opens in a new tab)</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Not submitted</span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                                <p className="text-muted-foreground text-sm">
                                    Private document links expire after five minutes. Refresh links before opening an expired document.
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={refreshingDocuments}
                                    onClick={() => {
                                        setRefreshingDocuments(true);
                                        router.reload({ only: ['documents'], onFinish: () => setRefreshingDocuments(false) });
                                    }}
                                >
                                    {refreshingDocuments ? 'Refreshing links...' : 'Refresh document links'}
                                </Button>
                            </div>
                        )}
                        {category === 'contact-details' && (
                            <div className="mb-6 space-y-4">
                                <p className="text-sm">
                                    Verify a code sent to your current registered email before changing email or contact number.
                                </p>
                                <EmailCodeConfirmation purpose="profile" confirmed={sensitiveConfirmed} compact />
                                <p className="text-muted-foreground text-sm break-words">
                                    Current email: {auth.user.email} / Contact: {auth.user.phone || 'Not provided'}
                                </p>
                                {googleConnected && <p className="text-muted-foreground text-sm">Google connected</p>}
                            </div>
                        )}
                        {editing && (category !== 'contact-details' || sensitiveConfirmed) && (
                            <div className="space-y-6">
                                {category !== 'contact-details' && <EmailCodeConfirmation purpose="profile" confirmed={sensitiveConfirmed} />}
                                <ValidatedForm
                                    className="max-w-3xl space-y-4"
                                    aria-busy={form.processing}
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        form.transform((values) => ({
                                            name: category === 'contact-details' ? values.name : auth.user.name,
                                            email: category === 'contact-details' ? values.email : auth.user.email,
                                            ...(category === 'contact-details' ? { phone: values.phone } : {}),
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
                                        }));
                                        form.post('/settings/profile', {
                                            forceFormData: true,
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                form.clearErrors();
                                            },
                                        });
                                    }}
                                >
                                    <fieldset disabled={form.processing} className="grid gap-4 disabled:opacity-70">
                                        <legend className="sr-only">Update {categories.find((item) => item.id === category)?.title}</legend>
                                        {category === 'contact-details' && (
                                            <>
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
                                        <InputError message={(form.errors as Record<string, string>).code} />
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
                            <Link className="text-primary mt-5 inline-flex min-h-11 items-center underline" href="/settings/password">
                                Change password
                            </Link>
                        )}
                    </Card>
                </div>
            </SettingsSections>
        </Page>
    );
}
