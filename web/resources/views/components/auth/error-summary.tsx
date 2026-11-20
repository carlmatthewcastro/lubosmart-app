import { registrationLabels } from '@/lib/registration-validation';
import { CircleAlert } from 'lucide-react';

export default function ErrorSummary({ errors, focus }: { errors: Record<string, string | undefined>; focus: (field: string) => void }) {
    const entries = Object.entries(errors).filter((entry): entry is [string, string] => !!entry[1]);
    if (!entries.length) return null;
    return (
        <div role="alert" className="border-destructive/30 bg-destructive/5 rounded-2xl border p-4" tabIndex={-1}>
            <div className="flex items-start gap-3">
                <CircleAlert className="text-destructive mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                    <h2 className="font-semibold">Please check your information</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {entries.length} {entries.length === 1 ? 'field needs' : 'fields need'} your attention. Review the highlighted details below.
                    </p>
                </div>
            </div>
            <ul className="mt-3 space-y-1 pl-8 text-sm">
                {entries.map(([key, message]) => (
                    <li key={key}>
                        <button type="button" onClick={() => focus(key)} className="text-destructive min-h-11 text-left underline underline-offset-4">
                            {registrationLabels[key] ?? key}: {message}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
