import SellerListFilters from '@/components/seller/list-filters';
import ProductForm from '@/components/seller/product-form';
import VariantForm from '@/components/seller/variant-form';
import { ActionDropdown } from '@/components/shared/action-dropdown';
import { Badge, buttonClass, Card, Empty, money, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';
import { Pencil, Plus, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { type Product } from './catalog';

export default function Inventory({
    products,
    categories,
    store,
    complianceNotices,
    filters = {},
}: {
    products: Pagination<Product>;
    categories: { id: number; name: string }[];
    store: { name: string; status: string } | null;
    complianceNotices: { id: number; name: string; action: string; reason: string }[];
    filters?: { search?: string; status?: string };
}) {
    const [editing, setEditing] = useState<Product | null | undefined>(undefined);
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [options, setOptions] = useState<Product | null>(null);
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
            <SellerListFilters key={JSON.stringify(filters)} inventory filters={filters} />
            {options && <VariantForm key={options.id} product={options} close={() => setOptions(null)} />}
            {!!complianceNotices.length && (
                <Card className="border-primary/15 !bg-accent/40">
                    <h2 className="font-semibold">Listing review updates</h2>
                    <ul className="mt-4 space-y-3">
                        {complianceNotices.map((notice) => (
                            <li key={notice.id} className="text-sm">
                                <p className="font-medium">
                                    {notice.name} · <span className="capitalize">{notice.action}</span>
                                </p>
                                <p className="text-muted-foreground mt-1 break-words whitespace-pre-wrap">{notice.reason}</p>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <p className="text-muted-foreground text-sm">Matching products</p>
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
                                        className="bg-muted/40 size-14 shrink-0 rounded-xl border object-contain"
                                    />
                                ) : (
                                    <div className="bg-accent/40 text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-xl text-[10px]">
                                        No photo
                                    </div>
                                )}
                                <div className="min-w-40 flex-1">
                                    <h2 className="font-medium">{product.name}</h2>
                                    <p className="text-muted-foreground mt-1 text-xs">{product.category?.name}</p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {product.weight_grams
                                            ? `${product.weight_grams.toLocaleString()} g packed weight`
                                            : 'Packed weight missing: add it for shipping quotes'}
                                    </p>
                                </div>
                                <div className="text-sm">
                                    <p className="font-semibold">{money(product.price)}</p>
                                    <p className={`mt-1 text-xs ${product.stock < 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                        {product.stock} in stock
                                    </p>
                                </div>
                                <Badge status={product.status} />
                                <ActionDropdown
                                    label={`Actions for ${product.name}`}
                                    open={openMenu === product.id}
                                    onOpenChange={(open) => setOpenMenu(open ? product.id : null)}
                                    actions={[
                                        { id: 'edit', label: 'Edit', icon: Pencil, onSelect: () => setEditing(product) },
                                        {
                                            id: 'options',
                                            label: 'Size/color options',
                                            icon: SlidersHorizontal,
                                            disabled: store?.status !== 'approved',
                                            onSelect: () => setOptions(product),
                                        },
                                    ]}
                                />
                            </div>
                        ))}
                    </div>
                </Card>
            ) : (
                <Empty
                    title={filters.search || (filters.status && filters.status !== 'all') ? 'No matching products' : 'No products yet'}
                    description={
                        filters.search || (filters.status && filters.status !== 'all')
                            ? 'Change or reset the filters to see more products.'
                            : 'Add your first product to start building your store.'
                    }
                />
            )}
            <Pager links={products.links} />
        </Page>
    );
}
