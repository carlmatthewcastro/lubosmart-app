import { buttonClass, Card, Field, secondaryClass, Select } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import type { Product } from '@/pages/marketplace/catalog';
import { useForm } from '@inertiajs/react';

export default function VariantForm({ product, close }: { product: Product; close: () => void }) {
    const form = useForm({
        expected_stock: product.stock,
        variants: (product.variants ?? []).map((variant) => ({
            id: variant.id as number | null,
            name: variant.name,
            stock: variant.stock,
            expected_stock: variant.stock as number | null,
            is_active: variant.is_active,
            is_legacy: variant.is_legacy ?? false,
        })),
    });
    return (
        <Card>
            <h2 className="text-lg font-semibold">Size/color options for {product.name}</h2>
            <p className="text-muted-foreground mt-2 text-sm">
                Each combination has its own stock. All options share the product price and packed weight. Saving options replaces the product stock
                total. Retire options instead of deleting purchase history.
            </p>
            <ValidatedForm
                confirmation={{
                    title: 'Save product variants?',
                    description: 'The entered stock replaces the available quantities for these options. Review every size or color before saving.',
                    confirmLabel: 'Save variants',
                }}
                className="mt-5 space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put(`/inventory/${product.id}/variants`, { preserveScroll: true, onSuccess: close });
                }}
            >
                {form.data.variants.map((variant, index) => (
                    <fieldset key={index} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-3">
                        <legend className="px-2 text-sm font-medium">Option {index + 1}</legend>
                        <Field
                            label="Size / color combination"
                            readOnly={variant.is_legacy}
                            hint={
                                variant.is_legacy
                                    ? 'Held stock from an original purchase. Inspect it, reduce this count and add the same quantity to the correct option.'
                                    : undefined
                            }
                            required
                            maxLength={100}
                            value={variant.name}
                            onChange={(event) =>
                                form.setData(
                                    'variants',
                                    form.data.variants.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)),
                                )
                            }
                            error={(form.errors as Record<string, string>)[`variants.${index}.name`]}
                        />
                        <Field
                            label="Option stock"
                            required
                            type="number"
                            min={0}
                            max={1000000}
                            step={1}
                            value={variant.stock}
                            onChange={(event) =>
                                form.setData(
                                    'variants',
                                    form.data.variants.map((row, i) => (i === index ? { ...row, stock: Number(event.target.value) } : row)),
                                )
                            }
                            error={(form.errors as Record<string, string>)[`variants.${index}.stock`]}
                        />
                        <Select
                            label="Availability"
                            disabled={variant.is_legacy}
                            value={variant.is_active ? 'active' : 'retired'}
                            onChange={(event) =>
                                form.setData(
                                    'variants',
                                    form.data.variants.map((row, i) => (i === index ? { ...row, is_active: event.target.value === 'active' } : row)),
                                )
                            }
                        >
                            <option value="active">Available</option>
                            <option value="retired">Retired</option>
                        </Select>
                    </fieldset>
                ))}
                {form.errors.variants && (
                    <p role="alert" className="text-destructive text-sm">
                        {form.errors.variants}
                    </p>
                )}
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        className={secondaryClass}
                        disabled={form.processing || form.data.variants.filter((variant) => !variant.is_legacy).length >= 50}
                        onClick={() =>
                            form.setData('variants', [
                                ...form.data.variants,
                                { id: null, name: '', stock: 0, expected_stock: null, is_active: true, is_legacy: false },
                            ])
                        }
                    >
                        Add option
                    </button>
                    <button className={buttonClass} disabled={form.processing || !form.data.variants.length}>
                        {form.processing ? 'Saving options…' : 'Save options'}
                    </button>
                    <button type="button" className={secondaryClass} onClick={close} disabled={form.processing}>
                        Close
                    </button>
                </div>
            </ValidatedForm>
        </Card>
    );
}
