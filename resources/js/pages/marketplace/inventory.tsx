import {
    Badge,
    buttonClass,
    Card,
    Empty,
    Field,
    inputClass,
    money,
    Page,
    Pager,
    type Pagination,
    secondaryClass,
    Select,
} from '@/components/marketplace-ui';
import { useForm } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { type Product } from './catalog';

function ProductForm({ product, categories, close }: { product: Product | null; categories: { id: number; name: string }[]; close: () => void }) {
    const form = useForm({
        name: product?.name ?? '',
        description: product?.description ?? '',
        price: product?.price ?? '',
        stock: product?.stock ?? 0,
        category_id: product?.category_id.toString() ?? '',
        status: product?.status ?? 'active',
        image: null as File | null,
        _method: product ? 'PUT' : 'POST',
    });
    return (
        <Card>
            <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold">{product ? 'Edit product' : 'New product'}</h2>
                <button className={secondaryClass} type="button" onClick={close}>
                    Cancel
                </button>
            </div>
            <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    const options = { preserveScroll: true, onSuccess: close };
                    if (product) form.post(`/inventory/${product.id}`, options);
                    else form.post('/inventory', options);
                }}
            >
                <Field
                    label="Product name"
                    required
                    maxLength={160}
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    error={form.errors.name}
                />
                <Select
                    label="Category"
                    required
                    error={form.errors.category_id}
                    value={form.data.category_id}
                    onChange={(e) => form.setData('category_id', e.target.value)}
                >
                    <option value="">Choose a category</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </Select>
                <Field
                    label="Price (PHP)"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.data.price}
                    onChange={(e) => form.setData('price', e.target.value)}
                    error={form.errors.price}
                />
                <Field
                    label="Available stock"
                    type="number"
                    min="0"
                    required
                    value={form.data.stock}
                    onChange={(e) => form.setData('stock', Number(e.target.value))}
                    error={form.errors.stock}
                />
                <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                    Description
                    <textarea
                        className={inputClass}
                        rows={3}
                        maxLength={5000}
                        value={form.data.description}
                        onChange={(e) => form.setData('description', e.target.value)}
                    />
                </label>
                <Field
                    label="Product photo (optional, up to 5 MB)"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)}
                    error={form.errors.image}
                />
                <Select
                    label="Visibility"
                    error={form.errors.status}
                    value={form.data.status}
                    onChange={(e) => form.setData('status', e.target.value)}
                >
                    <option value="active">Published</option>
                    <option value="hidden">Hidden</option>
                </Select>
                <div className="flex items-end">
                    <button className={buttonClass} disabled={form.processing}>
                        {form.processing ? 'Saving…' : 'Save product'}
                    </button>
                </div>
            </form>
        </Card>
    );
}
export default function Inventory({
    products,
    categories,
    store,
}: {
    products: Pagination<Product>;
    categories: { id: number; name: string }[];
    store: { name: string; status: string } | null;
}) {
    const [editing, setEditing] = useState<Product | null | undefined>(undefined);
    return (
        <Page
            title="Inventory"
            description={`${store?.name ?? 'Your store'} · Manage products, prices and stock.`}
            action={
                <button className={buttonClass} onClick={() => setEditing(null)} disabled={store?.status !== 'approved'}>
                    <Plus className="size-4" />
                    Add product
                </button>
            }
        >
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <p className="text-muted-foreground text-sm">Catalog products</p>
                    <p className="mt-3 text-3xl font-semibold">{products.total}</p>
                </Card>
                <Card>
                    <p className="text-muted-foreground text-sm">Store status</p>
                    <div className="mt-4">
                        <Badge status={store?.status ?? 'pending'} />
                    </div>
                </Card>
                <Card>
                    <p className="text-muted-foreground text-sm">Stock guidance</p>
                    <p className="mt-3 text-sm leading-relaxed">Update stock when you restock. Orders deduct stock automatically.</p>
                </Card>
            </div>
            {editing !== undefined && (
                <ProductForm key={editing?.id ?? 'new'} product={editing} categories={categories} close={() => setEditing(undefined)} />
            )}
            {products.data.length ? (
                <Card className="overflow-hidden !p-0">
                    <div className="divide-y">
                        {products.data.map((product) => (
                            <div key={product.id} className="flex flex-wrap items-center gap-4 p-5">
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        className="size-14 shrink-0 rounded-xl border object-cover"
                                    />
                                ) : (
                                    <div className="bg-accent/40 text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-xl text-[10px]">
                                        No photo
                                    </div>
                                )}
                                <div className="min-w-40 flex-1">
                                    <h2 className="font-medium">{product.name}</h2>
                                    <p className="text-muted-foreground mt-1 text-xs">{product.category?.name}</p>
                                </div>
                                <div className="text-sm">
                                    <p className="font-semibold">{money(product.price)}</p>
                                    <p className={`mt-1 text-xs ${product.stock < 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                        {product.stock} in stock
                                    </p>
                                </div>
                                <Badge status={product.status} />
                                <button className={secondaryClass} onClick={() => setEditing(product)}>
                                    <Pencil className="size-3" />
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>
            ) : (
                <Empty title="No products yet" description="Add your first product to start building your store." />
            )}
            <Pager links={products.links} />
        </Page>
    );
}
