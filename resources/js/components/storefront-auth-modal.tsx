import AuthFeedback, { validateCredentials } from '@/components/auth-feedback';
import GoogleContinueButton from '@/components/google-continue-button';
import { buttonClass } from '@/components/marketplace-ui';
import RegistrationForm, { authInputClass, Password, type RegistrationRole } from '@/components/registration-form';
import type { SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle, X } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import '../../css/auth-preview.css';

type AuthTab = 'login' | 'register';
type PublicRole = RegistrationRole;

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

type GoogleRegistrationForm = {
    intent: 'login';
    google?: string;
};

export default function AuthModal({ initialTab, initialRole, onClose }: { initialTab: AuthTab; initialRole: PublicRole; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
    const loginEmailRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLElement>(null);
    const focusTabOnChange = useRef(false);
    const { errors: sharedErrors, status } = usePage<SharedData>().props;
    const {
        data: loginData,
        setData: setLoginData,
        post: postLogin,
        processing: loginProcessing,
        errors: loginErrors,
        reset: resetLogin,
        clearErrors: clearLoginErrors,
        setError: setLoginError,
    } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });
    const { post: postGoogle, processing: googleProcessing } = useForm<GoogleRegistrationForm>({
        intent: 'login',
    });

    useEffect(() => {
        document.body.classList.add('auth-modal-open');
        const previousFocus = document.activeElement;

        return () => {
            document.body.classList.remove('auth-modal-open');
            if (previousFocus instanceof HTMLElement) previousFocus.focus();
        };
    }, []);

    useEffect(() => {
        if (focusTabOnChange.current) {
            focusTabOnChange.current = false;
            dialogRef.current?.querySelector<HTMLButtonElement>(`#auth-${activeTab}-tab`)?.focus();
            return;
        }
        (activeTab === 'login' ? loginEmailRef.current : dialogRef.current?.querySelector<HTMLInputElement>('#auth-register-email'))?.focus();
    }, [activeTab]);

    const switchTab = (tab: AuthTab) => {
        focusTabOnChange.current = false;
        setActiveTab(tab);
        window.requestAnimationFrame(() => {
            (tab === 'login' ? loginEmailRef.current : dialogRef.current?.querySelector<HTMLInputElement>('#auth-register-email'))?.focus();
        });
    };

    const handleTabNavigation = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const tab: AuthTab = event.key === 'Home' ? 'login' : event.key === 'End' ? 'register' : activeTab === 'login' ? 'register' : 'login';
        focusTabOnChange.current = tab !== activeTab;
        setActiveTab(tab);
        if (tab === activeTab) dialogRef.current?.querySelector<HTMLButtonElement>(`#auth-${tab}-tab`)?.focus();
    };

    const submitLogin = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loginProcessing || googleProcessing) return;
        const errors = validateCredentials(loginData, !!loginEmailRef.current?.validity.typeMismatch);
        clearLoginErrors();
        if (Object.keys(errors).length) {
            if (errors.email) setLoginError('email', errors.email);
            if (errors.password) setLoginError('password', errors.password);
            const id = errors.email ? '#auth-login-email' : '#auth-login-password';
            requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>(id)?.focus());
            return;
        }
        postLogin(route('login'), {
            onError: (errors) => {
                const id = errors.email ? '#auth-login-email' : '#auth-login-password';
                requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>(id)?.focus());
            },
            onFinish: () => resetLogin('password'),
        });
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Escape') {
            onClose();
        }
        if (event.key === 'Tab') {
            const elements = Array.from(
                dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]') ?? [],
            ).filter((element) => element.offsetParent !== null && element.tabIndex >= 0 && !element.hasAttribute('disabled'));
            const first = elements[0];
            const last = elements[elements.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        }
    };

    return (
        <div className="auth-modal is-open" onKeyDown={handleKeyDown}>
            <button className="auth-modal__backdrop" type="button" tabIndex={-1} aria-label="Close authentication dialog" onClick={onClose} />
            <section ref={dialogRef} className="auth-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
                <header className="auth-modal__header">
                    <button className="auth-modal__close" type="button" aria-label="Close dialog" onClick={onClose}>
                        <X className="size-4" strokeWidth={2} aria-hidden="true" />
                    </button>
                    <p className="auth-modal__brand">
                        <img src="/logo.svg" className="size-10" alt="" />
                        <span>LubosMart</span>
                    </p>
                    <h2 className="auth-modal__heading" id="auth-modal-title">
                        {activeTab === 'login' ? 'Welcome back' : 'Join LubosMart'}
                    </h2>
                    <div className="auth-modal__tabs" role="tablist" aria-label="Account access" onKeyDown={handleTabNavigation}>
                        <button
                            className="auth-modal__tab"
                            id="auth-login-tab"
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'login'}
                            tabIndex={activeTab === 'login' ? 0 : -1}
                            aria-controls="auth-login-panel"
                            onClick={() => switchTab('login')}
                        >
                            Log in
                        </button>
                        <button
                            className="auth-modal__tab"
                            id="auth-register-tab"
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'register'}
                            tabIndex={activeTab === 'register' ? 0 : -1}
                            aria-controls="auth-register-panel"
                            onClick={() => switchTab('register')}
                        >
                            Create account
                        </button>
                    </div>
                </header>

                <div className="auth-modal__content" style={{ backgroundColor: 'var(--card)', color: 'var(--card-foreground)' }}>
                    {status && (
                        <p role="status" className="auth-modal__hint">
                            {status}
                        </p>
                    )}
                    <div id="auth-login-panel" role="tabpanel" aria-labelledby="auth-login-tab" hidden={activeTab !== 'login'}>
                        <form className="space-y-5" onSubmit={submitLogin} aria-busy={loginProcessing || googleProcessing} noValidate>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="auth-login-email">
                                    Email address
                                </label>
                                <input
                                    ref={loginEmailRef}
                                    className={authInputClass}
                                    id="auth-login-email"
                                    type="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    name="email"
                                    maxLength={160}
                                    required
                                    disabled={loginProcessing || googleProcessing}
                                    aria-invalid={!!loginErrors.email}
                                    aria-describedby={loginErrors.email ? 'auth-login-email-error' : undefined}
                                    value={loginData.email}
                                    onChange={(event) => {
                                        setLoginData('email', event.target.value);
                                        clearLoginErrors('email');
                                    }}
                                />
                                <AuthFeedback id="auth-login-email-error" message={loginErrors.email} />
                            </div>
                            <div className="space-y-2">
                                <Password
                                    label="Password"
                                    id="auth-login-password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    disabled={loginProcessing || googleProcessing}
                                    value={loginData.password}
                                    onChange={(event) => {
                                        setLoginData('password', event.target.value);
                                        clearLoginErrors('password');
                                    }}
                                    error={loginErrors.password}
                                />
                                <div className="text-right">
                                    <Link href={route('password.request')} className="text-primary text-xs hover:underline">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>
                            <label
                                className="border-primary/10 bg-accent/30 hover:bg-accent/60 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors"
                                htmlFor="auth-remember"
                            >
                                <input
                                    id="auth-remember"
                                    type="checkbox"
                                    className="accent-primary size-4 rounded"
                                    disabled={loginProcessing || googleProcessing}
                                    checked={loginData.remember}
                                    onChange={(event) => setLoginData('remember', event.target.checked)}
                                />
                                <span className="flex-1">
                                    <span className="block font-medium">Stay signed in</span>
                                    <span className="text-muted-foreground block text-xs">Use on your personal device.</span>
                                </span>
                            </label>
                            <button className={`${buttonClass} w-full`} type="submit" disabled={loginProcessing || googleProcessing}>
                                {loginProcessing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                                {loginProcessing ? 'Logging in…' : 'Log in'}
                            </button>
                            <div className="text-muted-foreground flex items-center gap-3 text-xs">
                                <span className="bg-border h-px flex-1" />
                                or
                                <span className="bg-border h-px flex-1" />
                            </div>
                            <GoogleContinueButton
                                processing={googleProcessing}
                                disabled={googleProcessing || loginProcessing}
                                onClick={() => postGoogle(route('auth.google.redirect'))}
                            />
                            <AuthFeedback message={sharedErrors?.google} />
                        </form>
                    </div>

                    <div id="auth-register-panel" role="tabpanel" aria-labelledby="auth-register-tab" hidden={activeTab !== 'register'}>
                        <RegistrationForm initialRole={initialRole} compact />
                    </div>
                </div>
            </section>
        </div>
    );
}
