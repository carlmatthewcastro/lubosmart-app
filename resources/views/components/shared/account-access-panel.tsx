import { AccountAccess } from '@/components/shared/account-access';
import { secondaryClass } from '@/components/shared/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { User } from '@/types';
import { useEffect, useState } from 'react';

export function AccountAccessPanel({ account }: { account: User }) {
    const [open, setOpen] = useState(false);
    const [statuses, setStatuses] = useState<string[] | null>(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        fetch(`/accounts/${account.id}`, { headers: { Accept: 'application/json' }, signal: controller.signal, cache: 'no-store' })
            .then(async (response) => {
                if (!response.ok) throw new Error('Unable to load account actions. Please try again.');
                return response.json();
            })
            .then((data) => {
                if (!controller.signal.aborted) setStatuses(data.allowedStatuses);
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(reason.message);
            });
        return () => controller.abort();
    }, [open, account.id, attempt]);
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                setOpen(value);
                setStatuses(null);
                setError('');
            }}
        >
            <DialogTrigger asChild>
                <button type="button" className={secondaryClass}>
                    Manage access
                </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Manage access — {account.name}</DialogTitle>
                    <DialogDescription>
                        Choose an allowed account action and provide a reason. You will confirm the decision before it is saved.
                    </DialogDescription>
                </DialogHeader>
                {open && (
                    <div>
                        {error ? (
                            <div role="alert" className="space-y-3 rounded-xl border p-4">
                                <p className="text-sm">{error}</p>
                                <button
                                    type="button"
                                    className={secondaryClass}
                                    onClick={() => {
                                        setError('');
                                        setAttempt(attempt + 1);
                                    }}
                                >
                                    Try again
                                </button>
                            </div>
                        ) : statuses === null ? (
                            <p role="status" className="text-muted-foreground py-3 text-sm">
                                Loading allowed actions…
                            </p>
                        ) : statuses.some((status) => status !== account.status) ? (
                            <AccountAccess account={account} allowedStatuses={statuses} onSaved={() => setOpen(false)} />
                        ) : (
                            <p className="text-muted-foreground rounded-xl border p-4 text-sm">
                                No access changes are available for this account. Registration must be reviewed before activation; existing
                                restrictions remain in place.
                            </p>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
