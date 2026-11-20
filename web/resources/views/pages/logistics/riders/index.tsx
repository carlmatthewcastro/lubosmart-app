import { LogisticsWorkspaceTabs } from '@/components/logistics/parcel-navigation';
import { AccountActions } from '@/components/shared/account-actions';
import { AccountDirectory, DirectoryIdentity } from '@/components/shared/account-directory';
import { FilterToolbar } from '@/components/shared/filter-toolbar';
import { Badge, buttonClass, Card, Empty, Field, Page, secondaryClass, Select } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { User } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { ClipboardCheck, Send } from 'lucide-react';
import { useState } from 'react';

export default function Riders({
    riders,
}: {
    riders: {
        id: number;
        name: string;
        email: string;
        status: User['status'];
        rider_capability: string;
        created_at: string;
        email_verified_at: string | null;
        applicationStatus: string | null;
        pendingActivation: boolean;
        applicationId: number | null;
        canReview: boolean;
        canManage: boolean;
    }[];
}) {
    const form = useForm({});
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState('name');
    const filters = { search, status, sort };
    const filteredRiders = riders
        .filter((rider) => {
            const query = filters.search.trim().toLocaleLowerCase();
            return (
                (!query || `${rider.name} ${rider.email}`.toLocaleLowerCase().includes(query)) &&
                (!filters.status ||
                    (filters.status === 'activation' ? rider.pendingActivation : !rider.pendingActivation && rider.status === filters.status))
            );
        })
        .sort((a, b) => (filters.sort === 'name-desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)));
    const statuses = [...new Set(riders.filter((rider) => !rider.pendingActivation).map((rider) => rider.status))].sort();

    return (
        <Page title="Company riders" description="Review and manage rider accounts assigned to your Logistics company.">
            <LogisticsWorkspaceTabs section="riders" />
            <Card className="!p-4">
                <ValidatedForm
                    className="relative"
                    onSubmit={(event) => {
                        event.preventDefault();
                    }}
                >
                    <FilterToolbar
                        autoSubmit={false}
                        primary={
                            <Field reserveFeedback={false} label="Search riders" value={search} onChange={(event) => setSearch(event.target.value)} />
                        }
                        activeFilters={[
                            { key: 'search', label: 'Search', value: search, onRemove: () => setSearch('') },
                            { key: 'status', label: 'Status', value: status, onRemove: () => setStatus('') },
                            { key: 'sort', label: 'Sort', value: sort === 'name' ? '' : 'Name (Z to A)', onRemove: () => setSort('name') },
                        ].filter((filter) => !!filter.value)}
                    >
                        <Select reserveFeedback={false} label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
                            <option value="">All statuses</option>
                            {riders.some((rider) => rider.pendingActivation) && <option value="activation">Awaiting activation</option>}
                            {statuses.map((value) => (
                                <option key={value} value={value}>
                                    {value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())}
                                </option>
                            ))}
                        </Select>
                        <Select reserveFeedback={false} label="Sort by" value={sort} onChange={(event) => setSort(event.target.value)}>
                            <option value="name">Name (A to Z)</option>
                            <option value="name-desc">Name (Z to A)</option>
                        </Select>
                    </FilterToolbar>
                </ValidatedForm>
            </Card>
            <p className="text-muted-foreground text-sm" role="status">
                {filteredRiders.length} {filteredRiders.length === 1 ? 'rider' : 'riders'}
                {filters.search || filters.status ? ' matching your filters' : ' in your Logistics company'}
            </p>
            {filteredRiders.length ? (
                <AccountDirectory
                    label="Company riders"
                    items={filteredRiders}
                    columns={[
                        {
                            label: 'Rider',
                            render: (rider) => (
                                <DirectoryIdentity name={rider.name}>
                                    <p className="text-muted-foreground mt-1 text-xs">Rider</p>
                                </DirectoryIdentity>
                            ),
                        },
                        { label: 'Email', render: (rider) => <span className="text-muted-foreground break-all">{rider.email}</span> },
                        { label: 'Capability', render: (rider) => <Capability rider={rider} /> },
                        {
                            label: 'Registration',
                            render: (rider) => (
                                <>
                                    <p className="whitespace-nowrap">
                                        {new Date(rider.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {rider.applicationStatus === 'approved'
                                            ? 'Reviewed and approved'
                                            : rider.applicationStatus === 'rejected'
                                              ? 'Changes requested'
                                              : rider.pendingActivation
                                                ? 'Awaiting activation'
                                                : !rider.email_verified_at
                                                  ? 'Email verification needed'
                                                  : rider.applicationStatus === 'submitted'
                                                    ? 'Awaiting review'
                                                    : 'Not yet submitted'}
                                    </p>
                                </>
                            ),
                        },
                        {
                            label: 'Status',
                            render: (rider) => (
                                <Badge
                                    status={rider.pendingActivation ? 'pending' : rider.status}
                                    label={rider.pendingActivation ? 'Awaiting activation' : undefined}
                                />
                            ),
                        },
                        {
                            label: 'Actions',
                            render: (rider) => (
                                <AccountActions
                                    account={rider}
                                    canView={rider.canManage}
                                    canManage={rider.canManage}
                                    open={openMenu === rider.id}
                                    onOpenChange={(open) => setOpenMenu(open ? rider.id : null)}
                                    actions={[
                                        {
                                            id: 'resend',
                                            label: 'Resend activation',
                                            icon: Send,
                                            visible: rider.pendingActivation,
                                            loading: form.processing,
                                            onSelect: () => form.post(route('logistics.riders.resend', rider.id)),
                                        },
                                        {
                                            id: 'review',
                                            label: 'Review application',
                                            icon: ClipboardCheck,
                                            visible: !!(rider.canReview && rider.applicationId),
                                            onSelect: () => router.visit(route('reviews.show', rider.applicationId!)),
                                        },
                                    ]}
                                />
                            ),
                        },
                    ]}
                />
            ) : (
                <Empty
                    title={riders.length ? 'No matching riders' : 'No riders yet'}
                    description={
                        riders.length ? 'Try another name, email, or status.' : 'Riders assigned to your Logistics company will appear here.'
                    }
                />
            )}
        </Page>
    );
}

function Capability({ rider }: { rider: { id: number; name: string; rider_capability: string } }) {
    const form = useForm({ rider_capability: rider.rider_capability });
    const [open, setOpen] = useState(false);
    const labels: Record<string, string> = { pickup: 'Pickup Rider', delivery: 'Delivery Rider', both: 'Pickup and Delivery' };
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                setOpen(value);
                if (value) {
                    form.setData('rider_capability', rider.rider_capability);
                    form.clearErrors();
                }
            }}
        >
            <div className="flex flex-col items-start gap-1">
                <span className="whitespace-nowrap">{labels[rider.rider_capability] ?? 'Not specified'}</span>
                <DialogTrigger asChild>
                    <button
                        type="button"
                        className="text-primary min-h-8 rounded text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-2"
                        aria-label={'Edit capability for ' + rider.name}
                    >
                        Edit capability
                    </button>
                </DialogTrigger>
            </div>
            <DialogContent className="motion-reduce:animate-none">
                <DialogHeader>
                    <DialogTitle>Edit capability</DialogTitle>
                    <DialogDescription>Choose the rider capability for {rider.name}.</DialogDescription>
                </DialogHeader>
                <ValidatedForm
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.patch('/logistics/riders/' + rider.id + '/capability', { preserveScroll: true, onSuccess: () => setOpen(false) });
                    }}
                >
                    <Select
                        label="Rider capability"
                        value={form.data.rider_capability}
                        onChange={(event) => form.setData('rider_capability', event.target.value)}
                        error={form.errors.rider_capability}
                    >
                        <option value="pickup">Pickup Rider</option>
                        <option value="delivery">Delivery Rider</option>
                        <option value="both">Pickup and Delivery</option>
                    </Select>
                    <DialogFooter>
                        <DialogClose asChild>
                            <button type="button" className={secondaryClass}>
                                Cancel
                            </button>
                        </DialogClose>
                        <button className={buttonClass} disabled={form.processing}>
                            {form.processing ? 'Saving...' : 'Save Changes'}
                        </button>
                    </DialogFooter>
                </ValidatedForm>
            </DialogContent>
        </Dialog>
    );
}
