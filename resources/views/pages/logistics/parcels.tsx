import ParcelNextStep from '@/components/logistics/parcel-next-step';
import { Badge, Card, Empty, Page, Pager, secondaryClass, type Pagination } from '@/components/shared/marketplace-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from '@inertiajs/react';
import { Boxes, PackageOpen, Search, Truck } from 'lucide-react';
import { useState } from 'react';
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
    const [selected, setSelected] = useState<{ id: number; available: boolean; tracking: string | null } | null>(null);
    const parcel = selected ? [...deliveries.data, ...available].find((row) => row.id === selected.id) : null;
    return (
        <Page
            title="Parcel Operations"
            description="Approve pickups, receive and sort parcels, then assign riders by destination."
            action={
                <Button variant="outline" size="icon" className="self-end" asChild>
                    <Link href="/dashboard" aria-label="Search parcels on dashboard" title="Search parcels">
                        <Search aria-hidden="true" />
                    </Link>
                </Button>
            }
        >
            {filters.search && (
                <p role="status" className="text-muted-foreground text-sm break-words">
                    Search results for: {filters.search}
                </p>
            )}
            {deliveries.data.length ? (
                <div className="grid items-start gap-4 lg:grid-cols-2">
                    {deliveries.data.map((row) => (
                        <Card key={row.id}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 gap-3">
                                    <span className="bg-accent text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                                        <Boxes className="size-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-muted-foreground text-xs">Parcel #{row.id}</p>
                                        <p className="mt-2 font-mono text-xs break-all">{row.tracking_reference}</p>
                                        {row.exception_status && (
                                            <p className="text-destructive mt-2 text-sm">{row.exception_status.replaceAll('_', ' ')}</p>
                                        )}
                                        <h2 className="mt-1 font-semibold">{row.seller_order.store.name}</h2>
                                    </div>
                                </div>
                                <Badge status={row.status} />
                            </div>
                            <div className="bg-background my-5 rounded-xl p-4">
                                <p className="text-sm font-medium">
                                    {row.seller_order.order.shipping_barangay}, {row.seller_order.order.shipping_city}
                                </p>
                                <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                                    <Truck className="size-3.5" />
                                    {row.rider?.name ?? 'No rider assigned'}
                                </p>
                            </div>
                            <ParcelNextStep parcel={row} role="logistics" compact />
                            <button
                                className={`${secondaryClass} mt-4 w-full`}
                                onClick={() => setSelected({ id: row.id, available: false, tracking: row.tracking_reference })}
                            >
                                View Parcel & Actions
                            </button>
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
                                <button
                                    className={secondaryClass}
                                    onClick={() => setSelected({ id: row.id, available: true, tracking: row.tracking_reference })}
                                >
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
                <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Parcel #{selected?.id}</DialogTitle>
                        <DialogDescription>Review the parcel and complete the next available action.</DialogDescription>
                    </DialogHeader>
                    {parcel ? (
                        <Parcel
                            key={`${parcel.id}-${parcel.status}-${parcel.received_at}-${parcel.sorted_at}-${parcel.pickup_approved_at}-${parcel.dispatch_prepared_at}-${parcel.dispatch_accepted_at}-${parcel.rider?.name}-${cod[parcel.id]?.status}`}
                            parcel={parcel}
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
