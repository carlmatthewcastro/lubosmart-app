import { Check } from 'lucide-react';

export default function OnboardingSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
    return (
        <ol aria-label="Account registration progress" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['Create account', 'Verify email', 'Complete application', 'Wait for approval'].map((label, index) => (
                <li key={label} aria-current={index + 1 === current ? 'step' : undefined} className="flex items-center gap-2 text-xs">
                    <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${index + 1 <= current ? 'border-primary bg-accent text-primary' : 'text-muted-foreground'}`}
                    >
                        {index + 1 < current ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                    </span>
                    <span className={index + 1 === current ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
                </li>
            ))}
        </ol>
    );
}
