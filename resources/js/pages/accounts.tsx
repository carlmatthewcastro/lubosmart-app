import { InfoModal } from '@/components/info-modal';
import { Badge, buttonClass, Card, Empty, Field, Page, Pager, roleLabel, Select, type Pagination } from '@/components/marketplace-ui';
import { type SharedData, type User } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

function AccountRow({ account }: { account: User; allowedStatuses: string[] }) {
    return (
        <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-accent text-primary flex size-11 shrink-0 items-center justify-center rounded-xl font-semibold">
                        {account.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                        <h2 className="truncate font-semibold">{account.name}</h2>
                        <p className="text-muted-foreground mt-1 text-xs">{roleLabel(account.role)}</p>
                    </div>
                </div>
                <Badge status={account.status} />
            </div>
            <p className="text-muted-foreground mt-4 text-sm break-all">{account.email}</p>
            <div className="mt-5 border-t pt-4">
                <InfoModal kind="account" id={account.id} label="View Profile & Actions" />
            </div>
        </Card>
    );
}
export default function Accounts({
    accounts,
    filters,
    allowedStatuses,
}: {
    accounts: Pagination<User>;
    filters: { search?: string; role?: string; status?: string };
    allowedStatuses: string[];
}) {
    const { auth } = usePage<SharedData>().props;
    const center = auth.user.role === 'sorting_center';
    const search = useForm({ search: filters.search ?? '', role: filters.role ?? '', status: filters.status ?? '' });
    return (
        <Page
            title={center ? 'Courier management' : 'User Accounts'}
            description={
                center
                    ? 'View and deactivate couriers assigned to your sorting center. Admin handles suspension and reactivation.'
                    : 'View all non-admin accounts, track registration progress, and manage eligible accounts.'
            }
        >
            <Card className="flex gap-3">
                <ShieldCheck className="text-primary size-5 shrink-0" />
                <p className="text-muted-foreground text-sm leading-relaxed">
                    Suspension blocks access immediately, including existing sessions. Pending accounts must complete application review before
                    activation.
                </p>
            </Card>
            <Card>
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
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                        <option value="courier">Courier</option>
                        <option value="sorting_center">Sorting Center</option>
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
                      ? ' in your sorting center'
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
