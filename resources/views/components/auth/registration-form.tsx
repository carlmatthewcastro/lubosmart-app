import AuthFeedback from '@/components/auth/auth-feedback';
import MotorcycleIcon from '@/components/auth/motorcycle-icon';
import PhilippineFlag from '@/components/auth/philippine-flag';
import RegistrationPolicy from '@/components/auth/registration-policy';
import RequiredMark from '@/components/auth/required-mark';
import RiderRegistrationFields, { emptyRiderDetails, type RiderDetails } from '@/components/auth/rider-registration-fields';
import SellerRegistrationFields, {
    type CompanyDetails,
    emptyCompanyDetails,
    emptySellerDetails,
    type SellerDetails,
    Upload,
} from '@/components/auth/seller-registration-fields';
import { buttonClass, inputClass, Select } from '@/components/shared/marketplace-ui';
import { useAuthRequestFeedback } from '@/hooks/use-auth-request-feedback';
import { passwordRequirements, registrationErrors, registrationFieldError } from '@/lib/registration-validation';
import type { SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, LoaderCircle, ShoppingCart, Store, Warehouse } from 'lucide-react';
import { type InputHTMLAttributes, useRef, useState } from 'react';

export type RegistrationRole = 'buyer' | 'seller' | 'courier' | 'sorting_center';
export const authInputClass = inputClass;
export function normalizeRegistrationPhone(value: string) {
    const digits = value.replace(/\D/g, '');
    const national = digits.startsWith('63') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : digits;
    return national ? '63' + national.slice(0, 10) : '';
}
export const registrationRoles = [
    { value: 'buyer', title: 'Buyer', description: 'Discover local favorites', icon: ShoppingCart },
    { value: 'seller', title: 'Seller', description: 'Grow your own store', icon: Store },
    { value: 'courier', title: 'Rider', description: 'Sign up for Logistics approval', icon: MotorcycleIcon },
    { value: 'sorting_center', title: 'Logistics', description: 'Manage deliveries and riders', icon: Warehouse },
] as const;

type Details = RiderDetails &
    SellerDetails &
    CompanyDetails & {
        first_name: string;
        last_name: string;
        phone: string;
        birthday: string;
        sex: string;
        policy_accepted: boolean;
        email: string;
        role: RegistrationRole;
        password: string;
        password_confirmation: string;
    };
export function AuthInput({
    label,
    error,
    hint,
    valid = false,
    phonePrefix = false,
    reserveFeedback = true,
    ...props
}: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    hint?: string;
    valid?: boolean;
    phonePrefix?: boolean;
    reserveFeedback?: boolean;
}) {
    return (
        <div className="grid content-start gap-2 self-start">
            <label htmlFor={props.id} className="min-h-5 text-sm font-medium">
                {label}
                {props.required && <RequiredMark />}
            </label>
            <div className="relative">
                {phonePrefix && (
                    <span
                        className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center border-r px-3 text-sm"
                        aria-hidden="true"
                    >
                        <PhilippineFlag />
                        <span className="ml-2">+63</span>
                    </span>
                )}
                <input
                    className={`${authInputClass} ${phonePrefix ? 'pl-24' : ''} ${valid && !error ? 'border-success' : ''}`}
                    {...props}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
                />
            </div>
            {hint && (
                <p id={`${props.id}-hint`} className="text-muted-foreground text-xs">
                    {hint}
                </p>
            )}
            {(reserveFeedback || error) && <AuthFeedback reserveSpace id={`${props.id}-error`} message={error} />}
        </div>
    );
}
export function Password({
    label,
    hint,
    error,
    valid = false,
    reserveFeedback = true,
    ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; valid?: boolean; reserveFeedback?: boolean }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="grid content-start gap-2 self-start">
            <label htmlFor={props.id} className="min-h-5 text-sm font-medium">
                {label}
                {props.required && <RequiredMark />}
            </label>
            <div className="relative">
                <input
                    {...props}
                    type={visible ? 'text' : 'password'}
                    className={`${authInputClass} pr-12 ${valid && !error ? 'border-success' : ''}`}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
                />
                <button
                    type="button"
                    className="text-muted-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl"
                    aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                    aria-pressed={visible}
                    disabled={props.disabled}
                    onClick={() => setVisible(!visible)}
                >
                    {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>
            {hint && (
                <p id={`${props.id}-hint`} className="text-muted-foreground text-xs">
                    {hint}
                </p>
            )}
            {(reserveFeedback || error) && <AuthFeedback reserveSpace id={`${props.id}-error`} message={error} />}
        </div>
    );
}

export default function RegistrationForm({
    initialRole = 'buyer',
    compact = false,
    fixedRole = false,
}: {
    initialRole?: RegistrationRole;
    compact?: boolean;
    fixedRole?: boolean;
}) {
    const {
        riderCenters = [],
        googleRegistration,
        errors: pageErrors = {},
    } = usePage<
        SharedData & {
            riderCenters?: { id: number; name: string }[];
            googleRegistration?: { first_name: string; last_name: string; email: string } | null;
        }
    >().props;
    const formRef = useRef<HTMLFormElement>(null);
    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [step, setStep] = useState(0);
    const form = useForm<Details>({
        ...emptySellerDetails,
        ...emptyRiderDetails,
        ...emptyCompanyDetails,
        first_name: googleRegistration?.first_name ?? '',
        last_name: googleRegistration?.last_name ?? '',
        phone: '',
        birthday: '',
        sex: '',
        policy_accepted: false,
        email: googleRegistration?.email ?? '',
        role: initialRole,
        password: '',
        password_confirmation: '',
    });
    const allErrors = { ...localErrors, ...registrationErrors(form.errors) };
    const error = (key: keyof Details) => allErrors[key];
    const valid = (key: keyof Details) => !!touched[key] && !error(key) && !registrationFieldError(key, form.data[key], form.data);
    const checkField = (key: keyof Details, value: Details[keyof Details]) => {
        const updated = { ...form.data, [key]: value };
        setTouched((previous) => ({ ...previous, [key]: true }));
        setLocalErrors((previous) => {
            const next = { ...previous };
            const message = registrationFieldError(key, value, updated);
            if (message) next[key] = message;
            else delete next[key];
            if (key === 'password' && touched.password_confirmation) {
                const confirmation = registrationFieldError('password_confirmation', updated.password_confirmation, updated);
                if (confirmation) next.password_confirmation = confirmation;
                else delete next.password_confirmation;
            }
            return next;
        });
        form.clearErrors(key);
        if (key === 'password_confirmation' && /confirmation|do not match|don.t match/i.test(form.errors.password ?? ''))
            form.clearErrors('password');
    };
    const busy = form.processing;
    const { requestError: connectionError, setRequestError: setConnectionError } = useAuthRequestFeedback(busy);
    const selectedRole = form.data.role;
    const steps = [
        'Personal information',
        selectedRole === 'buyer' ? 'Address & ID' : selectedRole === 'courier' ? 'Rider details & documents' : 'Business information',
        'Review & submit',
    ];
    const personalFields = ['first_name', 'middle_initial', 'last_name', 'phone', 'email', 'birthday', 'sex'];
    const securityFields = ['password', 'password_confirmation', 'policy_accepted'];
    const dateParts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts();
    const today = ['year', 'month', 'day'].map((type) => dateParts.find((part) => part.type === type)?.value).join('-');
    const missingPasswordRules = passwordRequirements(form.data.password).filter((rule) => !rule.met);
    const birthDate = new Date(`${form.data.birthday}T00:00:00Z`);
    const currentDate = new Date(`${today}T00:00:00Z`);
    const age =
        form.data.birthday && !Number.isNaN(birthDate.valueOf()) && birthDate <= currentDate
            ? currentDate.getUTCFullYear() -
              birthDate.getUTCFullYear() -
              (currentDate.getUTCMonth() < birthDate.getUTCMonth() ||
              (currentDate.getUTCMonth() === birthDate.getUTCMonth() && currentDate.getUTCDate() < birthDate.getUTCDate())
                  ? 1
                  : 0)
            : '';
    const setDetails = (key: keyof Details, value: string | File | null | string[]) =>
        form.setData((previous) => {
            const next = { ...previous, [key]: value };
            if (key === 'house_number' || key === 'street') next.line1 = `${next.house_number} ${next.street}`.trim();
            return next;
        });
    const focusField = (key: string) => {
        if (key !== 'google' && key !== 'role') setStep(personalFields.includes(key) ? 0 : securityFields.includes(key) ? 2 : 1);
        requestAnimationFrame(() => {
            const field = formRef.current?.querySelector<HTMLElement>(`[name="${key.split('.')[0]}"]`);
            field?.focus();
            field?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
        });
    };
    const changeStep = (next: number) => {
        setStep(next);
        requestAnimationFrame(() => {
            const section = formRef.current?.querySelector<HTMLElement>(`[data-registration-step="${next}"]`);
            section?.focus({ preventScroll: true });
            section?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
        });
    };
    const advance = () => {
        const fields =
            formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
                `[data-registration-step="${step}"] input, [data-registration-step="${step}"] select`,
            ) ?? [];
        const invalid: Record<string, string> = {};
        for (const field of fields) {
            if (!(field.name in form.data) || field.type === 'checkbox' || (!field.required && !field.value)) continue;
            const key = field.name as keyof Details;
            const message = registrationFieldError(key, form.data[key], form.data);
            if (message) invalid[key] = message;
        }
        if (step === 1 && selectedRole === 'sorting_center' && !form.data.service_regions.length)
            invalid.service_regions = 'Select at least one service area.';
        if (Object.keys(invalid).length) {
            setLocalErrors(invalid);
            focusField(Object.keys(invalid)[0]);
            return;
        }
        setLocalErrors({});
        changeStep(Math.min(step + 1, 2));
    };
    const focusError = (errors: Record<string, string>) =>
        requestAnimationFrame(() => {
            const key = Object.keys(errors)[0];
            focusField(Object.keys(registrationErrors({ [key]: errors[key] }))[0] ?? key);
        });

    return (
        <form
            ref={formRef}
            className={compact ? 'space-y-5' : 'space-y-6'}
            aria-busy={busy}
            noValidate
            onBlurCapture={(event) => {
                const field = event.target as unknown as HTMLInputElement;
                if (field.name in form.data && field.type !== 'radio')
                    checkField(field.name as keyof Details, form.data[field.name as keyof Details]);
            }}
            onChangeCapture={(event) => {
                const field = event.target as HTMLInputElement;
                if (!(field.name in form.data) || field.type === 'radio') return;
                if (field.name === 'service_regions') {
                    const selected = field.checked
                        ? [...form.data.service_regions, field.value]
                        : form.data.service_regions.filter((code) => code !== field.value);
                    if (touched.service_regions || error('service_regions')) checkField('service_regions', selected);
                    else form.clearErrors('service_regions');
                    return;
                }
                const key = field.name as keyof Details;
                if (touched[key] || error(key) || field.type === 'file')
                    checkField(
                        key,
                        field.type === 'checkbox'
                            ? field.checked
                            : field.type === 'file'
                              ? (field.files?.[0] ?? null)
                              : key === 'phone'
                                ? normalizeRegistrationPhone(field.value)
                                : field.value,
                    );
            }}
            onSubmit={(event) => {
                event.preventDefault();
                if (busy) return;
                if (step < 2) {
                    advance();
                    return;
                }
                setConnectionError('');
                form.clearErrors();
                form.post(route('register'), {
                    onError: focusError,
                    onCancel: () => setConnectionError('Registration was interrupted. Your details are saved on this page; please try again.'),
                    onFinish: () => form.reset('password', 'password_confirmation'),
                });
            }}
        >
            <AuthFeedback message={allErrors.google ?? pageErrors.google} />
            {googleRegistration && (
                <p className="bg-accent/40 rounded-xl border p-4 text-sm">
                    Your Google name and email are filled in. Complete your details, choose a password, and submit your requirements.
                </p>
            )}
            <fieldset disabled={busy} hidden={fixedRole} className="space-y-3">
                <legend className="mb-1 text-sm font-semibold">Join as</legend>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {registrationRoles.map(({ value, title, description, icon: Icon }) => (
                        <label
                            key={value}
                            className={`relative flex cursor-pointer gap-2 rounded-xl border p-3 transition ${compact ? 'items-center' : 'sm:p-4'} ${selectedRole === value ? 'border-primary bg-accent/60 ring-primary/10 ring-1' : 'bg-card hover:border-primary/40'} ${busy ? 'opacity-60' : ''}`}
                        >
                            <input
                                className="peer sr-only"
                                type="radio"
                                name="role"
                                value={value}
                                checked={selectedRole === value}
                                onChange={() => {
                                    setLocalErrors({});
                                    setTouched({});
                                    setStep(0);
                                    form.setData('role', value);
                                    form.clearErrors();
                                }}
                            />
                            <span className="peer-focus-visible:outline-ring pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2" />
                            <Icon className={`size-4 shrink-0 ${selectedRole === value ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="min-w-0">
                                <span className={`text-sm font-semibold ${selectedRole === value ? 'text-primary' : ''}`}>{title}</span>
                                <span className={compact ? 'sr-only' : 'text-muted-foreground mt-1 block text-xs leading-relaxed'}>
                                    {description}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
                <AuthFeedback message={error('role')} />
            </fieldset>
            {
                <ol
                    aria-label={selectedRole === 'courier' ? 'Rider registration progress' : 'Registration progress'}
                    className="grid grid-cols-3 gap-3 border-b pb-6"
                >
                    {steps.map((label, index) => (
                        <li key={label} className="min-w-0 text-center">
                            <button
                                type="button"
                                disabled={busy || index > step}
                                aria-current={index === step ? 'step' : undefined}
                                onClick={() => changeStep(index)}
                                className="flex min-h-11 w-full flex-col items-center gap-2 text-xs sm:text-sm"
                            >
                                <span
                                    className={`auth-step-indicator flex size-9 items-center justify-center rounded-full border font-semibold ${index === step ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground'}`}
                                >
                                    {index + 1}
                                </span>
                                <span>{label}</span>
                            </button>
                        </li>
                    ))}
                </ol>
            }
            <>
                <AuthFeedback message={connectionError} />
                <div
                    data-registration-step="0"
                    tabIndex={-1}
                    aria-label="Personal and contact information"
                    hidden={step !== 0}
                    className="registration-section space-y-5 focus:outline-none"
                >
                    <div className="border-b pb-4">
                        <h2 className="font-semibold">Personal and contact information</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Fields marked * are required. Your email and mobile number must be unique.
                        </p>
                    </div>
                    <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="contents">
                            {(['first_name', 'middle_initial', 'last_name'] as const).map((field) => (
                                <AuthInput
                                    key={field}
                                    label={field === 'first_name' ? 'First name' : field === 'middle_initial' ? 'Middle initial' : 'Last name'}
                                    id={field}
                                    name={field}
                                    autoComplete={
                                        field === 'first_name' ? 'given-name' : field === 'middle_initial' ? 'additional-name' : 'family-name'
                                    }
                                    required={field !== 'middle_initial'}
                                    minLength={field === 'middle_initial' ? undefined : 2}
                                    pattern={
                                        field === 'middle_initial'
                                            ? "(?=[^\\p{L}]*\\p{L})[\\p{L}\\p{M} .'\\-]+"
                                            : "(?=(?:[^\\p{L}]*\\p{L}){2})[\\p{L}\\p{M} .'\\-]+"
                                    }
                                    maxLength={field === 'middle_initial' ? 10 : 50}
                                    disabled={busy}
                                    value={form.data[field]}
                                    onChange={(event) => form.setData(field, event.target.value)}
                                    error={error(field)}
                                    valid={valid(field)}
                                />
                            ))}
                        </div>
                        {
                            <Select
                                label="Sex *"
                                required
                                reserveFeedback
                                id="register-sex"
                                name="sex"
                                disabled={busy}
                                value={form.data.sex}
                                onChange={(event) => form.setData('sex', event.target.value)}
                                error={error('sex')}
                            >
                                <option value="">Select an option</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="prefer_not_to_say">Prefer not to say</option>
                            </Select>
                        }
                        <AuthInput
                            label="Mobile number"
                            id="register-phone"
                            name="phone"
                            type="tel"
                            autoComplete="tel"
                            required
                            phonePrefix
                            placeholder="9XXXXXXXXX"
                            maxLength={13}
                            inputMode="numeric"
                            disabled={busy}
                            value={form.data.phone.startsWith('63') ? form.data.phone.slice(2) : form.data.phone}
                            onChange={(event) => {
                                form.setData('phone', normalizeRegistrationPhone(event.target.value));
                            }}
                            error={error('phone')}
                            valid={valid('phone')}
                        />
                        {
                            <AuthInput
                                label="Date of birth"
                                id="register-birthday"
                                name="birthday"
                                type="date"
                                max={today}
                                required
                                disabled={busy}
                                value={form.data.birthday}
                                onChange={(event) => form.setData('birthday', event.target.value)}
                                error={error('birthday')}
                                valid={valid('birthday')}
                            />
                        }
                        <AuthInput label="Age" id="register-age" value={age} readOnly />
                        <div className="grid items-start gap-3 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-5">
                            <AuthInput
                                label="Email address"
                                id="auth-register-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                required
                                maxLength={160}
                                disabled={busy}
                                readOnly={!!googleRegistration}
                                value={form.data.email}
                                onChange={(e) => {
                                    form.setData('email', e.target.value);
                                    form.clearErrors('email');
                                }}
                                error={error('email')}
                                valid={valid('email')}
                            />
                            <div className="flex justify-end sm:pt-7">
                                <button type="button" disabled={busy} onClick={advance} className={`auth-action-button ${buttonClass}`}>
                                    Continue
                                    <ChevronRight className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {['seller', 'sorting_center'].includes(selectedRole) && (
                    <div
                        data-registration-step="1"
                        tabIndex={-1}
                        aria-label="Business information and required documents"
                        hidden={step !== 1}
                        className="registration-section focus:outline-none"
                    >
                        <SellerRegistrationFields
                            company={form.data.role === 'sorting_center'}
                            data={form.data}
                            errors={allErrors}
                            disabled={busy}
                            set={setDetails}
                        />
                    </div>
                )}
                {selectedRole === 'courier' && (
                    <div
                        data-registration-step="1"
                        tabIndex={-1}
                        aria-label="Rider details and required documents"
                        hidden={step !== 1}
                        className="registration-section focus:outline-none"
                    >
                        <RiderRegistrationFields data={form.data} errors={allErrors} centers={riderCenters} disabled={busy} set={setDetails} />
                    </div>
                )}
                {selectedRole === 'buyer' && (
                    <section
                        data-registration-step="1"
                        tabIndex={-1}
                        hidden={step !== 1}
                        className="registration-section space-y-4 focus:outline-none"
                        aria-label="Address and identity document"
                    >
                        <SellerRegistrationFields personalAddressOnly data={form.data} errors={allErrors} disabled={busy} set={setDetails} />
                        <h2 className="font-semibold">Identity document</h2>
                        <Upload
                            kind="identity"
                            label="Valid government ID"
                            file={form.data.identity}
                            error={error('identity')}
                            disabled={busy}
                            existing={false}
                            set={(_, file) => form.setData('identity', file)}
                        />
                    </section>
                )}
                {step === 1 && (
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => changeStep(0)}
                            className="text-primary inline-flex min-h-11 items-center gap-2 rounded-xl border px-5"
                        >
                            <ChevronLeft className="size-4" aria-hidden="true" />
                            Back
                        </button>
                        <button type="button" disabled={busy} onClick={advance} className={buttonClass + ' auth-action-button ml-auto'}>
                            Continue
                            <ChevronRight className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                )}
                <div
                    data-registration-step="2"
                    tabIndex={-1}
                    aria-label="Review and account security"
                    hidden={step !== 2}
                    className="registration-section space-y-5 focus:outline-none"
                >
                    {
                        <section className="bg-accent/40 grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2" aria-label="Registration review">
                            <p>
                                <span className="text-muted-foreground block text-xs">Name</span>
                                {form.data.first_name} {form.data.middle_initial} {form.data.last_name}
                            </p>
                            <p className="break-all">
                                <span className="text-muted-foreground block text-xs">Email</span>
                                {form.data.email}
                            </p>
                            <p>
                                <span className="text-muted-foreground block text-xs">Sex</span>
                                {form.data.sex === 'female'
                                    ? 'Female'
                                    : form.data.sex === 'male'
                                      ? 'Male'
                                      : form.data.sex === 'prefer_not_to_say'
                                        ? 'Prefer not to say'
                                        : 'Not provided'}
                            </p>
                            <p>
                                <span className="text-muted-foreground block text-xs">Mobile number</span>
                                {form.data.phone}
                            </p>
                            <p>
                                <span className="text-muted-foreground block text-xs">Date of birth / age</span>
                                {form.data.birthday} / {age}
                            </p>
                            {selectedRole === 'buyer' && (
                                <p className="break-all">
                                    <span className="text-muted-foreground block text-xs">Identity document</span>
                                    {form.data.identity?.name ?? 'Not provided'}
                                </p>
                            )}
                            <p className="break-words">
                                <span className="text-muted-foreground block text-xs">
                                    {selectedRole === 'buyer'
                                        ? 'Address'
                                        : selectedRole === 'courier'
                                          ? 'Vehicle / plate'
                                          : selectedRole === 'seller'
                                            ? 'Shop'
                                            : 'Company'}
                                </span>
                                {selectedRole === 'buyer'
                                    ? `${form.data.line1}, ${form.data.zip}`
                                    : selectedRole === 'courier'
                                      ? `${form.data.vehicle_type} / ${form.data.plate_number}`
                                      : form.data.business_name}
                            </p>
                        </section>
                    }
                    <div className="border-b pb-4">
                        <h2 className="font-semibold">Account security</h2>
                        <p className="text-muted-foreground mt-1 text-sm">Choose a password you do not use elsewhere.</p>
                    </div>
                    <div className={`grid items-start gap-4 ${compact ? '' : 'sm:grid-cols-2'}`}>
                        <Password
                            label="Password"
                            id="auth-register-password"
                            name="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            disabled={busy}
                            value={form.data.password}
                            onChange={(e) => {
                                form.setData('password', e.target.value);
                                form.clearErrors('password');
                            }}
                            error={
                                error('password') ||
                                (form.data.password && missingPasswordRules.length
                                    ? `Your password still needs: ${missingPasswordRules.map((rule) => rule.label.toLowerCase()).join(', ')}.`
                                    : undefined)
                            }
                        />
                        <Password
                            label="Confirm password"
                            id="auth-register-password-confirmation"
                            name="password_confirmation"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            disabled={busy}
                            value={form.data.password_confirmation}
                            onChange={(e) => {
                                form.setData('password_confirmation', e.target.value);
                                form.clearErrors('password_confirmation');
                            }}
                            error={error('password_confirmation')}
                            valid={valid('password_confirmation')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-start gap-3 text-sm">
                            <input
                                id="register-policy"
                                aria-label="By signing up you agree to our Terms and conditions and Privacy policy"
                                name="policy_accepted"
                                type="checkbox"
                                className="accent-primary mt-1 size-4 shrink-0"
                                required
                                disabled={busy}
                                checked={form.data.policy_accepted}
                                onChange={(event) => form.setData('policy_accepted', event.target.checked)}
                                aria-invalid={!!error('policy_accepted')}
                                aria-describedby={error('policy_accepted') ? 'register-policy-error' : undefined}
                            />
                            <div className="leading-relaxed">
                                <label htmlFor="register-policy">By signing up you agree to our </label>
                                <RegistrationPolicy label="Terms and conditions" />
                                {' and '}
                                <RegistrationPolicy label="Privacy policy" />.
                            </div>
                        </div>
                        <AuthFeedback
                            id="register-policy-error"
                            message={
                                error('policy_accepted')
                                    ? 'Please agree to the Terms and conditions and Privacy policy before creating your account.'
                                    : undefined
                            }
                        />
                    </div>
                    <p className="text-muted-foreground text-sm">
                        After email verification, wait for {selectedRole === 'courier' ? 'your Logistics company' : 'the administrator'} to review
                        your registration. The decision will be sent to your email.
                    </p>
                </div>
                <div hidden={step !== 2}>
                    <div className="space-y-4">
                        <button type="submit" className={`auth-action-button ${buttonClass} w-full`} disabled={busy}>
                            {form.processing ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                            {form.processing ? 'Creating your account…' : 'Create my account'}
                        </button>
                        {form.processing && (
                            <p role="status" className="text-muted-foreground text-center text-sm">
                                {form.progress
                                    ? `Uploading your requirements: ${form.progress.percentage ?? 0}%`
                                    : 'Saving your registration and requirements…'}
                            </p>
                        )}
                    </div>
                </div>
            </>
        </form>
    );
}
