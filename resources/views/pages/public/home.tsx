import AuthFeedback from '@/components/auth/auth-feedback';
import AppWordmark from '@/components/branding/app-wordmark';
import HomeDiscovery from '@/components/marketplace/home-discovery';
import { assets } from '@/config/assets';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, PackageCheck, Search, Store, Wallet } from 'lucide-react';
import { useEffect, useRef, type MouseEvent } from 'react';

import { SkipLink } from '@/components/shell/skip-link';
import type { SharedData } from '@/types';
import '../../../css/storefront.css';

type PublicRole = 'buyer' | 'seller' | 'courier' | 'sorting_center';

function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const section = document.getElementById(id);
    if (!section) return;

    event.preventDefault();
    if (window.location.hash) {
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    section.focus({ preventScroll: true });
    section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}

export default function Welcome({
    announcements = [],
    products = [],
    favoriteIds = [],
}: {
    favoriteIds?: number[];
    announcements?: { id: number; title: string; body: string }[];
    products?: {
        id: number;
        name: string;
        price: string;
        stock?: number;
        description?: string | null;
        image_url: string;
        store: { name: string };
        category: { name: string };
    }[];
}) {
    const { auth, errors: sharedErrors } = usePage<SharedData>().props;
    const benefitsRef = useRef<HTMLElement>(null);
    useEffect(() => {
        const section = benefitsRef.current;
        if (!section || !('IntersectionObserver' in window)) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    section.classList.add('storefront__benefits--visible');
                    observer.disconnect();
                }
            },
            { threshold: 0.15 },
        );
        observer.observe(section);
        return () => observer.disconnect();
    }, []);

    const discoveryProducts = products.map((product) => ({
        ...product,
        key: 'live-' + product.id,
        seller: product.store.name,
        category: product.category.name,
    }));

    const openRegistration = (role?: PublicRole) => {
        if (auth.user) {
            router.visit(route('dashboard'));
            return;
        }
        router.visit(role ? route('register', { role }) : route('register'));
    };

    return (
        <>
            <Head title="Home">
                <meta name="description" content="Discover local finds, support neighborhood sellers, and shop with LubosMart." />
            </Head>
            <SkipLink />
            <main className="storefront">
                <header className="storefront__header">
                    <a className="storefront__brand" href="/" aria-label="LubosMart home">
                        <img src={assets.brand.logo} className="size-10" alt="" />
                        <AppWordmark />
                    </a>
                    <nav className="storefront__nav" aria-label="Main navigation">
                        <a className="storefront__nav-link" href="#shop-categories" onClick={(event) => scrollToSection(event, 'shop-categories')}>
                            Discover
                        </a>
                        <a className="storefront__nav-link" href="#how-it-works" onClick={(event) => scrollToSection(event, 'how-it-works')}>
                            How it works
                        </a>
                        {auth.user ? (
                            <a className="storefront__button storefront__button--outline" href={route('dashboard')}>
                                Dashboard
                            </a>
                        ) : (
                            <>
                                <Link className="storefront__nav-link" href={route('login')}>
                                    Sign In
                                </Link>
                                <button className="storefront__button storefront__button--small" type="button" onClick={() => openRegistration()}>
                                    Sign up
                                </button>
                            </>
                        )}
                    </nav>
                </header>
                {sharedErrors?.google && (
                    <div className="mx-auto max-w-4xl px-4 py-5">
                        <AuthFeedback message={sharedErrors.google} />
                        <Link href={route('login')} className="text-primary mt-3 inline-flex min-h-11 items-center font-medium underline">
                            Return to Sign In
                        </Link>
                    </div>
                )}

                <section id="main-content" tabIndex={-1} className="storefront__hero">
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
                            <input id="home-search" name="search" type="search" placeholder="Search products" maxLength={100} />
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
                    <figure className="storefront__hero-photo storefront__hero-illustration">
                        <img
                            src="/images/brand/auth-marketplace-3d.webp"
                            width={1024}
                            height={1536}
                            fetchPriority="high"
                            decoding="async"
                            alt="A purple marketplace phone with shopping bags, shoes, headphones and a delivery cart"
                        />
                    </figure>
                </section>

                {!!announcements.length && (
                    <section aria-label="Latest announcements" className="mx-auto max-w-[1180px] px-6 py-6 sm:px-8">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold">Latest updates</h2>
                            <a href="/platform-information" className="text-primary text-sm font-medium hover:underline">
                                View all updates
                            </a>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {announcements.map((item) => (
                                <article key={item.id} className="bg-accent/40 rounded-2xl border p-5">
                                    <h3 className="font-semibold break-words">{item.title}</h3>
                                    <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
                                        {item.body}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
                <section className="storefront__categories" id="shop-categories" tabIndex={-1}>
                    <div className="storefront__section-heading">
                        <span className="storefront__eyebrow storefront__eyebrow--center">EXPLORE</span>
                        <h2>Discover everyday finds.</h2>
                    </div>
                    <p className="storefront__samples-note">Find your next favorite. Browse local sellers and explore the marketplace.</p>
                    <HomeDiscovery products={discoveryProducts} favoriteIds={favoriteIds} />
                </section>

                <section ref={benefitsRef} className="storefront__benefits" id="how-it-works" tabIndex={-1}>
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

                <section className="storefront__seller-cta" id="sell-with-us" aria-labelledby="seller-cta-title">
                    <div className="storefront__seller-copy">
                        <span className="storefront__seller-label">SELL WITH LUBOSMART</span>
                        <h2 id="seller-cta-title">
                            Your next chapter
                            <br />
                            starts with your store.
                        </h2>
                        <p>Bring your products to your local community. Create a seller account and start building your shop.</p>
                    </div>
                    <div className="storefront__seller-action">
                        <span className="storefront__seller-emblem" aria-hidden="true">
                            <Store className="size-10" strokeWidth={1.5} />
                        </span>
                        <button className="storefront__button storefront__button--light" type="button" onClick={() => openRegistration('seller')}>
                            Become a seller <ArrowRight aria-hidden="true" className="size-4" />
                        </button>
                    </div>
                </section>

                <footer className="storefront__footer">
                    <div className="storefront__footer-main">
                        <div className="storefront__footer-about">
                            <a className="storefront__brand storefront__brand--footer" href="/" aria-label="LubosMart home">
                                <img src={assets.brand.logo} className="size-10" alt="" />
                                <AppWordmark inverse />
                            </a>
                            <p>A local marketplace bringing neighbors, independent sellers, and delivery partners together.</p>
                        </div>
                        <div className="storefront__footer-column">
                            <h3>Explore</h3>
                            <a href="/platform-information">Announcements & policies</a>
                            <a href="#shop-categories" onClick={(event) => scrollToSection(event, 'shop-categories')}>
                                Discover local
                            </a>
                            <a href="#how-it-works" onClick={(event) => scrollToSection(event, 'how-it-works')}>
                                How it works
                            </a>
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
                            <button type="button" onClick={() => openRegistration('courier')}>
                                Sign up as a rider
                            </button>
                            <button type="button" onClick={() => openRegistration('sorting_center')}>
                                Register a sorting center
                            </button>
                        </div>
                    </div>
                    <div className="storefront__footer-bottom">
                        <span>© {new Date().getFullYear()} LubosMart. All rights reserved.</span>
                    </div>
                </footer>
            </main>
        </>
    );
}
