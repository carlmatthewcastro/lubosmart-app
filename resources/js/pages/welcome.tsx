import { Head, router, usePage } from '@inertiajs/react';
import { PackageCheck, Search, Store, Wallet } from 'lucide-react';
import { useState } from 'react';

import AuthModal from '@/components/storefront-auth-modal';
import type { SharedData } from '@/types';
import '../../css/auth-preview.css';

type AuthTab = 'login' | 'register';
type PublicRole = 'buyer' | 'seller' | 'rider' | 'logistics';

export default function Welcome({ departments }: { departments: Record<string, number> }) {
    const { auth, errors: sharedErrors } = usePage<SharedData>().props;
    const [modalTab, setModalTab] = useState<AuthTab | null>(() => (sharedErrors?.google ? 'register' : null));
    const [initialRole, setInitialRole] = useState<PublicRole>('buyer');
    const departmentUrl = (slug: string) => (departments[slug] ? `/shop?category=${departments[slug]}` : '/shop');

    const openRegistration = (role: PublicRole = 'buyer') => {
        if (auth.user) {
            router.visit(route('dashboard'));
            return;
        }
        setInitialRole(role);
        setModalTab('register');
    };

    return (
        <>
            <Head title="Home">
                <meta name="description" content="Discover local finds, support neighborhood sellers, and shop with LubosMart." />
            </Head>
            <main className="storefront" inert={modalTab !== null}>
                <header className="storefront__header">
                    <a className="storefront__brand" href="/" aria-label="LubosMart home">
                        <img src="/logo.svg" className="size-10" alt="" />
                        <span>LubosMart</span>
                    </a>
                    <nav className="storefront__nav" aria-label="Main navigation">
                        <a className="storefront__nav-link" href="#shop-categories">
                            Discover
                        </a>
                        <a className="storefront__nav-link" href="#how-it-works">
                            How it works
                        </a>
                        {auth.user ? (
                            <a className="storefront__button storefront__button--outline" href={route('dashboard')}>
                                Dashboard
                            </a>
                        ) : (
                            <>
                                <button className="storefront__nav-link" type="button" onClick={() => setModalTab('login')}>
                                    Log in
                                </button>
                                <button
                                    className="storefront__button storefront__button--small"
                                    type="button"
                                    onClick={() => openRegistration('buyer')}
                                >
                                    Sign up
                                </button>
                            </>
                        )}
                    </nav>
                </header>

                <section className="storefront__hero">
                    <div className="storefront__hero-content">
                        <span className="storefront__eyebrow">YOUR LOCAL MARKETPLACE</span>
                        <h1>
                            Local finds.
                            <br />
                            Everyday <em>favorites.</em>
                        </h1>
                        <p className="storefront__hero-copy">Shop local sellers, find something you love, and pay when it arrives.</p>
                        <form action="/shop" method="get" role="search" className="storefront__search">
                            <label htmlFor="home-search" className="sr-only">
                                Search products
                            </label>
                            <Search className="size-5 shrink-0" aria-hidden="true" />
                            <input id="home-search" name="search" type="search" placeholder="Search products" maxLength={160} />
                            <button type="submit">Search</button>
                        </form>
                        <div className="storefront__actions">
                            <a className="storefront__button" href="/shop">
                                Shop now
                            </a>
                            <button className="storefront__text-button" type="button" onClick={() => openRegistration('seller')}>
                                Start selling
                            </button>
                        </div>
                    </div>
                    <figure className="storefront__hero-photo">
                        <img
                            src="/images/marketplace-hero-v2.jpg"
                            width={1200}
                            height={900}
                            fetchPriority="high"
                            decoding="async"
                            alt="A canvas tote, woven basket, ceramics and local products against a lavender backdrop"
                        />
                    </figure>
                </section>

                <section className="storefront__categories" id="shop-categories">
                    <div className="storefront__section-heading">
                        <span className="storefront__eyebrow storefront__eyebrow--center">EXPLORE</span>
                        <h2>Shop by category.</h2>
                    </div>
                    <div className="storefront__category-grid">
                        <a className="storefront__category-card" href={departmentUrl('food-and-gourmet')}>
                            <span className="storefront__category-photo">
                                <img src="/images/marketplace-fresh-v2.jpg" width={720} height={540} loading="lazy" decoding="async" alt="" />
                            </span>
                            <span className="storefront__category-details">
                                <span className="storefront__category-name">Fresh &amp; local</span>
                                <span className="storefront__category-caption">Good things grown nearby</span>
                            </span>
                        </a>
                        <a className="storefront__category-card" href={departmentUrl('home-and-garden')}>
                            <span className="storefront__category-photo">
                                <img src="/images/marketplace-home-v2.jpg" width={720} height={540} loading="lazy" decoding="async" alt="" />
                            </span>
                            <span className="storefront__category-details">
                                <span className="storefront__category-name">Home &amp; handmade</span>
                                <span className="storefront__category-caption">Made with a personal touch</span>
                            </span>
                        </a>
                        <a className="storefront__category-card" href={departmentUrl('food-and-gourmet')}>
                            <span className="storefront__category-photo">
                                <img src="/images/marketplace-pantry-v2.jpg" width={720} height={540} loading="lazy" decoding="async" alt="" />
                            </span>
                            <span className="storefront__category-details">
                                <span className="storefront__category-name">Pantry favorites</span>
                                <span className="storefront__category-caption">Local flavors to enjoy</span>
                            </span>
                        </a>
                        <a className="storefront__category-card" href="/shop">
                            <span className="storefront__category-photo">
                                <img src="/images/marketplace-hero-v2.jpg" width={1200} height={900} loading="lazy" decoding="async" alt="" />
                            </span>
                            <span className="storefront__category-details">
                                <span className="storefront__category-name">Discover more</span>
                                <span className="storefront__category-caption">Meet your local makers</span>
                            </span>
                        </a>
                    </div>
                </section>

                <section className="storefront__benefits" id="how-it-works">
                    <div className="storefront__section-heading">
                        <span className="storefront__eyebrow storefront__eyebrow--center">SIMPLE FROM THE START</span>
                        <h2>Browse. Order. Enjoy.</h2>
                    </div>
                    <div className="storefront__benefit-grid">
                        <article className="storefront__benefit">
                            <span className="storefront__benefit-icon storefront__benefit-icon--purple" aria-hidden="true">
                                <Store className="size-6" strokeWidth={1.75} />
                            </span>
                            <h3>Find your favorites</h3>
                            <p>Browse products from local sellers.</p>
                        </article>
                        <article className="storefront__benefit">
                            <span className="storefront__benefit-icon storefront__benefit-icon--orange" aria-hidden="true">
                                <Wallet className="size-6" strokeWidth={1.75} />
                            </span>
                            <h3>Pay on delivery</h3>
                            <p>Add your address and place a COD order.</p>
                        </article>
                        <article className="storefront__benefit">
                            <span className="storefront__benefit-icon storefront__benefit-icon--green" aria-hidden="true">
                                <PackageCheck className="size-6" strokeWidth={1.75} />
                            </span>
                            <h3>Follow your order</h3>
                            <p>Check delivery updates in your dashboard.</p>
                        </article>
                    </div>
                </section>

                <section className="storefront__seller-cta" id="sell-with-us">
                    <div>
                        <span className="storefront__eyebrow">SELL WITH LUBOSMART</span>
                        <h2>Your products. A wider community.</h2>
                        <p>Create a seller account and set up your store.</p>
                    </div>
                    <button className="storefront__button storefront__button--light" type="button" onClick={() => openRegistration('seller')}>
                        Become a seller
                    </button>
                </section>

                <footer className="storefront__footer">
                    <div className="storefront__footer-main">
                        <div className="storefront__footer-about">
                            <a className="storefront__brand storefront__brand--footer" href="/" aria-label="LubosMart home">
                                <img src="/logo.svg" className="size-10" alt="" />
                                <span>LubosMart</span>
                            </a>
                            <p>A local marketplace bringing neighbors, independent sellers, and delivery partners together.</p>
                        </div>
                        <div className="storefront__footer-column">
                            <h3>Explore</h3>
                            <a href="#shop-categories">Discover local</a>
                            <a href="#how-it-works">How it works</a>
                            <button type="button" onClick={() => openRegistration('buyer')}>
                                Create an account
                            </button>
                        </div>
                        <div className="storefront__footer-column">
                            <h3>Join the marketplace</h3>
                            <button type="button" onClick={() => openRegistration('buyer')}>
                                Shop as a buyer
                            </button>
                            <button type="button" onClick={() => openRegistration('seller')}>
                                Open a seller store
                            </button>
                            <button type="button" onClick={() => openRegistration('rider')}>
                                Deliver as a courier
                            </button>
                            <button type="button" onClick={() => openRegistration('logistics')}>
                                Register a sorting center
                            </button>
                        </div>
                    </div>
                    <div className="storefront__footer-bottom">
                        <span>© {new Date().getFullYear()} LubosMart. All rights reserved.</span>
                    </div>
                </footer>
            </main>
            {modalTab && (
                <AuthModal key={`${modalTab}-${initialRole}`} initialTab={modalTab} initialRole={initialRole} onClose={() => setModalTab(null)} />
            )}
        </>
    );
}
