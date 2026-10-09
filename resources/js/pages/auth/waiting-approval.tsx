import { secondaryClass } from '@/components/marketplace-ui';
import OnboardingLayout from '@/layouts/onboarding-layout';
import { Link, usePoll } from '@inertiajs/react';
import { Clock3 } from 'lucide-react';

export default function WaitingApproval({ email, approver, submittedAt }: { email: string; approver: string; submittedAt: string | null }) {
    usePoll(10000);
    return (
        <OnboardingLayout title="Waiting for approval" step={4}>
            <Clock3 className="text-primary mb-5 size-10" />
            <h1 className="text-2xl font-semibold">Waiting for approval</h1>
            <p className="text-muted-foreground mt-4 text-sm leading-6">
                Your application is with {approver}. We’ll email <strong className="text-foreground break-all">{email}</strong> when it’s approved or
                if changes are needed.
            </p>
            {submittedAt && <p className="text-muted-foreground mt-3 text-xs">Submitted {new Date(submittedAt).toLocaleString('en-PH')}</p>}
            <p className="text-muted-foreground my-5 text-sm">
                Your role’s menus unlock after approval. Your submitted details are locked during review.
            </p>
            <Link href="/shop" className={secondaryClass}>
                Browse the marketplace
            </Link>
        </OnboardingLayout>
    );
}
