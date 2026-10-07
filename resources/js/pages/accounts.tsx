import { Badge, buttonClass, Card, Empty, Field, Page, Pager, secondaryClass, Select, type Pagination } from '@/components/marketplace-ui';
import { type SharedData, type User } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

function AccountRow({ account }: { account: User }) {
    const { auth } = usePage<SharedData>().props;
    const form = useForm({ status: account.status === 'active' ? 'suspended' : 'active', reason: '' });
    return (
        <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-accent text-primary flex size-11 shrink-0 items-center justify-center rounded-full font-semibold">
                        {account.name.charAt(0)}
                    </span>
                    <div>
                        <h2 className="font-semibold">{account.name}</h2>
                        <p className="text-muted-foreground mt-1 text-xs break-all">
                            {account.email} · {account.role}
                        </p>
                    </div>
                </div>
                <Badge status={account.status} />
            </div>
            <Link className={`${secondaryClass} mt-4`} href={`/accounts/${account.id}`}>
                View profile
            </Link>
            <form
                className="mt-5 flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.patch(route('accounts.update', account.id), { preserveScroll: true, onSuccess: () => form.reset('reason') });
                }}
            >
                <div className="min-w-0 flex-1 basis-60">
                    <Field
                        label="Reason for status change"
                        placeholder="Add a clear audit reason…"
                        required
                        maxLength={1000}
                        value={form.data.reason}
                        onChange={(e) => form.setData('reason', e.target.value)}
                        error={form.errors.reason ?? form.errors.status}
                    />
                </div>
                <Select label="New status" value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    {auth.user.role === 'admin' && <option value="deactivated">Deactivated</option>}
                </Select>
                <button className={buttonClass} disabled={form.processing || form.data.status === account.status}>
                    {form.processing ? 'Saving…' : 'Save status'}
                </button>
            </form>
        </Card>
    );
}
export default function Accounts({
    accounts,
    filters,
}: {
    accounts: Pagination<User>;
    filters: { search?: string; role?: string; status?: string };
}) {
    const search = useForm({ search: filters.search ?? '', role: filters.role ?? '', status: filters.status ?? '' });
    return (
        <Page title="Account management" description="Manage account access and status.">
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
                    <Field label="Search accounts" value={search.data.search} onChange={(e) => search.setData('search', e.target.value)} />
                    <Select label="Role" value={search.data.role} onChange={(e) => search.setData('role', e.target.value)}>
                        <option value="">All roles</option>
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                        <option value="rider">Courier</option>
                        <option value="logistics">Sorting center</option>
                    </Select>
                    <Select label="Status" value={search.data.status} onChange={(e) => search.setData('status', e.target.value)}>
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="deactivated">Deactivated</option>
                    </Select>
                    <button className={buttonClass} disabled={search.processing}>
                        Apply filters
                    </button>
                </form>
            </Card>
            {accounts.data.length ? (
                <div className="grid items-start gap-4 xl:grid-cols-2">
                    {accounts.data.map((account) => (
                        <AccountRow key={`${account.id}-${account.status}`} account={account} />
                    ))}
                </div>
            ) : (
                <Empty title="No accounts yet" description="Accounts you can manage will appear here." />
            )}
            <Pager links={accounts.links} />
        </Page>
    );
}
