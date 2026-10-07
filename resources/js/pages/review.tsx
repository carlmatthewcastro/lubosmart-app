import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

export default function Review({
    application,
    applicant,
    profile,
    address,
    store,
    rider,
    documents,
    reviewer,
}: {
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
    applicant: { name: string; email: string; phone: string; email_verified_at: string | null };
    profile: Record<string, string> | null;
    address: Record<string, string> | null;
    store: { name: string; business_category: { name: string } | null } | null;
    rider: { vehicle_type: string; plate_number: string | null } | null;
    documents: { id: number; kind: string }[];
}) {
    const form = useForm({ decision: 'approved', reason: '' });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(route('reviews.update', application.id));
    };
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Reviews', href: route('reviews.index') },
                { title: applicant.name, href: route('reviews.show', application.id) },
            ]}
        >
            <Head title="Review application" />
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
                <h1 className="text-3xl font-semibold">{applicant.name}</h1>
                <p className="text-muted-foreground capitalize">
                    {application.requested_role} · {application.status}
                </p>
                <section className="bg-card grid gap-4 rounded-2xl border p-6 text-sm sm:grid-cols-2">
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
                        'Email verified': applicant.email_verified_at ? 'Yes' : 'No',
                        Birthday: profile?.birthday,
                        Sex: profile?.sex,
                        Address: address ? [address.line1, address.barangay, address.city, address.province, address.zip].join(', ') : null,
                        Business: application.business_name ?? store?.name,
                        'Line of business': store?.business_category?.name,
                        Vehicle: rider?.vehicle_type,
                        Plate: rider?.plate_number,
                    }).map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-muted-foreground text-sm">{label}</dt>
                            <dd className="mt-1">{value ?? '—'}</dd>
                        </div>
                    ))}
                </dl>
                <section className="bg-card rounded-2xl border p-6 shadow-sm shadow-black/[.02]">
                    <h2 className="font-semibold">Private documents</h2>
                    <ul className="mt-4 space-y-3">
                        {documents.map((document) => (
                            <li key={document.id}>
                                <a href={route('registration-documents.show', document.id)} className="text-sm underline">
                                    Download {document.kind.replaceAll('_', ' ')}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
                {application.status === 'submitted' && (
                    <form onSubmit={submit} className="bg-card grid gap-4 rounded-2xl border p-6 shadow-sm shadow-black/[.02]">
                        <Label htmlFor="decision">Decision</Label>
                        <select
                            id="decision"
                            className="bg-background h-10 rounded-md border px-3"
                            value={form.data.decision}
                            onChange={(event) => form.setData('decision', event.target.value)}
                        >
                            <option value="approved">Approve</option>
                            <option value="rejected">Request changes / reject</option>
                        </select>
                        <InputError message={form.errors.decision} />
                        <Label htmlFor="reason">Reason (required for rejection)</Label>
                        <textarea
                            id="reason"
                            className="bg-background min-h-28 rounded-md border p-3"
                            required={form.data.decision === 'rejected'}
                            maxLength={2000}
                            value={form.data.reason}
                            onChange={(event) => form.setData('reason', event.target.value)}
                        />
                        <InputError message={form.errors.reason} />
                        <Button disabled={form.processing}>{form.processing ? 'Saving…' : 'Save decision'}</Button>
                    </form>
                )}
            </div>
        </AppLayout>
    );
}
