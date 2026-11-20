import DeliveryProofCamera from '@/components/logistics/delivery-proof-camera';
import ParcelCamera from '@/components/logistics/parcel-camera';
import ParcelNextStep from '@/components/logistics/parcel-next-step';
import RiderServiceAreaForm from '@/components/logistics/rider-service-area-form';
import OrderProductImage from '@/components/marketplace/order-product-image';
import RiderNavigation, { riderQueues } from '@/components/rider/rider-navigation';
import RiderParcelRecords from '@/components/rider/rider-parcel-records';
import { useConfirmAction } from '@/components/shared/action-feedback';
import ActivityTimeline from '@/components/shared/activity-timeline';
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
import ProgressStepper from '@/components/shared/progress-stepper';
import RecordAction from '@/components/shared/record-action';
import { RecordDisclosure, RecordHeader, openRecordSection } from '@/components/shared/record-header';
import ValidatedForm from '@/components/shared/validated-form';
import { codStages, parcelStages } from '@/components/shared/workflow-stages';
import { activityNote } from '@/lib/activity-note';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Copy, Download, History, MapPin, Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { type SellerOrder } from './orders';

export type Delivery = {
    picked_up_at?: string | null;
    delivered_at?: string | null;
    allowed_actions?: string[];
    fulfillment_status?: string;
    delivery_notes?: string | null;
    tracking_reference: string | null;
    service_area_id: number | null;
    receipt_condition: string | null;
    sorting_bin: string | null;
    dispatch_prepared_at: string | null;
    dispatch_reference: string | null;
    dispatch_accepted_at: string | null;
    exception_status: string | null;
    events?: { has_proof?: boolean; id: number; type: string; actor_name: string; occurred_at: string; notes: string | null; details: string[] }[];
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
    collected_at?: string | null;
    handed_over_at?: string | null;
    reconciled_at?: string | null;
    amount: string;
    status: string;
    received_amount?: string | null;
    handover_reference?: string | null;
    discrepancy_reason?: string | null;
    expected_handover_amount?: string;
    expected_handover_reference?: string;
};
export type Option = { id: number; name: string };
export type Rider = Option & { logistics_center_id: number; service_area_ids: number[]; rider_capability?: string };
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
    embedded = false,
}: {
    parcel: Delivery;
    role: string;
    centers: Option[];
    riders: Rider[];
    areas: Area[];
    collection?: Collection;
    available?: boolean;
    scanEntry?: ScanEntry;
    embedded?: boolean;
}) {
    const { noteSuggestions } = usePage<{ noteSuggestions: Record<string, string[]> }>().props;
    const [deliveryAction, setDeliveryAction] = useState('');
    const [copyMessage, setCopyMessage] = useState('');
    const [reportDiscrepancy, setReportDiscrepancy] = useState(false);
    const historyRef = useRef<HTMLDetailsElement>(null);
    const order = parcel.seller_order;
    const cashEvent = parcel.events?.findLast((event) => ['submit_cod_handover', 'cod_discrepancy', 'receive_cod'].includes(event.type));
    const handoverPending = collection?.status === 'collected' && cashEvent?.type === 'submit_cod_handover';
    // The scan workspace presents one permitted exception action at a time.
    const scanExceptionAction = scanEntry
        ? ['receive_return', 'retry', 'return_to_center', 'hold'].find((action) => parcel.allowed_actions?.includes(action))
        : undefined;
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
                (area.province_name?.trim().toLowerCase() === assignmentAddress.province?.trim().toLowerCase() &&
                    area.city_name?.trim().toLowerCase() === assignmentAddress.city?.trim().toLowerCase() &&
                    area.barangay_name?.trim().toLowerCase() === assignmentAddress.barangay?.trim().toLowerCase())) &&
            (pickupAssignment || !parcel.sorted_at || area.id === parcel.service_area_id),
    );
    const sortingArea = destinationAreas.find((area) => area.id === parcel.service_area_id) ?? destinationAreas[0];
    const sortingReady = !parcel.exception_status && ['picked_up', 'in_transit'].includes(parcel.status) && !!parcel.received_at && !parcel.sorted_at;
    const sortingDefaultsApplied = useRef(false);
    const form = useForm({
        action: '',
        logistics_center_id: centers[0]?.id.toString() ?? '',
        rider_id: '',
        service_area_id: pickupAssignment ? (destinationAreas[0]?.id.toString() ?? '') : (sortingArea?.id.toString() ?? ''),
        proof: null as File | null,
        tracking_reference: scanEntry?.reference ?? '',
        capture_method: 'scanner',
        reason: '',
        receipt_condition: 'intact',
        sorting_bin: parcel.sorting_bin ?? (!pickupAssignment && sortingArea ? sortingArea.name.slice(0, 80) : ''),
        amount: '',
        handover_reference: '',
        recipient_name: '',
        note: '',
        remarks: '',
        cod_confirmed: false as boolean,
        request_key: crypto.randomUUID(),
    });
    const setFormData = form.setData;
    const suggestedAreaId = sortingArea?.id.toString() ?? '';
    const suggestedRoute = sortingArea?.name.slice(0, 80) ?? '';
    useEffect(() => {
        if (!sortingReady || !suggestedAreaId || sortingDefaultsApplied.current) return;
        sortingDefaultsApplied.current = true;
        setFormData((data) => ({
            ...data,
            service_area_id: suggestedAreaId,
            sorting_bin: data.sorting_bin || suggestedRoute,
        }));
    }, [sortingReady, suggestedAreaId, suggestedRoute, setFormData]);
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
                title: action === 'submit_cod_handover' ? 'Submit COD handover?' : `${action.replaceAll('_', ' ')}?`,
                description:
                    action === 'submit_cod_handover'
                        ? `Confirm you physically handed over ${money(collection?.amount ?? 0)} for parcel #${parcel.id} to Logistics. Logistics must still verify the cash received.`
                        : `Parcel #${parcel.id}, tracking ${parcel.tracking_reference ?? 'not recorded'}. Confirm the parcel identity, entered details, and physical handover before recording this action.${['receive_cod', 'reconcile_cod', 'deliver'].includes(action) ? ' Verify the cash amount and recipient before continuing.' : ''}`,
                confirmLabel: action === 'submit_cod_handover' ? 'Submit handover' : 'Confirm parcel action',
            }))
        )
            return;
        form.transform((data) => ({
            ...data,
            action,
            ...(['submit_cod_handover', 'receive_cod'].includes(action) && !reportDiscrepancy
                ? {
                      amount: collection?.expected_handover_amount ?? collection?.amount ?? '',
                      handover_reference: collection?.expected_handover_reference ?? '',
                  }
                : {}),
            report_discrepancy: reportDiscrepancy,
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
        (rider) =>
            ['both', pickupAssignment ? 'pickup' : 'delivery'].includes(rider.rider_capability ?? 'both') &&
            rider.logistics_center_id === parcel.logistics_center_id &&
            rider.service_area_ids.includes(Number(form.data.service_area_id)),
    );
    return (
        <Card className={embedded ? '@container relative border-0 !p-0 shadow-none' : '@container relative'}>
            {form.processing && (
                <p role="status" className="text-primary mb-4 text-sm">
                    Updating parcel...
                </p>
            )}
            <div className="grid min-w-0 items-start gap-6 @3xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-4 rounded-2xl border p-4 sm:p-5">
                    <ul className="mb-4 space-y-1 rounded-xl border p-3 text-sm" aria-label="Order items">
                        {!order.items.length && <li className="text-muted-foreground">Product information not recorded.</li>}
                        {order.items.map((item) => (
                            <li key={item.id} className="flex items-center gap-3 py-2">
                                <OrderProductImage src={item.product_image_url} name={item.product_name} className="size-12" />
                                {item.product_name} × {item.quantity}
                            </li>
                        ))}
                    </ul>
                    <RecordHeader
                        showIcon={false}
                        actionsClassName={embedded ? 'absolute top-0 right-0' : 'absolute top-5 right-5 sm:top-6 sm:right-6'}
                        label={`Parcel #${parcel.id}`}
                        title={order.store.name}
                        reference={parcel.tracking_reference}
                        status={<Badge status={parcel.status} label={(parcel.fulfillment_status ?? parcel.status).replaceAll('_', ' ')} />}
                        actions={
                            embedded
                                ? []
                                : [
                                      {
                                          id: 'history',
                                          label: 'View handling history',
                                          icon: History,
                                          visible: !!parcel.events?.length,
                                          onSelect: () => openRecordSection(historyRef.current),
                                      },
                                      {
                                          id: 'proof',
                                          label: 'Download delivery proof',
                                          icon: Download,
                                          visible: !!parcel.proof_photo_path,
                                          href: '/deliveries/' + parcel.id + '/proof',
                                          download: true,
                                      },
                                  ]
                        }
                    />
                    {parcel.tracking_reference && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                className={`${secondaryClass} size-11 shrink-0 !p-0`}
                                aria-label="Copy tracking reference"
                                title="Copy tracking reference"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(parcel.tracking_reference!);
                                        setCopyMessage('Tracking reference copied.');
                                    } catch {
                                        setCopyMessage('Unable to copy. Select the tracking reference above to copy it.');
                                    }
                                }}
                            >
                                <Copy aria-hidden="true" className="size-4" />
                            </button>
                            <span role="status" className="text-muted-foreground text-sm">
                                {copyMessage}
                            </span>
                        </div>
                    )}
                    <div className="grid min-w-0 gap-4 @xl:grid-cols-2">
                        {pickup && (
                            <div className="bg-accent/30 rounded-xl border p-4">
                                <p className="text-primary text-xs font-medium">Seller pickup address</p>
                                <p className="mt-2 text-sm">
                                    {pickup.line1}, {pickup.barangay}, {pickup.city}, {pickup.province}
                                </p>
                                <a href={'tel:' + pickup.phone} className="text-primary mt-2 inline-flex min-h-11 items-center text-sm">
                                    {pickup.phone}
                                </a>
                            </div>
                        )}
                        {
                            <>
                                <div className="bg-accent/30 rounded-xl border p-4">
                                    <p className="flex items-center gap-2 text-sm font-medium">
                                        <MapPin className="text-primary size-4" />
                                        {order.order.shipping_recipient_name}
                                    </p>
                                    <p className="text-muted-foreground mt-2 text-sm">
                                        {order.order.shipping_line1}, {order.order.shipping_barangay}, {order.order.shipping_city},{' '}
                                        {order.order.shipping_province}
                                    </p>
                                    <a
                                        className="text-primary mt-2 inline-flex min-h-11 items-center text-sm"
                                        href={`tel:${order.order.shipping_phone}`}
                                    >
                                        {order.order.shipping_phone}
                                    </a>
                                </div>
                                {order.shipping_weight_grams && (
                                    <p className="text-muted-foreground text-sm @xl:col-span-2">
                                        Packed weight: {(order.shipping_weight_grams / 1000).toFixed(2)} kg / Shipping: {money(order.shipping_fee)}
                                    </p>
                                )}
                                <div className="bg-accent/60 flex flex-wrap justify-between gap-3 rounded-xl border p-4 text-sm @xl:col-span-2">
                                    <span className="text-muted-foreground">
                                        {parcel.rider ? `Rider: ${parcel.rider.name}` : 'Awaiting rider assignment'}
                                    </span>
                                    <span className="font-semibold">
                                        COD:{' '}
                                        {money(
                                            order.cod_due_cents != null
                                                ? order.cod_due_cents / 100
                                                : Number(order.subtotal) + Number(order.shipping_fee) - (order.coins_redeemed_cents ?? 0) / 100,
                                        )}
                                    </span>
                                </div>
                            </>
                        }
                    </div>
                </div>
                <section className="bg-accent/20 min-w-0 rounded-2xl border p-4 sm:p-5">
                    <h3 className="mb-4 text-lg font-semibold">Parcel tracking</h3>
                    <ProgressStepper
                        label="Parcel handling progress"
                        stages={parcelStages({ ...order, delivery: { ...order.delivery, ...parcel } }, true)}
                        layout="vertical"
                        variant="parcel"
                        className="my-4 [&_.workflow-connector]:top-8! [&_.workflow-connector]:left-4! [&_.workflow-node]:size-8! [&_.workflow-stage]:gap-3! [&_.workflow-stage]:pb-3!"
                    />
                    {collection && (
                        <section className="mt-5 border-t pt-4">
                            <h3 className="mb-3 text-sm font-semibold">COD financial status</h3>
                            <dl className="grid gap-3">
                                {codStages(collection).map((stage) => (
                                    <div key={stage.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                                        <dt>{stage.label}</dt>
                                        <dd className="min-w-0 text-right">
                                            <Badge status={stage.state} label={stage.state === 'current' ? 'In progress' : stage.state} />
                                            {stage.timestamp && (
                                                <time dateTime={stage.timestamp} className="text-muted-foreground mt-1 block text-xs tabular-nums">
                                                    {new Date(stage.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </time>
                                            )}
                                            {stage.description && <p className="text-destructive mt-1 text-xs break-words">{stage.description}</p>}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}
                    {parcel.delivery_notes && <p className="my-4 text-sm break-words">Delivery notes: {parcel.delivery_notes}</p>}
                </section>
            </div>
            {['logistics', 'rider'].includes(role) && !(embedded && role === 'rider' && parcel.status === 'delivered') && (
                <ParcelNextStep parcel={parcel} role={role} scanning={!!scanEntry} />
            )}
            {Object.keys(form.errors).length > 0 && (
                <div role="alert" className="text-destructive my-4 space-y-1 text-sm">
                    {Object.entries(form.errors).map(([key, error]) => (
                        <p key={key}>{error}</p>
                    ))}
                </div>
            )}
            {parcel.dispatch_reference && !(embedded && role === 'rider') && (
                <p className="my-4 text-sm break-all">
                    Dispatch manifest (one parcel): <span className="font-mono">{parcel.dispatch_reference}</span>
                </p>
            )}
            {role === 'logistics' && !available && !['unassigned', 'delivered'].includes(parcel.status) && (
                <div className="my-5 grid gap-4">
                    {(!parcel.sorted_at || scanEntry || !!parcel.exception_status) && (
                        <details open={parcel.exception_status || form.errors.reason ? true : undefined} className="rounded-xl border p-4">
                            <summary className="min-h-11 cursor-pointer text-sm font-medium">
                                {parcel.exception_status ? 'Handling notes / exception reason' : 'Add handling notes (optional)'}
                            </summary>
                            <Textarea
                                label="Handling notes / exception reason"
                                value={form.data.reason}
                                maxLength={1000}
                                onChange={(e) => form.setData('reason', e.target.value)}
                                error={form.errors.reason}
                            />
                        </details>
                    )}
                </div>
            )}
            {role === 'rider' &&
                !available &&
                parcel.status !== 'delivered' &&
                ['picked_up', 'accept_dispatch', 'accept_transfer'].some((action) => parcel.allowed_actions?.includes(action)) && (
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
                            <option value="manual">Manual lookup only (cannot confirm checkpoint)</option>
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
                (!scanEntry || !parcel.dispatch_prepared_at) &&
                ((parcel.status === 'unassigned' && parcel.pickup_approved_at) ||
                    (['picked_up', 'in_transit'].includes(parcel.status) && parcel.sorted_at)) && (
                    <ValidatedForm
                        className="grid min-w-0 grid-cols-1 items-start gap-4 @min-[48rem]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
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
                        <button
                            className={`${buttonClass} w-full @min-[48rem]:mt-7 @min-[48rem]:w-auto`}
                            disabled={form.processing || !eligibleRiders.length}
                        >
                            {parcel.status === 'unassigned'
                                ? 'Assign Pickup Rider'
                                : parcel.dispatch_prepared_at
                                  ? 'Reassign Delivery Rider'
                                  : 'Assign Delivery Rider'}
                        </button>
                        {!destinationAreas.length && (
                            <p role="status" className="text-muted-foreground text-sm @min-[48rem]:col-span-3">
                                No active service area matches this buyer’s destination. Set up destination coverage before assigning a rider.
                            </p>
                        )}
                        {!!form.data.service_area_id && !eligibleRiders.length && (
                            <p role="status" className="text-muted-foreground text-sm @min-[48rem]:col-span-3">
                                No approved rider covers the selected {pickupAssignment ? 'pickup area' : 'delivery area'} in this center.{' '}
                                <Link href="/logistics/rider-coverage" className="text-primary underline">
                                    Set up rider coverage
                                </Link>{' '}
                                before assigning.
                            </p>
                        )}
                    </ValidatedForm>
                )}
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
                        <Select label="Return to logistics note" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)}>
                            <option value="">Choose a note before requesting return</option>
                            {(noteSuggestions?.return_to_center ?? []).map((note) => (
                                <option key={note}>{note}</option>
                            ))}
                        </Select>
                    )}
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
                                    (!scanEntry || scanExceptionAction === 'retry') &&
                                    parcel.receipt_condition !== 'damaged' && (
                                        <button className={secondaryClass} disabled={form.processing} onClick={() => send('retry')}>
                                            Confirm re-handover and authorize retry
                                        </button>
                                    )}
                                {['failed_attempt', 'held'].includes(parcel.exception_status) &&
                                    (!scanEntry || scanExceptionAction === 'return_to_center') &&
                                    (!parcel.received_at || parcel.dispatch_accepted_at) && (
                                        <button className={secondaryClass} disabled={form.processing} onClick={() => send('return_to_center')}>
                                            Request return to center
                                        </button>
                                    )}
                                {parcel.exception_status === 'failed_attempt' && (!scanEntry || scanExceptionAction === 'hold') && (
                                    <button className={secondaryClass} disabled={form.processing} onClick={() => send('hold')}>
                                        Hold for review
                                    </button>
                                )}
                                {scanEntry && scanExceptionAction === 'receive_return' && parcel.exception_status === 'return_requested' && (
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
                    {sortingReady && (
                        <div className="grid gap-4">
                            <Select
                                label="Sorted destination area"
                                required
                                value={form.data.service_area_id}
                                onChange={(e) => {
                                    const area = destinationAreas.find((area) => area.id.toString() === e.target.value);
                                    form.setData((data) => ({
                                        ...data,
                                        service_area_id: e.target.value,
                                        sorting_bin:
                                            !data.sorting_bin ||
                                            data.sorting_bin ===
                                                destinationAreas.find((item) => item.id.toString() === data.service_area_id)?.name.slice(0, 80)
                                                ? (area?.name.slice(0, 80) ?? '')
                                                : data.sorting_bin,
                                    }));
                                }}
                                error={form.errors.service_area_id}
                            >
                                <option value="">Choose destination area</option>
                                {destinationAreas.map((area) => (
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
                                required
                                hint="Suggested from the delivery destination. Change it to your actual bin or route, then confirm after placing the parcel there."
                            />
                            {!destinationAreas.length && (
                                <p role="status" className="text-destructive text-sm">
                                    No active service area matches this delivery address. Configure destination coverage before sorting.
                                </p>
                            )}
                            <button
                                className={buttonClass}
                                disabled={form.processing || !form.data.service_area_id || !form.data.sorting_bin.trim() || !destinationAreas.length}
                                onClick={() => send('sort')}
                            >
                                Confirm Sorted for Destination
                            </button>
                        </div>
                    )}
                    <details className="text-muted-foreground rounded-xl border p-4 text-xs">
                        <summary className="min-h-11 cursor-pointer text-sm font-medium">Operational milestones</summary>
                        <div className="flex flex-wrap gap-2">
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
                    </details>
                </div>
            )}
            {role === 'rider' &&
                (!parcel.allowed_actions || parcel.allowed_actions.length > 0) &&
                !parcel.exception_status &&
                ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(parcel.status) && (
                    <div className="space-y-4">
                        {parcel.dispatch_prepared_at && !parcel.dispatch_accepted_at && (
                            <button className={buttonClass} disabled={form.processing} onClick={() => send('accept_dispatch')}>
                                Scan and accept dispatch handover
                            </button>
                        )}
                        {parcel.status === 'out_for_delivery' && (
                            <>
                                <h2 className="text-xl font-semibold">
                                    {deliveryAction === 'failed_attempt' ? 'Report failed delivery' : 'Complete delivery'}
                                </h2>
                                <Select
                                    label="Delivery action"
                                    value={deliveryAction}
                                    onChange={(e) => {
                                        setDeliveryAction(e.target.value);
                                        form.setData('proof', null);
                                        form.setData('cod_confirmed', false);
                                        form.setData('note', '');
                                        form.setData('reason', '');
                                    }}
                                >
                                    <option value="">Choose delivery action</option>
                                    <option value="delivered">Successful delivery</option>
                                    <option value="failed_attempt">Failed delivery</option>
                                </Select>
                                {deliveryAction && (
                                    <DeliveryProofCamera
                                        key={deliveryAction}
                                        required={deliveryAction === 'delivered'}
                                        onCapture={(file) => form.setData('proof', file)}
                                    />
                                )}
                                <Select
                                    label="Delivery notes (required)"
                                    value={form.data.note}
                                    onChange={(e) => form.setData('note', e.target.value)}
                                    error={form.errors.note}
                                >
                                    <option value="">Choose a note</option>
                                    {(noteSuggestions?.[deliveryAction] ?? []).map((note) => (
                                        <option key={note} value={note}>
                                            {note}
                                        </option>
                                    ))}
                                </Select>
                                {form.data.note === 'Other / Custom notes' && (
                                    <Textarea
                                        label="Custom delivery notes (required)"
                                        value={form.data.reason}
                                        maxLength={1000}
                                        onChange={(e) => form.setData('reason', e.target.value)}
                                        error={form.errors.reason}
                                    />
                                )}
                                <Textarea
                                    label="Additional remarks (optional)"
                                    value={form.data.remarks}
                                    maxLength={500}
                                    onChange={(e) => form.setData('remarks', e.target.value)}
                                />
                                {deliveryAction === 'delivered' && (
                                    <Field
                                        label="Recipient name (required)"
                                        maxLength={150}
                                        value={form.data.recipient_name}
                                        onChange={(e) => form.setData('recipient_name', e.target.value)}
                                        error={form.errors.recipient_name}
                                    />
                                )}
                                {deliveryAction === 'delivered' && (
                                    <label className="flex min-h-11 items-start gap-3 text-sm">
                                        <input
                                            type="checkbox"
                                            className="mt-1 size-5"
                                            checked={form.data.cod_confirmed}
                                            onChange={(e) => form.setData('cod_confirmed', e.target.checked)}
                                        />
                                        I confirm that the full COD payment of{' '}
                                        {money(
                                            order.cod_due_cents != null
                                                ? order.cod_due_cents / 100
                                                : Number(order.subtotal) + Number(order.shipping_fee) - (order.coins_redeemed_cents ?? 0) / 100,
                                        )}{' '}
                                        has been received.
                                    </label>
                                )}
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
                                (parcel.status === 'out_for_delivery' &&
                                    (!deliveryAction ||
                                        !form.data.note ||
                                        (form.data.note === 'Other / Custom notes' && !form.data.reason.trim()) ||
                                        (deliveryAction === 'delivered' && (!form.data.proof || !form.data.cod_confirmed)))) ||
                                (parcel.status === 'picked_up' && !parcel.sorted_at)
                            }
                            onClick={() =>
                                send(
                                    {
                                        assigned: 'picked_up',
                                        picked_up: 'in_transit',
                                        in_transit: 'out_for_delivery',
                                        out_for_delivery: deliveryAction,
                                    }[parcel.status] ?? '',
                                )
                            }
                        >
                            <Truck className="size-4" />
                            {
                                {
                                    assigned: 'Confirm pickup',
                                    picked_up: 'Waiting for center receipt and dispatch',
                                    in_transit: 'Start delivery',
                                    out_for_delivery: deliveryAction === 'delivered' ? 'Confirm delivery' : 'Report failed delivery',
                                }[parcel.status]
                            }
                        </button>
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
            {role === 'logistics' && parcel.exception_status === 'returned_to_center' && (
                <RecordAction
                    title="Assign replacement delivery rider"
                    description="The parcel is in facility custody. Record the exceptional reassignment reason; the replacement must accept physical custody before delivery resumes."
                    url={'/deliveries/' + parcel.id}
                    action="exception_assign"
                    fields={[
                        {
                            key: 'rider_id',
                            label: 'Delivery-capable rider',
                            type: 'select',
                            options: riders
                                .filter(
                                    (r) =>
                                        ['delivery', 'both'].includes(r.rider_capability ?? 'both') &&
                                        r.logistics_center_id === parcel.logistics_center_id,
                                )
                                .map((r) => ({ value: String(r.id), label: r.name })),
                        },
                        { key: 'reason', label: 'Authorized transfer reason', type: 'textarea' },
                    ]}
                />
            )}
            {role === 'rider' && parcel.allowed_actions?.includes('accept_transfer') && (
                <button className={buttonClass} disabled={form.processing} onClick={() => send('accept_transfer')}>
                    Scan and accept replacement handover
                </button>
            )}
            {role === 'rider' && parcel.exception_status && (
                <p role="status" className="my-4 text-sm">
                    {parcel.exception_status.replaceAll('_', ' ')}. Contact your logistics center for the next instruction. Keep custody until a
                    recorded handover.
                </p>
            )}
            {collection && (!(embedded && role === 'rider') || handoverPending || parcel.allowed_actions?.includes('submit_cod_handover')) && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div>
                        <p className="text-sm font-medium">COD {money(collection.amount)}</p>
                        <div className="mt-2">
                            <Badge status={collection.status} />
                        </div>
                    </div>
                    {handoverPending && (
                        <div className="grid gap-2 text-sm">
                            <p role="status" className="text-muted-foreground">
                                COD handover submitted. Awaiting Logistics confirmation. The cash remains pending until Logistics verifies receipt.
                            </p>
                            {cashEvent?.details.map((detail, index) => (
                                <p key={index} className="break-words">
                                    {detail}
                                </p>
                            ))}
                        </div>
                    )}
                    {role === 'rider' && parcel.allowed_actions?.includes('submit_cod_handover') && (
                        <div className="grid w-full gap-4">
                            <p className="text-muted-foreground text-sm">Submit after physically handing the cash to Logistics.</p>
                            <Field
                                label="Cash handed over (PHP)"
                                type="number"
                                min="0"
                                step="0.01"
                                value={collection.expected_handover_amount ?? collection.amount}
                                readOnly
                                error={form.errors.amount}
                            />
                            <Field
                                label="Receipt / handover reference"
                                value={collection.expected_handover_reference ?? ''}
                                maxLength={100}
                                readOnly
                                error={form.errors.handover_reference}
                            />
                            <Textarea
                                label="Handover notes (optional)"
                                value={form.data.reason}
                                maxLength={1000}
                                onChange={(e) => form.setData('reason', e.target.value)}
                                error={form.errors.reason}
                            />
                            <button type="button" className={buttonClass} disabled={form.processing} onClick={() => send('submit_cod_handover')}>
                                {form.processing ? 'Submitting handover...' : 'Submit COD handover'}
                            </button>
                        </div>
                    )}
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
                                    value={reportDiscrepancy ? form.data.amount : (collection.expected_handover_amount ?? collection.amount)}
                                    readOnly={!reportDiscrepancy}
                                    onChange={(e) => form.setData('amount', e.target.value)}
                                    error={form.errors.amount}
                                />
                                <Field
                                    label="Cash handover receipt / reference"
                                    value={collection.expected_handover_reference ?? ''}
                                    maxLength={100}
                                    readOnly
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
                                    {reportDiscrepancy
                                        ? 'Record cash discrepancy'
                                        : collection.status === 'handed_over'
                                          ? 'Verify previous cash handover'
                                          : 'Confirm cash received'}
                                </button>
                                <button
                                    type="button"
                                    className={secondaryClass}
                                    disabled={form.processing}
                                    onClick={() => {
                                        setReportDiscrepancy(!reportDiscrepancy);
                                        form.setData('handover_reference', collection.expected_handover_reference ?? '');
                                        form.setData('amount', collection.expected_handover_amount ?? collection.amount);
                                    }}
                                >
                                    {reportDiscrepancy ? 'Cancel discrepancy report' : 'Report cash discrepancy'}
                                </button>
                            </div>
                        )}
                    {role === 'admin' && collection.status === 'handed_over' && (
                        <button className={buttonClass} disabled={form.processing} onClick={() => send('reconcile_cod')}>
                            Reconcile COD
                        </button>
                    )}
                    {['logistics', 'admin'].includes(role) && ['handed_over', 'reconciled'].includes(collection.status) && (
                        <Link href="/logistics-settlements" className={buttonClass}>
                            {role === 'logistics' ? 'Review product cash settlement' : 'Review Logistics cash handover'}
                        </Link>
                    )}
                </div>
            )}
            {embedded && parcel.proof_photo_path && (
                <a className={`${secondaryClass} mt-4`} href={`/deliveries/${parcel.id}/proof`} download>
                    <Download aria-hidden="true" className="size-4" />
                    Download delivery proof
                </a>
            )}
            {parcel.events && parcel.events.length > 0 && (
                <RecordDisclosure ref={historyRef} data-parcel-history className={`mt-5 border-t pt-4${embedded ? '[&:not([open])]:block!' : ''}`}>
                    <summary className="min-h-11 cursor-pointer text-sm font-medium">Parcel handling history ({parcel.events.length})</summary>
                    <div className="mt-3" role="region" aria-label="Parcel activity history" tabIndex={0}>
                        <ActivityTimeline
                            label="Parcel activity timeline"
                            entries={parcel.events.map((event) => ({
                                id: event.id,
                                label:
                                    (
                                        {
                                            approve_pickup: 'Pickup request approved',
                                            assign: 'Rider assigned',
                                            picked_up: 'Parcel collected from seller',
                                            receive: 'Parcel received at logistics facility',
                                            sort: 'Parcel sorting completed',
                                            accept_dispatch: 'Delivery rider accepted parcel',
                                            delivered: 'Delivered to recipient',
                                            submit_cod_handover: 'Rider submitted COD handover',
                                            receive_cod: 'COD handover recorded',
                                            reconcile_cod: 'COD reconciled',
                                        } as Record<string, string>
                                    )[event.type] ?? event.type.replaceAll('_', ' '),
                                at: event.occurred_at,
                                content: (
                                    <>
                                        <p>{event.actor_name}</p>
                                        {event.has_proof && (
                                            <a className={secondaryClass} href={'/deliveries/' + parcel.id + '/proof?event=' + event.id}>
                                                View supporting photo
                                            </a>
                                        )}
                                        {event.details?.map((detail, index) => <p key={index}>{activityNote(detail)}</p>)}
                                    </>
                                ),
                            }))}
                        />
                    </div>
                </RecordDisclosure>
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
            title={
                role === 'rider'
                    ? (riderQueues.find((queue) => queue.key === (filters.stage ?? 'all'))?.label ?? 'My deliveries')
                    : 'Parcel operations'
            }
            description={role === 'rider' ? 'Manage pickups, deliveries and collected cash.' : 'Manage parcels, riders and collected cash.'}
        >
            {role === 'rider' && <RiderNavigation key={filters.search} />}
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
                    role === 'rider' ? (
                        <RiderParcelRecords deliveries={deliveries.data} centers={centers} riders={riders} areas={areas} cod={cod} />
                    ) : (
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
                    )
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
