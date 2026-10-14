import { Badge, roleLabel } from '@/components/shared/marketplace-ui';
import { useInitials } from '@/hooks/use-initials';
import type Review from '@/pages/management/registrations/show';
import { useState, type ComponentProps } from 'react';

export function RegistrationProfile({ details }: { details: ComponentProps<typeof Review> }) {
    const { application, applicant, profile, address, store, courier, documents, reviewer } = details;
    const getInitials = useInitials();
    const [section, setSection] = useState('Personal information');
    const sections = [
        'Personal information',
        ...(application.requested_role === 'buyer' ? [] : ['Role details']),
        'Supporting documents',
        'Registration timeline',
    ];
    const personal = [
        ['Full name', applicant.name],
        ['First name', profile?.first_name],
        ['Middle initial (optional)', profile?.middle_initial],
        ['Last name', profile?.last_name],
        ['Email', applicant.email],
        ['Phone', applicant.phone],
        ['Email verified', applicant.email_verified_at ? 'Yes' : 'No'],
        ...(['buyer', 'courier'].includes(application.requested_role) || profile?.birthday
            ? [
                  ['Birthday', profile?.birthday],
                  ['Age', profile?.age],
              ]
            : []),
        [
            'Sex',
            profile?.sex === 'female'
                ? 'Female'
                : profile?.sex === 'male'
                  ? 'Male'
                  : profile?.sex === 'prefer_not_to_say'
                    ? 'Prefer not to say'
                    : null,
        ],
        ...(address || application.requested_role !== 'buyer'
            ? [
                  [
                      'Address',
                      address ? [address.line1, address.barangay, address.city, address.province, address.zip].filter(Boolean).join(', ') : null,
                  ],
              ]
            : []),
    ];
    const roleDetails =
        application.requested_role === 'courier'
            ? [
                  ['Vehicle', courier?.vehicle_type],
                  ['Plate number', courier?.plate_number],
              ]
            : [
                  ['Business name', application.business_name ?? store?.name],
                  ...(application.requested_role === 'seller'
                      ? [
                            ['Seller type', application.seller_type?.replaceAll('_', ' ')],
                            ['TIN', application.tin],
                            ['Line of business', store?.business_category?.name],
                        ]
                      : [
                            ['SEC number', application.sec_number],
                            ['Position', application.position],
                            ['Service regions', (application.service_region_names ?? application.service_regions)?.join(', ')],
                            ['TIN', application.tin],
                        ]),
              ];
    const milestones = [
        { label: 'Email verified', date: applicant.email_verified_at },
        { label: 'Application submitted', date: application.submitted_at },
        { label: 'Reviewed' + (reviewer ? ' by ' + reviewer.name : ''), date: application.reviewed_at },
    ];
    return (
        <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-accent text-primary flex size-12 shrink-0 items-center justify-center rounded-full font-semibold">
                        {getInitials(applicant.name)}
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-xl font-semibold break-words">{applicant.name}</h2>
                        <p className="text-muted-foreground mt-1 text-sm">{roleLabel(application.requested_role)} account</p>
                    </div>
                </div>
                <Badge
                    status={application.status}
                    label={application.status === 'submitted' ? 'Awaiting review' : application.status === 'draft' ? 'Not yet submitted' : undefined}
                />
            </div>
            <div className="bg-accent/40 rounded-xl border p-4">
                <h3 className="text-sm font-semibold">Registration status</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                    {application.status === 'approved'
                        ? 'Registration reviewed and approved.'
                        : application.status === 'rejected'
                          ? 'Changes requested before approval.'
                          : application.status === 'submitted'
                            ? 'Submitted information and documents are awaiting review.'
                            : 'The applicant has not submitted this registration yet.'}
                </p>
                {application.rejection_reason && <p className="mt-2 text-sm break-words">{application.rejection_reason}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <nav aria-label="Registration details sections" className="flex flex-wrap gap-2 md:flex-col">
                    {sections.map((label) => (
                        <button
                            key={label}
                            type="button"
                            aria-pressed={section === label}
                            onClick={() => setSection(label)}
                            className={`focus-visible:ring-ring min-h-11 rounded-xl px-3 py-3 text-left text-xs font-medium focus-visible:ring-2 focus-visible:outline-none ${section === label ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
                <section aria-label={section} className="min-w-0 rounded-xl border p-4 sm:p-5">
                    <h3 className="font-semibold">{section}</h3>
                    {['Personal information', 'Role details'].includes(section) && (
                        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                            {(section === 'Personal information' ? personal : roleDetails).map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-muted-foreground text-xs">{label}</dt>
                                    <dd className="mt-1 text-sm font-medium break-words whitespace-pre-wrap">{value || 'Not provided'}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                    {section === 'Supporting documents' && (
                        <div className="mt-4">
                            {documents.length ? (
                                <ul className="divide-y">
                                    {documents.map((document) => (
                                        <li key={document.id} className="py-3">
                                            <a
                                                href={document.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded text-sm font-medium underline focus-visible:ring-2"
                                            >
                                                View {document.kind.replaceAll('_', ' ')}
                                                <span className="sr-only"> (opens in a new tab)</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">No supporting documents uploaded.</p>
                            )}
                            <p className="text-muted-foreground mt-3 text-xs">
                                Private document links expire after 5 minutes. Reopen details for fresh links.
                            </p>
                        </div>
                    )}
                    {section === 'Registration timeline' && (
                        <ol className="mt-4 space-y-5">
                            {milestones.map((item) => (
                                <li key={item.label} className="border-primary/20 border-l-2 pl-4">
                                    <p className="text-sm font-medium">{item.label}</p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {item.date ? new Date(item.date).toLocaleString('en-PH') : 'Not yet completed'}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>
        </div>
    );
}
