import AutoFilterForm from '@/components/shared/auto-filter-form';
import { FilterToolbar } from '@/components/shared/filter-toolbar';
import { Card, Field, Select } from '@/components/shared/marketplace-ui';
import { useForm } from '@inertiajs/react';

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
        <Card className="!p-4">
            <AutoFilterForm
                processing={form.processing}
                cancel={form.cancel}
                className="relative"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.get(path, { preserveState: true, preserveScroll: true, replace: true });
                }}
            >
                <FilterToolbar
                    hasErrors={Object.keys(form.errors).length > 0}
                    primary={
                        <div className="min-w-0 flex-1">
                            <Field
                                reserveFeedback={false}
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
                    }
                    activeFilters={[
                        { key: 'search', label: 'Search', value: form.data.search ?? '', onRemove: () => form.setData('search', '') },
                        { key: 'status', label: 'Status', value: form.data.status ?? '', onRemove: () => form.setData('status', 'all') },
                        { key: 'stage', label: 'Queue', value: form.data.stage ?? '', onRemove: () => form.setData('stage', 'all') },
                    ].filter(
                        (filter) =>
                            !!filter.value &&
                            !(filter.key === 'sort' && filter.value === 'name') &&
                            !(filter.key === 'status' && filter.value === 'all') &&
                            !(filter.key === 'stage' && (!buyer || filter.value === 'all')),
                    )}
                >
                    {!inventory && (
                        <div className="min-w-0 lg:w-52">
                            <Select
                                reserveFeedback={false}
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
                                reserveFeedback={false}
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
                </FilterToolbar>
            </AutoFilterForm>
        </Card>
    );
}
