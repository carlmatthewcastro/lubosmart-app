import ProgressStepper from '@/components/shared/progress-stepper';
import { accountIcons } from '@/components/shared/workflow-stages';

export default function OnboardingSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
    return (
        <ProgressStepper
            label="Account registration progress"
            layout="responsive"
            stages={['Create account', 'Verify email', 'Complete application', 'Wait for approval'].map((label, index) => ({
                id: String(index),
                label,
                icon: accountIcons[index],
                state: index + 1 < current ? 'completed' : index + 1 === current ? 'current' : 'pending',
            }))}
        />
    );
}
