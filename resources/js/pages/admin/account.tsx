import { InfoModal } from '@/components/info-modal';
import { Badge, buttonClass, Card, Page, roleLabel, secondaryClass, Select } from '@/components/marketplace-ui';
import { ReasonConfirmation } from '@/components/reason-confirmation';
import { type User } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
export default function Account({
    account,
    profile,
    store,
    applicationId,
    history,
    embedded = false,
    onViewRegistration,
    onSaved,
    address,
    courier,
    centers,
    assignedCenter,
    allowedStatuses,
}: {
    embedded?: boolean;
    onViewRegistration?: (id: number) => void;
    onSaved?: () => void;
    address?: Record<string, string> | null;
    courier?: { vehicle_type?: string; plate_number?: string } | null;
    centers?: { id: number; name: string }[];
    assignedCenter?: string | null;
    allowedStatuses?: string[];
    account: User;
    profile: Record<string, string> | null;
    store: { name: string; status: string } | null;
    applicationId: number | null;
    history: { id: number; actor_id: number | null; actor_name?: string | null; action: string; changes: string; occurred_at: string }[];
}) {
    const [confirming, setConfirming] = useState(false);
    const form = useForm({
        status: allowedStatuses?.length === 1 ? allowedStatuses[0] : account.status === 'approved' ? 'suspended' : 'approved',
        reason: '',
    });
    return (
        <Page
            embedded={embedded}
            title={account.name}
            description="Account profile and access history."
            action={
                !embedded && (
                    <Link href="/accounts" className={secondaryClass}>
                        Back to Accounts
                    </Link>
                )
            }
        >
            <Card>
                <div className="mb-5 flex items-center gap-3">
                    <span className="bg-accent text-primary flex size-12 items-center justify-center rounded-xl text-lg font-semibold">
                        {account.name.charAt(0).toUpperCase()}
                    </span>
                    <Badge status={account.status} />
                </div>
                <dl className="grid gap-5 sm:grid-cols-2">
                    {[
                        ['Email', account.email],
                        ['Role', roleLabel(account.role)],
                        ['Phone', account.phone ?? 'Not Provided'],
                        ['Email Verification', account.email_verified_at ? 'Verified' : 'Not verified'],
                        ['First Name', profile?.first_name ?? 'Not Provided'],
                        ['Last Name', profile?.last_name ?? 'Not Provided'],
                        ...(account.role === 'seller' ? [['Store', store?.name ?? 'Not Provided']] : []),
                        ...(account.role === 'courier'
                            ? [
                                  ['Vehicle', courier?.vehicle_type ?? 'Not Provided'],
                                  ['Plate Number', courier?.plate_number ?? 'Not Provided'],
                                  ['Sorting Center', assignedCenter ?? 'Not Assigned'],
                              ]
                            : []),
                        ...(account.role === 'sorting_center'
                            ? [['Sorting Centers', centers?.map((center) => center.name).join(', ') || 'Not Assigned']]
                            : []),
                        ...(address
                            ? [['Address', [address.line1, address.barangay, address.city, address.province, address.zip].filter(Boolean).join(', ')]]
                            : []),
                    ].map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-muted-foreground text-sm">{label}</dt>
                            <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
                        </div>
                    ))}
                </dl>
                {applicationId && (
                    <div className="mt-6">
                        {onViewRegistration ? (
                            <button type="button" onClick={() => onViewRegistration(applicationId)} className={secondaryClass}>
                                View Registration Application
                            </button>
                        ) : (
                            <InfoModal kind="registration" id={applicationId} label="View Registration Application" />
                        )}
                    </div>
                )}
            </Card>
            {!!allowedStatuses?.filter((status) => status !== account.status).length && (
                <Card>
                    <h2 className="font-semibold">Manage Access</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Choose an action and a reason. A confirmation appears before saving.</p>
                    <form
                        className="mt-5 grid gap-4 sm:grid-cols-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            setConfirming(true);
                        }}
                    >
                        <Select
                            label="Action"
                            value={form.data.status}
                            onChange={(event) => form.setData('status', event.target.value)}
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
                            className={buttonClass + ' sm:col-span-2 sm:justify-self-end'}
                            disabled={form.processing || form.data.status === account.status}
                        >
                            Review Action
                        </button>
                    </form>
                    <ReasonConfirmation
                        open={confirming}
                        onOpenChange={setConfirming}
                        title={'Change access for ' + account.name + '?'}
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
                </Card>
            )}
            <Card>
                <h2 className="font-semibold">Access History</h2>
                {history.length ? (
                    <ul className="mt-4 divide-y">
                        {history.map((item) => {
                            const changes = JSON.parse(item.changes ?? '{}');
                            return (
                                <li key={item.id} className="py-4 text-sm">
                                    <p className="text-muted-foreground">
                                        {new Date(item.occurred_at).toLocaleString()} · {item.actor_name ?? 'System'}
                                    </p>
                                    <p className="font-medium capitalize">
                                        {changes.from ?? item.action.replaceAll('_', ' ')} → {changes.to ?? ''}
                                    </p>
                                    <p className="text-muted-foreground mt-1 break-words whitespace-pre-wrap">{changes.reason}</p>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-muted-foreground mt-4 text-sm">No status changes recorded.</p>
                )}
            </Card>
        </Page>
    );
}
