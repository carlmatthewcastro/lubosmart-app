import OnboardingLayout from '@/layouts/onboarding-layout';
import { ShieldAlert } from 'lucide-react';

export default function AccountBlocked({ message }: { message: string }) {
    return (
        <OnboardingLayout title="Account access unavailable">
            <ShieldAlert className="text-destructive mb-5 size-10" />
            <h1 className="text-2xl font-semibold">Account access unavailable</h1>
            <p className="text-muted-foreground mt-4 text-sm leading-6">{message}</p>
        </OnboardingLayout>
    );
}
