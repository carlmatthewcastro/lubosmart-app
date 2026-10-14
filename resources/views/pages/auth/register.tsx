import RegistrationForm, { registrationRoles } from '@/components/auth/registration-form';
import AccountAccessLayout from '@/layouts/auth/account-access-layout';
import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function Register() {
    const { url } = usePage();
    const role = new URLSearchParams(url.split('?')[1] ?? '').get('role');
    const selected = registrationRoles.find((item) => item.value === role);
    return (
        <AccountAccessLayout
            registering
            hideBackLink={!!selected}
            title={selected ? `${selected.title} registration` : 'Join LubosMart'}
            description={
                selected ? 'Complete your details and requirements, then verify your email.' : 'Choose how you want to join your local marketplace.'
            }
        >
            {selected ? (
                <>
                    <Link href={route('register')} className="text-primary mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium">
                        <ArrowLeft className="size-4" aria-hidden="true" /> Choose a different role
                    </Link>
                    <RegistrationForm key={selected.value} initialRole={selected.value} fixedRole />
                </>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2" aria-label="Choose your registration role">
                    {registrationRoles.map(({ value, title, description, icon: Icon }) => (
                        <Link
                            key={value}
                            href={route('register', { role: value })}
                            data-role-choice={value}
                            className="registration-role-card group bg-card hover:border-primary hover:bg-accent/40 focus-visible:ring-ring flex min-w-0 flex-col gap-5 rounded-2xl border p-6 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
                        >
                            <span className="bg-accent text-primary flex size-14 items-center justify-center rounded-2xl">
                                <Icon className="size-7" aria-hidden="true" />
                            </span>
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold">{title}</h2>
                                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                            </div>
                            <span className="text-primary mt-auto inline-flex items-center gap-2 text-sm font-semibold">
                                Join as {title}
                                <ArrowRight className="registration-role-arrow size-4" aria-hidden="true" />
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </AccountAccessLayout>
    );
}
