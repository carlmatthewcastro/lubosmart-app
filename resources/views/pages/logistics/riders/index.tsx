import { Badge, Card, Page, buttonClass, secondaryClass } from '@/components/shared/marketplace-ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useForm } from '@inertiajs/react';
export default function Riders({
    riders,
}: {
    riders: {
        id: number;
        name: string;
        email: string;
        status: string;
        pendingActivation: boolean;
        applicationId: number | null;
        canReview: boolean;
        canManage: boolean;
    }[];
}) {
    const form = useForm({});
    return (
        <Page
            title="Company riders"
            description="Riders submit their details and documents during signup, then verify email. Review their applications before assigning deliveries."
            action={
                <Link className={buttonClass} href={route('reviews.index')}>
                    Review rider applications
                </Link>
            }
        >
            <Card>
                <p className="text-sm">
                    New riders can register using the Rider option, then choose your Logistics company when submitting their requirements.
                </p>
                <div className="mt-4 grid gap-2">
                    <Label htmlFor="rider-signup-link">Share this signup link with riders</Label>
                    <Input
                        id="rider-signup-link"
                        readOnly
                        value={route('register', { role: 'courier' })}
                        onFocus={(event) => event.currentTarget.select()}
                    />
                </div>
            </Card>
            {riders.length === 0 && <p>No rider applications for your company yet.</p>}
            {riders.map((rider) => (
                <Card key={rider.id} className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="font-semibold">{rider.name}</p>
                        <p className="text-muted-foreground text-sm break-all">{rider.email}</p>
                        {rider.pendingActivation ? (
                            <p className="text-sm">Awaiting activation of an existing invitation</p>
                        ) : (
                            <Badge status={rider.status} />
                        )}
                    </div>
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
                        <Link href={route('accounts.show', rider.id)} className={secondaryClass}>
                            Manage rider
                        </Link>
                    )}
                </Card>
            ))}
        </Page>
    );
}
