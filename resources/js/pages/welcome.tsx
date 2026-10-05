import { Head, useForm, usePage } from '@inertiajs/react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import type { SharedData } from '@/types';
import '../../css/auth-preview.css';

type AuthTab = 'login' | 'register';
type PublicRole = 'buyer' | 'seller' | 'rider';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface RegistrationForm {
    name: string;
    email: string;
    role: PublicRole;
    store_name: string;
    store_description: string;
    password: string;
    password_confirmation: string;
}

function AuthModal({
    initialTab,
    initialRole,
    onClose,
}: {
    initialTab: AuthTab;
    initialRole: PublicRole;
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
    const loginEmailRef = useRef<HTMLInputElement>(null);
    const registerNameRef = useRef<HTMLInputElement>(null);
    const { data: loginData, setData: setLoginData, post: postLogin, processing: loginProcessing, errors: loginErrors, reset: resetLogin } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });
    const {
        data: registrationData,
        setData: setRegistrationData,
        post: postRegistration,
        processing: registrationProcessing,
        errors: registrationErrors,
        reset: resetRegistration,
        clearErrors: clearRegistrationErrors,
    } = useForm<RegistrationForm>({
        name: '',
        email: '',
        role: initialRole,
        store_name: '',
        store_description: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        document.body.classList.add('auth-modal-open');
        (activeTab === 'login' ? loginEmailRef.current : registerNameRef.current)?.focus();

        return () => document.body.classList.remove('auth-modal-open');
    }, []);

    const switchTab = (tab: AuthTab) => {
        setActiveTab(tab);
        clearRegistrationErrors();
        window.requestAnimationFrame(() => {
            (tab === 'login' ? loginEmailRef.current : registerNameRef.current)?.focus();
        });
    };

    const submitLogin = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        postLogin(route('login'), {
            onFinish: () => resetLogin('password'),
        });
    };

    const submitRegistration = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (registrationData.password !== registrationData.password_confirmation) {
            return;
        }

        postRegistration(route('register'), {
            onFinish: () => resetRegistration('password', 'password_confirmation'),
        });
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="auth-modal is-open" onKeyDown={handleKeyDown}>
            <button className="auth-modal__backdrop" type="button" aria-label="Close authentication dialog" onClick={onClose} />
            <section className="auth-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
                <header className="auth-modal__header">
                    <button className="auth-modal__close" type="button" aria-label="Close dialog" onClick={onClose}>
                        <span aria-hidden="true">&times;</span>
                    </button>
                    <p className="auth-modal__brand">
                        <span className="auth-modal__brand-mark" aria-hidden="true">L</span>
                        <span>LubosMart</span>
                    </p>
                    <h2 className="auth-modal__heading" id="auth-modal-title">
                        {activeTab === 'login' ? 'Welcome back' : 'Join LubosMart'}
                    </h2>
                    <p className="auth-modal__intro">
                        {activeTab === 'login' ? 'Log in to continue to your account.' : 'Create an account and shop or sell with confidence.'}
                    </p>
                    <div className="auth-modal__tabs" role="tablist" aria-label="Account access">
                        <button
                            className="auth-modal__tab"
                            id="auth-login-tab"
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'login'}
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
                            aria-controls="auth-register-panel"
                            onClick={() => switchTab('register')}
                        >
                            Create account
                        </button>
                    </div>
                </header>

                <div className="auth-modal__content">
                    <div id="auth-login-panel" role="tabpanel" aria-labelledby="auth-login-tab" hidden={activeTab !== 'login'}>
                        <form className="auth-modal__form" onSubmit={submitLogin}>
                            <div className="auth-modal__field-group">
                                <label className="auth-modal__label" htmlFor="auth-login-email">Email address</label>
                                <input
                                    ref={loginEmailRef}
                                    className="auth-modal__field"
                                    id="auth-login-email"
                                    type="email"
                                    autoComplete="email"
                                    maxLength={160}
                                    required
                                    value={loginData.email}
                                    onChange={(event) => setLoginData('email', event.target.value)}
                                    placeholder="you@example.com"
                                />
                                {loginErrors.email && <p className="auth-modal__error">{loginErrors.email}</p>}
                            </div>
                            <div className="auth-modal__field-group">
                                <label className="auth-modal__label" htmlFor="auth-login-password">Password</label>
                                <input
                                    className="auth-modal__field"
                                    id="auth-login-password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={loginData.password}
                                    onChange={(event) => setLoginData('password', event.target.value)}
                                />
                                {loginErrors.password && <p className="auth-modal__error">{loginErrors.password}</p>}
                            </div>
                            <label className="auth-modal__remember" htmlFor="auth-remember">
                                <input
                                    id="auth-remember"
                                    type="checkbox"
                                    checked={loginData.remember}
                                    onChange={(event) => setLoginData('remember', event.target.checked)}
                                />
                                <span>Remember me</span>
                            </label>
                            <button className="auth-modal__button" type="submit" disabled={loginProcessing}>
                                {loginProcessing ? 'Logging in…' : 'Log in'}
                            </button>
                            <p className="auth-modal__footer">
                                <a href={route('password.request')}>Forgot your password?</a>
                            </p>
                        </form>
                    </div>

                    <div id="auth-register-panel" role="tabpanel" aria-labelledby="auth-register-tab" hidden={activeTab !== 'register'}>
                        <form className="auth-modal__form" onSubmit={submitRegistration}>
                            <div className="auth-modal__field-group">
                                <label className="auth-modal__label" htmlFor="auth-register-name">Full name</label>
                                <input
                                    ref={registerNameRef}
                                    className="auth-modal__field"
                                    id="auth-register-name"
                                    type="text"
                                    autoComplete="name"
                                    maxLength={160}
                                    required
                                    value={registrationData.name}
                                    onChange={(event) => setRegistrationData('name', event.target.value)}
                                    placeholder="Your full name"
                                />
                                {registrationErrors.name && <p className="auth-modal__error">{registrationErrors.name}</p>}
                            </div>
                            <div className="auth-modal__field-group">
                                <label className="auth-modal__label" htmlFor="auth-register-email">Email address</label>
                                <input
                                    className="auth-modal__field"
                                    id="auth-register-email"
                                    type="email"
                                    autoComplete="email"
                                    maxLength={160}
                                    required
                                    value={registrationData.email}
                                    onChange={(event) => setRegistrationData('email', event.target.value)}
                                    placeholder="you@example.com"
                                />
                                {registrationErrors.email && <p className="auth-modal__error">{registrationErrors.email}</p>}
                            </div>
                            <div className="auth-modal__field-group">
                                <label className="auth-modal__label" htmlFor="auth-register-role">Account type</label>
                                <select
                                    className="auth-modal__select"
                                    id="auth-register-role"
                                    required
                                    value={registrationData.role}
                                    onChange={(event) => setRegistrationData('role', event.target.value as PublicRole)}
                                >
                                    <option value="buyer">Buyer</option>
                                    <option value="seller">Seller</option>
                                    <option value="rider">Rider</option>
                                </select>
                                {registrationErrors.role && <p className="auth-modal__error">{registrationErrors.role}</p>}
                            </div>
                            {registrationData.role === 'seller' && (
                                <div className="auth-modal__seller-fields">
                                    <div className="auth-modal__field-group">
                                        <label className="auth-modal__label" htmlFor="auth-store-name">Store name</label>
                                        <input
                                            className="auth-modal__field"
                                            id="auth-store-name"
                                            type="text"
                                            autoComplete="organization"
                                            maxLength={160}
                                            required
                                            value={registrationData.store_name}
                                            onChange={(event) => setRegistrationData('store_name', event.target.value)}
                                            placeholder="Your store name"
                                        />
                                        {registrationErrors.store_name && <p className="auth-modal__error">{registrationErrors.store_name}</p>}
                                    </div>
                                    <div className="auth-modal__field-group">
                                        <label className="auth-modal__label" htmlFor="auth-store-description">Store description</label>
                                        <textarea
                                            className="auth-modal__textarea"
                                            id="auth-store-description"
                                            required
                                            value={registrationData.store_description}
                                            onChange={(event) => setRegistrationData('store_description', event.target.value)}
                                            placeholder="Tell customers what your store offers"
                                        />
                                        {registrationErrors.store_description && <p className="auth-modal__error">{registrationErrors.store_description}</p>}
                                    </div>
                                    <p className="auth-modal__hint">Seller stores are reviewed before they can start selling.</p>
                                </div>
                            )}
                            <div className="auth-modal__field-group">
                                <label className="auth-modal__label" htmlFor="auth-register-password">Password</label>
                                <input
                                    className="auth-modal__field"
                                    id="auth-register-password"
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    value={registrationData.password}
                                    onChange={(event) => setRegistrationData('password', event.target.value)}
                                />
                                {registrationErrors.password && <p className="auth-modal__error">{registrationErrors.password}</p>}
                            </div>
                            <div className="auth-modal__field-group">
                                <label className="auth-modal__label" htmlFor="auth-register-password-confirmation">Confirm password</label>
                                <input
                                    className="auth-modal__field"
                                    id="auth-register-password-confirmation"
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    value={registrationData.password_confirmation}
                                    onChange={(event) => setRegistrationData('password_confirmation', event.target.value)}
                                />
                                {registrationData.password_confirmation && registrationData.password !== registrationData.password_confirmation && (
                                    <p className="auth-modal__error">The passwords do not match.</p>
                                )}
                            </div>
                            <button
                                className="auth-modal__button auth-modal__button--accent"
                                type="submit"
                                disabled={registrationProcessing || registrationData.password !== registrationData.password_confirmation}
                            >
                                {registrationProcessing ? 'Creating account…' : 'Create account'}
                            </button>
                            <p className="auth-modal__footer">Seller accounts begin with a pending store review.</p>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const [modalTab, setModalTab] = useState<AuthTab | null>(null);
    const [initialRole, setInitialRole] = useState<PublicRole>('buyer');

    const openRegistration = (role: PublicRole = 'buyer') => {
        setInitialRole(role);
        setModalTab('register');
    };

    return (
        <>
            <Head title="Home">
                <meta name="description" content="Discover local finds, support neighborhood sellers, and shop with LubosMart." />
            </Head>
            <main className="storefront">
                <header className="storefront__header">
                    <a className="storefront__brand" href="/" aria-label="LubosMart home">
                        <span className="storefront__brand-mark">L</span>
                        <span>LubosMart</span>
                    </a>
                    <nav className="storefront__nav" aria-label="Main navigation">
                        <a className="storefront__nav-link" href="#shop-categories">Discover</a>
                        <a className="storefront__nav-link" href="#how-it-works">How it works</a>
                        {auth.user ? (
                            <a className="storefront__button storefront__button--outline" href={route('dashboard')}>Dashboard</a>
                        ) : (
                            <>
                                <button className="storefront__nav-link" type="button" onClick={() => setModalTab('login')}>Log in</button>
                                <button className="storefront__button storefront__button--small" type="button" onClick={() => setModalTab('register')}>Join LubosMart</button>
                            </>
                        )}
                    </nav>
                </header>

                <section className="storefront__hero">
                    <div className="storefront__hero-content">
                        <span className="storefront__eyebrow"><span /> YOUR LOCAL MARKETPLACE</span>
                        <h1>Good things,<br />closer to <em>home.</em></h1>
                        <p className="storefront__hero-copy">
                            Discover neighborhood finds, support independent sellers, and get what you need from the people who know your community best.
                        </p>
                        <div className="storefront__actions">
                            <button className="storefront__button" type="button" onClick={() => setModalTab('register')}>
                                Explore the marketplace <span aria-hidden="true">→</span>
                            </button>
                            <button className="storefront__text-button" type="button" onClick={() => openRegistration('seller')}>
                                Start selling <span aria-hidden="true">↗</span>
                            </button>
                        </div>
                        <div className="storefront__trust">
                            <span className="storefront__trust-icon" aria-hidden="true">✓</span>
                            <span>Local sellers. Real community. Smarter shopping.</span>
                        </div>
                    </div>
                    <div className="storefront__hero-art" aria-hidden="true">
                        <div className="storefront__sun" />
                        <div className="storefront__art-card storefront__art-card--main">
                            <span className="storefront__art-label">MADE NEAR YOU</span>
                            <div className="storefront__product-art">
                                <span className="storefront__product-leaf storefront__product-leaf--one" />
                                <span className="storefront__product-leaf storefront__product-leaf--two" />
                                <span className="storefront__product-pot" />
                            </div>
                            <div className="storefront__product-caption"><span>Handmade for home</span><strong>Locally loved</strong></div>
                        </div>
                        <div className="storefront__floating-note"><span>✦</span> Thoughtfully local</div>
                        <div className="storefront__art-orbit storefront__art-orbit--one" />
                        <div className="storefront__art-orbit storefront__art-orbit--two" />
                    </div>
                    <div className="storefront__hero-wash" />
                </section>

                <section className="storefront__categories" id="shop-categories">
                    <div className="storefront__section-heading">
                        <span className="storefront__eyebrow storefront__eyebrow--center">FIND YOUR NEXT FAVORITE</span>
                        <h2>A little something for every day.</h2>
                        <p>Explore the kinds of local finds waiting for you on LubosMart.</p>
                    </div>
                    <div className="storefront__category-grid">
                        <button className="storefront__category-card storefront__category-card--produce" type="button" onClick={() => setModalTab('register')}>
                            <span className="storefront__category-art" aria-hidden="true">✿</span>
                            <span className="storefront__category-name">Fresh &amp; local</span>
                            <span className="storefront__category-caption">Good things grown nearby</span>
                            <span className="storefront__category-arrow" aria-hidden="true">↗</span>
                        </button>
                        <button className="storefront__category-card storefront__category-card--home" type="button" onClick={() => setModalTab('register')}>
                            <span className="storefront__category-art" aria-hidden="true">⌂</span>
                            <span className="storefront__category-name">Home &amp; handmade</span>
                            <span className="storefront__category-caption">Made with a personal touch</span>
                            <span className="storefront__category-arrow" aria-hidden="true">↗</span>
                        </button>
                        <button className="storefront__category-card storefront__category-card--pantry" type="button" onClick={() => setModalTab('register')}>
                            <span className="storefront__category-art" aria-hidden="true">◉</span>
                            <span className="storefront__category-name">Pantry favorites</span>
                            <span className="storefront__category-caption">Local flavors to enjoy</span>
                            <span className="storefront__category-arrow" aria-hidden="true">↗</span>
                        </button>
                        <button className="storefront__category-card storefront__category-card--more" type="button" onClick={() => setModalTab('register')}>
                            <span className="storefront__category-art" aria-hidden="true">✳</span>
                            <span className="storefront__category-name">Discover more</span>
                            <span className="storefront__category-caption">Meet your local makers</span>
                            <span className="storefront__category-arrow" aria-hidden="true">↗</span>
                        </button>
                    </div>
                </section>

                <section className="storefront__benefits" id="how-it-works">
                    <div className="storefront__section-heading">
                        <span className="storefront__eyebrow storefront__eyebrow--center">A MARKET WITH MEANING</span>
                        <h2>Closer connections. Better finds.</h2>
                    </div>
                    <div className="storefront__benefit-grid">
                        <article className="storefront__benefit">
                            <span className="storefront__benefit-icon storefront__benefit-icon--purple" aria-hidden="true">⌂</span>
                            <h3>Shop your neighborhood</h3>
                            <p>Find products and services from independent sellers right in your community.</p>
                        </article>
                        <article className="storefront__benefit">
                            <span className="storefront__benefit-icon storefront__benefit-icon--orange" aria-hidden="true">✳</span>
                            <h3>Give local talent a lift</h3>
                            <p>Every order helps local entrepreneurs grow their businesses and reach more people.</p>
                        </article>
                        <article className="storefront__benefit">
                            <span className="storefront__benefit-icon storefront__benefit-icon--green" aria-hidden="true">↗</span>
                            <h3>Make your next move</h3>
                            <p>Join as a buyer, open a seller store, or ride along as a delivery partner.</p>
                        </article>
                    </div>
                </section>

                <section className="storefront__seller-cta" id="sell-with-us">
                    <div>
                        <span className="storefront__eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
                        <h2>Have something good to share?</h2>
                        <p>Bring your products to a community that values local makers. Create your seller account and tell us about your store.</p>
                    </div>
                    <button className="storefront__button storefront__button--light" type="button" onClick={() => openRegistration('seller')}>
                        Become a seller <span aria-hidden="true">→</span>
                    </button>
                </section>

                <footer className="storefront__footer">
                    <div className="storefront__footer-main">
                        <div className="storefront__footer-about">
                            <a className="storefront__brand storefront__brand--footer" href="/" aria-label="LubosMart home">
                                <span className="storefront__brand-mark">L</span>
                                <span>LubosMart</span>
                            </a>
                            <p>A local marketplace bringing neighbors, independent sellers, and delivery partners together.</p>
                        </div>
                        <div className="storefront__footer-column">
                            <h3>Explore</h3>
                            <a href="#shop-categories">Discover local</a>
                            <a href="#how-it-works">How it works</a>
                            <button type="button" onClick={() => setModalTab('register')}>Create an account</button>
                        </div>
                        <div className="storefront__footer-column">
                            <h3>Join the marketplace</h3>
                            <button type="button" onClick={() => setModalTab('register')}>Shop as a buyer</button>
                            <button type="button" onClick={() => openRegistration('seller')}>Open a seller store</button>
                            <button type="button" onClick={() => openRegistration('rider')}>Deliver as a rider</button>
                        </div>
                    </div>
                    <div className="storefront__footer-bottom">
                        <span>© {new Date().getFullYear()} LubosMart. All rights reserved.</span>
                        <a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Back to top ↑</a>
                    </div>
                </footer>
            </main>
            {modalTab && (
                <AuthModal
                    key={`${modalTab}-${initialRole}`}
                    initialTab={modalTab}
                    initialRole={initialRole}
                    onClose={() => setModalTab(null)}
                />
            )}
        </>
    );
}
