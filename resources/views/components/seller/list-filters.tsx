import { buttonClass, Card, Field, secondaryClass, Select } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Link, useForm } from '@inertiajs/react';

export default function SellerListFilters({
    inventory = false,
    buyer = false,
    filters,
}: {
    inventory?: boolean;
    buyer?: boolean;
    filters: { search?: string; status?: string; stage?: string };
}) {
    const form = useForm<{ search: string; status?: string; stage?: string }>({
        search: filters.search ?? '',
        ...(inventory ? { status: filters.status ?? 'all' } : { stage: filters.stage ?? 'all' }),
    });
    const path = inventory ? '/inventory' : '/orders';
    return (
        <Card>
            <ValidatedForm
                className="grid items-end gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.get(path, { preserveScroll: true });
                }}
            >
                <div className="min-w-0 flex-1">
                    <Field
                        label={
                            inventory
                                ? 'Product name'
                                : buyer
                                  ? 'Order, parcel, tracking reference, product, or store'
                                  : 'Parcel, order, tracking reference, or recipient'
                        }
                        type="search"
                        maxLength={100}
                        value={form.data.search}
                        onChange={(event) => form.setData('search', event.target.value)}
                        error={form.errors.search}
                    />
                </div>
                {!inventory && (
                    <div className="min-w-0 lg:w-52">
                        <Select
                            label="Order queue"
                            value={form.data.stage}
                            onChange={(event) => form.setData('stage', event.target.value)}
                            error={form.errors.stage}
                        >
                            <option value="all">All parcels</option>
                            <option value="pending">New orders</option>
                            <option value="processing">Preparing</option>
                            <option value="ready">Ready for pickup</option>
                            <option value="transit">In delivery</option>
                            <option value="issues">Delivery issues</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </Select>
                    </div>
                )}
                {inventory && (
                    <div className="min-w-0 lg:w-52">
                        <Select
                            label="Inventory filter"
                            value={form.data.status}
                            onChange={(event) => form.setData('status', event.target.value)}
                            error={form.errors.status}
                        >
                            <option value="all">All products</option>
                            <option value="active">Published</option>
                            <option value="hidden">Hidden</option>
                            <option value="low-stock">Low stock (under 5)</option>
                            <option value="missing-weight">Missing packed weight</option>
                        </Select>
                    </div>
                )}
                <button type="submit" className={buttonClass} disabled={form.processing}>
                    {form.processing ? 'Searching…' : 'Apply filters'}
                </button>
                <Link href={path} className={secondaryClass}>
                    Reset
                </Link>
            </ValidatedForm>
        </Card>
    );
}
