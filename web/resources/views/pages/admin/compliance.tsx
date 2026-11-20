import { ActionDropdown } from '@/components/shared/action-dropdown';
import AutoFilterForm from '@/components/shared/auto-filter-form';
import { FilterToolbar } from '@/components/shared/filter-toolbar';
import { Badge, Card, Empty, Field, Page, Pager, Select, buttonClass, money, type Pagination } from '@/components/shared/marketplace-ui';
import { ReasonConfirmation } from '@/components/shared/reason-confirmation';
import ValidatedForm from '@/components/shared/validated-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link, useForm } from '@inertiajs/react';
import { EyeOff, ShieldAlert, ShieldCheck, UserX } from 'lucide-react';
import { useRef, useState } from 'react';
type Product = {
    id: number;
    name: string;
    image_url: string | null;
    price: string;
    status: string;
    blocked_at: string | null;
    store: { name: string; business_category_id: number | null; business_category: { name: string } | null };
    category: { name: string; id: number; parent_id: number | null };
};
type Review = { id: number; action: string; reason: string; created_at: string };
function Listing({ product, history }: { product: Product; history: Review[] }) {
    const trigger = useRef<HTMLButtonElement>(null);
    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const form = useForm<{ action: 'warn' | 'hide' | 'restore' | 'suspend'; reason: string }>({ action: 'warn', reason: '' });
    const labels = { warn: 'Send a Warning', hide: 'Block Listing', restore: 'Restore Listing', suspend: 'Block Listing and Suspend Seller' };
    const icons = { warn: ShieldAlert, hide: EyeOff, restore: ShieldCheck, suspend: UserX };
    const mismatch = product.store.business_category_id && product.store.business_category_id !== (product.category.parent_id ?? product.category.id);
    return (
        <Card>
            <div className="flex items-start gap-4">
                {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="size-20 shrink-0 rounded-xl object-cover" loading="lazy" />
                )}
                <div className="min-w-0 flex-1">
                    <h2 className="font-semibold break-words">{product.name}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {product.store.name} · {money(product.price)}
                    </p>
                    <div className="mt-3">
                        <Badge status={product.blocked_at ? 'blocked' : product.status} />
                    </div>
                </div>
                <ActionDropdown
                    label={`Review actions for ${product.name}`}
                    triggerRef={trigger}
                    actions={(Object.keys(labels) as (keyof typeof labels)[]).map((action) => ({
                        id: action,
                        label: labels[action],
                        icon: icons[action],
                        destructive: action === 'hide' || action === 'suspend',
                        disabled: form.processing,
                        onSelect: () => {
                            form.setData({ action, reason: '' });
                            form.clearErrors();
                            setEditing(true);
                        },
                    }))}
                />
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                    <dt className="text-muted-foreground">Registered department</dt>
                    <dd className="mt-1">{product.store.business_category?.name ?? 'Not recorded'}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">Listing category</dt>
                    <dd className="mt-1">{product.category.name}</dd>
                </div>
            </dl>
            {mismatch && <p className="bg-accent text-primary mt-4 rounded-xl p-3 text-sm">Category does not match the registered department.</p>}
            <Dialog
                open={editing}
                onOpenChange={(value) => {
                    if (!form.processing) setEditing(value);
                }}
            >
                <DialogContent
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        (trigger.current ?? document.getElementById('main-content'))?.focus();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className="[overflow-wrap:anywhere]">{labels[form.data.action]}</DialogTitle>
                        <DialogDescription className="[overflow-wrap:anywhere]">
                            {product.name}. Choose a reason, then review the decision before saving.
                        </DialogDescription>
                    </DialogHeader>
                    <ValidatedForm
                        className="mt-5 grid gap-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!form.processing && form.data.reason.trim()) setConfirming(true);
                        }}
                    >
                        {form.errors.action && (
                            <p role="alert" className="text-destructive text-sm">
                                {form.errors.action}
                            </p>
                        )}
                        <Select
                            label="Reason"
                            required
                            value={form.data.reason}
                            onChange={(event) => form.setData('reason', event.target.value)}
                            error={form.errors.reason}
                        >
                            <option value="">Select a Reason</option>
                            {(form.data.action === 'restore'
                                ? ['Listing corrected and category verified', 'Compliance review completed']
                                : [
                                      'Product outside the registered category',
                                      'Prohibited or inappropriate product',
                                      'Misleading product information',
                                      'Repeated platform policy violations',
                                  ]
                            ).map((reason) => (
                                <option key={reason}>{reason}</option>
                            ))}
                        </Select>
                        <button className={buttonClass} disabled={form.processing || !form.data.reason.trim()}>
                            {form.processing ? 'Saving…' : 'Review Action'}
                        </button>
                    </ValidatedForm>
                </DialogContent>
            </Dialog>
            <ReasonConfirmation
                open={confirming}
                onOpenChange={setConfirming}
                title={`${{ warn: 'Send a Warning', hide: 'Block Listing', restore: 'Restore Listing', suspend: 'Suspend Seller' }[form.data.action]}: ${product.name}`}
                reason={form.data.reason}
                onReasonChange={(value) => form.setData('reason', value)}
                processing={form.processing}
                onConfirm={() =>
                    form.patch(`/admin/compliance/${product.id}`, {
                        preserveScroll: true,
                        onSuccess: () => {
                            form.reset('reason');
                            setConfirming(false);
                            setEditing(false);
                        },
                        onError: () => setConfirming(false),
                    })
                }
            />
            {!!history.length && (
                <details className="mt-5 border-t pt-4">
                    <summary className="text-muted-foreground cursor-pointer text-sm">Review history ({history.length})</summary>
                    <ul className="mt-3 space-y-3">
                        {history.map((item) => (
                            <li key={item.id} className="text-sm">
                                <p className="font-medium capitalize">{item.action}</p>
                                <p className="text-muted-foreground mt-1 break-words whitespace-pre-wrap">{item.reason}</p>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </Card>
    );
}
export default function Compliance({
    products,
    filters,
    history,
}: {
    products: Pagination<Product>;
    filters: { search?: string; status?: string };
    history: Record<string, Review[]>;
}) {
    const search = useForm({ search: filters.search ?? '', status: filters.status ?? 'all' });
    return (
        <Page
            title="Seller Compliance"
            description="Check listing categories, record warnings, and handle violations."
            action={
                <Link className={buttonClass} href="/admin/product-reviews">
                    Moderate product reviews
                </Link>
            }
        >
            <Card className="!p-4">
                <AutoFilterForm
                    processing={search.processing}
                    cancel={search.cancel}
                    className="relative"
                    onSubmit={(e) => {
                        e.preventDefault();
                        search.get('/admin/compliance', { preserveState: true, preserveScroll: true, replace: true });
                    }}
                >
                    <FilterToolbar
                        hasErrors={Object.keys(search.errors).length > 0}
                        primary={
                            <Field
                                reserveFeedback={false}
                                label="Search listings"
                                value={search.data.search}
                                onChange={(e) => search.setData('search', e.target.value)}
                            />
                        }
                        activeFilters={[
                            { key: 'search', label: 'Search', value: search.data.search ?? '', onRemove: () => search.setData('search', '') },
                            { key: 'status', label: 'Status', value: search.data.status ?? '', onRemove: () => search.setData('status', 'all') },
                        ].filter(
                            (filter) =>
                                !!filter.value &&
                                !(filter.key === 'sort' && filter.value === 'name') &&
                                !(filter.key === 'status' && filter.value === 'all') &&
                                !(filter.key === 'stage' && filter.value === 'all'),
                        )}
                    >
                        <Select
                            reserveFeedback={false}
                            label="Show"
                            value={search.data.status}
                            onChange={(e) => search.setData('status', e.target.value)}
                        >
                            <option value="all">All listings</option>
                            <option value="mismatch">Category mismatches</option>
                            <option value="blocked">Blocked listings</option>
                        </Select>
                    </FilterToolbar>
                </AutoFilterForm>
            </Card>
            <p className="text-muted-foreground text-sm">{products.total} listings</p>
            {products.data.length ? (
                <div className="grid items-start gap-5 lg:grid-cols-2">
                    {products.data.map((product) => (
                        <Listing key={product.id} product={product} history={history[product.id] ?? []} />
                    ))}
                </div>
            ) : (
                <Empty title="No matching listings" description="Try another filter. Seller products will appear here." />
            )}
            <Pager links={products.links} />
        </Page>
    );
}
