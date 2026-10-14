import { AccountAccessPanel } from '@/components/shared/account-access-panel';
import { InfoModal } from '@/components/shared/info-modal';
import { Badge, buttonClass, Card, Empty, Field, Page, Pager, roleLabel, Select, type Pagination } from '@/components/shared/marketplace-ui';
import { useInitials } from '@/hooks/use-initials';
import { type SharedData, type User } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';

type AccountItem = User & { created_at?: string; application?: { status: string; submitted_at: string | null; reviewed_at: string | null } | null };

function AccountRow({ account }: { account: AccountItem; allowedStatuses: string[] }) {
    const getInitials = useInitials();
    return (
        <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-accent/70 text-primary flex size-11 shrink-0 items-center justify-center rounded-full font-semibold">
                        {getInitials(account.name)}
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold break-words">{account.name}</h2>
                        <p className="text-muted-foreground mt-1 text-xs">{roleLabel(account.role)}</p>
                    </div>
                </div>
                <Badge status={account.status} label={account.status === 'incomplete' ? 'Incomplete Registration' : undefined} />
            </div>
            <p className="text-muted-foreground mt-3 text-sm break-all">{account.email}</p>
            {account.created_at && (
                <p className="text-muted-foreground mt-2 text-xs">
                    Registered {new Date(account.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                <span className="text-muted-foreground">Registration</span>
                <span className="font-medium">
                    {account.application?.status === 'approved'
                        ? 'Reviewed and approved'
                        : account.application?.status === 'rejected'
                          ? 'Changes requested'
                          : !account.email_verified_at
                            ? 'Email verification needed'
                            : account.application?.status === 'submitted'
                              ? 'Awaiting review'
                              : 'Not yet submitted'}
                </span>
            </div>
            <div className="mt-4 flex flex-wrap items-start gap-3 border-t pt-4">
                <InfoModal kind="account" id={account.id} label="View details" />
                {['approved', 'suspended', 'deactivated'].includes(account.status) ? (
                    <AccountAccessPanel account={account} />
                ) : account.status === 'pending' ? (
                    <Link
                        href="/reviews?status=submitted"
                        className="text-primary inline-flex min-h-11 items-center rounded px-2 text-sm font-medium hover:underline"
                    >
                        Review in Registrations
                    </Link>
                ) : null}
            </div>
        </Card>
    );
}
export default function Accounts({
    accounts,
    filters,
    allowedStatuses,
}: {
    accounts: Pagination<AccountItem>;
    filters: { search?: string; role?: string; status?: string; sort?: string };
    allowedStatuses: string[];
}) {
    const { auth } = usePage<SharedData>().props;
    const center = auth.user.role === 'sorting_center';
    const search = useForm({ search: filters.search ?? '', role: filters.role ?? '', status: filters.status ?? '', sort: filters.sort ?? 'name' });
    return (
        <Page
            title={center ? 'Rider management' : 'User Accounts'}
            description={
                center
                    ? 'Review and manage riders assigned to your logistics center.'
                    : 'Review Buyer, Seller, and Logistics accounts. Rider accounts are managed by their Logistics company.'
            }
        >
            <Card>
                <div className="mb-5 flex items-center gap-3">
                    <div>
                        <h2 className="text-sm font-semibold">Find an Account</h2>
                        <p className="text-muted-foreground mt-1 text-xs">Search by name or email, then narrow by role and status.</p>
                    </div>
                </div>
                <form
                    className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_160px_160px_auto]"
                    onSubmit={(e) => {
                        e.preventDefault();
                        search.get('/accounts');
                    }}
                >
                    <Field label="Search Accounts" value={search.data.search} onChange={(e) => search.setData('search', e.target.value)} />
                    <Select label="Role" value={search.data.role} onChange={(e) => search.setData('role', e.target.value)}>
                        <option value="">All Roles</option>
                        {(center ? ['courier'] : ['buyer', 'seller', 'sorting_center']).map((role) => (
                            <option key={role} value={role}>
                                {roleLabel(role)}
                            </option>
                        ))}
                        {!center && <option value="unassigned">No Role Selected</option>}
                    </Select>
                    <Select label="Status" value={search.data.status} onChange={(e) => search.setData('status', e.target.value)}>
                        <option value="">All Statuses</option>
                        {!center && (
                            <>
                                <option value="unverified">Unverified</option>
                                <option value="incomplete">Incomplete Registration</option>
                                <option value="pending">Pending Review</option>
                                <option value="rejected">Rejected</option>
                            </>
                        )}
                        <option value="approved">Approved</option>
                        <option value="suspended">Suspended</option>
                        <option value="deactivated">Deactivated</option>
                    </Select>
                    <button className={buttonClass} disabled={search.processing}>
                        Apply Filters
                    </button>
                    <Select label="Sort by" value={search.data.sort} onChange={(event) => search.setData('sort', event.target.value)}>
                        <option value="name">Name (A–Z)</option>
                        <option value="newest">Recently registered</option>
                        <option value="oldest">Oldest registered</option>
                    </Select>
                    {(filters.search || filters.role || filters.status) && (
                        <Link href="/accounts" className="text-primary text-sm font-medium hover:underline">
                            Clear Filters
                        </Link>
                    )}
                </form>
            </Card>
            <p className="text-muted-foreground text-sm">
                {accounts.total} {accounts.total === 1 ? 'account' : 'accounts'}
                {filters.search || filters.role || filters.status
                    ? ' matching your filters'
                    : center
                      ? ' in your logistics center'
                      : ' across all registration statuses'}
            </p>
            {accounts.data.length ? (
                <div className="grid items-start gap-4 xl:grid-cols-2">
                    {accounts.data.map((account) => (
                        <AccountRow key={`${account.id}-${account.status}`} account={account} allowedStatuses={allowedStatuses} />
                    ))}
                </div>
            ) : (
                <Empty title="No Accounts Found" description="Accounts you can manage will appear here." />
            )}
            <Pager links={accounts.links} />
        </Page>
    );
}
