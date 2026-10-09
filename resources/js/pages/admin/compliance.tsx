import { Badge, Card, Empty, Field, Page, Pager, Select, buttonClass, money, type Pagination } from '@/components/marketplace-ui';
import { ReasonConfirmation } from '@/components/reason-confirmation';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
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
    const [confirming, setConfirming] = useState(false);
    const form = useForm({ action: 'warn', reason: '' });
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
            <form
                noValidate
                className="mt-5 grid gap-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    setConfirming(true);
                }}
            >
                <Select
                    label="Review Action"
                    value={form.data.action}
                    onChange={(e) => form.setData('action', e.target.value)}
                    error={form.errors.action}
                >
                    <option value="warn">Send a Warning</option>
                    <option value="hide">Block Listing</option>
                    <option value="restore">Restore Listing</option>
                    <option value="suspend">Block Listing and Suspend Seller</option>
                </Select>
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
                <button className={buttonClass} disabled={form.processing}>
                    {form.processing ? 'Saving…' : 'Save Review'}
                </button>
            </form>
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
        <Page title="Seller Compliance" description="Check listing categories, record warnings, and handle violations.">
            <Card>
                <form
                    className="grid items-end gap-4 sm:grid-cols-[1fr_220px_auto]"
                    onSubmit={(e) => {
                        e.preventDefault();
                        search.get('/admin/compliance', { preserveState: true });
                    }}
                >
                    <Field label="Search listings" value={search.data.search} onChange={(e) => search.setData('search', e.target.value)} />
                    <Select label="Show" value={search.data.status} onChange={(e) => search.setData('status', e.target.value)}>
                        <option value="all">All listings</option>
                        <option value="mismatch">Category mismatches</option>
                        <option value="blocked">Blocked listings</option>
                    </Select>
                    <button className={buttonClass} disabled={search.processing}>
                        Apply Filters
                    </button>
                </form>
            </Card>
            <p className="text-muted-foreground text-sm">{products.total} listings</p>
            {products.data.length ? (
                <div className="grid items-start gap-5 lg:grid-cols-2">
                    {products.data.map((product) => (
                        <Listing
                            key={`${product.id}-${product.status}-${product.blocked_at}`}
                            product={product}
                            history={history[product.id] ?? []}
                        />
                    ))}
                </div>
            ) : (
                <Empty title="No matching listings" description="Try another filter. Seller products will appear here." />
            )}
            <Pager links={products.links} />
        </Page>
    );
}
