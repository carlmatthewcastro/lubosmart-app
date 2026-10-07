import { Badge, Card, Empty, Field, Page, Pager, type Pagination, Select, buttonClass, money, secondaryClass } from '@/components/marketplace-ui';
import { useForm } from '@inertiajs/react';
import { MapPin, Truck } from 'lucide-react';
import { type SellerOrder } from './orders';

type Delivery = {
    id: number;
    status: string;
    sorting_center_id: number | null;
    proof_photo_path: string | null;
    rider: { name: string } | null;
    seller_order: SellerOrder;
};
type Collection = { amount: string; status: string };
type Option = { id: number; name: string };
function Parcel({
    parcel,
    role,
    centers,
    riders,
    collection,
    available = false,
}: {
    parcel: Delivery;
    role: string;
    centers: Option[];
    riders: Option[];
    collection?: Collection;
    available?: boolean;
}) {
    const form = useForm<{ action: string; sorting_center_id: string; rider_id: string; proof: File | null }>({
        action: '',
        sorting_center_id: centers[0]?.id.toString() ?? '',
        rider_id: '',
        proof: null,
    });
    const send = (action: string) => {
        form.transform((data) => ({ ...data, action }));
        form.post(`/deliveries/${parcel.id}`, { preserveScroll: true, forceFormData: true });
    };
    const order = parcel.seller_order;
    return (
        <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-muted-foreground text-xs">Parcel #{parcel.id}</p>
                    <h2 className="mt-1 font-semibold">{order.store.name}</h2>
                </div>
                <Badge status={parcel.status} />
            </div>
            {!available && (
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
            )}
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
                        Receive parcel
                    </button>
                </form>
            )}
            {role === 'logistics' && !available && parcel.status === 'unassigned' && (
                <form
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        send('assign');
                    }}
                >
                    <Select label="Approved courier" value={form.data.rider_id} onChange={(e) => form.setData('rider_id', e.target.value)} required>
                        <option value="">Choose a courier</option>
                        {riders.map((rider) => (
                            <option key={rider.id} value={rider.id}>
                                {rider.name}
                            </option>
                        ))}
                    </Select>
                    <button className={buttonClass} disabled={form.processing || !riders.length}>
                        Assign courier
                    </button>
                    {!riders.length && <p className="text-muted-foreground text-xs">Approve a rider for this center before assigning parcels.</p>}
                </form>
            )}
            {role === 'rider' && ['assigned', 'picked_up', 'in_transit'].includes(parcel.status) && (
                <div className="space-y-4">
                    {parcel.status === 'in_transit' && (
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
                        disabled={form.processing || (parcel.status === 'in_transit' && !form.data.proof)}
                        onClick={() => send({ assigned: 'picked_up', picked_up: 'in_transit', in_transit: 'delivered' }[parcel.status] ?? '')}
                    >
                        <Truck className="size-4" />
                        {{ assigned: 'Confirm pickup', picked_up: 'Start delivery', in_transit: 'Confirm delivered & COD collected' }[parcel.status]}
                    </button>
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
                    {role === 'logistics' && collection.status === 'collected' && (
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
    cod,
    role,
}: {
    deliveries: Pagination<Delivery>;
    available: Delivery[];
    centers: Option[];
    riders: Option[];
    cod: Record<string, Collection>;
    role: string;
}) {
    return (
        <Page
            title={role === 'rider' ? 'My deliveries' : 'Parcel operations'}
            description={role === 'rider' ? 'Manage pickups, deliveries and collected cash.' : 'Manage parcels, couriers and collected cash.'}
        >
            {available.length > 0 && (
                <section>
                    <h2 className="mb-4 font-semibold">Ready for center receipt</h2>
                    <div className="grid gap-4 xl:grid-cols-2">
                        {available.map((parcel) => (
                            <Parcel key={parcel.id} parcel={parcel} role={role} centers={centers} riders={riders} available />
                        ))}
                    </div>
                </section>
            )}
            <section>
                <h2 className="mb-4 font-semibold">
                    {role === 'rider' ? 'Assigned to you' : 'Tracked parcels'} ({deliveries.total})
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
                                collection={cod[parcel.id]}
                            />
                        ))}
                    </div>
                ) : (
                    <Empty
                        title={role === 'rider' ? 'No assigned deliveries' : 'No parcels yet'}
                        description={role === 'rider' ? 'Your center will assign deliveries here.' : 'Received parcels will appear here.'}
                    />
                )}
            </section>
            <Pager links={deliveries.links} />
        </Page>
    );
}
