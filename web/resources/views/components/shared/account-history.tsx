import type Account from '@/pages/admin/account';
import type { ComponentProps } from 'react';

export function AccountHistory({ history }: { history: ComponentProps<typeof Account>['history'] }) {
    return history.length ? (
        <ol className="mt-4 divide-y">
            {history.map((item) => {
                let changes: { from?: string; to?: string; reason?: string } = {};
                try {
                    changes = JSON.parse(item.changes || '{}') ?? {};
                } catch {
                    /* Older events may contain no structured changes. */
                }
                return (
                    <li key={item.id} className="space-y-2 py-4 text-sm break-words">
                        <p className="text-muted-foreground text-xs">
                            {new Date(item.occurred_at).toLocaleString('en-PH')} · {item.actor_name ?? 'System'}
                        </p>
                        <p className="font-medium">
                            {changes.from && changes.to ? `${changes.from} → ${changes.to}` : item.action.replaceAll('_', ' ')}
                        </p>
                        {changes.reason && <p className="text-muted-foreground whitespace-pre-wrap">{changes.reason}</p>}
                    </li>
                );
            })}
        </ol>
    ) : (
        <p className="text-muted-foreground mt-4 text-sm">No status changes recorded.</p>
    );
}
