import { Badge, Card, Page, secondaryClass } from '@/components/marketplace-ui';
import { type User } from '@/types';
import { Link } from '@inertiajs/react';
export default function Account({
    account,
    profile,
    store,
    applicationId,
    history,
}: {
    account: User;
    profile: Record<string, string> | null;
    store: { name: string; status: string } | null;
    applicationId: number | null;
    history: { id: number; changes: string; occurred_at: string }[];
}) {
    return (
        <Page
            title={account.name}
            description="Account profile and access history."
            action={
                <Link href="/accounts" className={secondaryClass}>
                    Back to accounts
                </Link>
            }
        >
            <Card>
                <div className="mb-5">
                    <Badge status={account.status} />
                </div>
                <dl className="grid gap-5 sm:grid-cols-2">
                    {[
                        ['Email', account.email],
                        ['Role', account.role === 'rider' ? 'Courier' : account.role === 'logistics' ? 'Sorting center' : account.role],
                        ['Phone', account.phone ?? 'Not added'],
                        ['Email verification', account.email_verified_at ? 'Verified' : 'Not verified'],
                        ['First name', profile?.first_name ?? 'Not added'],
                        ['Last name', profile?.last_name ?? 'Not added'],
                        ['Store', store?.name ?? 'Not applicable'],
                    ].map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-muted-foreground text-sm">{label}</dt>
                            <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
                        </div>
                    ))}
                </dl>
                {applicationId && (
                    <Link href={`/reviews/${applicationId}`} className={`${secondaryClass} mt-6`}>
                        View registration application
                    </Link>
                )}
            </Card>
            <Card>
                <h2 className="font-semibold">Account status history</h2>
                {history.length ? (
                    <ul className="mt-4 divide-y">
                        {history.map((item) => {
                            const changes = JSON.parse(item.changes ?? '{}');
                            return (
                                <li key={item.id} className="py-4 text-sm">
                                    <p className="font-medium capitalize">
                                        {changes.from} → {changes.to}
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
