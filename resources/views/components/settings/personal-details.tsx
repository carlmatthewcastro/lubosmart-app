import { LockKeyhole, UserRound } from 'lucide-react';

type PersonalDetailsProps = {
    firstName?: string | null;
    middleInitial?: string | null;
    lastName?: string | null;
    sex?: string | null;
    dateOfBirth?: string | null;
    age?: number | string | null;
};

function formatBirthDate(value?: string | null) {
    if (!value) return 'Not provided';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())
        ? 'Not provided'
        : new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export default function PersonalDetails({ firstName, middleInitial, lastName, sex, dateOfBirth, age }: PersonalDetailsProps) {
    const initial = middleInitial?.trim();
    const fullName = [firstName?.trim(), initial ? (initial.endsWith('.') ? initial : `${initial}.`) : '', lastName?.trim()]
        .filter(Boolean)
        .join(' ');
    const sexLabel =
        { male: 'Male', female: 'Female', prefer_not_to_say: 'Prefer not to say', 'prefer not to say': 'Prefer not to say' }[
            sex?.toLowerCase() ?? ''
        ] ??
        sex ??
        'Not provided';
    const years = age !== null && age !== undefined && age !== '' ? Number(age) : null;
    return (
        <div className="space-y-6">
            <div className="bg-accent/40 flex items-start gap-4 rounded-xl border p-4 sm:p-5">
                <span className="bg-card text-primary flex size-11 shrink-0 items-center justify-center rounded-xl border">
                    <UserRound aria-hidden="true" className="size-5" />
                </span>
                <dl className="min-w-0">
                    <dt className="text-muted-foreground text-sm">Full name</dt>
                    <dd className="mt-1 text-xl font-semibold break-words sm:text-2xl">{fullName || 'Not provided'}</dd>
                </dl>
            </div>
            <dl className="grid gap-6 sm:grid-cols-3">
                {[
                    { label: 'Date of birth', value: formatBirthDate(dateOfBirth) },
                    { label: 'Sex', value: sexLabel || 'Not provided' },
                    {
                        label: 'Age',
                        value:
                            years !== null && Number.isFinite(years) && years >= 0
                                ? `${years} ${years === 1 ? 'year' : 'years'} old`
                                : 'Not provided',
                    },
                ].map((item) => (
                    <div key={item.label} className="min-w-0">
                        <dt className="text-muted-foreground text-sm">{item.label}</dt>
                        <dd className="mt-2 text-base font-medium break-words">{item.value}</dd>
                    </div>
                ))}
            </dl>
            <p className="text-muted-foreground flex items-start gap-2 border-t pt-4 text-xs leading-relaxed">
                <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                Registration information · Read-only
            </p>
        </div>
    );
}
