import { useConfirmAction } from '@/components/shared/action-feedback';
import { buttonClass, Card, Field, money, Page, Pager, secondaryClass, type Pagination } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Link, useForm } from '@inertiajs/react';

type Voucher = { id: number; code: string; amount_cents: number; minimum_cents: number; usage_limit: number; expires_at: string; is_active: boolean };
function VoucherRow({ voucher }: { voucher: Voucher }) {
    const confirm = useConfirmAction();
    const form = useForm({ is_active: !voucher.is_active });
    return (
        <Card>
            <h2 className="text-lg font-semibold break-all">{voucher.code}</h2>
            <p className="mt-2 text-sm">
                {money(voucher.amount_cents / 100)} off your store items · minimum {money(voucher.minimum_cents / 100)}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
                {voucher.is_active ? 'Enabled' : 'Paused'} · {voucher.usage_limit} total uses · one use per buyer · expires{' '}
                {new Date(voucher.expires_at).toLocaleString()}
            </p>
            <button
                className={`${secondaryClass} mt-4`}
                disabled={form.processing}
                onClick={async () => {
                    if (
                        !(await confirm({
                            title: voucher.is_active ? 'Disable this voucher?' : 'Enable this voucher?',
                            description: `Voucher ${voucher.code}. This changes whether buyers can apply it at checkout.`,
                            confirmLabel: 'Update voucher',
                        }))
                    )
                        return;
                    form.transform(() => ({ is_active: !voucher.is_active }));
                    form.patch(`/seller/vouchers/${voucher.id}`, { preserveScroll: true });
                }}
            >
                {form.processing ? 'Updating…' : voucher.is_active ? 'Pause voucher' : 'Enable voucher'}
            </button>
        </Card>
    );
}
export default function Vouchers({ vouchers, storeApproved }: { vouchers: Pagination<Voucher>; storeApproved: boolean }) {
    const form = useForm({ code: '', amount: '', minimum: '0', usage_limit: 100, expires_at: '' });
    return (
        <Page
            title="Store vouchers"
            description="Create fixed peso discounts for your store."
            action={
                <Link className={secondaryClass} href="/inventory">
                    Inventory
                </Link>
            }
        >
            <Card>
                <h2 className="text-lg font-semibold">Create a voucher</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                    You fund the discount. It reduces product sales before commission; shipping stays unchanged. One voucher per checkout, one use per
                    buyer. Cancelled purchases release the use. Existing orders retain their agreed amounts.
                </p>
                <ValidatedForm
                    className="mt-5 grid gap-4 sm:grid-cols-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform((data) => ({ ...data, expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : '' }));
                        form.post('/seller/vouchers', { preserveScroll: true, onSuccess: () => form.reset() });
                    }}
                >
                    <Field
                        label="Voucher code"
                        required
                        minLength={3}
                        maxLength={30}
                        pattern="[A-Za-z0-9-]+"
                        value={form.data.code}
                        onChange={(event) => form.setData('code', event.target.value)}
                        error={form.errors.code}
                    />
                    <Field
                        label="Discount (PHP)"
                        required
                        type="number"
                        min="0.01"
                        max="999999.99"
                        step="0.01"
                        value={form.data.amount}
                        onChange={(event) => form.setData('amount', event.target.value)}
                        error={form.errors.amount}
                    />
                    <Field
                        label="Minimum store subtotal (PHP)"
                        required
                        type="number"
                        min="0"
                        max="999999.99"
                        step="0.01"
                        value={form.data.minimum}
                        onChange={(event) => form.setData('minimum', event.target.value)}
                        error={form.errors.minimum}
                    />
                    <Field
                        label="Total usage limit"
                        required
                        type="number"
                        min={1}
                        max={1000000}
                        step={1}
                        value={form.data.usage_limit}
                        onChange={(event) => form.setData('usage_limit', Number(event.target.value))}
                        error={form.errors.usage_limit}
                    />
                    <Field
                        label="Expires at (your local time)"
                        required
                        type="datetime-local"
                        value={form.data.expires_at}
                        onChange={(event) => form.setData('expires_at', event.target.value)}
                        error={form.errors.expires_at}
                    />
                    <button className={buttonClass} disabled={!storeApproved || form.processing}>
                        {form.processing ? 'Creating…' : 'Create voucher'}
                    </button>
                </ValidatedForm>
            </Card>
            {!storeApproved && <p role="status">Store approval is required to create or change vouchers.</p>}
            {!vouchers.data.length && <p className="text-muted-foreground text-sm">No vouchers yet. Create a code and share it with your buyers.</p>}
            {vouchers.data.map((voucher) => (
                <VoucherRow key={voucher.id} voucher={voucher} />
            ))}
            <Pager links={vouchers.links} />
        </Page>
    );
}
