import { Badge } from '@/components/shared/marketplace-ui';
import { type AccountChange, displayValue, type Region } from '@/lib/account-api';

export function AccountChangeComparison({ change, regions = [] }: { change: AccountChange; regions?: Region[] }) {
    return (
        <div className="bg-muted/40 grid gap-4 rounded-xl border p-4" role="status">
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{change.field.replaceAll('_', ' ')}</span>
                <Badge status={change.status} label={change.status === 'pending' ? 'Pending review' : undefined} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {[
                    ['Current approved values', change.old_value],
                    ['Proposed values', change.new_value],
                ].map(([label, value]) => (
                    <div key={String(label)} className="min-w-0">
                        <h3 className="text-sm font-semibold">{String(label)}</h3>
                        <p className="mt-2 text-sm break-words whitespace-pre-wrap">{displayValue(value, regions)}</p>
                    </div>
                ))}
            </div>
            {change.reason && <p className="text-destructive text-sm">Rejected: {change.reason}</p>}
        </div>
    );
}
