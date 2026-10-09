import { buttonClass } from '@/components/marketplace-ui';
import OnboardingLayout from '@/layouts/onboarding-layout';
import { Link } from '@inertiajs/react';

export default function VerificationResult({ verified }: { verified: boolean }) {
    return (
        <OnboardingLayout title={verified ? 'Email verified' : 'Verification link unavailable'} authenticated={false}>
            <h1 className="text-2xl font-semibold">{verified ? 'Your email is verified' : 'This verification link is unavailable'}</h1>
            <p className="text-muted-foreground my-5 text-sm">
                {verified
                    ? 'Return to the tab where you created your account, or log in to complete your application.'
                    : 'The link may have expired, already been used, or been replaced. Log in to check your email status and request a new link if needed.'}
            </p>
            <Link href="/login" className={buttonClass}>
                Continue to log in
            </Link>
        </OnboardingLayout>
    );
}
