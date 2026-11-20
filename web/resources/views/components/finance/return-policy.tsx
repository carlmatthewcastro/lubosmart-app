import { Card } from '@/components/shared/marketplace-ui';
import RecordAction from '@/components/shared/record-action';

export type ExceptionParcel = {
    id: number;
    tracking: string | null;
    order_reference: string;
    buyer: string;
    store: string;
    delivered_at: string | null;
    deadline: string | null;
    within_window: boolean;
    return_status: string | null;
    exception: boolean;
    can_authorize: boolean;
};

export default function ReturnPolicy({
    days,
    updatedAt,
    canEdit,
}: {
    days: number;
    updatedAt?: string | null;
    parcels: ExceptionParcel[];
    search: string;
    canEdit: boolean;
}) {
    return (
        <Card>
            <h2 className="text-lg font-semibold">Standard return policy</h2>
            <p className="mt-2 text-sm">
                Current standard: <strong>{days} days from actual delivery</strong>. The saved delivery policy determines each parcel's deadline.
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
                {updatedAt ? 'Settings last updated: ' + new Date(updatedAt).toLocaleString('en-PH') : 'Policy update time unavailable'}. Existing
                approvals and delivered-parcel eligibility remain protected when the policy changes.
            </p>
            {canEdit && (
                <>
                    <RecordAction
                        forceDialog
                        title="Edit return policy"
                        description="Apply a standard window to future deliveries. Existing delivered parcels keep their applicable window; authorized exceptions remain available."
                        url="/return-settings"
                        method="patch"
                        fields={[
                            { key: 'return_window_days', label: 'Days from delivery', type: 'number', min: '1', max: '365', value: String(days) },
                        ]}
                    />
                </>
            )}
        </Card>
    );
}
