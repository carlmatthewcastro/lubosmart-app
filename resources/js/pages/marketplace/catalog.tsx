import { buttonClass, Card, Empty, Field, money, Page, Pager, secondaryClass, Select, type Pagination } from '@/components/marketplace-ui';
import { type SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';

import { useState } from 'react';

export type Product = {
    weight_grams?: number | null;
    id: number;
    name: string;
    description: string | null;
    price: string;
    stock: number;
    status: string;
    category_id: number;
    store_id: number;
    image_path?: string | null;
    image_url?: string | null;
    category?: { name: string };
    store: { id: number; name: string };
};
export default function Catalog({
    products,
    categories,
    filters,
}: {
    products: Pagination<Product>;
    categories: { id: number; name: string }[];
    filters: { search?: string; category?: string };
}) {
    const { auth } = usePage<SharedData>().props;
    const search = useForm({ search: filters.search ?? '', category: filters.category ?? '' });
    const cart = useForm({ quantity: 1, add: true });
    const [addingProduct, setAddingProduct] = useState<number | null>(null);
    const filtered = Boolean(filters.search || filters.category);
    const selectedCategory = categories.find((category) => String(category.id) === String(filters.category));
    return (
        <Page
            title="Marketplace"
            description="Shop local and find your everyday favorites."
            action={
                auth.user?.role === 'buyer' && (
                    <Link href="/cart" className={secondaryClass}>
                        Shopping bag
                    </Link>
                )
            }
        >
            <Card>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        search.get('/shop', { preserveState: true });
                    }}
                    role="search"
                    aria-busy={search.processing}
                    className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_240px_auto]"
                >
                    <div className="sm:col-span-2 xl:col-span-1">
                        <Field
                            label="Search products"
                            name="search"
                            type="search"
                            maxLength={100}
                            disabled={search.processing}
                            value={search.data.search}
                            onChange={(e) => search.setData('search', e.target.value)}
                        />
                    </div>
                    <Select
                        label="Category"
                        name="category"
                        disabled={search.processing}
                        value={search.data.category}
                        onChange={(e) => search.setData('category', e.target.value)}
                    >
                        <option value="">All categories</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>
                    <button className={buttonClass} disabled={search.processing}>
                        {search.processing ? 'Searching…' : 'Search'}
                    </button>
                </form>
            </Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-muted-foreground text-sm" role="status">
                        {products.total} {products.total === 1 ? 'product' : 'products'}
                    </p>
                    {selectedCategory && <span className="bg-accent text-primary rounded-full px-3 py-1 text-xs">{selectedCategory.name}</span>}
                    {filters.search && <span className="text-muted-foreground text-xs break-all">Results for “{filters.search}”</span>}
                </div>
                {filtered && (
                    <Link href="/shop" preserveScroll className="text-primary inline-flex min-h-11 items-center text-sm font-medium hover:underline">
                        Clear filters
                    </Link>
                )}
            </div>
            {products.data.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.data.map((product) => (
                        <article
                            key={product.id}
                            className="bg-card flex min-w-0 flex-col overflow-hidden rounded-2xl border shadow-sm shadow-black/[.02] transition-shadow hover:shadow-md hover:shadow-black/[.04]"
                        >
                            <div className="bg-accent/40 relative flex aspect-[4/3] items-center justify-center">
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt={product.name}
                                        loading="lazy"
                                        decoding="async"
                                        width={400}
                                        height={300}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-muted-foreground text-xs">No photo yet</span>
                                )}
                            </div>
                            <div className="flex flex-1 flex-col p-5">
                                {product.category && <p className="text-primary mb-2 text-xs font-medium">{product.category.name}</p>}
                                <p className="text-muted-foreground text-xs">{product.store.name}</p>
                                <h2 className="mt-2 leading-relaxed font-semibold break-words">{product.name}</h2>
                                {product.description && (
                                    <details className="mt-2 text-xs">
                                        <summary className="text-primary min-h-11 cursor-pointer content-center">Details</summary>
                                        <p className="text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                                    </details>
                                )}
                                <div className="mt-auto pt-5">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="font-semibold">{money(product.price)}</span>
                                        <span className="text-muted-foreground text-xs">
                                            {product.stock ? `${product.stock} available` : 'Sold out'}
                                        </span>
                                    </div>
                                    {auth.user?.role === 'buyer' && auth.user.status === 'approved' && auth.user.email_verified_at ? (
                                        <button
                                            className={`${buttonClass} w-full`}
                                            disabled={!product.stock || cart.processing}
                                            aria-label={`Add ${product.name} to bag`}
                                            onClick={() =>
                                                cart.put(`/cart/${product.id}`, {
                                                    preserveScroll: true,
                                                    onStart: () => setAddingProduct(product.id),
                                                    onFinish: () => setAddingProduct(null),
                                                })
                                            }
                                        >
                                            {addingProduct === product.id ? 'Adding...' : product.stock ? 'Add to bag' : 'Sold out'}
                                        </button>
                                    ) : auth.user?.role === 'buyer' ? (
                                        <Link href="/application" className={`${secondaryClass} w-full`}>
                                            Complete registration / view approval
                                        </Link>
                                    ) : !auth.user ? (
                                        <Link href="/login" className={`${secondaryClass} w-full`}>
                                            Log in to shop
                                        </Link>
                                    ) : (
                                        <p className="text-muted-foreground text-xs">Shopping is available with a buyer account.</p>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <Empty
                    title={filtered ? 'No matches yet' : 'No products yet'}
                    description={filtered ? 'Try another search or browse all products.' : 'Check back soon for new arrivals.'}
                    href={filtered ? '/shop' : undefined}
                    label={filtered ? 'Browse all products' : undefined}
                />
            )}
            <Pager links={products.links} />
        </Page>
    );
}
