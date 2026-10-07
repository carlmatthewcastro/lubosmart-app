import { Badge, Card, Empty, Page, Pager, type Pagination, secondaryClass, Select } from '@/components/marketplace-ui';
import { Link, router } from '@inertiajs/react';

export default function Reviews({
    applications,
    filters,
}: {
    applications: Pagination<{ id: number; requested_role: string; name: string; email: string; status: string }>;
    filters: { status: string };
}) {
    return (
        <Page title="Application reviews" description="Review applications and decide account access.">
            <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="w-full sm:max-w-xs">
                    <Select
                        label="Application status"
                        value={filters.status}
                        onChange={(event) => router.get('/reviews', { status: event.target.value })}
                    >
                        <option value="submitted">Awaiting review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Changes requested</option>
                    </Select>
                </div>
                <div>
                    <h2 className="font-semibold">
                        {applications.total}{' '}
                        {filters.status === 'submitted' ? 'awaiting review' : filters.status === 'approved' ? 'approved' : 'with changes requested'}
                    </h2>
                </div>
            </Card>
            {applications.data.length ? (
                <Card className="overflow-hidden !p-0">
                    <ul className="divide-y">
                        {applications.data.map((application) => (
                            <li key={application.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                                <div className="min-w-0">
                                    <p className="font-semibold">{application.name}</p>
                                    <p className="text-muted-foreground mt-1 text-sm break-all">{application.email}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge status={application.requested_role} />
                                        <Badge status={application.status} />
                                    </div>
                                </div>
                                <Link href={route('reviews.show', application.id)} className={secondaryClass}>
                                    Review details
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Card>
            ) : (
                <Empty title="No matching applications" description="Try another application status." />
            )}
            <Pager links={applications.links} />
        </Page>
    );
}
