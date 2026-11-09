import ParcelCamera from '@/components/logistics/parcel-camera';
import { buttonClass, Card, Field, Page, Select, Textarea, type Pagination } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { router } from '@inertiajs/react';
import { Camera, Info, PackageSearch, Search } from 'lucide-react';
import { useState } from 'react';
import { Parcel, type Area, type Collection, type Delivery, type Option, type Rider } from '../marketplace/deliveries';

type Props = {
    deliveries: Pagination<Delivery>;
    centers: Option[];
    riders: Rider[];
    areas: Area[];
    cod: Record<string, Collection>;
    filters: { search?: string };
};

export default function ScanParcel({ deliveries, centers, riders, areas, cod, filters }: Props) {
    const [reference, setReference] = useState(filters.search ?? '');
    const [method, setMethod] = useState('scanner');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const lookup = (value: string) => {
        if (!navigator.onLine) {
            setError('No connection. The parcel was not looked up. Reconnect and try again.');
            return;
        }
        setError('');
        router.get(
            '/logistics/scan',
            { search: value.trim().toUpperCase() },
            {
                preserveState: true,
                preserveScroll: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };
    const parcel = deliveries.data[0];
    const searched = filters.search?.trim().toUpperCase() ?? '';
    const matches = searched !== '' && reference.trim().toUpperCase() === searched;

    return (
        <Page title="Scan Parcel" description="Scan the attached waybill, review the parcel, then confirm receipt, sorting or dispatch.">
            <Card className="max-sm:p-4">
                <div className="grid gap-6 lg:grid-cols-3">
                    <div data-parcel-camera-region className="grid min-w-0 content-start gap-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                                <Camera className="size-5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-semibold">Scan the waybill</h2>
                                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                                    Point at the square QR or barcode. Review the parcel before confirming a handover.
                                </p>
                            </div>
                        </div>
                        <ParcelCamera
                            onScan={(value) => {
                                setReference(value);
                                setMethod('scanner');
                                setReason('');
                                lookup(value);
                            }}
                        />
                    </div>
                    <div className="min-w-0 border-t pt-5 lg:col-span-2 lg:border-t-0 lg:pt-0">
                        <h2 className="text-lg font-semibold">Tracking lookup</h2>
                        <ValidatedForm
                            className="mt-4 grid gap-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                lookup(reference);
                            }}
                        >
                            <Field
                                id="scan-reference"
                                label="Parcel tracking reference"
                                placeholder="Scan or enter the tracking reference"
                                value={reference}
                                onChange={(event) => setReference(event.target.value.toUpperCase())}
                                maxLength={40}
                                autoComplete="off"
                                required
                                hint="Use a USB / Bluetooth scanner, or type the printed reference."
                            />
                            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                <Select
                                    label="Tracking entry method"
                                    reserveFeedback={false}
                                    value={method}
                                    onChange={(event) => setMethod(event.target.value)}
                                >
                                    <option value="scanner">Camera / USB / Bluetooth scanner</option>
                                    <option value="manual">Manual entry (reason required)</option>
                                </Select>

                                <button className={buttonClass} disabled={loading}>
                                    <Search className="size-4" aria-hidden="true" />
                                    {loading ? 'Finding parcel...' : 'Find parcel'}
                                </button>
                            </div>
                            {method === 'manual' && (
                                <Textarea
                                    label="Manual entry reason"
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    maxLength={1000}
                                    placeholder="For example: barcode damaged; checked the printed reference"
                                />
                            )}
                        </ValidatedForm>
                    </div>
                </div>
                <div className="text-muted-foreground mt-6 flex items-start gap-2 border-t pt-4 text-sm leading-relaxed">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>Use the parcel waybill, not a product barcode. Scanning does not confirm a handover.</p>
                </div>
                {loading && (
                    <p role="status" className="text-muted-foreground mt-4 text-sm">
                        Looking up this parcel…
                    </p>
                )}
                {error && (
                    <p role="alert" className="text-destructive mt-4 text-sm">
                        {error}
                    </p>
                )}
            </Card>
            {matches && parcel && !loading ? (
                <section data-scan-parcel aria-label="Scanned parcel and actions">
                    <Parcel
                        key={`${parcel.id}-${parcel.status}-${parcel.received_at}-${parcel.sorted_at}-${parcel.dispatch_prepared_at}-${parcel.exception_status}-${cod[parcel.id]?.status}`}
                        parcel={parcel}
                        role="logistics"
                        centers={centers}
                        riders={riders}
                        areas={areas}
                        collection={cod[parcel.id]}
                        scanEntry={{ reference: searched, method, reason }}
                    />
                </section>
            ) : (
                !loading && (
                    <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                        <div className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-2xl">
                            <PackageSearch className="size-6" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold tracking-tight">{searched && matches ? 'Parcel not found' : 'Ready to scan'}</h2>
                            <p className="text-muted-foreground mt-1 max-w-xl text-sm leading-relaxed">
                                {searched && matches
                                    ? 'Check the printed tracking reference. Only parcels assigned to your operational centers can be opened here.'
                                    : 'Find a parcel to view its details and available actions. Review the parcel before confirming receipt, sorting or dispatch.'}
                            </p>
                        </div>
                    </Card>
                )
            )}
        </Page>
    );
}
