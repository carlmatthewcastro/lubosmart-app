import AppWordmark from '@/components/branding/app-wordmark';
import { ThemeToggle } from '@/components/navigation/theme-toggle';
import { assets } from '@/config/assets';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Menu, Search, ShoppingCart, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import '../../../css/reference-marketplace.css';
import '../../../css/storefront-home-reference.css';

export default function PublicHeader({ home = false }: { home?: boolean }) {
    const {
        props: { auth },
        url,
    } = usePage<SharedData>();
    const query = new URLSearchParams(url.split('?')[1] ?? '');
    const currentSearch = query.get('search') ?? '';
    const [search, setSearch] = useState(currentSearch);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        setSearch(currentSearch);
        setMenuOpen(false);
    }, [currentSearch, url]);
    return (
        <header className="reference-header">
            {home && (
                <button
                    ref={menuButton}
                    type="button"
                    className="home-menu-toggle reference-icon"
                    aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
                    aria-expanded={menuOpen}
                    aria-controls="home-navigation"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                </button>
            )}
            <Link href="/" className="reference-brand" aria-label="LubosMart home">
                <img src={assets.brand.logo} width={44} height={44} alt="" />
                <AppWordmark />
            </Link>
            <nav
                id={home ? 'home-navigation' : undefined}
                aria-label="Main navigation"
                className={'reference-nav' + (menuOpen ? ' is-open' : '')}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        setMenuOpen(false);
                        menuButton.current?.focus();
                    }
                }}
            >
                <Link href="/" aria-current={url === '/' ? 'page' : undefined}>
                    Home
                </Link>
                <Link href="/shop" aria-current={url.split('?')[0] === '/shop' ? 'page' : undefined}>
                    Shop
                </Link>
                {!home && <Link href="/#shop-categories">Categories</Link>}
                <Link href={route('dashboard')}>Track Order</Link>
                {home && !auth.user && (
                    <Link className="home-mobile-account" href={route('login')}>
                        Sign In / Sign Up
                    </Link>
                )}
            </nav>
            {home && (
                <form
                    role="search"
                    aria-label="Search the marketplace"
                    className="home-navbar-search"
                    onSubmit={(event) => {
                        event.preventDefault();
                        const filters = url.split('?')[0] === '/shop' ? Object.fromEntries(query) : {};
                        delete filters.page;
                        router.get('/shop', { ...filters, search: search.trim() }, { preserveScroll: true });
                    }}
                >
                    <label htmlFor="home-search" className="sr-only">
                        Search products
                    </label>
                    <Search size={18} aria-hidden="true" />
                    <input
                        id="home-search"
                        name="search"
                        type="search"
                        maxLength={100}
                        placeholder="Search products"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <button type="submit" className="reference-button">
                        Search
                    </button>
                </form>
            )}
            <div className="reference-account">
                {!home && (
                    <Link href="/shop" aria-label="Search products" className="reference-icon">
                        <Search size={21} aria-hidden="true" />
                    </Link>
                )}
                <ThemeToggle />
                <Link href={route('cart')} aria-label="Shopping cart" className="reference-icon">
                    <ShoppingCart size={21} aria-hidden="true" />
                </Link>
                {auth.user ? (
                    <Link className="reference-button" href={route('dashboard')}>
                        Dashboard
                    </Link>
                ) : (
                    <>
                        <Link
                            className="reference-button reference-button-outline"
                            href={route('login')}
                            aria-current={url.split('?')[0] === '/login' ? 'page' : undefined}
                        >
                            Sign In
                        </Link>
                        <Link
                            className="reference-button"
                            href={route('register')}
                            aria-current={url.split('?')[0] === '/register' ? 'page' : undefined}
                        >
                            Sign Up
                        </Link>
                    </>
                )}
            </div>
        </header>
    );
}
