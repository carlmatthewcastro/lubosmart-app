import ProgressStepper from '@/components/shared/progress-stepper';
import { accountIcons } from '@/components/shared/workflow-stages';

export default function RegistrationProgress({
    steps,
    current,
    busy,
    onSelect,
}: {
    steps: string[];
    current: number;
    busy: boolean;
    onSelect: (step: number) => void;
}) {
    return (
        <ProgressStepper
            label="Registration progress"
            className="border-b pb-4"
            disabled={busy}
            onSelect={onSelect}
            stages={steps.map((label, index) => ({
                id: String(index),
                label,
                icon: accountIcons[index],
                state: index < current ? 'completed' : index === current ? 'current' : 'pending',
                description: 'Form navigation; account verification and approval are separate.',
            }))}
        />
    );
}
