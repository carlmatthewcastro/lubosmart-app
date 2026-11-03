import { Card, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, LoaderCircle, MapPin, ShieldCheck } from 'lucide-react';
import { FormEventHandler } from 'react';

import EmailCodeConfirmation from '@/components/auth/email-code-confirmation';
import InputError from '@/components/auth/input-error';
import DeleteUser from '@/components/settings/delete-user';
import SettingsPage from '@/components/settings/settings-page';
import HeadingSmall from '@/components/shared/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Account Settings',
        href: '/settings/profile',
    },
];

export default function Profile({
    mustVerifyEmail,
    status,
    googleConnected,
    googleOnly,
    sensitiveConfirmed,
    businessName,
    bankAccount,
    plateNumber,
    logisticsRegistration,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    googleConnected: boolean;
    googleOnly: boolean;
    sensitiveConfirmed: boolean;
    businessName: string | null;
    bankAccount: string | null;
    plateNumber: string | null;
    logisticsRegistration: Record<string, Record<string, string | null>> | null;
}) {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth.user.role === 'admin';
    const isLogistics = auth.user.role === 'logistics';

    const { data, setData, transform, post, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        email: auth.user.email,
        phone: auth.user.phone ?? '',
        current_password: '',
        _method: 'patch',
        identity: null as File | null,
        ...(['seller', 'logistics'].includes(auth.user.role) && businessName ? { business_name: businessName, bank_account: bankAccount ?? '' } : {}),
        ...(auth.user.role === 'rider' && plateNumber ? { plate_number: plateNumber } : {}),
        ...(auth.user.role === 'rider' ? { bank_account: bankAccount ?? '' } : {}),
    });

    const sensitiveDetailsChanged =
        data.email !== auth.user.email ||
        data.phone !== (auth.user.phone ?? '') ||
        (data.bank_account !== undefined && data.bank_account !== (bankAccount ?? ''));
    const showEmailConfirmation = !isAdmin && (!isLogistics || sensitiveDetailsChanged);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        transform((values) => (isAdmin ? { name: values.name, _method: values._method } : values));
        post(route('profile.update'), { forceFormData: true, onSuccess: () => setData('current_password', '') });
    };

    return (
        <SettingsPage title="Profile settings" breadcrumbs={breadcrumbs}>
            <Head title="Account Settings" />

            {status && (
                <p role="status" className="text-primary mb-4 text-sm">
                    {status}
                </p>
            )}
            {showEmailConfirmation && <EmailCodeConfirmation purpose="profile" confirmed={sensitiveConfirmed} />}
            <Card>
                <div className="mb-6 flex items-center gap-4">
                    <span className="bg-accent text-primary flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold">
                        {auth.user.name
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join('')
                            .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-xl font-semibold break-words">
                            {isAdmin ? 'Admin Account' : isLogistics ? auth.user.name : 'My Profile'}
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {isAdmin ? 'Your administrator profile.' : 'Manage and protect your LubosMart account.'}
                        </p>
                    </div>
                </div>
                {!isAdmin && (!isLogistics || googleConnected) && (
                    <div className="mb-6 flex flex-wrap gap-2 border-b pb-6 text-xs">
                        {!isLogistics && (
                            <span className="bg-accent text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium">
                                <ShieldCheck className="size-3.5" />
                                {auth.user.email_verified_at ? 'Email Verified' : 'Verify your email'}
                            </span>
                        )}
                        {googleConnected && <span className="bg-muted text-muted-foreground rounded-full px-3 py-1.5">Google connected</span>}
                    </div>
                )}

                <ValidatedForm id="contact-details" tabIndex={-1} onSubmit={submit} className="scroll-mt-24 space-y-6" aria-busy={processing}>
                    <fieldset disabled={processing} className="grid gap-6 disabled:opacity-70">
                        <legend className="mb-4 text-sm font-semibold">
                            {isAdmin ? 'Profile' : isLogistics ? 'Contact details' : 'Personal Information'}
                        </legend>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Display Name</Label>

                            <Input
                                id="name"
                                name="name"
                                className="mt-1 block min-h-11 w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                maxLength={160}
                                minLength={2}
                                pattern={"(?=(?:[^\\p{L}]*\\p{L}){2})[\\p{L}\\p{M} .'\\-]+"}
                                autoComplete="name"
                                placeholder="Full name"
                                aria-invalid={!!errors.name}
                                aria-describedby={errors.name ? 'profile-name-error' : 'profile-name-hint'}
                            />

                            <InputError id="profile-name-error" message={errors.name} />
                            <p id="profile-name-hint" className="text-muted-foreground text-xs leading-relaxed">
                                Full name: 2–160 characters, with at least two letters.{' '}
                                {isAdmin ? (
                                    'Displayed in messages and activity history.'
                                ) : (
                                    <>
                                        {googleConnected
                                            ? 'Your name was filled from Google at signup. Edit it anytime; this does not change your Google account.'
                                            : 'Choose the name shown on your LubosMart account.'}{' '}
                                        Legal name details for partner verification are managed in your application.
                                    </>
                                )}
                            </p>
                        </div>
                    </fieldset>

                    {!isAdmin && (
                        <fieldset disabled={processing} className="grid gap-5 border-t pt-6 disabled:opacity-70">
                            <legend className="float-left mb-4 w-full text-sm font-semibold">Contact details</legend>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>

                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    className="mt-1 block min-h-11 w-full"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                    maxLength={160}
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    placeholder="Email address"
                                    aria-invalid={!!errors.email}
                                    aria-describedby={errors.email ? 'profile-email-error' : 'profile-email-hint'}
                                />

                                <InputError id="profile-email-error" message={errors.email} />
                                <p id="profile-email-hint" className="text-muted-foreground text-xs leading-relaxed">
                                    Changing this address requires email verification again.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">Contact number</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    className="min-h-11"
                                    type="tel"
                                    autoComplete="tel"
                                    maxLength={30}
                                    value={data.phone}
                                    onChange={(event) => setData('phone', event.target.value)}
                                    placeholder="09XX XXX XXXX"
                                    aria-invalid={!!errors.phone}
                                    aria-describedby={errors.phone ? 'profile-phone-error' : 'profile-phone-hint'}
                                />
                                <InputError id="profile-phone-error" message={errors.phone} />
                                <p id="profile-phone-hint" className="text-muted-foreground text-xs">
                                    For delivery contact. Sign in with your email address.
                                </p>
                            </div>
                        </fieldset>
                    )}

                    {mustVerifyEmail && auth.user.email_verified_at === null && (
                        <div>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Your email address is unverified.
                                <Link
                                    href={route('verification.send')}
                                    method="post"
                                    as="button"
                                    className="rounded-md text-sm text-neutral-600 underline hover:text-neutral-900 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                                >
                                    Click here to re-send the verification email.
                                </Link>
                            </p>

                            {status === 'verification-link-sent' && (
                                <div className="mt-2 text-sm font-medium text-green-600">
                                    A new verification link has been sent to your email address.
                                </div>
                            )}
                        </div>
                    )}

                    {['seller', 'logistics'].includes(auth.user.role) && businessName && (
                        <fieldset className="grid gap-4 border-t pt-5">
                            <legend className="font-semibold">Business details</legend>
                            <p className="text-muted-foreground text-sm">
                                Changing your business name or bank account requires another admin review.
                            </p>
                            <Label htmlFor="business_name">Business name</Label>
                            <Input
                                id="business_name"
                                value={data.business_name ?? ''}
                                onChange={(event) => setData('business_name', event.target.value)}
                            />
                            <InputError message={errors.business_name} />
                            <Label htmlFor="bank_account">Bank account details</Label>
                            <Input
                                id="bank_account"
                                value={data.bank_account ?? ''}
                                onChange={(event) => setData('bank_account', event.target.value)}
                            />
                            <InputError message={errors.bank_account} />
                        </fieldset>
                    )}
                    {auth.user.role === 'rider' && (
                        <div className="grid gap-2">
                            <Label htmlFor="rider_bank_account">Bank account details</Label>
                            <Input
                                id="rider_bank_account"
                                value={data.bank_account ?? ''}
                                onChange={(event) => setData('bank_account', event.target.value)}
                            />
                            <InputError message={errors.bank_account} />
                            <p className="text-muted-foreground text-sm">
                                Changes require confirmation and another review by your logistics company.
                            </p>
                        </div>
                    )}
                    {auth.user.role === 'rider' && plateNumber && (
                        <div className="grid gap-2">
                            <Label htmlFor="plate_number">Plate Number</Label>
                            <Input
                                id="plate_number"
                                value={data.plate_number ?? ''}
                                onChange={(event) => setData('plate_number', event.target.value)}
                            />
                            <InputError message={errors.plate_number} />
                            <p className="text-muted-foreground text-sm">
                                Changing your plate number requires another review by your logistics company.
                            </p>
                        </div>
                    )}
                    {['buyer', 'seller', 'rider', 'logistics'].includes(auth.user.role) && (
                        <div className="grid gap-2">
                            <Label htmlFor="identity">Replace photo ID (JPG, PNG or PDF, up to 5 MB)</Label>
                            <Input
                                id="identity"
                                type="file"
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={(event) => setData('identity', event.target.files?.[0] ?? null)}
                            />
                            <InputError message={errors.identity} />
                            <p className="text-muted-foreground text-sm">Replacing your ID sends your account back for approval.</p>
                        </div>
                    )}
                    {!isAdmin && !isLogistics && !googleOnly && (
                        <div className="grid gap-2">
                            <Label htmlFor="current_password">
                                {showEmailConfirmation ? 'Current password (or confirm an email code above)' : 'Current password'}
                            </Label>
                            <Input
                                id="current_password"
                                type="password"
                                autoComplete="current-password"
                                value={data.current_password}
                                onChange={(event) => setData('current_password', event.target.value)}
                            />
                            <InputError message={errors.current_password} />
                        </div>
                    )}
                    <div className="flex items-center gap-4">
                        <InputError message={(errors as Record<string, string>).code} />
                        <Button disabled={processing} className="min-h-11 px-6">
                            {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                            {processing ? 'Saving…' : 'Save Changes'}
                        </Button>

                        <Transition
                            show={recentlySuccessful}
                            enter="transition ease-in-out"
                            enterFrom="opacity-0"
                            leave="transition ease-in-out"
                            leaveTo="opacity-0"
                        >
                            <p role="status" className="text-primary flex items-center gap-2 text-sm">
                                <CheckCircle2 className="size-4" />
                                Saved
                            </p>
                        </Transition>
                    </div>
                </ValidatedForm>
            </Card>
            {isLogistics && logisticsRegistration && (
                <Card>
                    <HeadingSmall
                        title="Registration details"
                        description="Your submitted registration information. Registered records are shown below for reference."
                    />
                    <div className="mt-6 space-y-6">
                        {Object.entries(logisticsRegistration).map(([section, values]) => (
                            <section
                                key={section}
                                id={
                                    {
                                        'Personal details': 'personal-information',
                                        'Company registration': 'business-details',
                                        'Submitted documents': 'submitted-documents',
                                    }[section]
                                }
                                tabIndex={-1}
                                className="scroll-mt-24 space-y-4"
                            >
                                <h3 className="font-semibold">{section}</h3>
                                <dl className="grid gap-4 sm:grid-cols-2">
                                    {Object.entries(values).map(([label, value]) => (
                                        <div key={label} className="min-w-0">
                                            <dt className="text-muted-foreground text-sm">{label}</dt>
                                            <dd className="mt-1 text-sm break-words">{value || 'Not provided'}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>
                        ))}
                    </div>
                    <Link href="/settings/addresses" className={`${secondaryClass} mt-6`}>
                        <MapPin className="size-4" /> Edit registered address
                    </Link>
                </Card>
            )}
            {!isAdmin && !isLogistics && (
                <Card>
                    <HeadingSmall title="Make it yours" description="Finish account setup whenever you need to." />
                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link href="/settings/addresses" className={secondaryClass}>
                            <MapPin className="size-4" />
                            Manage addresses
                        </Link>
                        <Link href="/settings/password" className={secondaryClass}>
                            <ShieldCheck className="size-4" />
                            Change Password
                        </Link>
                    </div>
                </Card>
            )}

            {!isAdmin && !isLogistics && <DeleteUser />}
        </SettingsPage>
    );
}
