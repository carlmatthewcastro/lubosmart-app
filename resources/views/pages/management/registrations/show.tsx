import InputError from '@/components/auth/input-error';
import { inputClass } from '@/components/shared/marketplace-ui';
import { ReasonConfirmation } from '@/components/shared/reason-confirmation';
import { RegistrationProfile } from '@/components/shared/registration-profile';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Fragment, useState, type FormEvent } from 'react';

export default function Review({
    application,
    applicant,
    profile,
    address,
    store,
    courier,
    documents,
    reviewer,
    bankAccount,
    canReview,
    embedded = false,
    onSaved,
}: {
    embedded?: boolean;
    onSaved?: () => void;
    application: {
        id: number;
        status: string;
        requested_role: string;
        business_name: string | null;
        seller_type?: string | null;
        tin?: string | null;
        sec_number?: string | null;
        position?: string | null;
        service_regions?: string[] | null;
        service_region_names?: string[] | null;
        rejection_reason: string | null;
        submitted_at: string | null;
        reviewed_at: string | null;
    };
    reviewer: { name: string } | null;
    bankAccount: string | null;
    canReview: boolean;
    applicant: { name: string; email: string; phone: string; email_verified_at: string | null };
    profile: Record<string, string> | null;
    address: Record<string, string> | null;
    store: { name: string; business_category: { name: string } | null } | null;
    courier: { vehicle_type: string; plate_number: string | null } | null;
    documents: { id: number; kind: string; url: string; mime_type: string }[];
}) {
    const [confirming, setConfirming] = useState(false);
    const form = useForm({ decision: 'approved', reason: '', _modal: embedded });
    const Layout = embedded ? Fragment : AppLayout;
    const submit = (event: FormEvent) => {
        event.preventDefault();
        setConfirming(true);
    };
    return (
        <Layout
            {...(embedded
                ? {}
                : {
                      breadcrumbs: [
                          { title: 'Reviews', href: route('reviews.index') },
                          { title: applicant.name, href: route('reviews.show', application.id) },
                      ],
                  })}
        >
            {!embedded && <Head title="Registration Review" />}
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
                {!embedded && <h1 className="text-2xl font-semibold">Registration review</h1>}
                <RegistrationProfile
                    details={{ application, applicant, profile, address, store, courier, documents, reviewer, bankAccount, canReview }}
                />
                {canReview && application.status === 'submitted' && (
                    <form onSubmit={submit} className="bg-card grid gap-4 rounded-2xl border p-6 shadow-sm shadow-black/[.02]">
                        <Label htmlFor="decision">Decision</Label>
                        <select
                            id="decision"
                            className={inputClass}
                            aria-invalid={!!form.errors.decision}
                            aria-describedby={form.errors.decision ? 'review-decision-error' : undefined}
                            value={form.data.decision}
                            onChange={(event) => form.setData('decision', event.target.value)}
                        >
                            <option value="approved">Approve</option>
                            <option value="rejected">Request changes / reject</option>
                        </select>
                        <InputError id="review-decision-error" message={form.errors.decision} />
                        <Label htmlFor="reason">Reason (required for rejection)</Label>
                        <select
                            id="reason"
                            className={inputClass}
                            aria-invalid={!!form.errors.reason}
                            aria-describedby={form.errors.reason ? 'review-reason-error' : undefined}
                            required={form.data.decision === 'rejected'}
                            value={form.data.reason}
                            onChange={(event) => form.setData('reason', event.target.value)}
                        >
                            <option value="">Select a Reason</option>
                            {(form.data.decision === 'approved'
                                ? ['Requirements verified and approved']
                                : [
                                      'Missing or unreadable supporting documents',
                                      'Registration information needs correction',
                                      ...(['seller', 'sorting_center'].includes(application.requested_role)
                                          ? ['Business information or permit needs verification']
                                          : []),
                                      ...(application.requested_role === 'courier' ? ['Assigned logistics company needs correction'] : []),
                                  ]
                            ).map((reason) => (
                                <option key={reason}>{reason}</option>
                            ))}
                        </select>
                        <InputError id="review-reason-error" message={form.errors.reason} />
                        <Button disabled={form.processing}>{form.processing ? 'Saving…' : 'Save decision'}</Button>
                    </form>
                )}
                <ReasonConfirmation
                    open={confirming}
                    onOpenChange={setConfirming}
                    title={form.data.decision === 'approved' ? 'Confirm Application Approval' : 'Confirm Application Rejection'}
                    reason={form.data.reason}
                    onReasonChange={(value) => form.setData('reason', value)}
                    required={form.data.decision === 'rejected'}
                    processing={form.processing}
                    onConfirm={() =>
                        form.patch(route('reviews.update', application.id), {
                            preserveState: true,
                            preserveScroll: true,
                            onSuccess: () => {
                                setConfirming(false);
                                onSaved?.();
                            },
                            onError: () => setConfirming(false),
                        })
                    }
                />
            </div>
        </Layout>
    );
}
