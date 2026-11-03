import { AccountChangeComparison } from '@/components/settings/account-change';
import PersonalDetails from '@/components/settings/personal-details';
import { roleSettingsItems, SettingsSections } from '@/components/settings/settings-sections';
import { notify, useConfirmAction } from '@/components/shared/action-feedback';
import { Badge, Card, Field, Notice, Page, Select } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Button } from '@/components/ui/button';
import { type AccountAddress, accountApi, type AccountChange, displayValue, type Region } from '@/lib/account-api';
import { Link } from '@inertiajs/react';
import { LockKeyhole } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import useSWR from 'swr';

type Settings = {
    profile: Record<string, unknown> & {
        first_name: string | null;
        last_name: string | null;
        middle_initial: string | null;
        sex: string | null;
        date_of_birth: string | null;
        age: number | null;
        tin: string;
        registered_address: AccountAddress;
        service_areas: Region[];
        documents: { id: number; kind: string; url: string }[];
    };
    status: string;
    contact: { email: string; phone: string; notification_preferences: { email?: boolean; sms?: boolean } | null };
    requests: AccountChange[];
    regions: Region[];
};
type Location = AccountAddress;

const categories = [
    { id: 'personal-information', title: 'Personal details', field: null },
    { id: 'business-details', title: 'Company registration', field: 'reverification' },
    { id: 'registered-address', title: 'Registered address', field: 'registered_address' },
    { id: 'service-areas', title: 'Service areas', field: 'service_areas' },
    { id: 'submitted-documents', title: 'Submitted documents', field: 'reverification' },
    { id: 'contact-details', title: 'Contact and security', field: null },
];

function Section({ title, active, status = 'approved', children }: { title: string; active: boolean; status?: string; children: ReactNode }) {
    return (
        <div hidden={!active} id={categories.find((category) => category.title === title)?.id}>
            <Card className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <Badge status={status} label={status === 'pending' ? 'Pending review' : status === 'missing' ? 'Needs re-upload' : undefined} />
                </div>
                {children}
            </Card>
        </div>
    );
}

export default function Account() {
    const confirm = useConfirmAction();
    const [category, setCategory] = useState('personal-information');
    useEffect(() => {
        const update = () => {
            const hash = window.location.hash.slice(1);
            setCategory(categories.some((item) => item.id === hash) ? hash : 'personal-information');
        };
        update();
        window.addEventListener('hashchange', update);
        return () => window.removeEventListener('hashchange', update);
    }, []);
    const { data, error, isLoading, mutate } = useSWR<Settings>('/api/account/settings', accountApi, { revalidateOnFocus: true });
    const [message, setMessage] = useState('');
    const [failure, setFailure] = useState('');
    const [busy, setBusy] = useState(false);
    const [revealed, setRevealed] = useState<string | null>(null);
    const [addressOpen, setAddressOpen] = useState(false);
    const [companyOpen, setCompanyOpen] = useState(false);
    const [selected, setSelected] = useState<string[] | null>(null);
    const [address, setAddress] = useState<AccountAddress>({
        region_code: '',
        province_code: '',
        city_code: '',
        barangay_code: '',
        postal_code: '',
        house_number: '',
        street: '',
    });
    const [code, setCode] = useState('');
    const [otpToken, setOtpToken] = useState('');
    const {
        data: locations,
        error: locationError,
        isLoading: locationsLoading,
    } = useSWR<Location[]>(address.region_code ? `/api/account/locations?region_code=${encodeURIComponent(address.region_code)}` : null, accountApi);
    async function act(work: () => Promise<unknown>, success: string) {
        setBusy(true);
        setFailure('');
        setMessage('');
        try {
            await work();
            await mutate();
            setMessage(success);
            notify(success);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save.';
            setFailure(message);
            notify(message, 'error');
        } finally {
            setBusy(false);
        }
    }
    const submit = (event: FormEvent<HTMLFormElement>, work: (form: FormData) => Promise<unknown>, success: string) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void act(() => work(form), success);
    };
    if (isLoading)
        return (
            <Page title="Account settings">
                <p role="status">Loading verified registration details…</p>
            </Page>
        );
    if (error || !data)
        return (
            <Page title="Account settings">
                <Notice tone="error">{error?.message ?? 'No verified registration is available.'}</Notice>
                <Button onClick={() => void mutate()}>Retry</Button>
            </Page>
        );
    const profile = data.profile;
    const status = (field: string) => data.requests.find((request) => request.field === field)?.status ?? 'approved';
    const home = profile.registered_address?.region_code;
    const proposedAreas = data.requests.find((request) => request.field === 'service_areas' && request.status === 'pending')?.new_value;
    const areas =
        selected ??
        (Array.isArray(proposedAreas)
            ? proposedAreas.filter((code): code is string => typeof code === 'string')
            : profile.service_areas.map((area) => area.code));
    const locked = (fields: string[]) => (
        <dl className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
                <div key={field} className="min-w-0">
                    <dt className="text-muted-foreground flex items-center gap-2 text-sm">
                        <LockKeyhole size={14} aria-hidden="true" />
                        {field.replaceAll('_', ' ')}
                    </dt>
                    <dd className="mt-1 break-words">{displayValue(profile[field])}</dd>
                </div>
            ))}
        </dl>
    );
    const options = (level: 'province' | 'city' | 'barangay') => [
        ...new Map(
            (locations ?? [])
                .filter(
                    (row) =>
                        level === 'province' ||
                        (row.province_code === address.province_code && (level === 'city' || row.city_code === address.city_code)),
                )
                .map((row) => [row[`${level}_code`], row[`${level}_name`]]),
        ).entries(),
    ];
    return (
        <Page title="Account settings" description="Your approved registration details. Request a review when your business information changes.">
            {failure && <Notice tone="error">{failure}</Notice>}
            {message && <Notice>{message}</Notice>}
            {data.status === 'pending_reverification' && (
                <Notice tone="warning">Your company is pending re-verification. Your approved registration remains visible below.</Notice>
            )}
            <SettingsSections
                items={roleSettingsItems('logistics')}
                onSelect={(target) => {
                    setCategory(target.split('#')[1] ?? 'personal-information');
                    setRevealed(null);
                    setMessage('');
                    setFailure('');
                }}
            >
                <div className="min-w-0 flex-1 space-y-6">
                    {data.requests
                        .filter((request) => request.field === categories.find((item) => item.id === category)?.field)
                        .slice(0, 1)
                        .filter((request) => request.status !== 'approved')
                        .map((change) => (
                            <AccountChangeComparison key={change.id} change={change} regions={data.regions} />
                        ))}
                    <Section title="Personal details" active={category === 'personal-information'}>
                        <PersonalDetails
                            firstName={profile.first_name}
                            middleInitial={profile.middle_initial}
                            lastName={profile.last_name}
                            sex={profile.sex}
                            dateOfBirth={profile.date_of_birth}
                            age={profile.age}
                        />
                    </Section>
                    <Section title="Company registration" active={category === 'business-details'} status={status('reverification')}>
                        {locked(['company_name', 'sec_registration_number', 'position'])}
                        <div>
                            <span className="text-muted-foreground flex items-center gap-2 text-sm">
                                <LockKeyhole size={14} aria-hidden="true" />
                                TIN
                            </span>
                            <p className="mt-1">{revealed ?? profile.tin}</p>
                            <Button
                                variant="ghost"
                                disabled={busy}
                                onClick={() =>
                                    revealed
                                        ? setRevealed(null)
                                        : void act(async () => {
                                              const result = await accountApi<{ tin: string }>('/api/account/tin');
                                              setRevealed(result.tin);
                                          }, 'TIN revealed.')
                                }
                            >
                                {revealed ? 'Hide TIN' : 'Reveal TIN'}
                            </Button>
                        </div>
                        <Button variant="outline" onClick={() => setCompanyOpen(!companyOpen)} aria-expanded={companyOpen}>
                            Request company re-verification
                        </Button>
                        {companyOpen && (
                            <ValidatedForm
                                confirmation={{
                                    title: 'Request company re-verification?',
                                    description:
                                        'Your new company details and documents will be reviewed. Operations remain subject to the account approval rules.',
                                    confirmLabel: 'Submit re-verification request',
                                }}
                                className="grid gap-4"
                                onSubmit={(event) =>
                                    submit(event, (form) => accountApi('/api/account/reverification', 'POST', form), 'Re-verification requested.')
                                }
                            >
                                <Notice tone="warning">
                                    Upload new documents for review. Your account status will become pending re-verification.
                                </Notice>
                                <Field label="Company name" name="company_name" required maxLength={160} />
                                <Field label="SEC registration number" name="sec_registration_number" required maxLength={60} />
                                <Field label="TIN" name="tin" required placeholder="123-456-789-000" />
                                {['identity', 'sec_certificate', 'bir_2303', 'business_permit'].map((kind) => (
                                    <Field
                                        key={kind}
                                        label={kind.replaceAll('_', ' ')}
                                        name={kind}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        required
                                        hint="PDF, JPG or PNG, up to 5 MB."
                                    />
                                ))}
                                <Button disabled={busy || status('reverification') === 'pending'}>
                                    {busy ? 'Submitting…' : 'Submit re-verification request'}
                                </Button>
                            </ValidatedForm>
                        )}
                    </Section>
                    <Section title="Registered address" active={category === 'registered-address'} status={status('registered_address')}>
                        <p className="text-sm whitespace-pre-wrap">{displayValue(profile.registered_address)}</p>
                        <Button variant="outline" onClick={() => setAddressOpen(!addressOpen)} aria-expanded={addressOpen}>
                            Request address change
                        </Button>
                        {addressOpen && (
                            <ValidatedForm
                                confirmation={{
                                    title: 'Request a registered address change?',
                                    description: 'Your approved address stays in use until this request is approved.',
                                    confirmLabel: 'Submit address request',
                                }}
                                className="grid gap-4 sm:grid-cols-2"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void act(
                                        () => accountApi('/api/account/change-requests', 'POST', { field: 'registered_address', new_value: address }),
                                        'Address change requested.',
                                    );
                                }}
                            >
                                <Select
                                    label="Region"
                                    required
                                    value={address.region_code}
                                    onChange={(event) =>
                                        setAddress({
                                            ...address,
                                            region_code: event.target.value,
                                            province_code: '',
                                            city_code: '',
                                            barangay_code: '',
                                            postal_code: '',
                                        })
                                    }
                                >
                                    <option value="">Choose region</option>
                                    {data.regions.map((region) => (
                                        <option key={region.code} value={region.code}>
                                            {region.name}
                                        </option>
                                    ))}
                                </Select>
                                {(['province', 'city', 'barangay'] as const).map((level) => (
                                    <Select
                                        key={level}
                                        label={level === 'city' ? 'City / municipality' : level}
                                        required
                                        value={address[`${level}_code`]}
                                        disabled={locationsLoading || !options(level).length}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setAddress({
                                                ...address,
                                                [`${level}_code`]: value,
                                                ...(level === 'province'
                                                    ? { city_code: '', barangay_code: '', postal_code: '' }
                                                    : level === 'city'
                                                      ? { barangay_code: '', postal_code: '' }
                                                      : { postal_code: locations?.find((row) => row.barangay_code === value)?.postal_code ?? '' }),
                                            });
                                        }}
                                    >
                                        <option value="">Choose {level}</option>
                                        {options(level).map(([code, name]) => (
                                            <option key={code} value={code}>
                                                {name}
                                            </option>
                                        ))}
                                    </Select>
                                ))}
                                {locationsLoading && <p role="status">Loading locations…</p>}
                                {locationError && <Notice tone="error">Unable to load locations. Choose the region again to retry.</Notice>}
                                {locations?.length === 0 && (
                                    <Notice tone="warning">No validated locations are available for this region. Contact support.</Notice>
                                )}
                                <Field label="Postal code" value={address.postal_code} readOnly required />
                                <Field
                                    label="House / unit number"
                                    required
                                    maxLength={30}
                                    value={address.house_number}
                                    onChange={(event) => setAddress({ ...address, house_number: event.target.value })}
                                />
                                <Field
                                    label="Street / subdivision"
                                    required
                                    maxLength={160}
                                    value={address.street}
                                    onChange={(event) => setAddress({ ...address, street: event.target.value })}
                                />
                                <Button disabled={busy || status('registered_address') === 'pending' || !address.postal_code}>
                                    {busy ? 'Submitting…' : 'Submit address request'}
                                </Button>
                            </ValidatedForm>
                        )}
                    </Section>
                    <Section title="Service areas" active={category === 'service-areas'} status={status('service_areas')}>
                        <p className="bg-accent text-primary inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm">
                            <LockKeyhole size={14} aria-hidden="true" />
                            {data.regions.find((region) => region.code === home)?.name} · Registered address
                        </p>
                        <fieldset className="grid gap-2 sm:grid-cols-2">
                            <legend className="mb-2 text-sm font-medium">Choose service regions</legend>
                            {data.regions.map((region) => (
                                <label key={region.code} className="flex min-h-11 items-center gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={areas.includes(region.code)}
                                        disabled={region.code === home || busy}
                                        onChange={(event) =>
                                            setSelected(event.target.checked ? [...areas, region.code] : areas.filter((code) => code !== region.code))
                                        }
                                    />
                                    {region.name}
                                </label>
                            ))}
                        </fieldset>
                        <p className="text-muted-foreground text-sm">
                            Removing a region applies immediately. Regions outside your original registration need admin approval before they become
                            active.
                        </p>
                        <Button
                            disabled={busy || !selected}
                            onClick={async () => {
                                if (
                                    !(await confirm({
                                        title: 'Update service areas?',
                                        description:
                                            'Removing a region applies immediately. Additional regions require approval before becoming active.',
                                        confirmLabel: 'Submit service areas',
                                    }))
                                )
                                    return;
                                void act(async () => {
                                    await accountApi('/api/account/change-requests', 'POST', { field: 'service_areas', new_value: areas });
                                    setSelected(null);
                                }, 'Service areas submitted.');
                            }}
                        >
                            {busy ? 'Saving…' : 'Save service areas'}
                        </Button>
                    </Section>
                    <Section
                        title="Submitted documents"
                        active={category === 'submitted-documents'}
                        status={profile.documents.length < 4 ? 'missing' : 'approved'}
                    >
                        {profile.documents.length ? (
                            <ul className="grid gap-3">
                                {profile.documents.map((doc) => (
                                    <li key={doc.id}>
                                        <a className="text-primary underline" href={doc.url}>
                                            {doc.kind.replaceAll('_', ' ')}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No submitted documents are available. Request re-verification to upload them.</p>
                        )}
                        <p className="text-muted-foreground text-sm">Document links expire after five minutes. Refresh this page for new links.</p>
                    </Section>
                    <Section title="Contact and security" active={category === 'contact-details'}>
                        <p className="text-sm">Verify a code sent to your current registered email before changing email or contact number.</p>
                        <Button
                            variant="outline"
                            disabled={busy}
                            onClick={() => void act(() => accountApi('/api/account/otp', 'POST', {}), 'Verification code sent.')}
                        >
                            Send verification code
                        </Button>
                        <Field
                            label="Email verification code"
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            maxLength={6}
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                        />
                        <Button
                            variant="outline"
                            disabled={busy || code.length !== 6}
                            onClick={() =>
                                void act(async () => {
                                    const result = await accountApi<{ token: string }>('/api/account/otp/verify', 'POST', { code });
                                    setOtpToken(result.token);
                                }, 'Code verified. Save within ten minutes.')
                            }
                        >
                            Verify code
                        </Button>
                        <ValidatedForm
                            className="grid gap-4"
                            key={`${data.contact.email}-${data.contact.phone}`}
                            onSubmit={(event) =>
                                submit(
                                    event,
                                    async (form) => {
                                        const result = await accountApi<{ requires_email_verification: boolean }>('/api/account/profile', 'PATCH', {
                                            email: form.get('email'),
                                            contact_number: form.get('contact_number'),
                                            otp_token: otpToken,
                                        });
                                        setOtpToken('');
                                        if (result.requires_email_verification) window.location.assign('/verify-email');
                                    },
                                    'Contact details saved. If you changed email, verify the link sent to your new address.',
                                )
                            }
                        >
                            <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={data.contact.email} />
                            <Field
                                label="Contact number"
                                name="contact_number"
                                type="tel"
                                autoComplete="tel"
                                pattern="09[0-9]{9}"
                                required
                                defaultValue={data.contact.phone}
                            />
                            <Button disabled={busy || !otpToken}>Save contact details</Button>
                        </ValidatedForm>
                        <Link className="text-primary inline-flex min-h-11 items-center underline" href="/settings/password">
                            Change password
                        </Link>
                    </Section>
                </div>
            </SettingsSections>
        </Page>
    );
}
