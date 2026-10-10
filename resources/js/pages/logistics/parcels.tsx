import { Badge, Card, Empty, inputClass, Page, Pager, secondaryClass, type Pagination } from '@/components/marketplace-ui';
import RiderServiceAreaForm from '@/components/rider-service-area-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link, router } from '@inertiajs/react';
import { Boxes, MapPinned, PackageOpen, Search, Truck } from 'lucide-react';
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
const stages = [
    { key: 'all', label: 'All Parcels' },
    { key: 'pickups', label: 'Pickup Requests' },
    { key: 'incoming', label: 'Incoming' },
    { key: 'sorting', label: 'Sorting' },
    { key: 'dispatch', label: 'Dispatch' },
    { key: 'monitoring', label: 'Monitoring' },
];
export default function LogisticsParcels(props: Props) {
    const { deliveries, available, centers, riders, areas, cod, filters } = props;
    const [selected, setSelected] = useState<{ id: number; available: boolean } | null>(null);
    const [coverage, setCoverage] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const parcel = selected ? (selected.available ? available : deliveries.data).find((row) => row.id === selected.id) : null;
    const visit = (stage: string) => router.get('/deliveries', { stage, search }, { preserveState: true, preserveScroll: true });
    return (
        <Page
            title="Parcel Operations"
            description="Approve pickups, receive and sort parcels, then assign riders by destination."
            action={
                <button className={secondaryClass} onClick={() => setCoverage(true)}>
                    <MapPinned className="size-4" />
                    Rider Coverage
                </button>
            }
        >
            <Card>
                <div className="flex flex-wrap gap-2">
                    {stages.map((stage) => (
                        <button
                            key={stage.key}
                            onClick={() => visit(stage.key)}
                            aria-pressed={(filters.stage ?? 'all') === stage.key}
                            className={`min-h-11 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${(filters.stage ?? 'all') === stage.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
                        >
                            {stage.label}
                        </button>
                    ))}
                </div>
                <form
                    className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        visit(filters.stage ?? 'all');
                    }}
                >
                    <div className="min-w-0 flex-1">
                        <label htmlFor="parcel-search" className="text-sm font-medium">
                            Find a Seller’s Parcels
                        </label>
                        <input
                            id="parcel-search"
                            type="search"
                            maxLength={100}
                            className={`${inputClass} mt-2`}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by store name"
                        />
                    </div>
                    <button className={secondaryClass}>
                        <Search className="size-4" />
                        Search
                    </button>
                </form>
            </Card>
            {deliveries.data.length ? (
                <div className="grid items-start gap-4 lg:grid-cols-2">
                    {deliveries.data.map((row) => (
                        <Card key={row.id}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex gap-3">
                                    <span className="bg-accent text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                                        <Boxes className="size-5" />
                                    </span>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Parcel #{row.id}</p>
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
                            <button className={`${secondaryClass} w-full`} onClick={() => setSelected({ id: row.id, available: false })}>
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
                                <button className={secondaryClass} onClick={() => setSelected({ id: row.id, available: true })}>
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
                            key={`${parcel.id}-${parcel.status}-${parcel.received_at}-${parcel.sorted_at}-${parcel.pickup_approved_at}-${cod[parcel.id]?.status}`}
                            parcel={parcel}
                            role="sorting_center"
                            centers={centers}
                            riders={riders}
                            areas={areas}
                            collection={cod[parcel.id]}
                            available={selected?.available}
                        />
                    ) : (
                        <p className="text-muted-foreground text-sm">This parcel moved to another queue. Close this window to continue.</p>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog open={coverage} onOpenChange={setCoverage}>
                <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Rider Coverage Assignments</DialogTitle>
                        <DialogDescription>Assign destination barangays to approved riders.</DialogDescription>
                    </DialogHeader>
                    <RiderServiceAreaForm centers={centers} riders={riders} />
                </DialogContent>
            </Dialog>
            <p className="text-muted-foreground text-xs">
                Need more coverage?{' '}
                <Link href="/logistics/shipping-rates" className="text-primary underline underline-offset-4">
                    Manage Shipping Rates
                </Link>
            </p>
        </Page>
    );
}
