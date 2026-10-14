import ProductCard from '@/components/marketplace/product-card';
import { buttonClass, Card, Empty, Field, Page, Pager, secondaryClass, Select, type Pagination } from '@/components/shared/marketplace-ui';
import { type SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';

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
    favoriteIds = [],
    wishlist = false,
}: {
    products: Pagination<Product>;
    favoriteIds?: number[];
    wishlist?: boolean;
    categories: { id: number; name: string }[];
    filters: { search?: string; category?: string };
}) {
    const { auth } = usePage<SharedData>().props;
    const search = useForm({ search: filters.search ?? '', category: filters.category ?? '' });
    const filtered = Boolean(filters.search || filters.category);
    const selectedCategory = categories.find((category) => String(category.id) === String(filters.category));
    return (
        <Page
            title={wishlist ? 'Saved products' : 'Marketplace'}
            description={wishlist ? 'Your saved marketplace products.' : 'Shop local and find your everyday favorites.'}
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
                        search.get(wishlist ? '/wishlist' : '/shop', { preserveState: true });
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
                    <Link
                        href={wishlist ? '/wishlist' : '/shop'}
                        preserveScroll
                        className="text-primary inline-flex min-h-11 items-center text-sm font-medium hover:underline"
                    >
                        Clear filters
                    </Link>
                )}
            </div>
            {products.data.length ? (
                <div className="product-grid">
                    {products.data.map((product) => (
                        <ProductCard key={product.id} product={{ ...product, seller: product.store.name }} saved={favoriteIds.includes(product.id)} />
                    ))}
                </div>
            ) : (
                <Empty
                    title={filtered ? 'No matches yet' : wishlist ? 'No saved products yet' : 'No products yet'}
                    description={filtered ? 'Try another search or browse all products.' : 'Check back soon for new arrivals.'}
                    href={wishlist || filtered ? '/shop' : undefined}
                    label={wishlist || filtered ? 'Browse all products' : undefined}
                />
            )}
            <Pager links={products.links} />
        </Page>
    );
}
