import { secondaryClass } from '@/components/shared/marketplace-ui';
import { RegistrationProfile } from '@/components/shared/registration-profile';
import { SavedAccountDetails } from '@/components/shared/saved-account-details';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import Account from '@/pages/admin/account';
import Review from '@/pages/management/registrations/show';
import Conversation from '@/pages/support/show';
import { ArrowLeft, X } from 'lucide-react';
import { useEffect, useState, type ComponentProps } from 'react';
type Kind = 'account' | 'registration' | 'conversation';
type Details = ComponentProps<typeof Account> | ComponentProps<typeof Review> | ComponentProps<typeof Conversation>;
type RegistrationDetails = ComponentProps<typeof Review>;
export function InfoModal({
    kind,
    id,
    label,
    open: controlledOpen,
    onOpenChange,
    hideTrigger = false,
    initialSection = 'Personal information',
    onCloseAutoFocus,
    inline = false,
}: {
    kind: Kind;
    id: number;
    label: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    hideTrigger?: boolean;
    initialSection?: string;
    onCloseAutoFocus?: () => void;
    inline?: boolean;
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const [target, setTarget] = useState({ kind, id });
    const [data, setData] = useState<Details | null>(null);
    const [registrationDetails, setRegistrationDetails] = useState<RegistrationDetails | null>(null);
    const [error, setError] = useState('');
    const [pageUrl, setPageUrl] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        setData(null);
        setError('');
        setRegistrationDetails(null);
        if (!open) return;
        const controller = new AbortController();
        const path = target.kind === 'account' ? 'accounts' : target.kind === 'registration' ? 'reviews' : 'support';
        fetch(pageUrl ?? '/' + path + '/' + target.id, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
            credentials: 'same-origin',
            cache: 'no-store',
        })
            .then(async (response) => {
                if (!response.ok) throw new Error('Unable to load these details. Try again or check your access.');
                return response.json();
            })
            .then(async (payload) => {
                if (target.kind === 'account' && payload.applicationId) {
                    const response = await fetch('/reviews/' + payload.applicationId, {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                        credentials: 'same-origin',
                        cache: 'no-store',
                    });
                    if (!response.ok) throw new Error('Unable to load the registration details. Try again or check your access.');
                    const registration = await response.json();
                    if (!controller.signal.aborted) setRegistrationDetails(registration);
                }
                if (!controller.signal.aborted) setData(payload);
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(reason.message);
            });
        return () => controller.abort();
    }, [open, target.kind, target.id, attempt, pageUrl]);
    const toggle = (value: boolean) => {
        setInternalOpen(value);
        onOpenChange?.(value);
        setPageUrl(null);
        setTarget({ kind, id });
        setData(null);
        setRegistrationDetails(null);
        setError('');
    };
    const navigate = (kind: Kind, id: number) => {
        setTarget({ kind, id });
        setData(null);
        setError('');
    };
    const refresh = () => {
        setPageUrl(null);
        setData(null);
        setAttempt((value) => value + 1);
    };
    const body = (
        <div className="min-h-0 overflow-y-auto overscroll-contain">
            {target.kind !== kind && (
                <button
                    type="button"
                    className="text-primary m-4 inline-flex items-center gap-2 text-sm font-medium"
                    onClick={() => navigate(kind, id)}
                >
                    <ArrowLeft className="size-4" />
                    Back to Profile
                </button>
            )}
            {error ? (
                <div role="alert" className="space-y-4 p-6">
                    <p>{error}</p>
                    <button
                        type="button"
                        className={secondaryClass}
                        onClick={() => {
                            setError('');
                            refresh();
                        }}
                    >
                        Try Again
                    </button>
                </div>
            ) : !data ? (
                <div role="status" aria-label="Loading Details" className="space-y-4 p-6">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-48 w-full" />
                </div>
            ) : target.kind === 'account' ? (
                registrationDetails ? (
                    <RegistrationProfile
                        key={target.id}
                        details={registrationDetails}
                        accountDetails={data as ComponentProps<typeof Account>}
                        initialSection={initialSection}
                    />
                ) : (
                    <SavedAccountDetails key={target.id} details={data as ComponentProps<typeof Account>} initialSection={initialSection} />
                )
            ) : target.kind === 'conversation' ? (
                <Conversation
                    {...(data as ComponentProps<typeof Conversation>)}
                    embedded
                    onSaved={refresh}
                    onPageChange={(url) => {
                        setData(null);
                        setPageUrl(url);
                    }}
                />
            ) : (
                <Review {...(data as ComponentProps<typeof Review>)} embedded onSaved={refresh} />
            )}
        </div>
    );
    if (inline && !open) return null;
    if (inline)
        return (
            <section
                aria-labelledby="account-details-heading"
                className="workspace-card bg-card min-w-0 overflow-hidden rounded-2xl border xl:sticky xl:top-24"
            >
                <header className="from-accent/40 to-card flex items-start justify-between gap-4 border-b bg-linear-to-r p-5">
                    <div>
                        <h2 id="account-details-heading" tabIndex={-1} className="text-xl font-semibold">
                            Account details
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">Account information and registration records.</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close account details"
                        className={secondaryClass}
                        onClick={() => {
                            toggle(false);
                            onCloseAutoFocus?.();
                        }}
                    >
                        <X aria-hidden="true" className="size-4" />
                    </button>
                </header>
                {body}
            </section>
        );
    return (
        <>
            <Dialog open={open} onOpenChange={toggle}>
                {!hideTrigger && (
                    <DialogTrigger asChild>
                        <button type="button" className={secondaryClass}>
                            {label}
                        </button>
                    </DialogTrigger>
                )}
                <DialogContent
                    onCloseAutoFocus={
                        onCloseAutoFocus
                            ? (event) => {
                                  event.preventDefault();
                                  onCloseAutoFocus();
                              }
                            : undefined
                    }
                    className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden !p-0 sm:max-w-4xl"
                >
                    <DialogHeader className="border-primary/10 bg-accent/40 shrink-0 border-b px-6 py-5 pr-14 [overflow-wrap:anywhere]">
                        <DialogTitle>
                            {target.kind === 'account' ? 'Account Details' : target.kind === 'conversation' ? 'Conversation' : 'Registration Review'}
                        </DialogTitle>
                        <DialogDescription>
                            {target.kind === 'account'
                                ? 'Read-only account information, registration details and activity history.'
                                : target.kind === 'conversation'
                                  ? 'Messages and case actions in one place.'
                                  : 'Check submitted information and supporting documents.'}
                        </DialogDescription>
                    </DialogHeader>
                    {body}
                </DialogContent>
            </Dialog>
        </>
    );
}
