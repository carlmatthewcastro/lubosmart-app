import { Badge, buttonClass, Card, Empty, Field, Page, Pager, type Pagination } from '@/components/marketplace-ui';
import { type User } from '@/types';
import { useForm } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

function AccountRow({ account }: { account: User }) {
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
                <button className={`${buttonClass} ${account.status === 'active' ? '!bg-destructive' : ''}`} disabled={form.processing}>
                    {account.status === 'active' ? 'Suspend account' : 'Reactivate account'}
                </button>
            </form>
        </Card>
    );
}
export default function Accounts({ accounts }: { accounts: Pagination<User> }) {
    return (
        <Page title="Account management" description="Manage account access and status.">
            <Card className="flex gap-3">
                <ShieldCheck className="text-primary size-5 shrink-0" />
                <p className="text-muted-foreground text-sm leading-relaxed">
                    Suspension blocks access immediately, including existing sessions. Pending accounts must complete application review before
                    activation.
                </p>
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
