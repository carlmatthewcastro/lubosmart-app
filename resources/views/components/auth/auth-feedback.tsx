import { CircleAlert, CircleCheck } from 'lucide-react';

export default function AuthFeedback({
    message,
    id,
    tone = 'error',
    reserveSpace = false,
}: {
    message?: string;
    id?: string;
    tone?: 'error' | 'warning' | 'success';
    reserveSpace?: boolean;
}) {
    if (!message) return reserveSpace ? <div className="min-h-5" aria-hidden="true" /> : null;
    const Icon = tone === 'success' ? CircleCheck : CircleAlert;

    return (
        <p
            id={id}
            role={tone === 'error' ? 'alert' : 'status'}
            className={
                reserveSpace
                    ? `flex min-h-5 items-start gap-2 text-xs leading-5 ${tone === 'error' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : 'text-success'}`
                    : `flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${tone === 'error' ? 'border-destructive/30 bg-destructive/5 text-destructive' : tone === 'warning' ? 'border-warning/30 bg-warning/5 text-warning' : 'border-success/30 bg-success/5 text-success'}`
            }
        >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </p>
    );
}
