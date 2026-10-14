import { AccountAccess } from '@/components/shared/account-access';
import { InfoModal } from '@/components/shared/info-modal';
import { Badge, Card, Page, roleLabel, secondaryClass } from '@/components/shared/marketplace-ui';
import { type User } from '@/types';
import { Link } from '@inertiajs/react';

export default function Account({
    account,
    profile,
    store,
    applicationId,
    history,
    embedded = false,
    verificationOnly = false,
    onViewRegistration,
    onSaved,
    address,
    courier,
    centers,
    assignedCenter,
    allowedStatuses,
}: {
    embedded?: boolean;
    verificationOnly?: boolean;
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
                        ...(applicationId ? [['Registration application', '#' + applicationId]] : []),
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
                {!embedded && applicationId && (
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
            {!embedded && allowedStatuses && <AccountAccess account={account} allowedStatuses={allowedStatuses} onSaved={onSaved} />}
            {!verificationOnly && (
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
            )}
        </Page>
    );
}
