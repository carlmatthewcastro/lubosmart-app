import ParcelCamera from '@/components/logistics/parcel-camera';
import ParcelNextStep from '@/components/logistics/parcel-next-step';
import RiderServiceAreaForm from '@/components/logistics/rider-service-area-form';
import { useConfirmAction } from '@/components/shared/action-feedback';
import {
    Badge,
    Card,
    Empty,
    Field,
    Page,
    Pager,
    type Pagination,
    Select,
    Textarea,
    buttonClass,
    money,
    secondaryClass,
} from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Link, useForm } from '@inertiajs/react';
import { MapPin, Truck } from 'lucide-react';
import { type SellerOrder } from './orders';

export type Delivery = {
    tracking_reference: string | null;
    service_area_id: number | null;
    receipt_condition: string | null;
    sorting_bin: string | null;
    dispatch_prepared_at: string | null;
    dispatch_reference: string | null;
    dispatch_accepted_at: string | null;
    exception_status: string | null;
    events?: { id: number; type: string; actor_name: string; occurred_at: string; notes: string | null; details: string[] }[];
    pickup_approved_at: string | null;
    received_at: string | null;
    sorted_at: string | null;
    id: number;
    status: string;
    logistics_center_id: number | null;
    proof_photo_path: string | null;
    rider: { name: string } | null;
    seller_order: SellerOrder;
};
export type Collection = {
    amount: string;
    status: string;
    received_amount?: string | null;
    handover_reference?: string | null;
    discrepancy_reason?: string | null;
};
export type Option = { id: number; name: string };
export type Rider = Option & { logistics_center_id: number; service_area_ids: number[] };
export type Area = Option & { logistics_center_id: number; province_name?: string | null; city_name?: string | null; barangay_name?: string | null };
export type ScanEntry = { reference: string; method: string; reason: string };
export function Parcel({
    parcel,
    role,
    centers,
    riders,
    areas,
    collection,
    available = false,
    scanEntry,
}: {
    parcel: Delivery;
    role: string;
    centers: Option[];
    riders: Rider[];
    areas: Area[];
    collection?: Collection;
    available?: boolean;
    scanEntry?: ScanEntry;
}) {
    const order = parcel.seller_order;
    const pickup = order.shipping_quote?.pickup_address ?? order.store.pickup_address;
    const pickupAssignment = parcel.status === 'unassigned';
    const assignmentAddress = pickupAssignment
        ? pickup
        : { province: order.order.shipping_province, city: order.order.shipping_city, barangay: order.order.shipping_barangay };
    const destinationAreas = areas.filter(
        (area) =>
            area.logistics_center_id === parcel.logistics_center_id &&
            !!assignmentAddress &&
            (!('province_name' in area) ||
                (area.province_name?.trim().toLowerCase() === assignmentAddress.province.trim().toLowerCase() &&
                    area.city_name?.trim().toLowerCase() === assignmentAddress.city.trim().toLowerCase() &&
                    area.barangay_name?.trim().toLowerCase() === assignmentAddress.barangay.trim().toLowerCase())) &&
            (pickupAssignment || !parcel.sorted_at || area.id === parcel.service_area_id),
    );
    const form = useForm({
        action: '',
        logistics_center_id: centers[0]?.id.toString() ?? '',
        rider_id: '',
        service_area_id: pickupAssignment ? (destinationAreas[0]?.id.toString() ?? '') : (parcel.service_area_id?.toString() ?? ''),
        proof: null as File | null,
        tracking_reference: scanEntry?.reference ?? '',
        capture_method: 'scanner',
        reason: '',
        receipt_condition: 'intact',
        sorting_bin: '',
        amount: '',
        handover_reference: '',
        recipient_name: '',
        request_key: crypto.randomUUID(),
    });
    const confirm = useConfirmAction();
    const send = async (action: string) => {
        if (form.processing) return;
        if (!navigator.onLine) {
            form.setError('action', 'No connection. This operation was not submitted. Reconnect and try again.');
            return;
        }

        if (
            role !== 'admin' &&
            !(await confirm({
                title: `${action.replaceAll('_', ' ')}?`,
                description: `Parcel #${parcel.id}, tracking ${parcel.tracking_reference ?? 'not recorded'}. Confirm the parcel identity, entered details, and physical handover before recording this action.${['receive_cod', 'reconcile_cod', 'deliver'].includes(action) ? ' Verify the cash amount and recipient before continuing.' : ''}`,
                confirmLabel: 'Confirm parcel action',
            }))
        )
            return;
        form.transform((data) => ({
            ...data,
            action,
            ...(scanEntry
                ? {
                      tracking_reference: scanEntry.reference,
                      capture_method: scanEntry.method,
                      reason: data.reason || (scanEntry.method === 'manual' ? scanEntry.reason : ''),
                  }
                : {}),
        }));
        form.post(`/deliveries/${parcel.id}`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => form.setData('request_key', crypto.randomUUID()),
        });
    };
    const eligibleRiders = riders.filter(
        (rider) => rider.logistics_center_id === parcel.logistics_center_id && rider.service_area_ids.includes(Number(form.data.service_area_id)),
    );
    return (
        <Card>
            {form.processing && (
                <p role="status" className="text-primary mb-4 text-sm">
                    Updating parcel...
                </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-muted-foreground text-xs">Parcel #{parcel.id}</p>
                    <p className="mt-2 font-mono text-xs break-all">{parcel.tracking_reference}</p>
                    <h2 className="mt-1 font-semibold">{order.store.name}</h2>
                </div>
                <Badge status={parcel.status} />
            </div>
            {['logistics', 'rider'].includes(role) && <ParcelNextStep parcel={parcel} role={role} scanning={!!scanEntry} />}
            {Object.keys(form.errors).length > 0 && (
                <div role="alert" className="text-destructive my-4 space-y-1 text-sm">
                    {Object.entries(form.errors).map(([key, error]) => (
                        <p key={key}>{error}</p>
                    ))}
                </div>
            )}
            {parcel.dispatch_reference && (
                <p className="my-4 text-sm break-all">
                    Dispatch manifest (one parcel): <span className="font-mono">{parcel.dispatch_reference}</span>
                </p>
            )}
            {role === 'logistics' && !available && !['unassigned', 'delivered'].includes(parcel.status) && (
                <div className="my-5 grid gap-4">
                    {!scanEntry && (
                        <Link href="/logistics/scan" className={secondaryClass}>
                            Open Scan Parcel for receipt, sorting and dispatch
                        </Link>
                    )}
                    {(!parcel.sorted_at || scanEntry) && (
                        <Textarea
                            label="Handling notes / exception reason"
                            value={form.data.reason}
                            maxLength={1000}
                            onChange={(e) => form.setData('reason', e.target.value)}
                            error={form.errors.reason}
                        />
                    )}
                </div>
            )}
            {(role === 'rider' || (role === 'logistics' && parcel.sorted_at && !scanEntry)) && !available && parcel.status !== 'delivered' && (
                <div className="my-5 grid gap-4 rounded-xl border p-4">
                    <ParcelCamera
                        onScan={(reference) => {
                            form.setData('tracking_reference', reference);
                            form.setData('capture_method', 'scanner');
                        }}
                    />
                    <Field
                        label="Scan parcel label or enter tracking reference"
                        value={form.data.tracking_reference}
                        maxLength={40}
                        autoComplete="off"
                        onChange={(e) => form.setData('tracking_reference', e.target.value.trim().toUpperCase())}
                        error={form.errors.tracking_reference}
                    />
                    <Select
                        label="Tracking entry method"
                        value={form.data.capture_method}
                        onChange={(e) => form.setData('capture_method', e.target.value)}
                    >
                        <option value="scanner">USB / Bluetooth scanner</option>
                        <option value="manual">Manual entry (reason required)</option>
                    </Select>
                    <Textarea
                        label="Handling notes / exception or manual entry reason"
                        value={form.data.reason}
                        maxLength={1000}
                        onChange={(e) => form.setData('reason', e.target.value)}
                        error={form.errors.reason}
                    />
                    <p className="text-muted-foreground text-xs">
                        Scanning only selects a parcel. Confirm each physical operation below while online.
                    </p>
                </div>
            )}
            {role === 'logistics' &&
                !available &&
                !parcel.exception_status &&
                !parcel.dispatch_accepted_at &&
                ((parcel.status === 'unassigned' && parcel.pickup_approved_at) ||
                    (['picked_up', 'in_transit'].includes(parcel.status) && parcel.sorted_at)) && (
                    <ValidatedForm
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            send('assign');
                        }}
                    >
                        <Select
                            label={pickupAssignment ? 'Pickup area (Seller address)' : 'Delivery area (Buyer address)'}
                            error={form.errors.service_area_id}
                            value={form.data.service_area_id}
                            onChange={(event) => {
                                form.setData('service_area_id', event.target.value);
                                form.setData('rider_id', '');
                            }}
                            required
                        >
                            <option value="">Choose the assignment barangay</option>
                            {destinationAreas.map((area) => (
                                <option key={area.id} value={area.id}>
                                    {area.name}
                                </option>
                            ))}
                        </Select>

                        <Select
                            label="Approved rider"
                            error={form.errors.rider_id}
                            value={form.data.rider_id}
                            onChange={(e) => form.setData('rider_id', e.target.value)}
                            required
                        >
                            <option value="">Choose a rider</option>
                            {eligibleRiders.map((rider) => (
                                <option key={rider.id} value={rider.id}>
                                    {rider.name}
                                </option>
                            ))}
                        </Select>
                        <button className={buttonClass} disabled={form.processing || !eligibleRiders.length}>
                            {parcel.status === 'unassigned'
                                ? 'Assign Pickup Rider'
                                : parcel.dispatch_prepared_at
                                  ? 'Reassign Delivery Rider'
                                  : 'Assign Delivery Rider'}
                        </button>
                        {!destinationAreas.length && (
                            <p role="status" className="text-muted-foreground text-sm">
                                No active service area matches this buyer’s destination. Set up destination coverage before assigning a rider.
                            </p>
                        )}
                        {!!form.data.service_area_id && !eligibleRiders.length && (
                            <p role="status" className="text-muted-foreground text-sm">
                                No approved rider covers the selected {pickupAssignment ? 'pickup area' : 'delivery area'} in this center.{' '}
                                <Link href="/logistics/rider-coverage" className="text-primary underline">
                                    Set up rider coverage
                                </Link>{' '}
                                before assigning.
                            </p>
                        )}
                    </ValidatedForm>
                )}
            {pickup && (
                <div className="mt-4 rounded-xl border p-4">
                    <p className="text-primary text-xs font-medium">Seller Pickup Address</p>
                    <p className="mt-2 text-sm">
                        {pickup.line1}, {pickup.barangay}, {pickup.city}, {pickup.province}
                    </p>
                    <a href={'tel:' + pickup.phone} className="text-primary mt-2 inline-flex min-h-11 items-center text-sm">
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
                        <a className="text-primary mt-2 inline-flex min-h-11 items-center text-sm" href={`tel:${order.order.shipping_phone}`}>
                            {order.order.shipping_phone}
                        </a>
                    </div>
                    <div className="my-5 flex flex-wrap justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{parcel.rider ? `Rider: ${parcel.rider.name}` : 'Awaiting rider assignment'}</span>
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
                <ValidatedForm
                    className="mt-5 flex flex-wrap items-end gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        send('claim');
                    }}
                >
                    <Select
                        label="Receiving center"
                        error={form.errors.logistics_center_id}
                        value={form.data.logistics_center_id}
                        onChange={(e) => form.setData('logistics_center_id', e.target.value)}
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
                </ValidatedForm>
            )}
            {role === 'logistics' && !available && (
                <div className="mb-5 space-y-3">
                    {parcel.exception_status && (
                        <div className="space-y-3 rounded-xl border p-4">
                            <p role="status" className="font-medium">
                                Exception: {parcel.exception_status.replaceAll('_', ' ')}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                Record the decision reason and current custody in handling notes. Damaged parcels require escalation through support.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {['failed_attempt', 'held', 'returned_to_center'].includes(parcel.exception_status) &&
                                    parcel.receipt_condition !== 'damaged' && (
                                        <button className={secondaryClass} disabled={form.processing} onClick={() => send('retry')}>
                                            Authorize retry
                                        </button>
                                    )}
                                {['failed_attempt', 'held'].includes(parcel.exception_status) &&
                                    (!parcel.received_at || parcel.dispatch_accepted_at) && (
                                        <button className={secondaryClass} disabled={form.processing} onClick={() => send('return_to_center')}>
                                            Request return to center
                                        </button>
                                    )}
                                {parcel.exception_status === 'failed_attempt' && (
                                    <button className={secondaryClass} disabled={form.processing} onClick={() => send('hold')}>
                                        Hold for review
                                    </button>
                                )}
                                {scanEntry && parcel.exception_status === 'return_requested' && (
                                    <button className={buttonClass} disabled={form.processing} onClick={() => send('receive_return')}>
                                        Confirm returned parcel received
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    {scanEntry &&
                        (!parcel.received_at || parcel.exception_status === 'return_requested') &&
                        ['picked_up', 'in_transit', 'out_for_delivery'].includes(parcel.status) && (
                            <Select
                                label="Parcel condition at receipt"
                                value={form.data.receipt_condition}
                                onChange={(e) => form.setData('receipt_condition', e.target.value)}
                                error={form.errors.receipt_condition}
                            >
                                <option value="intact">Intact</option>
                                <option value="damaged">Damaged — hold for review</option>
                            </Select>
                        )}
                    {parcel.status === 'unassigned' && !parcel.pickup_approved_at && order.status === 'shipped' && (
                        <button className={buttonClass} disabled={form.processing} onClick={() => send('approve_pickup')}>
                            Approve Pickup Request
                        </button>
                    )}
                    {scanEntry && !parcel.exception_status && ['picked_up', 'in_transit'].includes(parcel.status) && !parcel.received_at && (
                        <button className={buttonClass} disabled={form.processing} onClick={() => send('receive')}>
                            Confirm Center Receipt
                        </button>
                    )}
                    {scanEntry &&
                        !parcel.exception_status &&
                        ['picked_up', 'in_transit'].includes(parcel.status) &&
                        parcel.received_at &&
                        !parcel.sorted_at && (
                            <div className="grid gap-4">
                                <Select
                                    label="Sorted destination area"
                                    value={form.data.service_area_id}
                                    onChange={(e) => form.setData('service_area_id', e.target.value)}
                                    error={form.errors.service_area_id}
                                >
                                    <option value="">Choose destination area</option>
                                    {areas
                                        .filter((area) => area.logistics_center_id === parcel.logistics_center_id)
                                        .map((area) => (
                                            <option key={area.id} value={area.id}>
                                                {area.name}
                                            </option>
                                        ))}
                                </Select>
                                <Field
                                    label="Destination bin / route"
                                    value={form.data.sorting_bin}
                                    maxLength={80}
                                    onChange={(e) => form.setData('sorting_bin', e.target.value)}
                                    error={form.errors.sorting_bin}
                                />
                                <button className={buttonClass} disabled={form.processing} onClick={() => send('sort')}>
                                    Confirm Sorted for Destination
                                </button>
                            </div>
                        )}
                    <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                        {[
                            ['Pickup Approved', parcel.pickup_approved_at],
                            ['Received', parcel.received_at],
                            ['Sorted', parcel.sorted_at],
                            ['Dispatch prepared', parcel.dispatch_prepared_at],
                            ['Rider accepted', parcel.dispatch_accepted_at],
                        ].map(([label, date]) => (
                            <span key={label} className="bg-background rounded-lg px-3 py-2">
                                {label}: {date ? new Date(date).toLocaleString('en-PH') : 'Pending'}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {role === 'rider' && !parcel.exception_status && ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(parcel.status) && (
                <div className="space-y-4">
                    {parcel.dispatch_prepared_at && !parcel.dispatch_accepted_at && (
                        <button className={buttonClass} disabled={form.processing} onClick={() => send('accept_dispatch')}>
                            Scan and accept dispatch handover
                        </button>
                    )}
                    {parcel.status === 'out_for_delivery' && (
                        <>
                            <Field
                                label="Recipient who received the parcel"
                                value={form.data.recipient_name}
                                maxLength={150}
                                onChange={(e) => form.setData('recipient_name', e.target.value)}
                                error={form.errors.recipient_name}
                            />
                            <Field
                                label="Actual COD collected (PHP)"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.amount}
                                onChange={(e) => form.setData('amount', e.target.value)}
                                error={form.errors.amount}
                            />
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
                            (Boolean(parcel.sorted_at) && !parcel.dispatch_accepted_at) ||
                            (parcel.status === 'out_for_delivery' && !form.data.proof) ||
                            (parcel.status === 'picked_up' && !parcel.sorted_at)
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
                                picked_up: 'Waiting for center receipt and dispatch',
                                in_transit: 'Mark out for delivery',
                                out_for_delivery: 'Confirm delivered & COD collected',
                            }[parcel.status]
                        }
                    </button>
                    {parcel.status === 'out_for_delivery' && (
                        <button className={secondaryClass} disabled={form.processing} onClick={() => send('failed_attempt')}>
                            Record failed delivery attempt
                        </button>
                    )}
                    {parcel.status === 'picked_up' && !parcel.sorted_at && (
                        <p className="text-muted-foreground text-xs">
                            Return the parcel to the center. Dispatch becomes available after receipt and sorting.
                        </p>
                    )}
                    {form.progress && (
                        <div className="space-y-2">
                            <p role="status" className="text-muted-foreground text-sm">
                                Uploading proof: {form.progress.percentage ?? 0}%
                            </p>
                            <progress
                                aria-label="Delivery proof upload"
                                className="accent-primary h-2 w-full"
                                value={form.progress.percentage ?? 0}
                                max={100}
                            />
                        </div>
                    )}
                </div>
            )}
            {role === 'rider' && parcel.exception_status && (
                <p role="status" className="my-4 text-sm">
                    {parcel.exception_status.replaceAll('_', ' ')}. Contact your logistics center for the next instruction. Keep custody until a
                    recorded handover.
                </p>
            )}
            {collection && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div>
                        <p className="text-sm font-medium">COD {money(collection.amount)}</p>
                        <div className="mt-2">
                            <Badge status={collection.status} />
                        </div>
                    </div>
                    {role === 'logistics' &&
                        (collection.status === 'collected' || (collection.status === 'handed_over' && collection.received_amount == null)) && (
                            <div className="grid w-full gap-4">
                                {collection.discrepancy_reason && (
                                    <p role="alert" className="text-destructive text-sm">
                                        Unresolved discrepancy: {collection.discrepancy_reason}. Last total received:{' '}
                                        {money(collection.received_amount ?? 0)}. Enter the cumulative amount now verified for this collection.
                                    </p>
                                )}
                                <Field
                                    label="Total cash physically received (PHP)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.data.amount}
                                    onChange={(e) => form.setData('amount', e.target.value)}
                                    error={form.errors.amount}
                                />
                                <Field
                                    label="Cash handover receipt / reference"
                                    value={form.data.handover_reference}
                                    maxLength={100}
                                    onChange={(e) => form.setData('handover_reference', e.target.value)}
                                    error={form.errors.handover_reference}
                                />
                                <Textarea
                                    label="Cash discrepancy reason (required when amount differs)"
                                    value={form.data.reason}
                                    maxLength={1000}
                                    onChange={(e) => form.setData('reason', e.target.value)}
                                    error={form.errors.reason}
                                />
                                <button className={buttonClass} disabled={form.processing} onClick={() => send('receive_cod')}>
                                    {collection.status === 'handed_over' ? 'Verify previous cash handover' : 'Confirm cash received'}
                                </button>
                            </div>
                        )}
                    {role === 'admin' && collection.status === 'handed_over' && (
                        <button className={buttonClass} disabled={form.processing} onClick={() => send('reconcile_cod')}>
                            Reconcile COD
                        </button>
                    )}
                </div>
            )}
            {parcel.events && parcel.events.length > 0 && (
                <details className="mt-5 border-t pt-4">
                    <summary className="min-h-11 cursor-pointer text-sm font-medium">Parcel handling history ({parcel.events.length})</summary>
                    <ol className="mt-3 space-y-3 text-sm">
                        {parcel.events.map((event) => (
                            <li key={event.id} className="rounded-xl border p-3">
                                <p className="font-medium">{event.type.replaceAll('_', ' ')}</p>
                                <p className="text-muted-foreground">
                                    {event.actor_name} · {new Date(event.occurred_at).toLocaleString('en-PH')}
                                </p>
                                {event.details?.map((detail, index) => (
                                    <p key={index} className="mt-2 text-sm break-words">
                                        {detail}
                                    </p>
                                ))}
                            </li>
                        ))}
                    </ol>
                </details>
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
    filters = {},
}: {
    deliveries: Pagination<Delivery>;
    available: Delivery[];
    centers: Option[];
    riders: Rider[];
    areas: Area[];
    cod: Record<string, Collection>;
    role: string;
    filters?: { stage?: string; search?: string };
}) {
    return (
        <Page
            title={role === 'rider' ? 'My deliveries' : 'Parcel operations'}
            description={role === 'rider' ? 'Manage pickups, deliveries and collected cash.' : 'Manage parcels, riders and collected cash.'}
        >
            {role === 'logistics' && <RiderServiceAreaForm centers={centers} riders={riders} />}
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
                                areas={areas}
                                collection={cod[parcel.id]}
                            />
                        ))}
                    </div>
                ) : (
                    <Empty
                        title={
                            role === 'rider'
                                ? filters.search || (filters.stage && filters.stage !== 'all')
                                    ? 'No matching parcels'
                                    : 'No assigned deliveries'
                                : 'No parcels yet'
                        }
                        description={
                            role === 'rider'
                                ? filters.search || (filters.stage && filters.stage !== 'all')
                                    ? 'Try another queue or search for a different tracking reference or store.'
                                    : 'Your logistics company will assign deliveries here.'
                                : 'Received parcels will appear here.'
                        }
                    />
                )}
            </section>
            <Pager links={deliveries.links} />
        </Page>
    );
}
