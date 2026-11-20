import { AccountAccess } from '@/components/shared/account-access';
import { Badge, secondaryClass } from '@/components/shared/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { User } from '@/types';
import { useEffect, useState } from 'react';

export function AccountAccessPanel({
    account,
    open: controlledOpen,
    onOpenChange,
    hideTrigger = false,
    onCloseAutoFocus,
}: {
    account: Pick<User, 'id' | 'name' | 'status'>;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    hideTrigger?: boolean;
    onCloseAutoFocus?: () => void;
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = (value: boolean) => {
        setInternalOpen(value);
        onOpenChange?.(value);
    };
    const [statuses, setStatuses] = useState<string[] | null>(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        setStatuses(null);
        setError('');
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
            {!hideTrigger && (
                <DialogTrigger asChild>
                    <button type="button" className={secondaryClass}>
                        Manage access
                    </button>
                </DialogTrigger>
            )}
            <DialogContent
                onCloseAutoFocus={
                    onCloseAutoFocus
                        ? (event) => {
                              event.preventDefault();
                              onCloseAutoFocus();
                          }
                        : undefined
                }
                className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
            >
                <DialogHeader>
                    <DialogTitle className="[overflow-wrap:anywhere]">Manage access — {account.name}</DialogTitle>
                    <DialogDescription>
                        Choose an allowed account action and provide a reason. You will confirm the decision before it is saved.
                    </DialogDescription>
                </DialogHeader>
                <div className="bg-accent/40 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                    <p className="min-w-0 text-sm font-medium break-words">{account.name}</p>
                    <Badge status={account.status} />
                </div>
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
                            <AccountAccess embedded account={account} allowedStatuses={statuses} onSaved={() => setOpen(false)} />
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
