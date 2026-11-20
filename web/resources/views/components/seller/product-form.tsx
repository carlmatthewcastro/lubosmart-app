import { buttonClass, Card, Field, secondaryClass, Select, Textarea } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import type { Product } from '@/pages/marketplace/catalog';
import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function ProductForm({
    product,
    categories,
    close,
}: {
    product: Product | null;
    categories: { id: number; name: string }[];
    close: () => void;
}) {
    const form = useForm({
        name: product?.name ?? '',
        description: product?.description ?? '',
        price: product?.price ?? '',
        stock: product?.stock ?? 0,
        expected_stock: product?.stock ?? 0,
        weight_grams: product?.weight_grams?.toString() ?? '',
        category_id: product?.category_id.toString() ?? '',
        status: product?.status ?? 'active',
        image: null as File | null,
        _method: product ? 'PUT' : 'POST',
    });
    const [preview, setPreview] = useState(product?.image_url ?? '');
    useEffect(() => {
        if (!form.data.image) {
            setPreview(product?.image_url ?? '');
            return;
        }
        const url = URL.createObjectURL(form.data.image);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [form.data.image, product?.image_url]);
    return (
        <Card>
            <ValidatedForm
                confirmation={{
                    title: product ? 'Update this product?' : 'Publish this product?',
                    description: `${form.data.name}: check the price, available stock, packed weight, and visibility. Approved active products become available to buyers.`,
                    confirmLabel: 'Save product',
                }}
                className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(200px,0.7fr)_minmax(0,2fr)]"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (form.processing) return;
                    const options = { preserveScroll: true, onSuccess: close };
                    if (product) form.post(`/inventory/${product.id}`, options);
                    else form.post('/inventory', options);
                }}
            >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 lg:col-span-2">
                    <div>
                        <h2 className="text-xl font-semibold">{product ? 'Edit product' : 'Add product'}</h2>
                        <p className="text-muted-foreground mt-1 text-sm">Product details, pricing, and availability.</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                        <button className={secondaryClass} type="button" onClick={close}>
                            Cancel
                        </button>
                        <button className={buttonClass} disabled={form.processing}>
                            {form.processing ? 'Saving...' : product ? 'Save changes' : 'Save product'}
                        </button>
                    </div>
                </div>
                <aside className="min-w-0 space-y-4">
                    <div className="bg-muted/40 flex aspect-square items-center justify-center overflow-hidden rounded-xl border">
                        {preview ? (
                            <img src={preview} alt={form.data.name || 'Product preview'} className="h-full w-full object-contain p-4" />
                        ) : (
                            <span className="text-muted-foreground text-sm">No photo selected</span>
                        )}
                    </div>
                    <Field
                        reserveFeedback={false}
                        label="Replace or add photo (up to 5 MB)"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)}
                        error={form.errors.image}
                    />
                    <p className="text-muted-foreground text-xs">JPEG, PNG, or WebP. Your current photo stays until you upload a replacement.</p>
                </aside>
                <section className="grid min-w-0 content-start gap-4 sm:grid-cols-2">
                    <h3 className="font-semibold sm:col-span-2">Product information</h3>
                    <Field
                        reserveFeedback={false}
                        label="Product name"
                        required
                        maxLength={160}
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        error={form.errors.name}
                    />
                    <Select
                        reserveFeedback={false}
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
                    <div className="grid gap-4 sm:col-span-2 xl:grid-cols-3">
                        <Field
                            reserveFeedback={false}
                            label="Price (PHP)"
                            type="number"
                            min="0.01"
                            max="999999.99"
                            step="0.01"
                            required
                            value={form.data.price}
                            onChange={(e) => form.setData('price', e.target.value)}
                            error={form.errors.price}
                        />
                        <Field
                            reserveFeedback={false}
                            label="Packed weight per item (grams)"
                            hint="Include packaging. Required for logistics shipping quotes."
                            type="number"
                            min="1"
                            max="50000"
                            step="1"
                            value={form.data.weight_grams}
                            onChange={(e) => form.setData('weight_grams', e.target.value)}
                            error={form.errors.weight_grams}
                        />
                        <Field
                            reserveFeedback={false}
                            label="Available stock"
                            type="number"
                            min="0"
                            max="1000000"
                            step="1"
                            required
                            value={form.data.stock}
                            readOnly={!!product?.variants?.length}
                            hint={product?.variants?.length ? 'Stock is managed in size/color options.' : undefined}
                            onChange={(e) => form.setData('stock', Number(e.target.value))}
                            error={form.errors.stock}
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Textarea
                            label="Description"
                            error={form.errors.description}
                            rows={3}
                            maxLength={5000}
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                        />
                    </div>
                    <Select
                        reserveFeedback={false}
                        label="Visibility"
                        error={form.errors.status}
                        value={form.data.status}
                        onChange={(e) => form.setData('status', e.target.value)}
                    >
                        <option value="active">Published</option>
                        <option value="hidden">Hidden</option>
                    </Select>
                </section>
                {form.progress && (
                    <p role="status" className="text-muted-foreground text-sm sm:col-span-2">
                        Uploading product image: {form.progress.percentage}%
                    </p>
                )}
            </ValidatedForm>
        </Card>
    );
}
