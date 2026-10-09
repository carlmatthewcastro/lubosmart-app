import { secondaryClass } from '@/components/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import Account from '@/pages/admin/account';
import Review from '@/pages/review';
import Conversation from '@/pages/support/show';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState, type ComponentProps } from 'react';
type Kind = 'account' | 'registration' | 'conversation';
type Details = ComponentProps<typeof Account> | ComponentProps<typeof Review> | ComponentProps<typeof Conversation>;
export function InfoModal({ kind, id, label }: { kind: Kind; id: number; label: string }) {
    const [open, setOpen] = useState(false);
    const [target, setTarget] = useState({ kind, id });
    const [data, setData] = useState<Details | null>(null);
    const [error, setError] = useState('');
    const [pageUrl, setPageUrl] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
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
            .then((payload) => {
                if (!controller.signal.aborted) setData(payload);
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(reason.message);
            });
        return () => controller.abort();
    }, [open, target.kind, target.id, attempt, pageUrl]);
    const toggle = (value: boolean) => {
        setOpen(value);
        setPageUrl(null);
        setTarget({ kind, id });
        setData(null);
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
    return (
        <>
            <button type="button" className={secondaryClass} onClick={() => toggle(true)}>
                {label}
            </button>
            <Dialog open={open} onOpenChange={toggle}>
                <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden !p-0 sm:max-w-4xl">
                    <DialogHeader className="border-primary/10 bg-accent/40 border-b px-6 py-5 pr-14">
                        <DialogTitle>
                            {target.kind === 'account' ? 'Account Profile' : target.kind === 'conversation' ? 'Conversation' : 'Registration Review'}
                        </DialogTitle>
                        <DialogDescription>
                            {target.kind === 'account'
                                ? 'Profile, registration and access history.'
                                : target.kind === 'conversation'
                                  ? 'Messages and case actions in one place.'
                                  : 'Check submitted information and supporting documents.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[calc(90dvh-100px)] overflow-y-auto overscroll-contain">
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
                            <Account
                                onSaved={refresh}
                                {...(data as ComponentProps<typeof Account>)}
                                embedded
                                onViewRegistration={(id) => navigate('registration', id)}
                            />
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
                </DialogContent>
            </Dialog>
        </>
    );
}
