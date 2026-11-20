import { AccountHistory } from '@/components/shared/account-history';
import { Badge, roleLabel } from '@/components/shared/marketplace-ui';
import { useInitials } from '@/hooks/use-initials';
import type Account from '@/pages/admin/account';
import type Review from '@/pages/management/registrations/show';
import { BriefcaseBusiness, ClipboardCheck, Clock3, Database, Files, History, UserRound } from 'lucide-react';
import { useState, type ComponentProps } from 'react';

export function RegistrationProfile({
    details,
    accountDetails,
    initialSection = 'Personal information',
}: {
    details: ComponentProps<typeof Review>;
    accountDetails?: ComponentProps<typeof Account>;
    initialSection?: string;
}) {
    const sectionIcons = {
        'Personal information': UserRound,
        'Role details': BriefcaseBusiness,
        'Supporting documents': Files,
        'Registration timeline': Clock3,
        'Saved account information': Database,
        'Activity history': History,
    };
    const formatDate = (value?: string) => {
        if (!value) return undefined;
        const date = new Date(value.length === 10 ? value + 'T00:00:00' : value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const { application, applicant, profile, address, store, rider, documents, reviewer } = details;
    const getInitials = useInitials();
    const [section, setSection] = useState(initialSection);
    const sections = [
        'Personal information',
        ...(application.requested_role === 'buyer' ? [] : ['Role details']),
        'Supporting documents',
        'Registration timeline',
        ...(accountDetails ? ['Saved account information', 'Activity history'] : []),
    ];
    const personal = [
        ['Full name', applicant.name],
        ['First name', profile?.first_name],
        ['Middle initial (optional)', profile?.middle_initial],
        ['Last name', profile?.last_name],
        ['Email', applicant.email],
        ['Phone', applicant.phone],
        ['Email verified', applicant.email_verified_at ? 'Yes' : 'No'],
        ...(['buyer', 'rider'].includes(application.requested_role) || profile?.birthday
            ? [
                  ['Birthday', formatDate(profile?.birthday)],
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
        application.requested_role === 'rider'
            ? [
                  ['Vehicle', rider?.vehicle_type],
                  ['Plate number', rider?.plate_number],
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
        <div className="space-y-6 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        aria-hidden="true"
                        className="bg-accent text-primary flex size-12 shrink-0 items-center justify-center rounded-full font-semibold"
                    >
                        {getInitials(accountDetails?.account.name ?? applicant.name)}
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-xl font-semibold [overflow-wrap:anywhere]">{accountDetails?.account.name ?? applicant.name}</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {roleLabel(accountDetails ? accountDetails.account.role : application.requested_role)} account
                        </p>
                        {accountDetails?.account.created_at && (
                            <p className="text-muted-foreground mt-1 text-xs">Registered {formatDate(accountDetails.account.created_at)}</p>
                        )}
                        <div className="mt-2 flex items-start gap-2">
                            <ClipboardCheck aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                    Registration:{' '}
                                    <span className="text-foreground font-medium">
                                        {application.status === 'approved'
                                            ? 'Approved'
                                            : application.status === 'rejected'
                                              ? 'Changes requested'
                                              : application.status === 'submitted'
                                                ? 'Awaiting review'
                                                : 'Not yet submitted'}
                                    </span>
                                </p>
                                {application.rejection_reason && (
                                    <p className="mt-2 text-sm [overflow-wrap:anywhere]">{application.rejection_reason}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <Badge
                    status={accountDetails?.account.status ?? application.status}
                    label={
                        !accountDetails && application.status === 'submitted'
                            ? 'Awaiting review'
                            : !accountDetails && application.status === 'draft'
                              ? 'Not yet submitted'
                              : undefined
                    }
                />
            </div>
            <div className="grid items-start gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
                <nav
                    aria-label="Registration details sections"
                    className="bg-muted/40 flex min-w-0 gap-1 overflow-x-auto rounded-2xl p-2 md:sticky md:top-0 md:flex-col"
                >
                    {sections.map((label) => {
                        const Icon = sectionIcons[label as keyof typeof sectionIcons];
                        return (
                            <button
                                key={label}
                                type="button"
                                aria-pressed={section === label}
                                onClick={() => setSection(label)}
                                className={`focus-visible:ring-ring flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium focus-visible:ring-2 focus-visible:outline-none ${section === label ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}`}
                            >
                                <Icon aria-hidden="true" className="size-4 shrink-0" />
                                <span>{label === 'Saved account information' ? 'Saved account' : label}</span>
                            </button>
                        );
                    })}
                </nav>
                <section aria-label={section} className="bg-card min-w-0 rounded-2xl border p-4 sm:p-5">
                    <h3 className="border-b pb-4 text-lg font-semibold">{section}</h3>
                    {['Personal information', 'Role details'].includes(section) && (
                        <dl className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                            {(section === 'Personal information' ? personal : roleDetails).map(([label, value]) => (
                                <div key={label} className={label === 'Address' ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
                                    <dt className="text-muted-foreground text-xs sm:text-sm">{label}</dt>
                                    <dd className="mt-2 text-sm leading-relaxed font-medium [overflow-wrap:anywhere] whitespace-pre-wrap sm:text-base">
                                        {value === '' || value == null ? 'Not provided' : value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}
                    {section === 'Activity history' && accountDetails && <AccountHistory history={accountDetails.history} />}
                    {section === 'Saved account information' && accountDetails && (
                        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                            {[
                                ['Name', accountDetails.account.name],
                                ['Email', accountDetails.account.email],
                                ['Phone', accountDetails.account.phone],
                                ['Account role', roleLabel(accountDetails.account.role)],
                                ['Email verified', accountDetails.account.email_verified_at ? 'Yes' : 'No'],
                                ...(accountDetails.account.role === 'seller'
                                    ? [
                                          ['Store', accountDetails.store?.name],
                                          ['Store status', accountDetails.store?.status],
                                      ]
                                    : []),
                                ...(accountDetails.account.role === 'rider'
                                    ? [
                                          ['Assigned logistics center', accountDetails.assignedCenter],
                                          ['Vehicle', accountDetails.rider?.vehicle_type],
                                          ['Plate number', accountDetails.rider?.plate_number],
                                      ]
                                    : []),
                                ...(accountDetails.account.role === 'logistics'
                                    ? [['Logistics companies', accountDetails.centers?.map((center) => center.name).join(', ')]]
                                    : []),
                                [
                                    'Address',
                                    accountDetails.address
                                        ? [
                                              accountDetails.address.line1,
                                              accountDetails.address.barangay,
                                              accountDetails.address.city,
                                              accountDetails.address.province,
                                              accountDetails.address.zip,
                                          ]
                                              .filter(Boolean)
                                              .join(', ')
                                        : null,
                                ],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-muted-foreground text-xs">{label}</dt>
                                    <dd className="mt-2 text-sm leading-relaxed font-medium [overflow-wrap:anywhere] sm:text-base">
                                        {value || 'Not provided'}
                                    </dd>
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
