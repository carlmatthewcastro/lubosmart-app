import { LogisticsWorkspaceTabs } from '@/components/logistics/parcel-navigation';
import { AccountDirectory, DirectoryIdentity } from '@/components/shared/account-directory';
import { InfoModal } from '@/components/shared/info-modal';
import { Badge, Card, Empty, Page, Pager, type Pagination, Select, roleLabel } from '@/components/shared/marketplace-ui';
import type { SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';

export default function Reviews({
    applications,
    filters,
}: {
    applications: Pagination<{ id: number; requested_role: string; name: string; email: string; status: string }>;
    filters: { status: string };
}) {
    const { auth } = usePage<SharedData>().props;
    const center = auth.user.role === 'logistics';
    return (
        <Page
            title={center ? 'Rider applications' : 'Manage account registrations'}
            description={
                center
                    ? 'Review riders who selected your Logistics company.'
                    : 'Review Buyer, Seller, and Logistics applications. Rider registrations are handled by their Logistics company.'
            }
        >
            {center && <LogisticsWorkspaceTabs section="riders" />}
            <Card className="flex flex-wrap items-end gap-4 !p-4">
                <div className="w-full min-w-0 sm:w-56">
                    <Select
                        label="Application status"
                        reserveFeedback={false}
                        value={filters.status}
                        onChange={(event) => router.get('/reviews', { status: event.target.value })}
                    >
                        <option value="submitted">Awaiting review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Changes requested</option>
                    </Select>
                </div>
                <div className="sm:pb-3">
                    <h2 className="font-semibold">
                        {applications.total}{' '}
                        {filters.status === 'submitted' ? 'awaiting review' : filters.status === 'approved' ? 'approved' : 'with changes requested'}
                    </h2>
                </div>
            </Card>
            {applications.data.length ? (
                <AccountDirectory
                    label={center ? 'Rider applications' : 'Account registrations'}
                    items={applications.data}
                    columns={[
                        {
                            label: 'Applicant',
                            render: (application) => (
                                <DirectoryIdentity name={application.name}>
                                    <p className="text-muted-foreground mt-1 text-xs">{roleLabel(application.requested_role)}</p>
                                </DirectoryIdentity>
                            ),
                        },
                        { label: 'Email', render: (application) => <span className="text-muted-foreground break-all">{application.email}</span> },
                        { label: 'Status', render: (application) => <Badge status={application.status} /> },
                        {
                            label: 'Actions',
                            render: (application) => <InfoModal kind="registration" id={application.id} label="Review Application" />,
                        },
                    ]}
                />
            ) : (
                <Empty title="No matching applications" description="Try another application status." />
            )}
            <Pager links={applications.links} />
        </Page>
    );
}
