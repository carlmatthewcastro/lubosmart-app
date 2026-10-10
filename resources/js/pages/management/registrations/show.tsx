import InputError from '@/components/input-error';
import { inputClass, roleLabel } from '@/components/marketplace-ui';
import { ReasonConfirmation } from '@/components/reason-confirmation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
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
    const { auth } = usePage<SharedData>().props;
    const override = auth.user.role === 'admin' && application.requested_role === 'courier';
    const [viewing, setViewing] = useState<string | null>(null);
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
                <h1 className="text-3xl font-semibold">{applicant.name}</h1>
                <p className="text-muted-foreground capitalize">
                    {roleLabel(application.requested_role)} · {application.status}
                </p>
                <section className="bg-card grid gap-4 rounded-2xl border p-6 text-sm sm:grid-cols-2">
                    {bankAccount && (
                        <div>
                            <p className="text-muted-foreground">Payout account</p>
                            <p className="mt-1 whitespace-pre-wrap">{bankAccount}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-muted-foreground">Application status</p>
                        <p className="mt-1 font-medium">
                            {application.status === 'submitted'
                                ? 'Awaiting review'
                                : application.status === 'rejected'
                                  ? 'Changes requested'
                                  : application.status}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="mt-1">{application.submitted_at ? new Date(application.submitted_at).toLocaleString('en-PH') : '—'}</p>
                    </div>
                    {reviewer && (
                        <div>
                            <p className="text-muted-foreground">Reviewed by</p>
                            <p className="mt-1">
                                {reviewer.name} · {application.reviewed_at ? new Date(application.reviewed_at).toLocaleString('en-PH') : '—'}
                            </p>
                        </div>
                    )}
                    {application.rejection_reason && (
                        <div className="sm:col-span-2">
                            <p className="text-muted-foreground">Requested changes</p>
                            <p className="mt-1">{application.rejection_reason}</p>
                        </div>
                    )}
                </section>
                <dl className="bg-card grid gap-4 rounded-2xl border p-6 shadow-sm shadow-black/[.02] sm:grid-cols-2">
                    {Object.entries({
                        Email: applicant.email,
                        Phone: applicant.phone,
                        'Email Verified': applicant.email_verified_at ? 'Yes' : 'No',
                        Birthday: profile?.birthday,
                        Age: profile?.age,
                        Sex: profile?.sex,
                        Address: address ? [address.line1, address.barangay, address.city, address.province, address.zip].join(', ') : null,
                        Business: application.business_name ?? store?.name,
                        'Line of business': store?.business_category?.name,
                        Vehicle: courier?.vehicle_type,
                        Plate: courier?.plate_number,
                    })
                        .filter(([label]) => {
                            if (['Business', 'Line of business'].includes(label))
                                return ['seller', 'sorting_center'].includes(application.requested_role);
                            if (['Vehicle', 'Plate'].includes(label)) return application.requested_role === 'courier';
                            return true;
                        })
                        .map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-muted-foreground text-sm">{label}</dt>
                                <dd className="mt-1">{value ?? '—'}</dd>
                            </div>
                        ))}
                </dl>
                <section className="bg-card rounded-2xl border p-6 shadow-sm shadow-black/[.02]">
                    <h2 className="font-semibold">Supporting Documents</h2>
                    <ul className="mt-4 space-y-3">
                        {documents.map((document) => (
                            <li key={document.id}>
                                <div className="flex flex-wrap gap-4">
                                    <button type="button" onClick={() => setViewing(document.url)} className="text-primary text-sm underline">
                                        View {document.kind.replaceAll('_', ' ')}
                                    </button>
                                    <a href={document.url} target="_blank" rel="noreferrer" className="text-sm underline">
                                        Open in a new tab
                                    </a>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="text-muted-foreground mt-4 text-xs">Document links expire after 5 minutes. Refresh this page for new links.</p>
                    {viewing && (
                        <div className="mt-5 space-y-3">
                            <button type="button" className="text-sm underline" onClick={() => setViewing(null)}>
                                Close viewer
                            </button>
                            <iframe src={viewing} title="Private registration document" className="h-[32rem] w-full rounded-xl border" />
                        </div>
                    )}
                </section>
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
                        {override && (
                            <p className="text-muted-foreground text-sm">
                                You are overriding this courier’s sorting center. Record the reason for your decision.
                            </p>
                        )}
                        <Label htmlFor="reason">Reason {override ? '(required for Admin override)' : '(required for rejection)'}</Label>
                        <select
                            id="reason"
                            className={inputClass}
                            aria-invalid={!!form.errors.reason}
                            aria-describedby={form.errors.reason ? 'review-reason-error' : undefined}
                            required={form.data.decision === 'rejected' || override}
                            value={form.data.reason}
                            onChange={(event) => form.setData('reason', event.target.value)}
                        >
                            <option value="">Select a Reason</option>
                            {(form.data.decision === 'approved'
                                ? ['Requirements verified and approved', 'Courier approval reviewed by admin']
                                : [
                                      'Missing or unreadable supporting documents',
                                      'Registration information needs correction',
                                      'Business category or permit needs verification',
                                      'Assigned sorting center needs correction',
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
                    required={form.data.decision === 'rejected' || override}
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
