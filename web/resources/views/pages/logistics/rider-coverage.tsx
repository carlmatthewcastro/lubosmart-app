import '@/../css/coverage-workspace.css';
import { LogisticsWorkspaceTabs } from '@/components/logistics/parcel-navigation';
import RiderServiceAreaForm from '@/components/logistics/rider-service-area-form';
import { Badge, Empty, Page, Pager, buttonClass, inputClass, secondaryClass, type Pagination } from '@/components/shared/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { router } from '@inertiajs/react';
import { ChevronDown, MapPin, Plus, Search, Users } from 'lucide-react';
import { useRef, useState } from 'react';

type Option = { id: number; name: string };
type Assignment = {
    rider_id: number;
    rider_name: string;
    area_id: number;
    area_name: string;
    center_name: string;
    is_active: boolean | number;
    barangay_name: string | null;
    city_name: string | null;
    province_name: string | null;
};
export default function RiderCoverage({
    centers,
    riders,
    assignments,
    filters,
}: {
    centers: Option[];
    riders: (Option & { logistics_center_id: number })[];
    assignments: Pagination<Assignment> & { rider_total: number };
    filters: { search?: string; center?: string };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [center, setCenter] = useState(filters.center ?? '');
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [saving, setSaving] = useState(false);
    const assignButton = useRef<HTMLButtonElement>(null);
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
    const grouped = new Map<number, Assignment[]>();
    for (const assignment of assignments.data) grouped.set(assignment.rider_id, [...(grouped.get(assignment.rider_id) ?? []), assignment]);
    function filterCoverage(clear = false) {
        if (clear) {
            setSearch('');
            setCenter('');
        }
        router.get('/logistics/rider-coverage', clear ? {} : { search: search.trim(), center }, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }
    return (
        <Page title="Coverage & Rates" logisticsBannerTitle="Rider Coverage" description="Manage assigned barangays for your riders.">
            <section className="coverage-workspace space-y-4">
                <LogisticsWorkspaceTabs section="coverage" />
                <div className="flex flex-wrap items-center gap-4">
                    <div className="coverage-stat">
                        <span className="coverage-stat-icon">
                            <MapPin aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-sm font-medium">Assigned coverage areas</p>
                            <p className="text-2xl font-semibold tabular-nums">{assignments.total}</p>
                        </div>
                    </div>
                    <div className="coverage-stat">
                        <span className="coverage-stat-icon">
                            <Users aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-sm font-medium">Riders with coverage</p>
                            <p className="text-2xl font-semibold tabular-nums">{assignments.rider_total}</p>
                        </div>
                    </div>
                    <button
                        ref={assignButton}
                        style={assigning ? { display: 'none' } : undefined}
                        className={buttonClass + (assigning ? ' hidden' : ' ml-auto')}
                        disabled={!centers.length || !riders.length}
                        onClick={() => setAssigning(true)}
                    >
                        <Plus aria-hidden="true" className="size-4" />
                        Assign Rider Coverage
                    </button>
                </div>
                <form
                    className="flex flex-wrap items-center gap-3"
                    aria-label="Filter assigned coverage"
                    aria-busy={loading}
                    onSubmit={(event) => {
                        event.preventDefault();
                        filterCoverage();
                    }}
                >
                    <label className="relative w-full min-w-0 sm:max-w-lg">
                        <span className="sr-only">Search rider coverage</span>
                        <Search aria-hidden="true" className="text-primary absolute top-3 left-4 size-5" />
                        <input
                            className={inputClass + ' pl-12'}
                            type="search"
                            maxLength={100}
                            placeholder="Search rider, barangay, city or province..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                    {centers.length > 1 && (
                        <select
                            aria-label="Logistics center"
                            className={inputClass + ' sm:w-48'}
                            value={center}
                            onChange={(event) => setCenter(event.target.value)}
                        >
                            <option value="">All centers</option>
                            {centers.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <button className={secondaryClass} disabled={loading}>
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                    {(filters.search || filters.center) && (
                        <button type="button" className={secondaryClass} disabled={loading} onClick={() => filterCoverage(true)}>
                            Clear filters
                        </button>
                    )}
                </form>
                <div className="space-y-2" aria-label="Rider directory">
                    {[...grouped].map(([riderId, coverage], index) => {
                        const expanded = index === 0 ? !collapsed.has(riderId) : collapsed.has(riderId);
                        const active = coverage.some((area) => area.is_active);
                        const initials = coverage[0].rider_name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join('');
                        return (
                            <article key={riderId} className="bg-card/75 overflow-hidden rounded-2xl border shadow-sm">
                                <button
                                    className="focus-visible:ring-ring flex w-full flex-wrap items-center gap-3 px-5 py-3 text-left focus-visible:ring-2 focus-visible:outline-none"
                                    aria-expanded={expanded}
                                    aria-controls={`rider-coverage-${riderId}`}
                                    onClick={() =>
                                        setCollapsed((previous) => {
                                            const next = new Set(previous);
                                            if (next.has(riderId)) next.delete(riderId);
                                            else next.add(riderId);
                                            return next;
                                        })
                                    }
                                >
                                    <span className="bg-accent text-primary flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold">
                                        {initials}
                                    </span>
                                    <span className="min-w-0 flex-1 sm:flex-none sm:basis-44">
                                        <span className="block text-sm font-semibold break-words">{coverage[0].rider_name}</span>
                                        <span className="text-muted-foreground block text-xs">{coverage[0].center_name}</span>
                                    </span>
                                    <span className="text-primary hidden items-center gap-3 border-l pl-5 text-sm sm:flex">
                                        <MapPin aria-hidden="true" className="size-5" />
                                        {coverage.length} coverage {coverage.length === 1 ? 'area' : 'areas'}
                                    </span>
                                    <span className="ml-auto">
                                        <Badge status={active ? 'active' : 'inactive'} />
                                    </span>
                                    <ChevronDown aria-hidden="true" className={`text-primary size-5 ${expanded ? 'rotate-180' : ''}`} />
                                </button>
                                {expanded && (
                                    <div
                                        id={`rider-coverage-${riderId}`}
                                        className="mx-5 mb-4 overflow-x-auto rounded-xl border"
                                        role="region"
                                        aria-label={`${coverage[0].rider_name} barangay coverage`}
                                        tabIndex={0}
                                    >
                                        <table className="w-full min-w-[480px] text-left text-xs">
                                            <thead className="bg-accent/70">
                                                <tr>
                                                    <th scope="col" className="px-4 py-2 font-medium">
                                                        Barangay
                                                    </th>
                                                    <th scope="col" className="px-4 py-2 font-medium">
                                                        Location
                                                    </th>
                                                    <th scope="col" className="px-4 py-2 font-medium">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {coverage.map((area) => (
                                                    <tr key={area.area_id}>
                                                        <td className="px-4 py-2 font-semibold">
                                                            <span className="flex items-center gap-3">
                                                                <MapPin aria-hidden="true" className="text-primary size-4 shrink-0" />
                                                                {area.barangay_name || area.area_name}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            {[area.city_name, area.province_name].filter(Boolean).join(', ')}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <Badge status={area.is_active ? 'active' : 'inactive'} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
                {!assignments.data.length && (
                    <Empty
                        title={filters.search || filters.center ? 'No matching coverage' : 'No coverage assigned'}
                        description={
                            filters.search || filters.center
                                ? 'Try another rider or location, or clear the filters.'
                                : !centers.length
                                  ? 'An approved logistics center is required before assigning coverage.'
                                  : !riders.length
                                    ? 'Approve a rider and verify their email before assigning coverage.'
                                    : 'Assign a destination barangay to an approved rider to get started.'
                        }
                    />
                )}
                <Pager links={assignments.links} />
            </section>
            <Dialog
                open={assigning}
                onOpenChange={(open) => {
                    if (!saving) setAssigning(open);
                }}
            >
                <DialogContent
                    className="coverage-rider-panel"
                    overlayClassName="coverage-dialog-overlay"
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        assignButton.current?.focus();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className="text-xl">Assign Rider Coverage</DialogTitle>
                        <DialogDescription>Assign a destination barangay to an approved rider.</DialogDescription>
                    </DialogHeader>
                    <RiderServiceAreaForm centers={centers} riders={riders} close={() => setAssigning(false)} onProcessingChange={setSaving} />
                </DialogContent>
            </Dialog>
        </Page>
    );
}
