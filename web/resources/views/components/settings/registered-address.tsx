import { MapPin } from 'lucide-react';
export default function RegisteredAddress({ details }: { details: Record<string, string | null | undefined> }) {
    const values = Object.values(details).filter(Boolean);
    return (
        <div className="bg-muted/40 space-y-4 rounded-xl border p-4">
            <div className="flex items-start gap-3">
                <MapPin aria-hidden="true" className="text-primary mt-1 size-5 shrink-0" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold">Registered address</p>
                    <address className="mt-2 text-sm leading-relaxed break-words not-italic">{values.join(', ') || 'Not provided'}</address>
                </div>
            </div>
            <details>
                <summary className="focus-visible:ring-ring cursor-pointer rounded py-2 text-sm font-medium focus-visible:ring-2">
                    Individual address details
                </summary>
                <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                    {Object.entries(details).map(([label, value]) => (
                        <div key={label} className="min-w-0">
                            <dt className="text-muted-foreground text-sm">{label}</dt>
                            <dd className="mt-1 text-sm break-words">{value || 'Not provided'}</dd>
                        </div>
                    ))}
                </dl>
            </details>
        </div>
    );
}
