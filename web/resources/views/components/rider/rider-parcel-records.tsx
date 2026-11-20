import OrderProductImage from '@/components/marketplace/order-product-image';
import { Badge, buttonClass, Card, money, secondaryClass } from '@/components/shared/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Parcel, type Area, type Collection, type Delivery, type Option, type Rider } from '@/pages/marketplace/deliveries';
import { Download, Eye, Package, ScanLine } from 'lucide-react';
import { useRef, useState } from 'react';

export default function RiderParcelRecords({
    deliveries,
    centers,
    riders,
    areas,
    cod,
}: {
    deliveries: Delivery[];
    centers: Option[];
    riders: Rider[];
    areas: Area[];
    cod: Record<string, Collection>;
}) {
    const [selected, setSelected] = useState<number | null>(null);
    const opener = useRef<HTMLButtonElement | null>(null);
    const parcel = deliveries.find((row) => row.id === selected);
    return (
        <>
            <Card className="overflow-hidden !p-0">
                <div
                    className="bg-accent/40 hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)] gap-4 border-b px-5 py-3 text-xs font-medium lg:grid"
                    aria-hidden="true"
                >
                    <span>Parcel / order</span>
                    <span>Work type / status</span>
                    <span>Parcel COD</span>
                    <span>Actions</span>
                </div>
                <ul className="divide-y" aria-label="Assigned parcel records">
                    {deliveries.map((row) => {
                        const order = row.seller_order;
                        const scan =
                            row.status !== 'delivered' &&
                            ['picked_up', 'accept_dispatch', 'accept_transfer'].some((action) => row.allowed_actions?.includes(action));
                        const pickup = ['assigned', 'picked_up'].includes(row.status) && !row.dispatch_prepared_at;
                        const item = order.items[0];
                        return (
                            <li
                                key={row.id}
                                className="hover:bg-accent/20 grid min-w-0 items-center gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)]"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <OrderProductImage
                                        src={item?.product_image_url}
                                        name={item?.product_name ?? 'Parcel'}
                                        className="size-12 shrink-0"
                                    />
                                    <div className="min-w-0 text-sm">
                                        <p className="font-semibold break-words">
                                            {item ? `${item.product_name} x ${item.quantity}` : 'Parcel contents'}
                                            {order.items.length > 1 && (
                                                <span className="text-muted-foreground font-normal"> / +{order.items.length - 1} products</span>
                                            )}
                                        </p>
                                        <p className="text-muted-foreground mt-1">
                                            Parcel #{row.id} / Order #{order.order_id}
                                        </p>
                                        <p className="text-muted-foreground mt-1 break-words">{order.store.name}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm lg:flex-col lg:items-start">
                                    <span className="text-primary flex items-center gap-2">
                                        <Package aria-hidden="true" className="size-4" />
                                        {pickup ? 'Pickup' : 'Delivery'}
                                    </span>
                                    <Badge status={row.status} label={(row.fulfillment_status ?? row.status).replaceAll('_', ' ')} />
                                    {row.exception_status && (
                                        <span className="text-destructive text-xs">{row.exception_status.replaceAll('_', ' ')}</span>
                                    )}
                                </div>
                                <p className="text-sm font-semibold tabular-nums">
                                    <span className="text-muted-foreground font-normal lg:hidden">Parcel COD: </span>
                                    {money(
                                        order.cod_due_cents != null
                                            ? order.cod_due_cents / 100
                                            : Number(order.subtotal) + Number(order.shipping_fee) - (order.coins_redeemed_cents ?? 0) / 100,
                                    )}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                    <button
                                        type="button"
                                        className={`${buttonClass} min-h-11 gap-2 whitespace-nowrap`}
                                        onClick={(event) => {
                                            opener.current = event.currentTarget;
                                            setSelected(row.id);
                                        }}
                                        aria-label={`${scan ? 'Scan QR and view details' : 'View details and actions'} for parcel #${row.id}`}
                                    >
                                        {scan ? <ScanLine aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                                        {scan ? 'Scan QR' : 'View details'}
                                    </button>
                                    {row.proof_photo_path && (
                                        <a
                                            href={`/deliveries/${row.id}/proof`}
                                            className={`${secondaryClass} min-h-11 gap-2 whitespace-nowrap`}
                                            download
                                            aria-label={`Download delivery proof for parcel #${row.id}`}
                                        >
                                            <Download aria-hidden="true" className="size-4" />
                                            Proof
                                        </a>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </Card>
            <Dialog
                open={selected !== null}
                onOpenChange={(open) => {
                    if (!open) setSelected(null);
                }}
            >
                <DialogContent
                    className="bg-card sm:max-w-5xl"
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        (opener.current?.isConnected ? opener.current : document.getElementById('main-content'))?.focus();
                    }}
                >
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle>Parcel #{selected}</DialogTitle>
                        <DialogDescription>Review parcel details, tracking, and your permitted workflow actions.</DialogDescription>
                    </DialogHeader>
                    {parcel ? (
                        <Parcel
                            key={`${parcel.id}-${parcel.status}-${parcel.dispatch_accepted_at}-${cod[parcel.id]?.status}`}
                            parcel={parcel}
                            role="rider"
                            centers={centers}
                            riders={riders}
                            areas={areas}
                            collection={cod[parcel.id]}
                            embedded
                        />
                    ) : (
                        <p className="text-muted-foreground text-sm" role="status">
                            The parcel moved to another queue. Close this dialog to review your updated assignments.
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
