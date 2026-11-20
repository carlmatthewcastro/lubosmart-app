import { buttonClass, Card, Select } from '@/components/shared/marketplace-ui';
import { ReasonConfirmation } from '@/components/shared/reason-confirmation';
import ValidatedForm from '@/components/shared/validated-form';
import { cn } from '@/lib/utils';
import { type User } from '@/types';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export function AccountAccess({
    account,
    allowedStatuses,
    onSaved,
    embedded = false,
}: {
    account: Pick<User, 'id' | 'name' | 'status'>;
    allowedStatuses: string[];
    onSaved?: () => void;
    embedded?: boolean;
}) {
    const [confirming, setConfirming] = useState(false);
    const form = useForm({ status: allowedStatuses.find((status) => status !== account.status) ?? account.status, reason: '' });
    const Container = embedded ? 'div' : Card;
    return (
        <>
            {!!allowedStatuses?.filter((status) => status !== account.status).length && (
                <Container>
                    {!embedded && <h2 className="font-semibold">Manage Access</h2>}
                    {!embedded && (
                        <p className="text-muted-foreground mt-1 text-sm">Choose an action and a reason. A confirmation appears before saving.</p>
                    )}
                    <ValidatedForm
                        className={cn('grid gap-4 sm:grid-cols-2', !embedded && 'mt-5')}
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!form.processing && form.data.status !== account.status && form.data.reason.trim()) setConfirming(true);
                        }}
                    >
                        <Select
                            label="Action"
                            value={form.data.status}
                            onChange={(event) => form.setData({ status: event.target.value, reason: '' })}
                            error={form.errors.status}
                        >
                            {allowedStatuses
                                .filter((status) => status !== account.status)
                                .map((status) => (
                                    <option key={status} value={status}>
                                        {status === 'approved'
                                            ? 'Activate Account'
                                            : status === 'suspended'
                                              ? 'Suspend Account'
                                              : 'Deactivate Account'}
                                    </option>
                                ))}
                        </Select>
                        <Select
                            label="Reason"
                            required
                            value={form.data.reason}
                            onChange={(event) => form.setData('reason', event.target.value)}
                            error={form.errors.reason}
                        >
                            <option value="">Select a Reason</option>
                            {(form.data.status === 'approved'
                                ? [
                                      'Application approved and requirements verified',
                                      'Violation corrected and account reviewed',
                                      'Account access restored after review',
                                  ]
                                : [
                                      'Platform policy violation',
                                      'Incorrect or unverifiable registration information',
                                      'Repeated unresolved complaints',
                                      'Account owner requested deactivation',
                                  ]
                            ).map((reason) => (
                                <option key={reason}>{reason}</option>
                            ))}
                        </Select>
                        <button
                            className={cn(
                                buttonClass,
                                'sm:col-span-2 sm:justify-self-end',
                                form.data.status !== 'approved' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                            )}
                            disabled={form.processing || form.data.status === account.status || !form.data.reason.trim()}
                        >
                            {form.processing ? 'Saving...' : 'Review Action'}
                        </button>
                    </ValidatedForm>
                    <ReasonConfirmation
                        open={confirming}
                        onOpenChange={setConfirming}
                        title={
                            (form.data.status === 'approved' ? 'Activate ' : form.data.status === 'suspended' ? 'Suspend ' : 'Deactivate ') +
                            account.name +
                            '?'
                        }
                        reason={form.data.reason}
                        onReasonChange={(value) => form.setData('reason', value)}
                        processing={form.processing}
                        onConfirm={() =>
                            form.patch('/accounts/' + account.id, {
                                preserveScroll: true,
                                onSuccess: () => {
                                    setConfirming(false);
                                    onSaved?.();
                                },
                                onError: () => setConfirming(false),
                            })
                        }
                    />
                </Container>
            )}
        </>
    );
}
