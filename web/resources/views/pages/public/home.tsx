import AuthFeedback from '@/components/auth/auth-feedback';
import AppWordmark from '@/components/branding/app-wordmark';
import HomeDeliveryTruck from '@/components/marketplace/home-delivery-truck';
import HomeDiscovery from '@/components/marketplace/home-discovery';
import PublicHeader from '@/components/navigation/public-header';
import { SkipLink } from '@/components/shell/skip-link';
import type { SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Grid2X2, Headphones, ShieldCheck, ShoppingBag, Sparkles, Truck, Wallet } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import '../../../css/reference-marketplace.css';
import '../../../css/storefront-home-reference.css';

type HomeProduct = {
    id: number;
    name: string;
    price: string;
    stock?: number;
    description?: string | null;
    image_url: string;
    store: { name: string };
    category: { name: string };
};

function HeroTagline({ bottom = false }: { bottom?: boolean }) {
    if (bottom) {
        return (
            <aside className="home-delivery-strip" aria-hidden="true">
                <div className="home-delivery-road" aria-hidden="true">
                    <div className="home-delivery-traveler">
                        <HomeDeliveryTruck />
                    </div>
                </div>
            </aside>
        );
    }
    const labels = ['Local finds', 'Everyday favorites', 'Shop local', 'Pay on delivery'];

    return (
        <aside className="home-hero-tagline" aria-hidden="true">
            <div className="home-tagline-track">
                {[0, 1].map((copy) => (
                    <div className="home-tagline-group" key={copy}>
                        {labels.map((label) => (
                            <span key={label}>
                                {label}
                                <span className="home-tagline-star">✦</span>
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </aside>
    );
}

function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
    const [open, setOpen] = useState(true);
    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 701px)');
        const update = () => setOpen(desktop.matches);
        update();
        desktop.addEventListener('change', update);
        return () => desktop.removeEventListener('change', update);
    }, []);
    return (
        <details className="home-footer-group" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
            <summary>{title}</summary>
            <div>{children}</div>
        </details>
    );
}
export default function Home({
    products = [],
    favoriteIds = [],
    announcements = [],
    backdrop = false,
}: {
    products?: HomeProduct[];
    favoriteIds?: number[];
    announcements?: { id: number; title: string; body: string }[];
    backdrop?: boolean;
}) {
    const { auth, errors } = usePage<SharedData>().props;
    const homeRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const home = homeRef.current;
        if (!home || backdrop || !('IntersectionObserver' in window)) return;

        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const animations = new Set<Animation>();
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    observer.unobserve(entry.target);
                    if (motion.matches || entry.target.contains(document.activeElement)) return;
                    const siblings = Array.from(entry.target.parentElement?.children ?? []);
                    const animation = entry.target.animate(
                        [
                            { opacity: 0, transform: 'translateY(20px)' },
                            { opacity: 1, transform: 'translateY(0)' },
                        ],
                        {
                            duration: 650,
                            delay: Math.min(siblings.indexOf(entry.target), 6) * 65,
                            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                            fill: 'backwards',
                        },
                    );
                    animations.add(animation);
                    animation.onfinish = () => animations.delete(animation);
                });
            },
            { threshold: 0.08 },
        );
        home.querySelectorAll(
            '.reference-hero > div > *, .home-hero-art, .reference-services > div, .reference-section-heading, .reference-categories > a, .product-card, main > section > article, .home-seller > *, .home-footer-main > *',
        ).forEach((element) => observer.observe(element));
        const cancelMotion = () => {
            if (motion.matches) animations.forEach((animation) => animation.cancel());
        };
        const revealFocus = () =>
            animations.forEach((animation) => {
                if ((animation.effect as KeyframeEffect | null)?.target?.contains(document.activeElement)) animation.cancel();
            });
        motion.addEventListener('change', cancelMotion);
        home.addEventListener('focusin', revealFocus);
        return () => {
            observer.disconnect();
            animations.forEach((animation) => animation.cancel());
            motion.removeEventListener('change', cancelMotion);
            home.removeEventListener('focusin', revealFocus);
        };
    }, [backdrop, products]);
    const registrationUrl = (role: string) => (auth.user ? route('dashboard') : route('register', { role }));
    return (
        <div ref={homeRef} className="reference-page reference-home home-motion">
            {!backdrop && (
                <Head title="Home">
                    <meta name="description" content="Discover great deals, trusted local sellers, and delivery with LubosMart." />
                </Head>
            )}
            {!backdrop && <SkipLink />}
            <PublicHeader home />
            <main id={backdrop ? undefined : 'main-content'} tabIndex={-1} className="reference-home-main">
                {errors?.google && <AuthFeedback message={errors.google} />}
                <section className="reference-hero">
                    <HeroTagline />
                    <div>
                        <p className="reference-eyebrow">ONLINE MARKETPLACE</p>
                        <h1>
                            Shop Smarter
                            <br />
                            with <span>LubosMart</span>
                        </h1>
                        <p>Discover great deals, trusted sellers, and everyday favorites in one place.</p>
                        <div className="reference-actions">
                            <Link href="/shop" className="reference-button">
                                Shop Now <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                            <Link href={registrationUrl('seller')} className="reference-button reference-button-outline">
                                Become a Seller
                            </Link>
                        </div>
                    </div>
                    <figure className="home-shopping-scene" aria-label="Shop local with cash on delivery">
                        <span className="home-scene-orbit" aria-hidden="true" />
                        <Sparkles className="home-scene-spark home-scene-spark-top" aria-hidden="true" />
                        <Sparkles className="home-scene-spark home-scene-spark-bottom" aria-hidden="true" />
                        <span className="home-scene-dot" aria-hidden="true" />
                        <img
                            className="home-hero-art"
                            src="/images/brand/auth-marketplace-3d.webp"
                            width={1024}
                            height={1536}
                            fetchPriority="high"
                            alt="Purple marketplace phone, shopping bag and delivery parcels"
                        />
                        <span className="home-scene-badge home-scene-badge-local">
                            <span className="home-scene-icon">
                                <ShoppingBag size={20} aria-hidden="true" />
                            </span>
                            <span>
                                <small>Made for your everyday</small>
                                <strong>Discover local finds</strong>
                            </span>
                        </span>
                        <span className="home-scene-badge home-scene-badge-cod">
                            <span className="home-scene-icon">
                                <Wallet size={20} aria-hidden="true" />
                            </span>
                            <span>
                                <small>Simple shopping</small>
                                <strong>Cash on delivery</strong>
                            </span>
                        </span>
                    </figure>
                    <HeroTagline bottom />
                </section>
                <section className="reference-services" aria-label="Marketplace benefits">
                    {[
                        { icon: Truck, title: 'Fast Delivery', copy: 'Get your orders on time.' },
                        { icon: ShieldCheck, title: 'Trusted Sellers', copy: 'Shop with confidence.' },
                        { icon: ShoppingBag, title: 'Great Deals', copy: 'Discover local favorites.' },
                        { icon: Headphones, title: 'Help & Support', copy: "We're here to assist you." },
                    ].map(({ icon: Icon, title, copy }) => (
                        <div key={title}>
                            <span>
                                <Icon aria-hidden="true" />
                            </span>
                            <div>
                                <h2>{title}</h2>
                                <p>{copy}</p>
                            </div>
                        </div>
                    ))}
                </section>
                <section id="shop-categories" aria-labelledby="category-heading">
                    <div className="reference-section-heading">
                        <h2 id="category-heading">Shop by Category</h2>
                        <Link href="/shop">
                            View All Categories <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                    </div>
                    <div className="reference-categories">
                        {[
                            { name: 'Groceries', art: 'groceries' },
                            { name: 'Electronics', art: 'electronics' },
                            { name: 'Fashion', art: 'fashion' },
                            { name: 'Home & Living', art: 'home' },
                            { name: 'Health & Beauty', art: 'beauty' },
                            { name: 'Sports', art: 'sports' },
                            { name: 'More', art: null },
                        ].map(({ name, art }) => (
                            <Link key={name} href={art ? '/shop?search=' + encodeURIComponent(name) : '/shop'}>
                                {art ? (
                                    <span className={`home-category-art home-category-art-${art}`} aria-hidden="true" />
                                ) : (
                                    <span className="home-category-more" aria-hidden="true">
                                        <Grid2X2 />
                                    </span>
                                )}
                                <span>{name}</span>
                            </Link>
                        ))}
                    </div>
                </section>
                <section aria-labelledby="featured-heading">
                    <div className="reference-section-heading">
                        <h2 id="featured-heading">Featured Products</h2>
                        <Link href="/shop">
                            View All Products <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                    </div>
                    <HomeDiscovery
                        products={products.map((product) => ({
                            ...product,
                            key: 'live-' + product.id,
                            seller: product.store.name,
                            category: product.category.name,
                        }))}
                        favoriteIds={favoriteIds}
                    />
                </section>
                {!!announcements.length && (
                    <section aria-label="Latest announcements" className="grid gap-4 md:grid-cols-3">
                        {announcements.map((item) => (
                            <article key={item.id} className="bg-accent/40 rounded-xl border p-5">
                                <h2 className="font-semibold">{item.title}</h2>
                                <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">{item.body}</p>
                            </article>
                        ))}
                    </section>
                )}
                <section className="home-seller" aria-labelledby="seller-heading">
                    <div>
                        <p className="reference-eyebrow">SELL WITH LUBOSMART</p>
                        <h2 id="seller-heading">
                            Your next chapter
                            <br />
                            starts with your store.
                        </h2>
                        <p>Bring your products to your local community. Create a seller account and start building your shop.</p>
                        <Link href={registrationUrl('seller')} className="reference-button">
                            Become a seller <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                    </div>
                    <img
                        src="/images/brand/home-seller-face-v3.jpg"
                        alt="Shop owner in a purple apron outside her local store"
                        width={1400}
                        height={467}
                        loading="lazy"
                    />
                </section>
            </main>
            <footer className="home-footer">
                <div className="home-footer-main">
                    <div className="home-footer-about">
                        <Link href="/" className="reference-brand" aria-label="LubosMart home">
                            <img src="/images/brand/logo.svg" width={48} height={48} alt="" />
                            <AppWordmark />
                        </Link>
                        <p>A local marketplace bringing neighbors, independent sellers, and delivery partners together.</p>
                        <span className="home-footer-payment">
                            <Wallet size={18} aria-hidden="true" /> Cash on delivery
                        </span>
                    </div>
                    <nav aria-label="Explore LubosMart">
                        <FooterGroup title="Explore">
                            <Link href="/shop">Shop all products</Link>
                            <a href="#shop-categories">Shop by category</a>
                            <Link href="/platform-information">Announcements &amp; policies</Link>
                        </FooterGroup>
                    </nav>
                    <nav aria-label="Join the marketplace">
                        <FooterGroup title="Join the marketplace">
                            <Link href={registrationUrl('buyer')}>Shop as a buyer</Link>
                            <Link href={registrationUrl('seller')}>Open a seller store</Link>
                            <Link href={registrationUrl('rider')}>Sign up as a rider</Link>
                            <Link href={registrationUrl('logistics')}>Register a logistics company</Link>
                        </FooterGroup>
                    </nav>
                    <nav aria-label="Your account">
                        <FooterGroup title="Your account">
                            <Link href={auth.user ? route('dashboard') : route('login')}>{auth.user ? 'Dashboard' : 'Sign in'}</Link>
                            <Link href={registrationUrl('buyer')}>Create an account</Link>
                            <Link href={route('dashboard')}>Track your orders</Link>
                            <Link href="/platform-information">Platform information</Link>
                        </FooterGroup>
                    </nav>
                </div>
                <div className="home-footer-bottom">
                    <p>&copy; {new Date().getFullYear()} LubosMart. All rights reserved.</p>
                    <a href="#main-content">
                        Back to top <ArrowRight size={14} aria-hidden="true" />
                    </a>
                </div>
            </footer>
        </div>
    );
}
