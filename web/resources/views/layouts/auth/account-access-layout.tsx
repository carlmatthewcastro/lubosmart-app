import AuthNotificationProvider from '@/components/auth/auth-notification-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Home from '@/pages/public/home';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import '../../../css/auth-reference.css';

export default function AccountAccessLayout({
    title,
    description,
    children,
    registering = false,
    recovery = false,
    hideBackLink = false,
    registrationDetails = false,
    verification = false,
    beforeHeading,
    compactLogin = false,
    compactRecovery = false,
    emailConfirmation = false,
}: {
    title: string;
    description: ReactNode;
    children: ReactNode;
    registering?: boolean;
    recovery?: boolean;
    hideBackLink?: boolean;
    registrationDetails?: boolean;
    verification?: boolean;
    beforeHeading?: ReactNode;
    compactLogin?: boolean;
    compactRecovery?: boolean;
    emailConfirmation?: boolean;
}) {
    const [dirty, setDirty] = useState(false);
    const leaving = useRef(false);
    const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
    const confirmTrigger = useRef<HTMLElement | null>(null);
    const askToLeave = (action: () => void) => {
        confirmTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setLeaveAction(() => action);
    };
    useEffect(() => {
        if (!registrationDetails || !dirty) return;
        const unload = (event: BeforeUnloadEvent) => {
            if (leaving.current || document.querySelector('.auth-reference-shell form[aria-busy="true"]')) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', unload);
        const remove = router.on('before', (event) => {
            if (event.detail.visit.method !== 'get' || leaving.current) return;
            event.preventDefault();
            const visit = event.detail.visit;
            askToLeave(() => {
                leaving.current = true;
                router.visit(visit.url);
            });
            return false;
        });
        return () => {
            window.removeEventListener('beforeunload', unload);
            remove();
        };
    }, [dirty, registrationDetails]);
    const close = () => {
        if (registrationDetails && dirty && !leaving.current) {
            askToLeave(() => {
                leaving.current = true;
                close();
            });
            return;
        }
        leaving.current = true;
        router.visit(route('home'), {
            onSuccess: () =>
                requestAnimationFrame(() => {
                    document.querySelector<HTMLAnchorElement>(`a[href="${route(registering ? 'register' : 'login')}"]`)?.focus();
                }),
        });
    };
    return (
        <>
            <Head title={title} />
            <div className="auth-landing-backdrop" inert aria-hidden="true">
                <Home backdrop />
            </div>
            <Dialog
                open
                onOpenChange={(open) => {
                    if (!open) close();
                }}
            >
                <DialogContent
                    className={`auth-reference-shell ${compactLogin ? 'auth-reference-login' : ''} ${compactRecovery ? 'auth-reference-recovery' : ''} ${emailConfirmation ? 'auth-reference-email-confirmation' : ''} ${registrationDetails ? 'auth-reference-details' : registering && !verification ? 'auth-reference-signup' : ''}`}
                    overlayClassName="auth-modal-overlay"
                    onPointerDownOutside={(event) => event.preventDefault()}
                    onCloseAutoFocus={(event) => event.preventDefault()}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        document.querySelector<HTMLElement>('.auth-reference-shell h1')?.focus();
                    }}
                >
                    <nav className="auth-reference-panel-nav" aria-label="Authentication">
                        {verification ? (
                            <>
                                <Link href={route('home')}>
                                    <ArrowLeft size={16} aria-hidden="true" />
                                    Back to home
                                </Link>
                                <Link href={route('logout')} method="post" as="button">
                                    Log out
                                </Link>
                            </>
                        ) : registrationDetails ? (
                            <Link href={route('register')}>
                                <ArrowLeft size={16} aria-hidden="true" />
                                Choose a different role
                            </Link>
                        ) : !hideBackLink ? (
                            <Link href={route(recovery ? 'login' : 'home')}>
                                <ArrowLeft size={16} aria-hidden="true" />
                                {recovery ? 'Back to sign in' : 'Back to home'}
                            </Link>
                        ) : null}
                    </nav>
                    <main id="main-content" className="auth-reference-panel" onChangeCapture={() => setDirty(true)}>
                        {beforeHeading}
                        <DialogTitle asChild>
                            <h1 tabIndex={-1}>{title}</h1>
                        </DialogTitle>
                        <DialogDescription asChild>
                            <p className="auth-reference-description">{description}</p>
                        </DialogDescription>
                        <AuthNotificationProvider>{children}</AuthNotificationProvider>
                        {!registering && !recovery && (
                            <p className="auth-reference-footer">
                                {compactLogin ? 'New here? ' : "Don't have an account? "}
                                <Link href={route('register')}>{compactLogin ? 'Create an account' : 'Sign up'}</Link>
                            </p>
                        )}
                    </main>
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!leaveAction}
                onOpenChange={(open) => {
                    if (!open) setLeaveAction(null);
                }}
            >
                <DialogContent
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        confirmTrigger.current?.focus();
                    }}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        document.querySelector<HTMLButtonElement>('[data-keep-registering]')?.focus();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Leave registration?</DialogTitle>
                        <DialogDescription>
                            Your entered details and selected documents will be lost. Stay to continue your registration.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button data-keep-registering variant="outline" onClick={() => setLeaveAction(null)}>
                            Keep editing
                        </Button>
                        <Button
                            onClick={() => {
                                const action = leaveAction;
                                setLeaveAction(null);
                                action?.();
                            }}
                        >
                            Leave registration
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
