import InputError from '@/components/input-error';
import { buttonClass, roleLabel, secondaryClass } from '@/components/marketplace-ui';
import OnboardingSteps from '@/components/onboarding-steps';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

type Option = { id: number; name: string };
type Location = { code: string; name: string };
type Document = { id: number; kind: string };
type Step = 'personal' | 'role' | 'address' | 'documents' | 'review';
type Form = {
    first_name: string;
    last_name: string;
    middle_initial: string;
    sex: string;
    birthday: string;
    phone: string;
    province_code: string;
    city_code: string;
    barangay_code: string;
    line1: string;
    street: string;
    house_number: string;
    zip: string;
    business_name: string;
    business_category_id: string;
    vehicle_type: string;
    plate_number: string;
    sorting_center_id: string;
    identity: File | null;
    license: File | null;
    business_permit: File | null;
    vehicle_registration: File | null;
    policy_accepted: boolean;
    current_step: Step;
};

export default function ApplicationPage({
    application,
    profile,
    address,
    store,
    courier,
    documents,
    categories,
    centers,
}: {
    application: {
        id: number;
        status: string;
        rejection_reason: string | null;
        business_name: string | null;
        sorting_center_id: number | null;
        draft_data: Partial<Omit<Form, 'identity' | 'license' | 'business_permit' | 'vehicle_registration'>> | null;
        draft_saved_at: string | null;
        submitted_at: string | null;
        reviewed_at: string | null;
    };
    profile: Record<string, string> | null;
    address: { line1: string; zip: string; street: string | null; house_number: string | null } | null;
    store: { name: string; business_category_id: number | null } | null;
    courier: { vehicle_type: string; plate_number: string | null } | null;
    documents: Document[];
    categories: Option[];
    centers: Option[];
}) {
    const { auth, status, errors: sharedErrors } = usePage<SharedData>().props;
    const role = auth.user.role;
    const accountName = auth.user.name === 'LubosMart member' ? '' : auth.user.name;
    const nameParts = accountName.trim().split(/\s+/);
    const draft = application.draft_data;
    const formRef = useRef<HTMLFormElement>(null);
    const form = useForm<Form>({
        first_name: profile?.first_name ?? (nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : accountName),
        last_name: profile?.last_name ?? (nameParts.length > 1 ? nameParts.at(-1)! : ''),
        middle_initial: profile?.middle_initial ?? '',
        sex: profile?.sex ?? '',
        birthday: profile?.birthday ?? '',
        phone: auth.user.phone ?? '',
        province_code: profile?.province_code ?? '',
        city_code: profile?.city_code ?? '',
        barangay_code: profile?.barangay_code ?? '',
        line1: address?.line1 ?? '',
        street: address?.street ?? draft?.line1 ?? address?.line1 ?? '',
        house_number: address?.house_number ?? '',
        zip: address?.zip ?? '',
        business_name: application.business_name ?? store?.name ?? '',
        business_category_id: String(store?.business_category_id ?? ''),
        vehicle_type: courier?.vehicle_type ?? '',
        plate_number: courier?.plate_number ?? '',
        sorting_center_id: String(application.sorting_center_id ?? ''),
        ...Object.fromEntries(Object.entries(draft ?? {}).map(([key, value]) => [key, value ?? ''])),
        identity: null,
        license: null,
        business_permit: null,
        vehicle_registration: null,
        policy_accepted: false,
        current_step: draft?.current_step ?? 'personal',
    });
    const steps: { key: Step; title: string }[] = [
        { key: 'personal', title: 'Personal details' },
        ...(role === 'buyer' ? [] : [{ key: 'role' as Step, title: role === 'courier' ? 'Courier details' : 'Business details' }]),
        { key: 'address', title: 'Address' },
        { key: 'documents', title: 'Documents' },
        { key: 'review', title: 'Review' },
    ];
    const step = form.data.current_step;
    const stepIndex = steps.findIndex((item) => item.key === step);
    const fieldSteps: Record<string, Step> = {
        first_name: 'personal',
        last_name: 'personal',
        middle_initial: 'personal',
        sex: 'personal',
        birthday: 'personal',
        phone: 'personal',
        business_name: 'role',
        business_category_id: 'role',
        vehicle_type: 'role',
        plate_number: 'role',
        sorting_center_id: 'role',
        province_code: 'address',
        city_code: 'address',
        barangay_code: 'address',
        line1: 'address',
        street: 'address',
        house_number: 'address',
        zip: 'address',
        identity: 'documents',
        license: 'documents',
        business_permit: 'documents',
        vehicle_registration: 'documents',
        policy_accepted: 'review',
    };
    const focusError = (errors: Record<string, string>) => {
        const key = Object.keys(errors)[0];
        if (fieldSteps[key]) form.setData('current_step', fieldSteps[key]);
        requestAnimationFrame(() => document.getElementById(key)?.focus());
    };
    const saveDraft = () =>
        form.post(route('application.draft'), {
            forceFormData: true,
            preserveScroll: true,
            onError: focusError,
            onSuccess: () => form.reset('identity', 'license', 'business_permit', 'vehicle_registration'),
        });
    const next = () => {
        const invalid = [
            ...(formRef.current?.querySelectorAll<HTMLInputElement>('fieldset:not([hidden]) input, fieldset:not([hidden]) select') ?? []),
        ].find((input) => !input.checkValidity());
        if (invalid) {
            invalid.reportValidity();
            return;
        }
        form.setData('current_step', steps[Math.min(stepIndex + 1, steps.length - 1)].key);
        requestAnimationFrame(() => document.getElementById('application-step-title')?.focus());
    };
    const [provinces, setProvinces] = useState<Location[]>([]);
    const [cities, setCities] = useState<Location[]>([]);
    const [barangays, setBarangays] = useState<Location[]>([]);
    const [locationError, setLocationError] = useState('');
    const [retry, setRetry] = useState(0);
    const submitted = application.status === 'submitted';
    const province = form.data.province_code;
    const city = form.data.city_code;
    useEffect(() => {
        if (submitted) return;
        const controller = new AbortController();
        setLocationError('');
        const fetchList = async (query: Record<string, string>, setter: (items: Location[]) => void) => {
            try {
                const response = await fetch(route('locations', query), { headers: { Accept: 'application/json' }, signal: controller.signal });
                if (!response.ok) throw new Error('Address selections are temporarily unavailable. Retry to continue.');
                setter(await response.json());
            } catch (error) {
                if (!controller.signal.aborted) setLocationError(error instanceof Error ? error.message : 'Unable to load locations.');
            }
        };
        void fetchList({}, setProvinces);
        setCities([]);
        setBarangays([]);
        if (province) void fetchList({ province }, setCities);
        if (city) void fetchList({ city }, setBarangays);
        return () => controller.abort();
    }, [province, city, retry, submitted]);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (step !== 'review') {
            next();
            return;
        }
        form.post(route('application.store'), { forceFormData: true, onError: focusError });
    };
    const birthday = new Date(`${form.data.birthday}T00:00:00`);
    const today = new Date();
    const age =
        today.getFullYear() -
        birthday.getFullYear() -
        (today.getMonth() < birthday.getMonth() || (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate()) ? 1 : 0);
    const field = (
        key: keyof Pick<
            Form,
            | 'first_name'
            | 'last_name'
            | 'middle_initial'
            | 'birthday'
            | 'phone'
            | 'line1'
            | 'street'
            | 'house_number'
            | 'zip'
            | 'business_name'
            | 'plate_number'
        >,
        label: string,
        type = 'text',
        required = true,
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={key}>{label}</Label>
            <Input
                id={key}
                name={key}
                className="min-h-11"
                aria-invalid={!!form.errors[key]}
                aria-describedby={form.errors[key] ? `${key}-error` : undefined}
                type={type}
                value={form.data[key]}
                required={required}
                onChange={(event) => form.setData(key, event.target.value)}
            />
            <InputError id={`${key}-error`} message={form.errors[key]} />
        </div>
    );
    const select = (
        key: keyof Pick<
            Form,
            'sex' | 'province_code' | 'city_code' | 'barangay_code' | 'business_category_id' | 'vehicle_type' | 'sorting_center_id'
        >,
        label: string,
        options: { value: string; label: string }[],
        disabled = false,
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={key}>{label}</Label>
            <select
                id={key}
                name={key}
                value={form.data[key]}
                disabled={disabled}
                required
                className="bg-background border-input aria-invalid:border-destructive min-h-11 w-full rounded-xl border px-3 text-base md:text-sm"
                aria-invalid={!!form.errors[key]}
                aria-describedby={form.errors[key] ? `${key}-error` : undefined}
                onChange={(event) => {
                    form.setData(key, event.target.value);
                    if (key === 'province_code') {
                        form.setData('city_code', '');
                        form.setData('barangay_code', '');
                    }
                    if (key === 'city_code') form.setData('barangay_code', '');
                }}
            >
                <option value="">Select</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <InputError id={`${key}-error`} message={form.errors[key]} />
        </div>
    );
    const locationOptions = (items: Location[]) => items.map((item) => ({ value: item.code, label: item.name }));
    const fileKinds: ('identity' | 'license' | 'business_permit' | 'vehicle_registration')[] = ['identity'];
    if (role === 'courier') fileKinds.push('license');
    if (role === 'seller' || role === 'sorting_center') fileKinds.push('business_permit');
    if (role === 'courier') fileKinds.push('vehicle_registration');
    return (
        <AppLayout breadcrumbs={[{ title: 'Application', href: route('application.edit') }]}>
            <Head title="Your application" />
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
                <OnboardingSteps current={3} />
                <div>
                    <p className="text-muted-foreground text-sm">{roleLabel(role)} registration</p>
                    <h1 className="mt-2 text-3xl font-semibold">Your application</h1>
                    <p className="text-muted-foreground mt-2">
                        Complete your details for {role === 'courier' ? 'your sorting center' : 'administrator'} review.
                    </p>
                </div>
                {status && (
                    <p role="status" className="rounded-xl border p-4">
                        {status}
                    </p>
                )}
                <div className="bg-card grid grid-cols-2 gap-3 rounded-2xl border p-4 sm:grid-cols-3">
                    <div className="text-sm">
                        <span className="text-muted-foreground block text-xs">Email account</span>
                        <span className="text-primary mt-1 flex items-center gap-2 font-medium">
                            <ShieldCheck className="size-4" />
                            Verified
                        </span>
                    </div>
                    <div className="text-sm">
                        <span className="text-muted-foreground block text-xs">Role application</span>
                        <span className="mt-1 block font-medium">
                            {submitted ? 'Under review' : application.status === 'rejected' ? 'Changes requested' : 'Draft — not submitted'}
                        </span>
                    </div>
                    <div className="col-span-2 text-sm sm:col-span-1">
                        <span className="text-muted-foreground block text-xs">Workspace access</span>
                        <span className="mt-1 block font-medium">Available after approval</span>
                    </div>
                    <p className="text-muted-foreground col-span-2 text-xs sm:col-span-3">Your documents are reviewed after submission.</p>
                </div>
                {application.rejection_reason && (
                    <div role="alert" className="rounded-xl border border-amber-500 p-4">
                        <h2 className="font-semibold">Changes requested</h2>
                        <p className="mt-2">{application.rejection_reason}</p>
                        <p className="mt-2 text-sm">Update your details below and resubmit.</p>
                    </div>
                )}
                {submitted ? (
                    <div className="bg-card rounded-xl border p-6">
                        <h2 className="text-xl font-semibold">Application submitted</h2>
                        <p className="text-muted-foreground mt-3">We will email the decision. Your dashboard becomes available after approval.</p>
                        <p className="text-muted-foreground mt-3 text-sm">
                            Submitted: {application.submitted_at ? new Date(application.submitted_at).toLocaleString('en-PH') : 'Recorded'}. Reviewer:{' '}
                            {role === 'courier'
                                ? (centers.find((center) => center.id === application.sorting_center_id)?.name ?? 'Your chosen sorting center')
                                : 'LubosMart administrator'}
                            .
                        </p>
                        <Link className="mt-5 inline-block text-sm underline" href={route('application.edit')}>
                            Check application status
                        </Link>
                    </div>
                ) : (
                    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-6">
                        <div className="bg-card space-y-5 rounded-2xl border p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-primary text-sm font-semibold">
                                    Step {stepIndex + 1} of {steps.length}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {application.draft_saved_at
                                        ? `Last saved ${new Date(application.draft_saved_at).toLocaleString('en-PH')}`
                                        : 'Not saved yet'}
                                </p>
                            </div>
                            <div
                                role="progressbar"
                                aria-label="Application form progress"
                                aria-valuemin={0}
                                aria-valuemax={steps.length}
                                aria-valuenow={stepIndex + 1}
                                className="bg-muted h-1.5 overflow-hidden rounded-full"
                            >
                                <div
                                    className="bg-primary h-full rounded-full transition-all"
                                    style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                                />
                            </div>
                            <ol className="grid grid-cols-5 gap-1 sm:gap-2">
                                {steps.map((item, index) => (
                                    <li key={item.key}>
                                        <button
                                            type="button"
                                            disabled={form.processing || index > stepIndex}
                                            aria-current={step === item.key ? 'step' : undefined}
                                            className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-left text-xs ${step === item.key ? 'bg-accent text-primary font-semibold' : 'text-muted-foreground'}`}
                                            onClick={() => form.setData('current_step', item.key)}
                                        >
                                            <span className="shrink-0">{index < stepIndex ? <Check className="size-3.5" /> : `0${index + 1}`}</span>
                                            <span className="sr-only sm:not-sr-only">{item.title}</span>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                            <h2 id="application-step-title" tabIndex={-1} className="text-xl font-semibold">
                                {steps[stepIndex]?.title}
                            </h2>
                            <p className="text-muted-foreground text-sm">Save a draft and return later. Review starts only after final submission.</p>
                        </div>
                        <InputError message={sharedErrors?.application} />
                        <fieldset
                            hidden={step !== 'personal'}
                            disabled={form.processing || step !== 'personal'}
                            className={`bg-card gap-5 rounded-2xl border p-6 shadow-sm shadow-black/[.02] sm:grid-cols-2 ${step === 'personal' ? 'grid' : 'hidden'}`}
                        >
                            <legend className="px-2 font-semibold">Personal details</legend>
                            {field('first_name', 'First name')}
                            {field('last_name', 'Last name')}
                            {field('middle_initial', 'Middle initial (optional)', 'text', false)}
                            {field('birthday', 'Birthday', 'date')}
                            {field('phone', 'Mobile number', 'tel')}
                            <div className="grid gap-2">
                                <Label htmlFor="application-email">Verified email</Label>
                                <Input id="application-email" value={auth.user.email} readOnly type="email" />
                                <p className="text-muted-foreground text-xs">This is the email verified for your account.</p>
                            </div>
                            {select('sex', 'Sex', [
                                { value: 'female', label: 'Female' },
                                { value: 'male', label: 'Male' },
                                { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                            ])}
                            {Number.isFinite(age) && age >= 0 && (
                                <p className="text-muted-foreground text-sm">Age: {age} (calculated from birthday)</p>
                            )}
                        </fieldset>
                        <fieldset
                            hidden={step !== 'address'}
                            disabled={form.processing || step !== 'address'}
                            className={`bg-card gap-5 rounded-2xl border p-6 sm:grid-cols-2 ${step === 'address' ? 'grid' : 'hidden'}`}
                        >
                            <legend className="px-2 font-semibold">
                                {role === 'courier' ? 'Contact address' : role === 'buyer' ? 'Registration address' : 'Business address'}
                            </legend>
                            {select('province_code', 'Province / NCR', locationOptions(provinces))}
                            {select('city_code', 'City / municipality', locationOptions(cities), !province)}
                            {select('barangay_code', 'Barangay', locationOptions(barangays), !city)}
                            {field('house_number', 'House / building number')}
                            {field('street', 'Street')}
                            {field('zip', 'Postal code')}
                            {locationError && (
                                <div role="alert" className="text-destructive text-sm sm:col-span-2">
                                    {locationError}{' '}
                                    <button type="button" className="underline" onClick={() => setRetry((value) => value + 1)}>
                                        Retry
                                    </button>
                                </div>
                            )}
                        </fieldset>
                        {(role === 'seller' || role === 'sorting_center') && (
                            <fieldset
                                hidden={step !== 'role'}
                                disabled={form.processing || step !== 'role'}
                                className={`bg-card gap-5 rounded-2xl border p-6 shadow-sm shadow-black/[.02] ${step === 'role' ? 'grid' : 'hidden'}`}
                            >
                                <legend className="px-2 font-semibold">Business details</legend>
                                {field('business_name', 'Business name')}
                                {role === 'seller' &&
                                    select(
                                        'business_category_id',
                                        'What will your store sell?',
                                        categories.map((category) => ({ value: String(category.id), label: category.name })),
                                    )}
                            </fieldset>
                        )}
                        {role === 'courier' && (
                            <fieldset
                                hidden={step !== 'role'}
                                disabled={form.processing || step !== 'role'}
                                className={`bg-card gap-5 rounded-2xl border p-6 shadow-sm shadow-black/[.02] ${step === 'role' ? 'grid' : 'hidden'}`}
                            >
                                <legend className="px-2 font-semibold">Courier details</legend>
                                {select(
                                    'vehicle_type',
                                    'Vehicle',
                                    ['motorcycle', 'bicycle', 'car', 'van', 'truck'].map((vehicle) => ({ value: vehicle, label: vehicle })),
                                )}
                                {field('plate_number', 'Plate number')}
                                {select(
                                    'sorting_center_id',
                                    'Choose your Sorting center',
                                    centers.map((center) => ({ value: String(center.id), label: center.name })),
                                )}
                                {!centers.length && (
                                    <p className="text-muted-foreground text-sm">
                                        Sorting centers must be approved before couriers can select them. You can save your draft and return later.
                                    </p>
                                )}
                            </fieldset>
                        )}
                        <fieldset
                            hidden={step !== 'documents'}
                            disabled={form.processing || step !== 'documents'}
                            className={`bg-card gap-5 rounded-2xl border p-6 shadow-sm shadow-black/[.02] ${step === 'documents' ? 'grid' : 'hidden'}`}
                        >
                            <legend className="px-2 font-semibold">Required documents</legend>
                            <p className="text-muted-foreground text-sm">
                                Documents are private and accessible only to your authorized approver and Admin. JPG, PNG, or PDF, up to 5 MB each.
                                Couriers must upload a photo ID and their driver’s license separately.
                            </p>
                            {fileKinds.map((kind) => (
                                <div key={kind} className="grid gap-2">
                                    <Label htmlFor={kind}>
                                        {kind === 'identity'
                                            ? 'Valid photo ID'
                                            : kind === 'license'
                                              ? 'Driver’s license'
                                              : kind === 'business_permit'
                                                ? 'Business / DTI permit'
                                                : 'Vehicle OR/CR'}
                                    </Label>
                                    <Input
                                        id={kind}
                                        name={kind}
                                        type="file"
                                        accept="image/jpeg,image/png,application/pdf"
                                        required={!documents.some((document) => document.kind === kind)}
                                        onChange={(event) => form.setData(kind, event.target.files?.[0] ?? null)}
                                    />
                                    <InputError message={form.errors[kind]} />
                                </div>
                            ))}
                        </fieldset>
                        {step === 'review' && (
                            <section className="bg-card space-y-5 rounded-2xl border p-6">
                                <h2 className="text-lg font-semibold">Check before you submit</h2>
                                <dl className="grid gap-5 text-sm sm:grid-cols-2">
                                    {Object.entries({
                                        'Full name': [form.data.first_name, form.data.middle_initial, form.data.last_name].filter(Boolean).join(' '),
                                        Email: auth.user.email,
                                        Phone: form.data.phone,
                                        Birthday: form.data.birthday,
                                        'Business name': role === 'seller' || role === 'sorting_center' ? form.data.business_name : null,
                                        Category:
                                            role === 'seller'
                                                ? (categories.find((category) => category.id === Number(form.data.business_category_id))?.name ??
                                                  'Not selected')
                                                : null,
                                        Vehicle: role === 'courier' ? form.data.vehicle_type : null,
                                        'Plate number': role === 'courier' ? form.data.plate_number || 'Not applicable' : null,
                                        'Sorting center':
                                            role === 'courier'
                                                ? (centers.find((center) => center.id === Number(form.data.sorting_center_id))?.name ??
                                                  'Not selected')
                                                : null,
                                        Address: [
                                            [form.data.house_number, form.data.street].filter(Boolean).join(' ') || form.data.line1,
                                            barangays.find((item) => item.code === form.data.barangay_code)?.name ?? form.data.barangay_code,
                                            cities.find((item) => item.code === city)?.name ?? city,
                                            provinces.find((item) => item.code === province)?.name ?? province,
                                            form.data.zip,
                                        ]
                                            .filter(Boolean)
                                            .join(', '),
                                    })
                                        .filter(([, value]) => value !== null)
                                        .map(([label, value]) => (
                                            <div key={label}>
                                                <dt className="text-muted-foreground">{label}</dt>
                                                <dd className="mt-1 font-medium break-words">{value || 'Not provided'}</dd>
                                            </div>
                                        ))}
                                </dl>
                                <div className="border-t pt-4">
                                    <h3 className="font-medium">Documents</h3>
                                    <ul className="text-muted-foreground mt-2 space-y-2 text-sm">
                                        {fileKinds.map((kind) => (
                                            <li key={kind}>
                                                {kind.replaceAll('_', ' ')}:{' '}
                                                {form.data[kind]?.name ??
                                                    (documents.some((document) => document.kind === kind)
                                                        ? 'Saved private document'
                                                        : 'Missing — go back to upload')}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    Your approver will review these details. You will receive the decision by email.
                                </p>
                            </section>
                        )}
                        <label hidden={step !== 'review'} className={`items-start gap-3 text-sm ${step === 'review' ? 'flex' : 'hidden'}`}>
                            <input
                                type="checkbox"
                                id="policy_accepted"
                                checked={form.data.policy_accepted}
                                required
                                disabled={form.processing || step !== 'review'}
                                onChange={(event) => form.setData('policy_accepted', event.target.checked)}
                                className="mt-1"
                            />
                            <span>
                                I confirm that my information is accurate and consent to LubosMart using these details and documents to review my
                                application.
                            </span>
                        </label>
                        <InputError message={form.errors.policy_accepted} />
                        <div className="flex flex-wrap gap-3">
                            {stepIndex > 0 && (
                                <button
                                    type="button"
                                    className={secondaryClass}
                                    disabled={form.processing}
                                    onClick={() => form.setData('current_step', steps[stepIndex - 1].key)}
                                >
                                    <ChevronLeft className="size-4" />
                                    Back
                                </button>
                            )}
                            <button type="button" className={secondaryClass} disabled={form.processing} onClick={saveDraft}>
                                <Save className="size-4" />
                                {form.processing ? 'Saving…' : 'Save draft'}
                            </button>
                            {step === 'review' ? (
                                <button type="submit" className={buttonClass} disabled={form.processing}>
                                    {form.processing ? 'Submitting…' : 'Submit for review'}
                                </button>
                            ) : (
                                <button type="button" className={buttonClass} disabled={form.processing} onClick={next}>
                                    Continue
                                    <ChevronRight className="size-4" />
                                </button>
                            )}
                        </div>
                    </form>
                )}
                {!!documents.length && (
                    <div className="bg-card rounded-2xl border p-6 shadow-sm shadow-black/[.02]">
                        <h2 className="font-semibold">Saved private documents</h2>
                        <ul className="mt-3 space-y-2 text-sm">
                            {documents.map((document) => (
                                <li key={document.id}>
                                    <span>{document.kind.replaceAll('_', ' ')} — saved for your approver</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <Link className="text-sm underline" href={route('logout')} method="post" as="button">
                    Log out
                </Link>
            </div>
        </AppLayout>
    );
}
