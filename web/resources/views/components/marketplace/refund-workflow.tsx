import { FinanceNavigation } from '@/components/finance/finance-ui';
import ReturnPolicy, { type ExceptionParcel } from '@/components/finance/return-policy';
import DeliveryProofCamera from '@/components/logistics/delivery-proof-camera';
import OrderProductImage from '@/components/marketplace/order-product-image';
import ActivityTimeline, { returnEventPresentation } from '@/components/shared/activity-timeline';
import {
    buttonClass,
    Card,
    Empty,
    Field,
    money,
    Page,
    Pager,
    secondaryClass,
    Select,
    Textarea,
    type Pagination,
} from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { activityNote } from '@/lib/activity-note';
import type { SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Clock3, Coins, Handshake, Package, ReceiptText, ShieldCheck, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import '../../../css/buyer-returns.css';
import '../../../css/storefront-catalog.css';

type Item = {
    order_item_id: number;
    quantity: number;
    product_name: string;
    requested_cents: number;
    approved_cents: number | null;
    approved_quantity?: number | null;
};
type EligibleItem = {
    id: number;
    product_name: string;
    remaining_quantity: number;
    remaining_cents: number;
    unit_cents: number;
    extra_units: number;
    consumed_quantity: number;
};
type EligibleParcel = {
    id: number;
    store: { name: string };
    tracking_reference: string | null;
    items: EligibleItem[];
    shipping_remaining_cents: number;
};
type Address = { recipient_name?: string; phone?: string; line1?: string; barangay?: string; city?: string; province?: string };
type Case = {
    id: number;
    buyer: { id: number; name: string } | null;
    refund_status: string;
    reason: string;
    decision_reason: string | null;
    responsibility: string | null;
    return_shipping_responsibility: string | null;
    return_shipping_cents: number | null;
    physical_return_required: boolean | null;
    requested_shipping_cents: number;
    refund_cents: number | null;
    coins_refunded_cents: number;
    cash_refunded_cents: number;
    refund_method: string | null;
    refund_reference: string | null;
    settlement_state: string | null;
    payment_context: {
        net_merchandise_cents: number;
        original_shipping_cents: number;
        original_coins_cents: number;
        buyer_cash_cents: number | null;
        cash_status: string | null;
        payment_reference: string | null;
    } | null;
    seller_settlement: { amount_cents: number; reference: string; created_at: string } | null;
    evidence_count: number;
    items: Item[];
    wallet_entries: { id: number; reference: string; type: string; amount_cents: number }[];
    task: {
        id: number;
        reference: string;
        status: string;
        buyer_address: Address | null;
        seller_address: Address | null;
        confirmed_at: string | null;
        proofs: { id: number; leg: string; recipient_name: string }[];
    } | null;
    allowed_actions: string[];
    events: { id: number; action: string; notes: string; created_at: string; evidence_url?: string | null }[];
    seller_order: {
        id: number;
        order_id: number;
        store: { name: string };
        delivery: { tracking_reference: string | null };
        items: { id: number; product_name: string; quantity: number; product_image_url?: string | null }[];
    };
};
const labels: Record<string, string> = {
    pending: 'Awaiting admin review',
    approved_uncredited: 'Approved; credit needs review',
    approved_no_refund: 'Return approved; no refund due',
    credited: 'Refund recorded',
    rejected: 'Request declined',
    approved: 'Awaiting collection assignment',
    assigned: 'Rider assigned for collection',
    collected: 'Collected from buyer',
    facility_received: 'Received at facility',
    seller_assigned: 'Rider assigned for seller delivery',
    seller_in_transit: 'On the way to seller',
    seller_delivered: 'Delivered; awaiting seller confirmation',
    received: 'Seller confirmed receipt',
    legacy_unknown: 'Historical custody needs review',
};
const actions: Record<string, string> = {
    record_return_fee: 'Record completed return transport cost',
    assign: 'Assign collection rider',
    collect: 'Record buyer collection',
    facility_receive: 'Confirm facility receipt',
    assign_seller: 'Assign seller delivery rider',
    accept_seller_dispatch: 'Accept seller dispatch',
    deliver_seller: 'Record seller delivery',
    receive: 'Confirm Received',
    discrepancy: 'Report return discrepancy',
};
const responsibilities = [
    ['seller', 'Seller — deduct eligible proceeds; recover any paid excess'],
    ['logistics', 'Logistics — record company liability; no rider charge'],
    ['buyer', 'Buyer change of mind — platform funds the approved coin refund'],
    ['platform', 'Platform — record platform refund expense'],
];

function RefundSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
    return (
        <section className="border-primary/15 bg-card min-w-0 overflow-hidden rounded-xl border">
            <h3 className="bg-accent/35 flex items-center gap-3 px-4 py-3 text-sm font-semibold">
                <span className="bg-accent text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon aria-hidden="true" className="size-4" />
                </span>
                {title}
            </h3>
            <div className="min-w-0 p-4">{children}</div>
        </section>
    );
}

function Errors({ errors }: { errors: Record<string, string> }) {
    return Object.keys(errors).length > 0 ? (
        <div role="alert" className="text-destructive rounded-xl border p-3 text-sm">
            <p className="font-semibold">The action could not be saved.</p>
            <ul className="mt-2 list-disc pl-5">
                {Object.entries(errors).map(([key, message]) => (
                    <li key={key}>{message}</li>
                ))}
            </ul>
        </div>
    ) : null;
}

function RequestRefund({ eligible, days }: { eligible: EligibleParcel[]; days: number }) {
    const [open, setOpen] = useState(false);
    const rows = (parcel?: EligibleParcel) =>
        parcel?.items
            .filter((item) => item.remaining_quantity > 0)
            .map((item) => ({
                order_item_id: item.id,
                quantity: item.remaining_quantity,
                amount: (item.remaining_cents / 100).toFixed(2),
                selected: true as boolean,
            })) ?? [];
    const form = useForm({
        seller_order_id: String(eligible[0]?.id ?? ''),
        reason_kind: 'other',
        reason: '',
        shipping_amount: '0.00',
        items: rows(eligible[0]),
        evidence: [] as File[],
    });
    const parcel = eligible.find((entry) => String(entry.id) === form.data.seller_order_id);
    const errors = form.errors as Record<string, string>;
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!form.processing) setOpen(value);
            }}
        >
            <DialogTrigger className={buttonClass}>Request a refund / return</DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Request a refund / return</DialogTitle>
                    <DialogDescription>
                        Choose purchased items within the recorded {days}-day return policy. Admin approval credits spendable Lubos Coins immediately.
                    </DialogDescription>
                </DialogHeader>
                <ValidatedForm
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform((data) => ({ ...data, items: data.items.filter((item) => item.selected) }));
                        form.post('/returns', {
                            forceFormData: true,
                            preserveScroll: true,
                            onSuccess: () => {
                                setOpen(false);
                                form.reset('reason', 'evidence');
                            },
                        });
                    }}
                >
                    <Errors errors={errors} />
                    <Select
                        label="Original delivered parcel"
                        value={form.data.seller_order_id}
                        onChange={(event) => {
                            const selected = eligible.find((entry) => String(entry.id) === event.target.value);
                            form.setData({ ...form.data, seller_order_id: event.target.value, items: rows(selected), shipping_amount: '0.00' });
                        }}
                        error={errors.seller_order_id}
                    >
                        {eligible.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                                {entry.tracking_reference ?? `Parcel #${entry.id}`} · {entry.store.name}
                            </option>
                        ))}
                    </Select>
                    <fieldset className="space-y-4">
                        <legend className="mb-3 font-semibold">Items and actual paid limits</legend>
                        {form.data.items.map((row, index) => {
                            const item = parcel?.items.find((entry) => entry.id === row.order_item_id);
                            return (
                                <div key={row.order_item_id} className="space-y-2 rounded-xl border p-3">
                                    <label className="flex min-h-11 items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={row.selected}
                                            onChange={(event) =>
                                                form.setData(
                                                    'items',
                                                    form.data.items.map((entry, i) =>
                                                        i === index ? { ...entry, selected: event.target.checked } : entry,
                                                    ),
                                                )
                                            }
                                        />
                                        {item?.product_name}
                                    </label>
                                    {row.selected && (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Field
                                                label="Quantity"
                                                type="number"
                                                min={1}
                                                step={1}
                                                max={item?.remaining_quantity}
                                                value={row.quantity}
                                                error={errors[`items.${index}.quantity`]}
                                                onChange={(event) => {
                                                    const quantity = Number(event.target.value);
                                                    const cents = item
                                                        ? item.unit_cents * quantity +
                                                          Math.min(quantity, Math.max(0, item.extra_units - item.consumed_quantity))
                                                        : 0;
                                                    form.setData(
                                                        'items',
                                                        form.data.items.map((entry, i) =>
                                                            i === index ? { ...entry, quantity, amount: (cents / 100).toFixed(2) } : entry,
                                                        ),
                                                    );
                                                }}
                                            />
                                            <Field
                                                label="Requested merchandise refund (PHP)"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={row.amount}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'items',
                                                        form.data.items.map((entry, i) =>
                                                            i === index ? { ...entry, amount: event.target.value } : entry,
                                                        ),
                                                    )
                                                }
                                                hint={`Remaining paid value: ${money((item?.remaining_cents ?? 0) / 100)}`}
                                                error={errors[`items.${index}.amount`]}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </fieldset>
                    <Field
                        label="Requested original shipping refund (PHP)"
                        type="number"
                        min="0"
                        step="0.01"
                        max={(parcel?.shipping_remaining_cents ?? 0) / 100}
                        value={form.data.shipping_amount}
                        onChange={(event) => form.setData('shipping_amount', event.target.value)}
                        error={errors.shipping_amount}
                    />
                    <Select label="Reason" value={form.data.reason_kind} onChange={(event) => form.setData('reason_kind', event.target.value)}>
                        <option value="other">Other issue</option>
                        <option value="damaged">Damaged goods</option>
                        <option value="wrong_product">Incorrect product</option>
                    </Select>
                    <Textarea
                        label="Describe the issue"
                        required
                        minLength={10}
                        maxLength={2000}
                        value={form.data.reason}
                        onChange={(event) => form.setData('reason', event.target.value)}
                        error={errors.reason}
                    />
                    <Field
                        label="Evidence photos (required for damaged or incorrect goods)"
                        type="file"
                        multiple
                        accept="image/jpeg,image/png"
                        onChange={(event) => form.setData('evidence', Array.from(event.target.files ?? []))}
                        error={errors.evidence}
                        hint="Up to 5 JPG/PNG photos, 5 MB each."
                    />
                    {form.progress && <p role="status">Uploading: {form.progress.percentage}%</p>}
                    <div className="flex flex-wrap justify-end gap-3">
                        <button type="button" className={secondaryClass} disabled={form.processing} onClick={() => setOpen(false)}>
                            Cancel
                        </button>
                        <button className={buttonClass} disabled={form.processing}>
                            {form.processing ? 'Submitting…' : 'Submit request'}
                        </button>
                    </div>
                </ValidatedForm>
            </DialogContent>
        </Dialog>
    );
}

function Approval({ entry }: { entry: Case }) {
    const [open, setOpen] = useState(false);
    const source = entry.items.length
        ? entry.items
        : entry.seller_order.items.map((item) => ({
              order_item_id: item.id,
              quantity: item.quantity,
              product_name: item.product_name,
              requested_cents: 0,
              approved_cents: null,
          }));
    const form = useForm({
        action: 'approve',
        items: source.map((item) => ({
            order_item_id: item.order_item_id,
            quantity: item.quantity,
            amount: (item.requested_cents / 100).toFixed(2),
            selected: true as boolean,
        })),
        shipping_amount: (entry.requested_shipping_cents / 100).toFixed(2),
        responsibility: '',
        return_shipping_responsibility: '',
        physical_return_required: true as boolean,
        reason: '',
    });
    const errors = form.errors as Record<string, string>;
    const total =
        form.data.items.filter((item) => item.selected).reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0) +
        Math.round(Number(form.data.shipping_amount) * 100);
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!form.processing) setOpen(value);
            }}
        >
            <DialogTrigger className={buttonClass}>
                {entry.refund_status === 'approved_uncredited' ? 'Complete approval and credit' : 'Review and approve refund'}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Approve refund #{entry.id}</DialogTitle>
                    <DialogDescription>
                        Approval immediately credits spendable Lubos Coins. Physical return and financial recovery proceed separately.
                    </DialogDescription>
                </DialogHeader>
                <ValidatedForm
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform((data) => ({ ...data, items: data.items.filter((item) => item.selected) }));
                        form.patch(`/returns/${entry.id}`, { preserveScroll: true, onSuccess: () => setOpen(false) });
                    }}
                >
                    <Errors errors={errors} />
                    <p className="text-sm break-words">
                        Order #{entry.seller_order.order_id} · {entry.seller_order.delivery.tracking_reference}
                    </p>
                    {entry.buyer && (
                        <p className="text-sm">
                            Buyer: {entry.buyer.name} · Account #{entry.buyer.id}
                        </p>
                    )}
                    {entry.payment_context && (
                        <div className="bg-muted rounded-xl p-3 text-sm tabular-nums">
                            <p>
                                Original paid allocation: merchandise {money(entry.payment_context.net_merchandise_cents / 100)}; shipping{' '}
                                {money(entry.payment_context.original_shipping_cents / 100)}.
                            </p>
                            <p>
                                Buyer cash collected:{' '}
                                {entry.payment_context.buyer_cash_cents == null
                                    ? 'Needs payment review'
                                    : money(entry.payment_context.buyer_cash_cents / 100)}
                                ; original coins used: {money(entry.payment_context.original_coins_cents / 100)} equivalent.
                            </p>
                            <p className="break-all">
                                Payment: {entry.payment_context.payment_reference ?? 'Not recorded'} · Internal reconciliation:{' '}
                                {entry.payment_context.cash_status ?? 'Not recorded'}.
                            </p>
                            <p>
                                {entry.seller_settlement
                                    ? `Seller already paid ${money(entry.seller_settlement.amount_cents / 100)}. Seller responsibility creates recovery against paid proceeds.`
                                    : 'Seller settlement pending. Reviewed seller deductions adjust the payable balance.'}
                            </p>
                        </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">Buyer reason: {entry.reason}</p>
                    {entry.evidence_count > 0 && (
                        <div className="flex flex-wrap gap-3">
                            {Array.from({ length: entry.evidence_count }, (_, index) => (
                                <a
                                    className={secondaryClass}
                                    key={index}
                                    target="_blank"
                                    rel="noreferrer"
                                    href={`/returns/${entry.id}/evidence/${index}`}
                                >
                                    Evidence {index + 1}
                                </a>
                            ))}
                        </div>
                    )}
                    {form.data.items.map((row, index) => (
                        <fieldset key={row.order_item_id} className="rounded-xl border p-3">
                            <legend className="px-1 text-sm font-semibold">{source[index].product_name}</legend>
                            <label className="flex min-h-11 items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={row.selected}
                                    onChange={(event) =>
                                        form.setData(
                                            'items',
                                            form.data.items.map((item, i) => (i === index ? { ...item, selected: event.target.checked } : item)),
                                        )
                                    }
                                />
                                Approve this item
                            </label>
                            {row.selected && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field
                                        label="Approved quantity"
                                        type="number"
                                        min={1}
                                        step={1}
                                        max={source[index].quantity}
                                        value={row.quantity}
                                        error={errors[`items.${index}.quantity`]}
                                        onChange={(event) =>
                                            form.setData(
                                                'items',
                                                form.data.items.map((item, i) =>
                                                    i === index ? { ...item, quantity: Number(event.target.value) } : item,
                                                ),
                                            )
                                        }
                                    />
                                    <Field
                                        label="Approved merchandise refund (PHP)"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={row.amount}
                                        error={errors[`items.${index}.amount`]}
                                        hint={
                                            entry.items.length
                                                ? `Requested: ${money(source[index].requested_cents / 100)}`
                                                : 'Legacy case: verify the exact paid amount before approval.'
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                'items',
                                                form.data.items.map((item, i) => (i === index ? { ...item, amount: event.target.value } : item)),
                                            )
                                        }
                                    />
                                </div>
                            )}
                        </fieldset>
                    ))}
                    <Field
                        label="Approved original shipping refund (PHP)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.data.shipping_amount}
                        onChange={(event) => form.setData('shipping_amount', event.target.value)}
                        error={errors.shipping_amount}
                    />
                    <Select
                        label="Refund responsibility"
                        required
                        value={form.data.responsibility}
                        onChange={(event) => form.setData('responsibility', event.target.value)}
                        error={errors.responsibility}
                    >
                        <option value="">Choose after reviewing evidence</option>
                        {responsibilities.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </Select>
                    <p className="text-muted-foreground text-sm">
                        The buyer’s allegation alone does not establish fault. A platform goodwill refund is available when you explicitly decide the
                        platform should bear the cost.
                    </p>
                    <label className="flex min-h-11 items-center gap-3">
                        <input
                            type="checkbox"
                            checked={form.data.physical_return_required}
                            onChange={(event) =>
                                form.setData({
                                    ...form.data,
                                    physical_return_required: event.target.checked,
                                    return_shipping_responsibility: event.target.checked ? '' : 'not_required',
                                })
                            }
                        />
                        Physical return required
                    </label>
                    <Select
                        label="Return shipping responsibility"
                        required
                        value={form.data.return_shipping_responsibility}
                        onChange={(event) => form.setData('return_shipping_responsibility', event.target.value)}
                        error={errors.return_shipping_responsibility}
                    >
                        <option value="">Choose separately from the refund</option>
                        {form.data.physical_return_required ? (
                            ['seller', 'logistics', 'buyer', 'platform'].map((value) => (
                                <option key={value} value={value}>
                                    {value.charAt(0).toUpperCase() + value.slice(1)} bears actual return transport cost
                                </option>
                            ))
                        ) : (
                            <option value="not_required">Not required</option>
                        )}
                    </Select>
                    <Textarea
                        label="Evidence reviewed and decision reason"
                        required
                        minLength={3}
                        maxLength={500}
                        value={form.data.reason}
                        onChange={(event) => form.setData('reason', event.target.value)}
                        error={errors.reason}
                    />
                    <p role="status" className="bg-accent rounded-xl p-3 text-sm font-semibold tabular-nums">
                        Approval makes {(total / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })} Lubos Coins available immediately (
                        {money(total / 100)}). No cash transfer is recorded.
                    </p>
                    <div className="flex flex-wrap justify-end gap-3">
                        <button type="button" className={secondaryClass} disabled={form.processing} onClick={() => setOpen(false)}>
                            Cancel
                        </button>
                        <button className={buttonClass} disabled={form.processing}>
                            {form.processing ? 'Approving and crediting…' : 'Approve and credit Lubos Coins'}
                        </button>
                    </div>
                </ValidatedForm>
            </DialogContent>
        </Dialog>
    );
}

function TaskAction({ entry, action, riders }: { entry: Case; action: string; riders: { id: number; name: string }[] }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        action,
        reason: '',
        rider_id: '',
        proof: null as File | null,
        recipient_name: '',
        condition: 'intact',
        restock: false as boolean,
        amount: '',
        leg: 'return_collection',
    });
    const needsProof = ['collect', 'deliver_seller'].includes(action);
    const errors = form.errors as Record<string, string>;
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!form.processing) setOpen(value);
            }}
        >
            <DialogTrigger className={secondaryClass}>{actions[action] ?? 'Reject request'}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{actions[action] ?? 'Reject request'}</DialogTitle>
                    <DialogDescription>
                        Record only an actual decision or physical handover for the displayed parcel. This action does not issue another wallet
                        credit.
                    </DialogDescription>
                </DialogHeader>
                <ValidatedForm
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform((data) => ({ ...data, _method: 'patch' }));
                        form.post(`/returns/${entry.id}`, { forceFormData: true, preserveScroll: true, onSuccess: () => setOpen(false) });
                    }}
                >
                    <Errors errors={errors} />
                    <p className="text-sm break-words">
                        Original tracking: {entry.seller_order.delivery.tracking_reference ?? 'Historical reference unavailable'}
                    </p>
                    {['assign', 'assign_seller'].includes(action) && (
                        <Select
                            label="Eligible rider"
                            required
                            value={form.data.rider_id}
                            onChange={(event) => form.setData('rider_id', event.target.value)}
                            error={errors.rider_id}
                        >
                            <option value="">Choose a rider</option>
                            {riders.map((rider) => (
                                <option key={rider.id} value={rider.id}>
                                    {rider.name}
                                </option>
                            ))}
                        </Select>
                    )}
                    {action === 'discrepancy' && (
                        <Field
                            label="Discrepancy evidence photo (optional)"
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={(event) => form.setData('proof', event.target.files?.[0] ?? null)}
                            error={errors.proof}
                        />
                    )}
                    {action === 'record_return_fee' && (
                        <>
                            <Select label="Completed return leg" value={form.data.leg} onChange={(event) => form.setData('leg', event.target.value)}>
                                <option value="return_collection">Buyer collection received at facility</option>
                                <option value="return">Seller delivery with proof</option>
                            </Select>
                            <Field
                                label="Agreed actual completed-work fee (PHP)"
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                value={form.data.amount}
                                onChange={(event) => form.setData('amount', event.target.value)}
                                error={errors.amount}
                            />
                            <p className="text-muted-foreground text-sm">
                                Records Logistics? fee obligation to the assigned rider and the reviewed transport cost responsibility. Actual rider
                                payment is recorded separately in Rider payments.
                            </p>
                        </>
                    )}
                    {needsProof && (
                        <>
                            <DeliveryProofCamera
                                label={action === 'collect' ? 'Collection proof photo (required)' : 'Seller delivery proof photo (required)'}
                                onCapture={(file) => form.setData('proof', file)}
                            />
                            <Field
                                label="Person handing over / receiving the return"
                                required
                                value={form.data.recipient_name}
                                onChange={(event) => form.setData('recipient_name', event.target.value)}
                                error={errors.recipient_name}
                            />
                        </>
                    )}
                    {action === 'receive' && (
                        <>
                            <Select
                                label="Returned items condition"
                                value={form.data.condition}
                                onChange={(event) => form.setData('condition', event.target.value)}
                            >
                                <option value="intact">Intact</option>
                                <option value="damaged">Damaged / discrepant</option>
                            </Select>
                            <label className="flex min-h-11 items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={form.data.restock}
                                    onChange={(event) => form.setData('restock', event.target.checked)}
                                />
                                Restock these returned quantities once (intact goods only)
                            </label>
                        </>
                    )}
                    <Textarea
                        label={
                            action === 'reject'
                                ? 'Rejection reason'
                                : action === 'discrepancy'
                                  ? 'Describe the delivery or item discrepancy'
                                  : 'Handover notes'
                        }
                        required
                        minLength={3}
                        maxLength={500}
                        value={form.data.reason}
                        onChange={(event) => form.setData('reason', event.target.value)}
                        error={errors.reason}
                    />
                    {form.progress && <p role="status">Uploading proof: {form.progress.percentage}%</p>}
                    <div className="flex flex-wrap justify-end gap-3">
                        <button type="button" className={secondaryClass} disabled={form.processing} onClick={() => setOpen(false)}>
                            Cancel
                        </button>
                        <button className={buttonClass} disabled={form.processing}>
                            {form.processing ? 'Saving…' : (actions[action] ?? 'Reject request')}
                        </button>
                    </div>
                </ValidatedForm>
            </DialogContent>
        </Dialog>
    );
}

export default function RefundWorkflow({
    role,
    returns,
    eligible,
    riders,
    returnWindowDays,
    exceptionParcels,
    exceptionSearch,
    policyUpdatedAt,
}: {
    role: string;
    returns: Pagination<Case>;
    eligible: EligibleParcel[];
    riders: { id: number; name: string }[];
    returnWindowDays: number;
    exceptionParcels: ExceptionParcel[];
    exceptionSearch: string;
    policyUpdatedAt?: string | null;
}) {
    const permissions = usePage<SharedData>().props.adminWorkspace?.permissions ?? [];
    const canReview = role === 'admin' && permissions.includes('disputes');
    const canApprove = canReview && permissions.includes('finance');
    return (
        <Page
            storefront={role === 'buyer'}
            title="Returns and refunds"
            description="Admin approval credits Lubos Coins immediately. Follow physical returns and settlement separately."
        >
            {role !== 'buyer' && role !== 'logistics' && (
                <section className="returns-role-banner relative overflow-hidden rounded-2xl p-6 sm:p-8">
                    <div className="relative z-10 max-w-lg sm:pr-20">
                        <h2 className="text-xl font-semibold sm:text-2xl">Returns & refunds</h2>
                        <p className="mt-2 text-sm leading-relaxed">Review requests, follow returned parcels, and keep track of refunds.</p>
                    </div>
                    <img
                        src="/images/marketplace/returns-banner.svg"
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute right-0 bottom-0 h-32 w-40 object-contain opacity-30 sm:h-full sm:w-64 sm:opacity-100"
                    />
                </section>
            )}
            {role === 'admin' && <FinanceNavigation section="returns" />}
            {role === 'admin' && (
                <ReturnPolicy
                    days={returnWindowDays}
                    updatedAt={policyUpdatedAt}
                    parcels={exceptionParcels}
                    search={exceptionSearch}
                    canEdit={canReview}
                />
            )}
            {role === 'buyer' && (
                <Card className="buyer-return-guide">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold">Your refund requests</h2>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Approved coins can be used at checkout while your return is in progress.
                            </p>
                        </div>
                        <Link className={secondaryClass} href="/wallet">
                            View Lubos Coins wallet
                        </Link>
                        {eligible.length > 0 && <RequestRefund eligible={eligible} days={returnWindowDays} />}
                    </div>
                </Card>
            )}
            <p className="text-muted-foreground text-sm">
                {returns.total} request{returns.total === 1 ? '' : 's'}
            </p>
            {returns.data.length === 0 && (
                <Empty
                    title="No return requests"
                    description={
                        role === 'buyer'
                            ? 'Eligible delivered items appear above. Contact support if an order needs an eligibility review.'
                            : 'Requests and assigned return tasks will appear here.'
                    }
                />
            )}
            <div className="space-y-4">
                {returns.data.map((entry) => (
                    <Card key={entry.id} className="buyer-return-card overflow-hidden !p-0 shadow-sm">
                        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.7fr)_auto] xl:gap-4 xl:px-5 xl:py-4">
                            <OrderProductImage
                                name={entry.items[0]?.product_name ?? entry.seller_order.items[0]?.product_name ?? 'Returned item'}
                                src={
                                    entry.seller_order.items.find((item) => item.id === entry.items[0]?.order_item_id)?.product_image_url ??
                                    entry.seller_order.items[0]?.product_image_url
                                }
                                className="size-16 rounded-xl sm:h-20 sm:w-20 xl:h-20 xl:w-20"
                            />
                            <div className="min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-muted-foreground font-medium">{entry.seller_order.store.name}</span>
                                    <span className="bg-accent/60 text-primary rounded-full px-3 py-0.5 font-semibold">Return #{entry.id}</span>
                                </div>
                                <h2 className="text-base leading-snug font-semibold break-words">
                                    {(entry.items.length ? entry.items : entry.seller_order.items)
                                        .map((item) => item.product_name + ' × ' + item.quantity)
                                        .join(', ')}
                                </h2>
                                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                    Order #{entry.seller_order.order_id}{' '}
                                    <span aria-hidden="true" className="px-1">
                                        /
                                    </span>{' '}
                                    Parcel #{entry.seller_order.id}
                                </p>
                            </div>
                            <div className="col-span-2 grid min-w-0 gap-3 border-t pt-4 sm:grid-cols-2 xl:col-span-1 xl:gap-3 xl:border-t-0 xl:border-l xl:py-0 xl:pl-4">
                                <div
                                    className={
                                        entry.refund_status === 'credited'
                                            ? 'bg-success/5 flex min-w-0 items-center gap-3 rounded-xl px-3 py-3'
                                            : entry.refund_status === 'approved_uncredited'
                                              ? 'bg-warning/5 flex min-w-0 items-center gap-3 rounded-xl px-3 py-3'
                                              : 'bg-accent/40 flex min-w-0 items-center gap-3 rounded-xl px-3 py-3'
                                    }
                                >
                                    {entry.refund_status === 'credited' ? (
                                        <Coins aria-hidden="true" className="text-success size-5 shrink-0" />
                                    ) : (
                                        <Clock3 aria-hidden="true" className="text-primary size-5 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-muted-foreground text-xs">Refund status</p>
                                        <p
                                            className={
                                                entry.refund_status === 'credited'
                                                    ? 'text-success mt-1 text-sm leading-snug font-semibold break-words'
                                                    : 'mt-1 text-sm leading-snug font-semibold break-words'
                                            }
                                        >
                                            {labels[entry.refund_status] ?? entry.refund_status.replaceAll('_', ' ')}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-accent/40 flex min-w-0 items-center gap-3 rounded-xl px-3 py-3">
                                    {entry.task?.status === 'received' ? (
                                        <Package aria-hidden="true" className="text-primary size-5 shrink-0" />
                                    ) : (
                                        <Truck aria-hidden="true" className="text-primary size-5 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-muted-foreground text-xs">Physical return</p>
                                        <p className="mt-1 text-sm leading-snug font-semibold break-words">
                                            {entry.task
                                                ? (labels[entry.task.status] ?? entry.task.status.replaceAll('_', ' '))
                                                : entry.physical_return_required === false
                                                  ? 'No physical return required'
                                                  : 'Awaiting admin decision'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Dialog>
                                <div className="col-span-2 xl:col-span-1 xl:border-l xl:pl-4">
                                    <DialogTrigger className={`${secondaryClass} min-h-11 w-full gap-2 px-4 text-sm font-semibold sm:w-auto`}>
                                        View details
                                        <ArrowUpRight aria-hidden="true" className="size-4" />
                                    </DialogTrigger>
                                </div>
                                <DialogContent className="bg-card sm:max-w-5xl">
                                    <DialogHeader className="border-b pb-4">
                                        <DialogTitle className="flex items-center gap-3 text-xl">
                                            <Package aria-hidden="true" className="text-primary size-6 shrink-0" />
                                            Return & refund details
                                        </DialogTitle>
                                        <DialogDescription>
                                            Return #{entry.id} · Order #{entry.seller_order.order_id} · Parcel #{entry.seller_order.id}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <dl className="grid min-w-0 gap-3 md:grid-cols-3">
                                        <div className="bg-accent/35 border-primary/15 min-w-0 rounded-xl border p-4">
                                            <dt className="text-muted-foreground flex items-center gap-2 text-xs">
                                                <Coins aria-hidden="true" className="text-primary size-5" />
                                                Refund / credit
                                            </dt>
                                            <dd className="mt-1 text-sm font-semibold break-words">
                                                {entry.refund_status === 'credited' && entry.refund_method === 'coins'
                                                    ? 'Lubos Coins credited and spendable'
                                                    : (labels[entry.refund_status] ?? entry.refund_status.replaceAll('_', ' '))}
                                            </dd>
                                            {entry.refund_status === 'credited' && (
                                                <dd className="text-success mt-1 text-lg font-semibold tabular-nums">
                                                    {money(entry.coins_refunded_cents / 100)}
                                                </dd>
                                            )}
                                        </div>
                                        <div className="bg-accent/35 border-primary/15 min-w-0 rounded-xl border p-4">
                                            <dt className="text-muted-foreground flex items-center gap-2 text-xs">
                                                <Package aria-hidden="true" className="text-primary size-5" />
                                                Physical return / custody
                                            </dt>
                                            <dd className="mt-1 text-sm font-semibold break-words">
                                                {entry.task
                                                    ? (labels[entry.task.status] ?? entry.task.status.replaceAll('_', ' '))
                                                    : entry.physical_return_required === false
                                                      ? 'No physical return required'
                                                      : 'Awaiting admin decision'}
                                            </dd>
                                        </div>
                                        {
                                            <div className="bg-accent/35 border-primary/15 min-w-0 rounded-xl border p-4">
                                                <dt className="text-muted-foreground flex items-center gap-2 text-xs">
                                                    <Handshake aria-hidden="true" className="text-primary size-5" />
                                                    Settlement / recovery
                                                </dt>
                                                <dd className="mt-1 text-sm font-semibold break-words">
                                                    {entry.settlement_state?.replaceAll('_', ' ') ?? 'Not recorded'}
                                                </dd>
                                            </div>
                                        }
                                    </dl>

                                    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                                        <div className="min-w-0 space-y-4">
                                            <RefundSection title="Return item" icon={ReceiptText}>
                                                <ul className="mt-3 space-y-2 text-sm">
                                                    {(entry.items.length
                                                        ? entry.items
                                                        : entry.seller_order.items.map((item) => ({
                                                              order_item_id: item.id,
                                                              quantity: item.quantity,
                                                              product_name: item.product_name,
                                                              requested_cents: null,
                                                              approved_cents: null,
                                                          }))
                                                    ).map((item) => (
                                                        <li key={item.order_item_id} className="flex min-w-0 flex-wrap items-center gap-3">
                                                            {
                                                                <OrderProductImage
                                                                    name={item.product_name}
                                                                    src={
                                                                        entry.seller_order.items.find((source) => source.id === item.order_item_id)
                                                                            ?.product_image_url
                                                                    }
                                                                />
                                                            }
                                                            {item.product_name} × {item.quantity}
                                                            {item.requested_cents != null &&
                                                                !['rider', 'logistics'].includes(role) &&
                                                                ` · Requested ${money(item.requested_cents / 100)}`}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <p className="text-muted-foreground mt-3 text-sm break-words whitespace-pre-wrap">{entry.reason}</p>
                                                {entry.decision_reason && (
                                                    <p className="mt-3 text-sm break-words">Decision: {entry.decision_reason}</p>
                                                )}
                                            </RefundSection>
                                            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                                                <RefundSection title="Refund breakdown" icon={Coins}>
                                                    <dl className="space-y-3 text-sm">
                                                        {[
                                                            [
                                                                'Requested refund',
                                                                money(
                                                                    (entry.items.reduce((sum, item) => sum + item.requested_cents, 0) +
                                                                        entry.requested_shipping_cents) /
                                                                        100,
                                                                ),
                                                            ],
                                                            [
                                                                'Approved refund',
                                                                entry.refund_cents == null ? 'Awaiting review' : money(entry.refund_cents / 100),
                                                            ],
                                                            ['Cash refund', money(entry.cash_refunded_cents / 100)],
                                                        ].map(([label, value]) => (
                                                            <div key={label} className="flex flex-wrap justify-between gap-2 border-b pb-2">
                                                                <dt className="text-muted-foreground">{label}</dt>
                                                                <dd className="font-medium tabular-nums">{value}</dd>
                                                            </div>
                                                        ))}
                                                        <div className="bg-success/10 text-success flex flex-wrap justify-between gap-2 rounded-lg p-2 font-semibold">
                                                            <dt>Lubos Coins credited</dt>
                                                            <dd className="tabular-nums">{money(entry.coins_refunded_cents / 100)}</dd>
                                                        </div>
                                                    </dl>
                                                </RefundSection>
                                                <RefundSection title="Responsibility & costs" icon={ShieldCheck}>
                                                    <dl className="space-y-3 text-sm">
                                                        {[
                                                            ['Refund responsibility', entry.responsibility ?? 'Awaiting review'],
                                                            ['Return shipping', entry.return_shipping_responsibility ?? 'Awaiting review'],
                                                            [
                                                                'Recorded transport cost',
                                                                entry.return_shipping_cents == null
                                                                    ? 'Not recorded'
                                                                    : money(entry.return_shipping_cents / 100),
                                                            ],
                                                        ].map(([label, value]) => (
                                                            <div
                                                                key={label}
                                                                className="flex flex-wrap justify-between gap-2 border-b pb-2 last:border-0"
                                                            >
                                                                <dt className="text-muted-foreground">{label}</dt>
                                                                <dd className="font-medium break-words capitalize tabular-nums">{value}</dd>
                                                            </div>
                                                        ))}
                                                    </dl>
                                                </RefundSection>
                                            </div>
                                            <details className="border-primary/15 rounded-xl border p-4">
                                                <summary className="min-h-6 cursor-pointer text-sm font-semibold">
                                                    Reference information & physical return
                                                </summary>
                                                <div className="mt-3 space-y-3 text-sm">
                                                    <p className="break-all">
                                                        Tracking reference: {entry.seller_order.delivery.tracking_reference ?? 'Not recorded'}
                                                    </p>
                                                    <p className="break-all">Refund reference: {entry.refund_reference ?? 'Not recorded'}</p>{' '}
                                                    {entry.task && (
                                                        <div className="mt-4 space-y-3">
                                                            <p className="text-muted-foreground text-xs break-all">
                                                                Return reference: {entry.task.reference}
                                                            </p>
                                                            {entry.task.buyer_address && (
                                                                <p className="text-sm">
                                                                    Collect from buyer:{' '}
                                                                    {Object.values(entry.task.buyer_address).filter(Boolean).join(', ')}
                                                                </p>
                                                            )}
                                                            {entry.task.seller_address && (
                                                                <p className="text-sm">
                                                                    Return to seller:{' '}
                                                                    {Object.values(entry.task.seller_address).filter(Boolean).join(', ')}
                                                                </p>
                                                            )}
                                                            <div className="flex flex-wrap gap-3">
                                                                {entry.task.proofs.map((proof) => (
                                                                    <a
                                                                        key={proof.id}
                                                                        className={secondaryClass}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        href={`/returns/${entry.id}/proof/${proof.id}`}
                                                                    >
                                                                        View {proof.leg.replaceAll('_', ' ')} proof
                                                                    </a>
                                                                ))}
                                                            </div>
                                                            {entry.task.confirmed_at && (
                                                                <p className="text-sm">
                                                                    Seller confirmed: {new Date(entry.task.confirmed_at).toLocaleString('en-PH')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {entry.wallet_entries.length > 0 && (
                                                        <ul className="mt-3 space-y-2 text-xs break-all">
                                                            {entry.wallet_entries.map((wallet) => (
                                                                <li key={wallet.id}>
                                                                    {wallet.type.replaceAll('_', ' ')}: {money(wallet.amount_cents / 100)} ·{' '}
                                                                    {wallet.reference}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </details>
                                        </div>
                                        <RefundSection title="Return activity history" icon={Clock3}>
                                            <details open>
                                                <summary className="mb-4 min-h-6 cursor-pointer text-sm font-medium">
                                                    Recorded activity ({entry.events.length})
                                                </summary>
                                                <ActivityTimeline
                                                    label="Return activity history"
                                                    entries={entry.events.map((event) => ({
                                                        id: event.id,
                                                        ...returnEventPresentation(event.action),
                                                        at: event.created_at,
                                                        content: (
                                                            <>
                                                                {activityNote(event.notes) && <p>{activityNote(event.notes)}</p>}
                                                                {event.evidence_url && (
                                                                    <a
                                                                        className={secondaryClass}
                                                                        href={event.evidence_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        View discrepancy evidence
                                                                    </a>
                                                                )}
                                                            </>
                                                        ),
                                                    }))}
                                                />
                                            </details>
                                        </RefundSection>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        {canApprove && ['pending', 'approved_uncredited'].includes(entry.refund_status) && <Approval entry={entry} />}
                                        {canReview && entry.refund_status === 'pending' && <TaskAction entry={entry} action="reject" riders={[]} />}
                                        {entry.allowed_actions.map((action) => (
                                            <TaskAction key={action} entry={entry} action={action} riders={riders} />
                                        ))}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </Card>
                ))}
            </div>
            <Pager links={returns.links} />
        </Page>
    );
}
