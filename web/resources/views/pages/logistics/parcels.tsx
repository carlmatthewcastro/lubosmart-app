import ParcelNavigation from '@/components/logistics/parcel-navigation';
import ParcelNextStep from '@/components/logistics/parcel-next-step';
import OrderProductImage from '@/components/marketplace/order-product-image';
import { Badge, buttonClass, Card, Empty, money, Page, Pager, secondaryClass, type Pagination } from '@/components/shared/marketplace-ui';
import { RecordHeader } from '@/components/shared/record-header';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link, usePage } from '@inertiajs/react';
import { Boxes, Download, Eye, History, MapPin, PackageOpen, Truck } from 'lucide-react';
import { useRef, useState } from 'react';
import { Parcel, type Area, type Collection, type Delivery, type Option, type Rider } from '../marketplace/deliveries';

type Props = {
    deliveries: Pagination<Delivery>;
    available: Delivery[];
    centers: Option[];
    riders: Rider[];
    areas: Area[];
    cod: Record<string, Collection>;
    filters: { stage?: string; search?: string };
};
export default function LogisticsParcels(props: Props) {
    const { deliveries, available, centers, riders, areas, cod, filters } = props;
    const page = usePage();
    const records = new URLSearchParams(page.url.split('?')[1]).get('view') === 'records';
    const deliveryWorkspace = ['dispatch', 'monitoring', 'exceptions'].includes(filters.stage ?? '');
    const [selected, setSelected] = useState<{ id: number; available: boolean; tracking: string | null; section?: 'history' } | null>(null);
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const returnFocus = useRef<HTMLElement | null>(null);
    const content = useRef<HTMLDivElement>(null);
    const openParcel = (row: Delivery, section?: 'history', available = false, opener?: HTMLElement) => {
        returnFocus.current =
            opener ??
            (available
                ? (document.activeElement as HTMLElement)
                : document.querySelector<HTMLButtonElement>(`button[aria-label="Actions for parcel #${row.id}"]`));
        setSelected({ id: row.id, available, tracking: row.tracking_reference, section });
    };
    const parcel = selected ? [...deliveries.data, ...available].find((row) => row.id === selected.id) : null;
    return (
        <Page
            title={records ? 'Parcel records' : deliveryWorkspace ? 'Delivery management' : 'Parcel management'}
            description={
                records
                    ? 'Review parcel history, tracking updates, and completed delivery records.'
                    : deliveryWorkspace
                      ? 'Assign delivery riders, monitor parcels in transit, and review delivery exceptions.'
                      : 'Approve pickups, receive and sort parcels, then assign riders by destination.'
            }
            action={
                <Link href="/logistics/scan" className={buttonClass}>
                    Scan parcel
                </Link>
            }
        >
            <ParcelNavigation
                key={`${filters.stage}-${filters.search}-${records}`}
                filters={filters}
                records={records}
                delivery={deliveryWorkspace && !records}
            />
            <p className="text-muted-foreground text-sm" role="status">
                {deliveries.total.toLocaleString()} matching parcels
            </p>
            {filters.search && (
                <p role="status" className="text-muted-foreground text-sm break-words">
                    Search results for: {filters.search}
                </p>
            )}
            {deliveries.data.length ? (
                <div className="grid items-start gap-4 lg:grid-cols-2">
                    {deliveries.data.map((row) => (
                        <Card key={row.id} className="relative !p-4 sm:!p-5">
                            <div className="mb-3 flex items-center gap-3 pr-14">
                                <OrderProductImage
                                    src={row.seller_order.items[0]?.product_image_url}
                                    name={row.seller_order.items[0]?.product_name ?? 'Parcel'}
                                />
                                <div className="min-w-0 text-sm">
                                    <p className="font-medium break-words">{row.seller_order.items[0]?.product_name ?? 'Parcel contents'}</p>
                                    <p className="text-muted-foreground mt-1">
                                        Product preview / {row.seller_order.items.reduce((total, item) => total + item.quantity, 0)} items
                                        {row.seller_order.items.length > 1 ? ' / +' + (row.seller_order.items.length - 1) + ' products' : ''}
                                    </p>
                                    <p className="mt-1 tabular-nums">
                                        COD{' '}
                                        {money(
                                            row.seller_order.cod_due_cents != null
                                                ? row.seller_order.cod_due_cents / 100
                                                : Number(row.seller_order.subtotal) +
                                                      Number(row.seller_order.shipping_fee) -
                                                      (row.seller_order.coins_redeemed_cents ?? 0) / 100,
                                        )}
                                    </p>
                                </div>
                            </div>
                            <RecordHeader
                                showIcon={false}
                                actionsClassName="absolute top-4 right-4 sm:top-5 sm:right-5"
                                label={`Parcel #${row.id}`}
                                title={row.seller_order.store.name}
                                reference={row.tracking_reference}
                                status={<Badge status={row.status} />}
                                icon={Boxes}
                                onOpen={(event) => openParcel(row, undefined, false, event.currentTarget)}
                                open={openMenu === row.id}
                                onOpenChange={(open) => setOpenMenu(open ? row.id : null)}
                                actions={[
                                    { id: 'details', label: 'View parcel & actions', icon: Eye, onSelect: () => openParcel(row) },
                                    {
                                        id: 'history',
                                        label: 'View handling history',
                                        icon: History,
                                        visible: !!row.events?.length,
                                        onSelect: () => openParcel(row, 'history'),
                                    },
                                    {
                                        id: 'proof',
                                        label: 'Download delivery proof',
                                        icon: Download,
                                        visible: !!row.proof_photo_path,
                                        href: '/deliveries/' + row.id + '/proof',
                                        download: true,
                                    },
                                ]}
                            />
                            <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t pt-3 text-xs">
                                <p className="flex min-w-0 items-start gap-2">
                                    <MapPin aria-hidden="true" className="size-4 shrink-0" />
                                    <span className="[overflow-wrap:anywhere]">
                                        {row.seller_order.order.shipping_barangay}, {row.seller_order.order.shipping_city}
                                    </span>
                                </p>
                                <p className="flex min-w-0 items-start gap-2">
                                    <Truck aria-hidden="true" className="size-4 shrink-0" />
                                    <span className="[overflow-wrap:anywhere]">{row.rider?.name ?? 'No rider assigned'}</span>
                                </p>
                            </div>
                            {row.exception_status && <p className="text-destructive mt-3 text-sm">{row.exception_status.replaceAll('_', ' ')}</p>}
                            <ParcelNextStep parcel={row} role="logistics" compact />
                        </Card>
                    ))}
                </div>
            ) : (
                <Empty
                    title="No Parcels in This Queue"
                    description="Parcels appear here as sellers prepare orders and riders update their deliveries."
                />
            )}
            <Pager links={deliveries.links} />
            {available.length > 0 && (filters.stage === 'pickups' || !filters.stage || filters.stage === 'all') && (
                <Card>
                    <h2 className="font-semibold">Unallocated Pickup Requests</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Legacy orders awaiting a logistics center. Verify pickup and destination coverage before accepting.
                    </p>
                    <div className="mt-4 divide-y">
                        {available.map((row) => (
                            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                                <div className="flex items-center gap-3">
                                    <PackageOpen className="text-primary size-5" />
                                    <p className="text-sm font-medium">
                                        Parcel #{row.id} · {row.seller_order.store.name}
                                    </p>
                                </div>
                                <button className={secondaryClass} onClick={() => openParcel(row, undefined, true)}>
                                    Review Request
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
            <Dialog
                open={Boolean(selected)}
                onOpenChange={(open) => {
                    if (!open) setSelected(null);
                }}
            >
                <DialogContent
                    ref={content}
                    onOpenAutoFocus={(event) => {
                        if (selected?.section === 'history') {
                            event.preventDefault();
                            requestAnimationFrame(() => {
                                const history = content.current?.querySelector<HTMLDetailsElement>('[data-parcel-history]');
                                if (history) {
                                    history.open = true;
                                    history.querySelector('summary')?.focus();
                                }
                            });
                        }
                    }}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        (returnFocus.current?.isConnected ? returnFocus.current : document.getElementById('main-content'))?.focus();
                    }}
                    className="bg-card max-h-[90dvh] overflow-y-auto sm:max-w-5xl"
                >
                    <DialogHeader className="border-b pb-4 text-left">
                        <DialogTitle className="text-2xl font-semibold">Parcel #{selected?.id}</DialogTitle>
                        <DialogDescription>Review the parcel and complete the next available action.</DialogDescription>
                    </DialogHeader>
                    {parcel ? (
                        <Parcel
                            key={`${parcel.id}-${parcel.status}-${parcel.received_at}-${parcel.sorted_at}-${parcel.pickup_approved_at}-${parcel.dispatch_prepared_at}-${parcel.dispatch_accepted_at}-${parcel.rider?.name}-${cod[parcel.id]?.status}`}
                            parcel={parcel}
                            embedded
                            role="logistics"
                            centers={centers}
                            riders={riders}
                            areas={areas}
                            collection={cod[parcel.id]}
                            available={!parcel.logistics_center_id}
                        />
                    ) : (
                        <div className="space-y-4">
                            <p className="text-muted-foreground text-sm">
                                The action was saved and this parcel moved to its next queue. Open its updated record to continue.
                            </p>
                            <Link
                                href={`/deliveries?${new URLSearchParams({ stage: 'all', search: selected?.tracking ?? '' })}`}
                                className={secondaryClass}
                            >
                                Open parcel in all queues
                            </Link>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Page>
    );
}
