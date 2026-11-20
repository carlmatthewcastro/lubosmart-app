import OnboardingSteps from '@/components/onboarding/onboarding-steps';
import AccountAccessLayout from '@/layouts/auth/account-access-layout';
import type { ReactNode } from 'react';

export default function OnboardingLayout({
    title,
    step,
    children,
    authenticated = true,
}: {
    title: string;
    step?: 1 | 2 | 3 | 4;
    children: ReactNode;
    authenticated?: boolean;
}) {
    return (
        <AccountAccessLayout title={title} description="" registering verification={authenticated} hideBackLink>
            {step && (
                <div className="mb-4">
                    <OnboardingSteps current={step} />
                </div>
            )}
            <div className="space-y-4 [&>h1]:hidden">{children}</div>
        </AccountAccessLayout>
    );
}
