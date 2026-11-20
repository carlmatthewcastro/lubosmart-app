import AccountRoleOptions from '@/components/auth/account-role-options';
import RegistrationForm, { registrationRoles } from '@/components/auth/registration-form';
import AccountAccessLayout from '@/layouts/auth/account-access-layout';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function Register() {
    const { url } = usePage();
    const role = new URLSearchParams(url.split('?')[1] ?? '').get('role');
    const selected = registrationRoles.find((item) => item.value === role);
    const [choice, setChoice] = useState<(typeof registrationRoles)[number]['value']>('buyer');
    return (
        <AccountAccessLayout
            key={selected?.value ?? 'roles'}
            registering
            registrationDetails={!!selected}
            title={selected ? selected.title + ' registration' : 'Create an Account'}
            description={
                selected
                    ? 'Complete your details and requirements, then verify your email.'
                    : 'Get started with LubosMart. Choose your account type to continue.'
            }
        >
            {selected ? (
                <>
                    <RegistrationForm key={selected.value} initialRole={selected.value} fixedRole />
                </>
            ) : (
                <>
                    <AccountRoleOptions value={choice} onChange={setChoice} />
                    <Link
                        data-role-choice={choice}
                        href={route('register', { role: choice })}
                        className="auth-reference-primary auth-reference-continue"
                    >
                        Continue <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                    <p className="auth-reference-footer">
                        Already have an account? <Link href={route('login')}>Sign In</Link>
                    </p>
                </>
            )}
        </AccountAccessLayout>
    );
}
