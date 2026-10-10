import InputError from '@/components/input-error';
import { Badge, Card, Empty, Field, Page, Pager, type Pagination, Select, buttonClass, money, secondaryClass } from '@/components/marketplace-ui';
import RiderServiceAreaForm from '@/components/rider-service-area-form';
import { useForm } from '@inertiajs/react';
import { MapPin, Truck } from 'lucide-react';
import { type SellerOrder } from './orders';

export type Delivery = {
    pickup_approved_at: string | null;
    received_at: string | null;
    sorted_at: string | null;
    id: number;
    status: string;
    sorting_center_id: number | null;
    proof_photo_path: string | null;
    rider: { name: string } | null;
    seller_order: SellerOrder;
};
export type Collection = { amount: string; status: string };
export type Option = { id: number; name: string };
export type Rider = Option & { sorting_center_id: number; service_area_ids: number[] };
export type Area = Option & { sorting_center_id: number };
export function Parcel({
    parcel,
    role,
    centers,
    riders,
    areas,
    collection,
    available = false,
}: {
    parcel: Delivery;
    role: string;
    centers: Option[];
    riders: Rider[];
    areas: Area[];
    collection?: Collection;
    available?: boolean;
}) {
    const form = useForm<{ action: string; sorting_center_id: string; rider_id: string; service_area_id: string; proof: File | null }>({
        action: '',
        sorting_center_id: centers[0]?.id.toString() ?? '',
        rider_id: '',
        service_area_id: '',
        proof: null,
    });
    const send = (action: string) => {
        form.transform((data) => ({ ...data, action }));
        form.post(`/deliveries/${parcel.id}`, { preserveScroll: true, forceFormData: true });
    };
    const order = parcel.seller_order;
    const pickup = order.shipping_quote?.pickup_address ?? order.store.pickup_address;
    return (
        <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-muted-foreground text-xs">Parcel #{parcel.id}</p>
                    <h2 className="mt-1 font-semibold">{order.store.name}</h2>
                </div>
                <Badge status={parcel.status} />
            </div>
            {pickup && (
                <div className="mt-4 rounded-xl border p-4">
                    <p className="text-primary text-xs font-medium">Seller Pickup Address</p>
                    <p className="mt-2 text-sm">
                        {pickup.line1}, {pickup.barangay}, {pickup.city}, {pickup.province}
                    </p>
                    <a href={'tel:' + pickup.phone} className="text-primary mt-2 block text-xs">
                        {pickup.phone}
                    </a>
                </div>
            )}
            {order.shipping_weight_grams && (
                <p className="text-muted-foreground mt-3 text-xs">
                    Packed weight: {(order.shipping_weight_grams / 1000).toFixed(2)} kg / Shipping: {money(order.shipping_fee)}
                </p>
            )}
            {
                <>
                    <div className="bg-background mt-5 rounded-xl p-4">
                        <p className="flex items-center gap-2 text-sm font-medium">
                            <MapPin className="text-primary size-4" />
                            {order.order.shipping_recipient_name}
                        </p>
                        <p className="text-muted-foreground mt-2 text-sm">
                            {order.order.shipping_line1}, {order.order.shipping_barangay}, {order.order.shipping_city},{' '}
                            {order.order.shipping_province}
                        </p>
                        <a className="text-primary mt-2 block text-sm" href={`tel:${order.order.shipping_phone}`}>
                            {order.order.shipping_phone}
                        </a>
                    </div>
                    <div className="my-5 flex flex-wrap justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">
                            {parcel.rider ? `Courier: ${parcel.rider.name}` : 'Awaiting courier assignment'}
                        </span>
                        <span className="font-semibold">COD: {money(Number(order.subtotal) + Number(order.shipping_fee))}</span>
                    </div>
                    <ul className="text-muted-foreground mb-5 space-y-1 text-xs">
                        {order.items.map((item) => (
                            <li key={item.id}>
                                {item.product_name} × {item.quantity}
                            </li>
                        ))}
                    </ul>
                </>
            }
            {available && (
                <form
                    className="mt-5 flex flex-wrap items-end gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        send('claim');
                    }}
                >
                    <Select
                        label="Receiving center"
                        value={form.data.sorting_center_id}
                        onChange={(e) => form.setData('sorting_center_id', e.target.value)}
                        required
                    >
                        {centers.map((center) => (
                            <option key={center.id} value={center.id}>
                                {center.name}
                            </option>
                        ))}
                    </Select>
                    <button className={buttonClass} disabled={form.processing}>
                        Accept Pickup Request
                    </button>
                </form>
            )}
            {role === 'sorting_center' && !available && (
                <div className="mb-5 space-y-3">
                    {parcel.status === 'unassigned' && !parcel.pickup_approved_at && order.status === 'shipped' && (
                        <button className={buttonClass} disabled={form.processing} onClick={() => send('approve_pickup')}>
                            Approve Pickup Request
                        </button>
                    )}
                    {['picked_up', 'in_transit'].includes(parcel.status) && !parcel.received_at && (
                        <button className={buttonClass} disabled={form.processing} onClick={() => send('receive')}>
                            Confirm Center Receipt
                        </button>
                    )}
                    {['picked_up', 'in_transit'].includes(parcel.status) && parcel.received_at && !parcel.sorted_at && (
                        <button className={buttonClass} disabled={form.processing} onClick={() => send('sort')}>
                            Confirm Sorted for Destination
                        </button>
                    )}
                    <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                        {[
                            ['Pickup Approved', parcel.pickup_approved_at],
                            ['Received', parcel.received_at],
                            ['Sorted', parcel.sorted_at],
                        ].map(([label, date]) => (
                            <span key={label} className="bg-background rounded-lg px-3 py-2">
                                {label}: {date ? new Date(date).toLocaleString('en-PH') : 'Pending'}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {role === 'sorting_center' &&
                !available &&
                ((parcel.status === 'unassigned' &&
                    (parcel.pickup_approved_at || !(order as SellerOrder & { shipping_quote?: { basis: string } }).shipping_quote)) ||
                    (['picked_up', 'in_transit'].includes(parcel.status) && parcel.sorted_at)) && (
                    <form
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            send('assign');
                        }}
                    >
                        <Select
                            label="Delivery area"
                            value={form.data.service_area_id}
                            onChange={(event) => {
                                form.setData('service_area_id', event.target.value);
                                form.setData('rider_id', '');
                            }}
                            required
                        >
                            <option value="">Choose the destination barangay</option>
                            {areas
                                .filter((area) => area.sorting_center_id === parcel.sorting_center_id)
                                .map((area) => (
                                    <option key={area.id} value={area.id}>
                                        {area.name}
                                    </option>
                                ))}
                        </Select>
                        <InputError message={form.errors.service_area_id || form.errors.rider_id} />
                        <Select
                            label="Approved courier"
                            value={form.data.rider_id}
                            onChange={(e) => form.setData('rider_id', e.target.value)}
                            required
                        >
                            <option value="">Choose a courier</option>
                            {riders
                                .filter(
                                    (rider) =>
                                        rider.sorting_center_id === parcel.sorting_center_id &&
                                        rider.service_area_ids.includes(Number(form.data.service_area_id)),
                                )
                                .map((rider) => (
                                    <option key={rider.id} value={rider.id}>
                                        {rider.name}
                                    </option>
                                ))}
                        </Select>
                        <button className={buttonClass} disabled={form.processing || !riders.length}>
                            {parcel.status === 'unassigned' ? 'Assign Pickup Rider' : 'Assign Delivery Rider'}
                        </button>
                        {!riders.length && (
                            <p className="text-muted-foreground text-xs">Approve a courier for this center before assigning parcels.</p>
                        )}
                    </form>
                )}
            {role === 'courier' && ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(parcel.status) && (
                <div className="space-y-4">
                    {parcel.status === 'out_for_delivery' && (
                        <>
                            <Field
                                label="Delivery proof photo (JPG or PNG, up to 5 MB)"
                                type="file"
                                accept="image/jpeg,image/png"
                                onChange={(e) => form.setData('proof', e.target.files?.[0] ?? null)}
                                error={form.errors.proof}
                            />
                            <p className="text-muted-foreground text-xs">
                                Confirm delivery only after the recipient receives the parcel and pays the displayed COD amount.
                            </p>
                        </>
                    )}
                    <button
                        className={buttonClass}
                        disabled={
                            form.processing ||
                            (parcel.status === 'out_for_delivery' && !form.data.proof) ||
                            (parcel.status === 'picked_up' && order.shipping_quote?.basis === 'destination_and_weight' && !parcel.sorted_at)
                        }
                        onClick={() =>
                            send(
                                { assigned: 'picked_up', picked_up: 'in_transit', in_transit: 'out_for_delivery', out_for_delivery: 'delivered' }[
                                    parcel.status
                                ] ?? '',
                            )
                        }
                    >
                        <Truck className="size-4" />
                        {
                            {
                                assigned: 'Confirm pickup',
                                picked_up: 'Start delivery',
                                in_transit: 'Mark out for delivery',
                                out_for_delivery: 'Confirm delivered & COD collected',
                            }[parcel.status]
                        }
                    </button>
                    {parcel.status === 'picked_up' && order.shipping_quote?.basis === 'destination_and_weight' && !parcel.sorted_at && (
                        <p className="text-muted-foreground text-xs">
                            Return the parcel to the center. Dispatch becomes available after receipt and sorting.
                        </p>
                    )}
                    {form.progress && <p className="text-muted-foreground text-xs">Uploading {form.progress.percentage}%</p>}
                </div>
            )}
            {collection && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div>
                        <p className="text-sm font-medium">COD {money(collection.amount)}</p>
                        <div className="mt-2">
                            <Badge status={collection.status} />
                        </div>
                    </div>
                    {role === 'sorting_center' && collection.status === 'collected' && (
                        <button className={buttonClass} disabled={form.processing} onClick={() => send('receive_cod')}>
                            Confirm cash received
                        </button>
                    )}
                    {role === 'admin' && collection.status === 'handed_over' && (
                        <button className={buttonClass} disabled={form.processing} onClick={() => send('reconcile_cod')}>
                            Reconcile COD
                        </button>
                    )}
                </div>
            )}
            {parcel.proof_photo_path && (
                <a href={`/deliveries/${parcel.id}/proof`} className={`${secondaryClass} mt-4`}>
                    Download proof
                </a>
            )}
        </Card>
    );
}
export default function Deliveries({
    deliveries,
    available,
    centers,
    riders,
    areas,
    cod,
    role,
}: {
    deliveries: Pagination<Delivery>;
    available: Delivery[];
    centers: Option[];
    riders: Rider[];
    areas: Area[];
    cod: Record<string, Collection>;
    role: string;
}) {
    return (
        <Page
            title={role === 'courier' ? 'My deliveries' : 'Parcel operations'}
            description={role === 'courier' ? 'Manage pickups, deliveries and collected cash.' : 'Manage parcels, couriers and collected cash.'}
        >
            {role === 'sorting_center' && <RiderServiceAreaForm centers={centers} riders={riders} />}
            {available.length > 0 && (
                <section>
                    <h2 className="mb-4 font-semibold">Ready for center receipt</h2>
                    <div className="grid gap-4 xl:grid-cols-2">
                        {available.map((parcel) => (
                            <Parcel key={parcel.id} parcel={parcel} role={role} centers={centers} riders={riders} areas={areas} available />
                        ))}
                    </div>
                </section>
            )}
            <section>
                <h2 className="mb-4 font-semibold">
                    {role === 'courier' ? 'Assigned to you' : 'Tracked parcels'} ({deliveries.total})
                </h2>
                {deliveries.data.length ? (
                    <div className="grid items-start gap-5 xl:grid-cols-2">
                        {deliveries.data.map((parcel) => (
                            <Parcel
                                key={`${parcel.id}-${parcel.status}-${cod[parcel.id]?.status}`}
                                parcel={parcel}
                                role={role}
                                centers={centers}
                                riders={riders}
                                areas={areas}
                                collection={cod[parcel.id]}
                            />
                        ))}
                    </div>
                ) : (
                    <Empty
                        title={role === 'courier' ? 'No assigned deliveries' : 'No parcels yet'}
                        description={role === 'courier' ? 'Your center will assign deliveries here.' : 'Received parcels will appear here.'}
                    />
                )}
            </section>
            <Pager links={deliveries.links} />
        </Page>
    );
}
