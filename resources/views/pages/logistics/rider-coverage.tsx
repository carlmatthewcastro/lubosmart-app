import RiderServiceAreaForm from '@/components/logistics/rider-service-area-form';
import { Badge, Card, Empty, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';

type Option = { id: number; name: string };
type Assignment = { rider_id: number; rider_name: string; area_id: number; area_name: string; center_name: string; is_active: boolean | number };

export default function RiderCoverage({
    centers,
    riders,
    assignments,
}: {
    centers: Option[];
    riders: (Option & { logistics_center_id: number })[];
    assignments: Pagination<Assignment>;
}) {
    return (
        <Page title="Rider Coverage" description="Assign destination barangays to your approved riders and review their coverage areas.">
            {centers.length && riders.length ? (
                <RiderServiceAreaForm centers={centers} riders={riders} />
            ) : (
                <Empty
                    title={centers.length ? 'No eligible riders yet' : 'No operational center'}
                    description={
                        centers.length
                            ? 'Approve a rider and verify their email before assigning coverage.'
                            : 'An approved logistics center is required before assigning rider coverage.'
                    }
                />
            )}
            <section aria-label="Existing rider coverage" className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Assigned coverage</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {assignments.total} {assignments.total === 1 ? 'assignment' : 'assignments'} for approved, email-verified riders in your
                        operational centers.
                    </p>
                </div>
                {assignments.data.length ? (
                    <div className="grid items-start gap-4 lg:grid-cols-2">
                        {assignments.data.map((assignment) => (
                            <Card key={`${assignment.rider_id}-${assignment.area_id}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold break-words">{assignment.rider_name}</h3>
                                        <p className="text-muted-foreground mt-1 text-xs break-words">{assignment.center_name}</p>
                                    </div>
                                    <Badge status={assignment.is_active ? 'active' : 'inactive'} />
                                </div>
                                <p className="mt-4 border-t pt-4 text-sm break-words">{assignment.area_name}</p>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Empty
                        title="No coverage assigned"
                        description={
                            centers.length && riders.length
                                ? 'Use the form above to assign a destination barangay to an eligible rider.'
                                : 'Assignments will appear here when eligible riders receive coverage.'
                        }
                    />
                )}
                <Pager links={assignments.links} />
            </section>
        </Page>
    );
}
