import ParcelCamera from '@/components/logistics/parcel-camera';
import { buttonClass, Card, Field, Page, Select, Textarea, type Pagination } from '@/components/shared/marketplace-ui';
import ProgressStepper from '@/components/shared/progress-stepper';
import ValidatedForm from '@/components/shared/validated-form';
import { router } from '@inertiajs/react';
import { Camera, ClipboardCheck, Info, LoaderCircle, PackageSearch, ScanLine, Search, ShieldCheck } from 'lucide-react';
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
        <Page
            title="Scan Parcel"
            description="Scan the attached waybill, review the parcel, then confirm physical receipt. Sorting and assignment need no further scan."
        >
            <ProgressStepper
                label="Scanning progress"
                stages={[
                    { id: 'scan', label: 'Scan', icon: ScanLine, state: matches && parcel && !loading ? 'completed' : 'current' },
                    { id: 'review', label: 'Review', icon: ClipboardCheck, state: matches && parcel && !loading ? 'current' : 'pending' },
                    { id: 'confirm', label: 'Confirm', icon: ShieldCheck, state: 'pending' },
                ]}
                className="bg-card rounded-2xl border px-3 py-4 sm:px-6"
            />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <Card className="min-w-0 max-sm:p-4">
                    <div className="grid gap-6">
                        <div data-parcel-camera-region className="grid min-w-0 content-start gap-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-accent text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                                    <Camera className="size-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-semibold">Scan the waybill</h2>
                                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                                        Open your camera and point it at the waybill QR code or barcode.
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
                        <div className="min-w-0 border-t pt-5">
                            <h2 className="text-base font-semibold">Use a tracking reference</h2>
                            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                                Use a USB / Bluetooth scanner or enter the printed reference.
                            </p>
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
                                    reserveFeedback={false}
                                    placeholder="Scan or enter the tracking reference"
                                    value={reference}
                                    onChange={(event) => setReference(event.target.value.toUpperCase())}
                                    maxLength={40}
                                    autoComplete="off"
                                    required
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
                                        {loading ? (
                                            <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                                        ) : (
                                            <Search className="size-4" aria-hidden="true" />
                                        )}
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
                    <section className="min-w-0" data-scan-parcel aria-label="Scanned parcel and actions">
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
                    <Card className="overflow-hidden !p-0 shadow-none">
                        <div className="flex items-center gap-3 border-b px-5 py-4 sm:px-6">
                            <div className="bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                                <ClipboardCheck className="size-5" aria-hidden="true" />
                            </div>
                            <div>
                                <h2 className="font-semibold">Parcel review</h2>
                                <p className="text-muted-foreground mt-1 text-xs">Verify the parcel before recording a handover.</p>
                            </div>
                        </div>
                        <div className="flex min-h-64 flex-col items-center justify-center gap-4 px-5 py-8 text-center sm:min-h-80 sm:px-8">
                            <div className="bg-accent/60 text-primary flex size-16 items-center justify-center rounded-full">
                                {loading ? (
                                    <LoaderCircle className="size-7 motion-safe:animate-spin" aria-hidden="true" />
                                ) : (
                                    <PackageSearch className="size-7" aria-hidden="true" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <h3 role="status" className="text-lg font-semibold tracking-tight">
                                    {loading ? 'Finding your parcel…' : searched && matches ? 'Parcel not found' : 'Ready for your next parcel'}
                                </h3>
                                <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
                                    {loading
                                        ? 'Checking the tracking reference. Parcel details will appear here.'
                                        : searched && matches
                                          ? 'Check the printed tracking reference. Only parcels assigned to your operational centers can be opened here.'
                                          : 'Scan the waybill or use the tracking lookup. You can review the parcel here before taking action.'}
                                </p>
                            </div>
                        </div>
                        <div className="bg-muted/30 grid gap-4 border-t p-5 sm:p-6">
                            <p className="text-sm font-medium">Before you confirm</p>
                            {[
                                {
                                    icon: PackageSearch,
                                    title: 'Match the physical parcel',
                                    description: 'Check its tracking reference, seller and destination.',
                                },
                                {
                                    icon: ClipboardCheck,
                                    title: 'Review the next available action',
                                    description: 'Only actions available for this parcel will be shown.',
                                },
                                {
                                    icon: ShieldCheck,
                                    title: 'Confirm after the handover',
                                    description: 'Scanning finds the parcel. Confirmation records the operation.',
                                },
                            ].map(({ icon: Icon, title, description }) => (
                                <div key={title} className="flex items-start gap-3">
                                    <Icon aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">{title}</p>
                                        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </Page>
    );
}
