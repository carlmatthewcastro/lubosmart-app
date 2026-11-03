import { AccountAccessPanel } from '@/components/shared/account-access-panel';
import { InfoModal } from '@/components/shared/info-modal';
import { Badge, Card, Empty, Field, Page, Select, buttonClass, secondaryClass } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Riders({
    riders,
}: {
    riders: {
        id: number;
        name: string;
        email: string;
        status: User['status'];
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
    const getInitials = useInitials();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState('name');
    const [filters, setFilters] = useState({ search: '', status: '', sort: 'name' });
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
            <Card>
                <div className="mb-5">
                    <h2 className="text-sm font-semibold">Find a rider</h2>
                    <p className="text-muted-foreground mt-1 text-xs">Search by name or email, then narrow by status.</p>
                </div>
                <ValidatedForm
                    className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_160px_160px_auto]"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setFilters({ search, status, sort });
                    }}
                >
                    <Field label="Search riders" value={search} onChange={(event) => setSearch(event.target.value)} />
                    <Select label="Role" value="rider" disabled>
                        <option value="rider">Rider</option>
                    </Select>
                    <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
                        <option value="">All statuses</option>
                        {riders.some((rider) => rider.pendingActivation) && <option value="activation">Awaiting activation</option>}
                        {statuses.map((value) => (
                            <option key={value} value={value}>
                                {value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())}
                            </option>
                        ))}
                    </Select>
                    <button className={buttonClass} type="submit">
                        Apply filters
                    </button>
                    <Select label="Sort by" value={sort} onChange={(event) => setSort(event.target.value)}>
                        <option value="name">Name (A to Z)</option>
                        <option value="name-desc">Name (Z to A)</option>
                    </Select>
                    {(filters.search || filters.status) && (
                        <button
                            type="button"
                            className="text-primary min-h-11 text-sm font-medium hover:underline"
                            onClick={() => {
                                setSearch('');
                                setStatus('');
                                setSort('name');
                                setFilters({ search: '', status: '', sort: 'name' });
                            }}
                        >
                            Clear filters
                        </button>
                    )}
                </ValidatedForm>
            </Card>
            <p className="text-muted-foreground text-sm" role="status">
                {filteredRiders.length} {filteredRiders.length === 1 ? 'rider' : 'riders'}
                {filters.search || filters.status ? ' matching your filters' : ' in your Logistics company'}
            </p>
            {filteredRiders.length ? (
                <div className="grid items-start gap-4 xl:grid-cols-2">
                    {filteredRiders.map((rider) => (
                        <Card key={rider.id}>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="bg-accent/70 text-primary flex size-11 shrink-0 items-center justify-center rounded-full font-semibold"
                                    >
                                        {getInitials(rider.name)}
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-semibold break-words">{rider.name}</h2>
                                        <p className="text-muted-foreground mt-1 text-xs">Rider</p>
                                    </div>
                                </div>
                                <Badge
                                    status={rider.pendingActivation ? 'pending' : rider.status}
                                    label={rider.pendingActivation ? 'Awaiting activation' : undefined}
                                />
                            </div>
                            <p className="text-muted-foreground mt-3 text-sm break-all">{rider.email}</p>
                            <p className="text-muted-foreground mt-2 text-xs">
                                Registered{' '}
                                {new Date(rider.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                                <span className="text-muted-foreground">Registration</span>
                                <span className="font-medium">
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
                                </span>
                            </div>
                            {(rider.pendingActivation || (rider.canReview && rider.applicationId) || rider.canManage) && (
                                <div className="mt-4 flex flex-wrap items-start gap-3 border-t pt-4">
                                    {rider.pendingActivation && (
                                        <button
                                            className={secondaryClass}
                                            disabled={form.processing}
                                            onClick={() => form.post(route('logistics.riders.resend', rider.id))}
                                        >
                                            Resend activation
                                        </button>
                                    )}
                                    {rider.canReview && rider.applicationId && (
                                        <Link href={route('reviews.show', rider.applicationId)} className={secondaryClass}>
                                            Review application
                                        </Link>
                                    )}
                                    {rider.canManage && (
                                        <>
                                            <InfoModal kind="account" id={rider.id} label="View details" />
                                            <AccountAccessPanel account={rider} />
                                        </>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
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
