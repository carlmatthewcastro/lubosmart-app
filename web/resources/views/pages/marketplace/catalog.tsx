import ProductCard from '@/components/marketplace/product-card';
import PublicVouchers, { type PublicVoucher } from '@/components/marketplace/public-vouchers';
import { buttonClass, Empty, Field, Page, Pager, secondaryClass, Select, type Pagination } from '@/components/shared/marketplace-ui';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { SharedData } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Armchair,
    BookOpen,
    CarFront,
    ChevronDown,
    Grid2X2,
    LayoutGrid,
    List,
    Monitor,
    ShoppingBag,
    SlidersHorizontal,
    Star,
    Store,
    Utensils,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import '../../../css/reference-marketplace.css';
import '../../../css/storefront-catalog.css';

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
    variants?: { id: number; name: string; stock: number; is_active: boolean; is_legacy?: boolean }[];
    reviews_avg_rating?: number | string | null;
    reviews_count?: number;
};
type Filters = {
    store?: string;
    search?: string;
    category?: string;
    min_price?: string;
    max_price?: string;
    availability?: string;
    rating?: string;
    sort?: string;
};
export default function Catalog({
    products,
    categories,
    filters,
    favoriteIds = [],
    wishlist = false,
    shopName,
    publicVouchers = [],
}: {
    products: Pagination<Product>;
    categories: { id: number; name: string; parent_id?: number | null }[];
    filters: Filters;
    favoriteIds?: number[];
    wishlist?: boolean;
    shopName?: string | null;
    publicVouchers?: PublicVoucher[];
}) {
    const { auth } = usePage<SharedData>().props;
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const rootCategories = categories.filter((category) => !category.parent_id);
    const categoryIcon = (name: string) => {
        const Icon = /automotive|motorcycle/i.test(name)
            ? CarFront
            : /books|media/i.test(name)
              ? BookOpen
              : /electronics|gadgets/i.test(name)
                ? Monitor
                : /food|gourmet/i.test(name)
                  ? Utensils
                  : /furniture|office/i.test(name)
                    ? Armchair
                    : ShoppingBag;
        return <Icon className="size-5 shrink-0" aria-hidden="true" />;
    };
    const form = useForm({
        store: filters.store ?? '',
        search: filters.search ?? '',
        category: String(filters.category ?? ''),
        min_price: filters.min_price ?? '',
        max_price: filters.max_price ?? '',
        availability: filters.availability ?? '',
        rating: String(filters.rating ?? ''),
        sort: filters.sort ?? 'latest',
    });
    const destination = wishlist ? '/wishlist' : '/shop';
    const searchData = useRef(form.data);
    searchData.current = form.data;
    const setData = form.setData;
    useEffect(() => {
        setData('search', filters.search ?? '');
    }, [filters.search, setData]);
    useEffect(() => {
        const search = form.data.search.trim();
        if (search === (filters.search ?? '')) return;

        let cancel: (() => void) | undefined;
        const timeout = window.setTimeout(() => {
            router.get(
                destination,
                { ...searchData.current, search },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onCancelToken: (token) => {
                        cancel = () => token.cancel();
                    },
                },
            );
        }, 350);

        return () => {
            window.clearTimeout(timeout);
            cancel?.();
        };
    }, [form.data.search, filters.search, destination]);
    const filtered = Object.entries(filters).some(([key, value]) => key !== 'sort' && value != null && value !== '');
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.get(destination, { preserveScroll: true, onSuccess: () => setDrawerOpen(false) });
    };
    const filterFields = (prefix: string) => (
        <form onSubmit={submit} className="flex min-w-0 flex-col gap-4" aria-label="Filter products" aria-busy={form.processing}>
            <section className="catalog-filter-section" aria-labelledby={prefix + '-category-heading'}>
                <h3 className="catalog-filter-title" id={prefix + '-category-heading'}>
                    Category
                </h3>
                <fieldset className="catalog-category-options">
                    <legend className="sr-only">Category</legend>
                    {[{ id: '', name: 'All categories' }, ...categories].map((category) => (
                        <label key={category.id} className="catalog-check-label">
                            <input
                                type="radio"
                                name="category"
                                value={category.id}
                                checked={form.data.category === String(category.id)}
                                onChange={(e) => form.setData('category', e.target.value)}
                            />
                            <span>{category.name}</span>
                        </label>
                    ))}
                </fieldset>
            </section>
            <fieldset className="min-w-0 space-y-2">
                <legend className="text-sm font-medium">Price range (PHP)</legend>
                <div className="grid grid-cols-2 gap-2">
                    <Field
                        label="Minimum"
                        name="min_price"
                        id={prefix + '-min'}
                        type="number"
                        min="0"
                        max="99999999.99"
                        step="0.01"
                        inputMode="decimal"
                        reserveFeedback={false}
                        value={form.data.min_price}
                        onChange={(e) => form.setData('min_price', e.target.value)}
                        error={form.errors.min_price}
                    />
                    <Field
                        label="Maximum"
                        name="max_price"
                        id={prefix + '-max'}
                        type="number"
                        min={form.data.min_price || '0'}
                        max="99999999.99"
                        step="0.01"
                        inputMode="decimal"
                        reserveFeedback={false}
                        value={form.data.max_price}
                        onChange={(e) => form.setData('max_price', e.target.value)}
                        error={form.errors.max_price}
                    />
                </div>
            </fieldset>
            <section className="catalog-filter-section" aria-labelledby={prefix + '-availability-heading'}>
                <h3 className="catalog-filter-title" id={prefix + '-availability-heading'}>
                    Availability
                </h3>
                <label className="catalog-check-label">
                    <input
                        type="checkbox"
                        name="availability"
                        checked={form.data.availability === 'in_stock'}
                        onChange={(e) => form.setData('availability', e.target.checked ? 'in_stock' : '')}
                    />
                    In stock only
                </label>
                <label className="catalog-check-label">
                    <input
                        type="checkbox"
                        checked={form.data.availability === 'out_of_stock'}
                        onChange={(e) => form.setData('availability', e.target.checked ? 'out_of_stock' : '')}
                    />
                    Out of stock
                </label>
            </section>
            <fieldset className="catalog-rating-filter">
                <legend>Minimum rating</legend>
                <div className="flex flex-wrap items-center gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                            key={rating}
                            type="button"
                            aria-label={rating + ' stars and up'}
                            aria-pressed={form.data.rating === String(rating)}
                            onClick={() => form.setData('rating', form.data.rating === String(rating) ? '' : String(rating))}
                            className="text-primary focus-visible:ring-ring flex size-8 items-center justify-center rounded focus-visible:ring-2"
                        >
                            <Star
                                aria-hidden="true"
                                className={'size-5 ' + (rating <= Number(form.data.rating) ? 'fill-current' : 'text-muted-foreground')}
                            />
                        </button>
                    ))}
                    <span className="text-sm">&amp; up</span>
                </div>
            </fieldset>
            <button type="submit" className={buttonClass} disabled={form.processing}>
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                {form.processing ? 'Applying...' : 'Apply filters'}
            </button>
            <Link href={destination} className="text-primary text-center text-sm underline lg:hidden">
                Reset filters
            </Link>
        </form>
    );
    return (
        <Page
            storefront
            title={wishlist ? 'Saved products' : (shopName ?? 'Marketplace')}
            description={wishlist ? 'Your saved marketplace products.' : 'Discover products from approved local sellers.'}
        >
            <PublicVouchers vouchers={publicVouchers} />
            <nav id="catalog-categories" aria-label="Product categories" className="catalog-categories flex flex-wrap gap-2">
                <Link href={destination} className={secondaryClass} aria-current={!filters.category ? 'page' : undefined}>
                    <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
                    All products
                </Link>
                {rootCategories.slice(0, 5).map((category) => (
                    <Link
                        key={category.id}
                        href={destination}
                        data={{ ...filters, category: String(category.id) }}
                        className={secondaryClass}
                        aria-current={String(filters.category) === String(category.id) ? 'page' : undefined}
                    >
                        {categoryIcon(category.name)}
                        {category.name}
                    </Link>
                ))}
                {rootCategories.length > 5 && (
                    <details className="catalog-more-categories">
                        <summary>
                            More categories <ChevronDown className="size-4" aria-hidden="true" />
                        </summary>
                        <div>
                            {rootCategories.slice(5).map((category) => (
                                <Link
                                    key={category.id}
                                    href={destination}
                                    data={{ ...filters, category: String(category.id) }}
                                    aria-current={String(filters.category) === String(category.id) ? 'page' : undefined}
                                >
                                    {categoryIcon(category.name)}
                                    {category.name}
                                </Link>
                            ))}
                        </div>
                    </details>
                )}
            </nav>
            <div className="catalog-body flex min-w-0 items-start gap-6">
                <aside className="catalog-filters hidden w-60 shrink-0 lg:block" aria-labelledby="catalog-filters-heading">
                    <h2 className="catalog-filters-heading" id="catalog-filters-heading">
                        <span>
                            <SlidersHorizontal className="size-5" aria-hidden="true" />
                            Filters
                        </span>
                    </h2>
                    {filterFields('desktop')}
                </aside>
                <section className="catalog-results min-w-0 flex-1" aria-label="Product results">
                    {' '}
                    <div className="catalog-results-toolbar flex min-w-0 flex-wrap items-end justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                                <SheetTrigger asChild>
                                    <button type="button" className={secondaryClass + ' lg:hidden'}>
                                        <SlidersHorizontal className="size-4" aria-hidden="true" />
                                        Filters
                                    </button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-[min(100%,24rem)]">
                                    <SheetHeader className="mb-6 pr-8">
                                        <SheetTitle>Filter products</SheetTitle>
                                        <SheetDescription>Narrow your results by category, price, stock or rating.</SheetDescription>
                                    </SheetHeader>
                                    {filterFields('mobile')}
                                    <SheetClose asChild>
                                        <button type="button" className={secondaryClass + ' mt-4 w-full'}>
                                            Back to products
                                        </button>
                                    </SheetClose>
                                </SheetContent>
                            </Sheet>
                            <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
                                <span className="text-foreground font-semibold tabular-nums">{products.total}</span>{' '}
                                {products.total === 1 ? 'product' : 'products'}
                                {filtered ? ' matching your filters' : wishlist ? ' saved' : ' available'}
                            </p>
                            {filtered && (
                                <Link href={destination} className="text-primary inline-flex min-h-11 items-center text-sm underline">
                                    Clear filters
                                </Link>
                            )}
                        </div>
                        <div className="catalog-sort-controls flex min-w-0 flex-wrap items-end gap-3">
                            <div className="catalog-view-toggle" role="group" aria-label="Product view">
                                <button type="button" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
                                    <Grid2X2 aria-hidden="true" className="size-5" />
                                    <span>Grid</span>
                                </button>
                                <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}>
                                    <List aria-hidden="true" className="size-5" />
                                    <span>List</span>
                                </button>
                            </div>
                            {auth.user && (
                                <form role="search" aria-label="Search products" onSubmit={submit} className="flex min-w-0 items-end gap-2">
                                    <Field
                                        label="Search products"
                                        name="search"
                                        type="search"
                                        reserveFeedback={false}
                                        maxLength={100}
                                        value={form.data.search}
                                        onChange={(e) => form.setData('search', e.target.value)}
                                    />
                                </form>
                            )}
                            <Select
                                label="Sort by"
                                name="sort"
                                reserveFeedback={false}
                                value={form.data.sort}
                                onChange={(e) => {
                                    const sort = e.target.value;
                                    router.get(destination, { ...filters, sort }, { preserveScroll: true });
                                }}
                            >
                                <option value="latest">Latest arrivals</option>
                                <option value="price_asc">Price: low to high</option>
                                <option value="price_desc">Price: high to low</option>
                                <option value="rating">Highest rated</option>
                            </Select>
                        </div>
                    </div>
                    {products.data.length ? (
                        <div className="catalog-results-layout">
                            <div
                                className={
                                    'product-grid marketplace-product-grid catalog-product-grid' + (view === 'list' ? ' catalog-list-view' : '')
                                }
                            >
                                {products.data.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        compact
                                        listView={view === 'list'}
                                        product={{ ...product, seller: product.store.name, categoryLabel: product.category?.name }}
                                        saved={favoriteIds.includes(product.id)}
                                    />
                                ))}
                            </div>
                            {products.data.length <= 2 && !filtered && !wishlist && (
                                <div className="catalog-end-note">
                                    <div className="catalog-end-art" aria-hidden="true">
                                        <ShoppingBag className="size-20" />
                                        <Store className="catalog-end-store size-8" />
                                    </div>
                                    <h2 className="text-lg font-semibold">That's all for now!</h2>
                                    <p className="text-muted-foreground max-w-64 text-sm leading-relaxed">
                                        More products will appear as sellers add new listings.
                                    </p>
                                    <a href="#catalog-categories" className={secondaryClass}>
                                        Browse categories
                                    </a>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Empty
                            title={filtered ? 'No matching products' : wishlist ? 'No saved products yet' : 'New products are on their way'}
                            description={
                                filtered
                                    ? 'Try a broader price range or clear your filters.'
                                    : wishlist
                                      ? 'Save products while browsing to find them here.'
                                      : 'There are no published products available right now. Please check back soon.'
                            }
                            href={filtered ? destination : wishlist ? '/shop' : undefined}
                            label={filtered ? 'Clear filters' : 'Browse products'}
                        />
                    )}
                </section>
            </div>
            <Pager links={products.links} />
        </Page>
    );
}
