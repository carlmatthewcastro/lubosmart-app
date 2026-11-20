import { AccountAccess } from '@/components/shared/account-access';
import { AccountHistory } from '@/components/shared/account-history';
import { InfoModal } from '@/components/shared/info-modal';
import { Badge, Card, Page, roleLabel, secondaryClass } from '@/components/shared/marketplace-ui';
import { useInitials } from '@/hooks/use-initials';
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
    rider,
    centers,
    assignedCenter,
    allowedStatuses,
}: {
    embedded?: boolean;
    verificationOnly?: boolean;
    onViewRegistration?: (id: number) => void;
    onSaved?: () => void;
    address?: Record<string, string> | null;
    rider?: { vehicle_type?: string; plate_number?: string } | null;
    centers?: { id: number; name: string }[];
    assignedCenter?: string | null;
    allowedStatuses?: string[];
    account: User;
    profile: Record<string, string> | null;
    store: { name: string; status: string } | null;
    applicationId: number | null;
    history: { id: number; actor_id: number | null; actor_name?: string | null; action: string; changes: string; occurred_at: string }[];
}) {
    const getInitials = useInitials();
    const birthday = profile?.birthday ? new Date(profile.birthday) : null;
    const today = new Date();
    const age =
        birthday && !Number.isNaN(birthday.getTime())
            ? today.getFullYear() -
              birthday.getFullYear() -
              (today.getMonth() < birthday.getMonth() || (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate()) ? 1 : 0)
            : null;
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
                    <span className="bg-accent text-primary flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-semibold">
                        {getInitials(account.name)}
                    </span>
                    <Badge status={account.status} />
                </div>
                <dl className="grid gap-5 sm:grid-cols-2">
                    {[
                        ['Full name', account.name],
                        ['Registered', account.created_at ? new Date(account.created_at).toLocaleDateString('en-PH') : 'Not Provided'],
                        ['Email', account.email],
                        ['Role', roleLabel(account.role)],
                        ['Phone', account.phone ?? 'Not Provided'],
                        ['Email Verification', account.email_verified_at ? 'Verified' : 'Not verified'],
                        ...(applicationId ? [['Registration application', '#' + applicationId]] : []),
                        ['First Name', profile?.first_name ?? 'Not Provided'],
                        ['Middle initial (optional)', profile?.middle_initial ?? 'Not Provided'],
                        ['Last Name', profile?.last_name ?? 'Not Provided'],
                        ['Birthday', profile?.birthday ?? 'Not Provided'],
                        ['Age', age === null ? 'Not Provided' : String(age)],
                        ['Sex', profile?.sex?.replaceAll('_', ' ') ?? 'Not Provided'],
                        ...(account.role === 'seller'
                            ? [
                                  ['Store', store?.name ?? 'Not Provided'],
                                  ['Store status', store?.status ?? 'Not Provided'],
                              ]
                            : []),
                        ...(account.role === 'rider'
                            ? [
                                  ['Vehicle', rider?.vehicle_type ?? 'Not Provided'],
                                  ['Plate Number', rider?.plate_number ?? 'Not Provided'],
                                  ['Logistics', assignedCenter ?? 'Not Assigned'],
                              ]
                            : []),
                        ...(account.role === 'logistics'
                            ? [['Logistics companies', centers?.map((center) => center.name).join(', ') || 'Not Assigned']]
                            : []),
                        ...(address
                            ? [['Address', [address.line1, address.barangay, address.city, address.province, address.zip].filter(Boolean).join(', ')]]
                            : []),
                    ].map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-muted-foreground text-sm">{label}</dt>
                            <dd className="mt-1 text-sm font-medium [overflow-wrap:anywhere]">{value}</dd>
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
                    <AccountHistory history={history} />
                </Card>
            )}
        </Page>
    );
}
