import AppLogoIcon from '@/components/branding/app-logo-icon';
import AppWordmark from '@/components/branding/app-wordmark';
import { buttonClass } from '@/components/shared/marketplace-ui';
import { cn } from '@/lib/utils';
import type { SharedData, UserRole } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bike, Package, ShieldCheck, ShoppingBag, Store } from 'lucide-react';
import type { CSSProperties } from 'react';

const roles = {
    admin: {
        label: 'Admin',
        icon: ShieldCheck,
        accent: '#5659a6',
        light: '#a8adeb',
        description: 'Monitor your platform, manage operations, and stay on top of important activities.',
        action: 'Manage Accounts',
        href: '/accounts',
    },
    buyer: {
        label: 'Buyer',
        icon: ShoppingBag,
        accent: '#3464a6',
        light: '#94bdf2',
        description: 'Discover products, explore great deals, and keep track of your orders.',
        action: 'Continue Shopping',
        href: '/shop',
    },
    seller: {
        label: 'Seller',
        icon: Store,
        accent: '#287359',
        light: '#8acdb1',
        description: 'Manage your products, process orders, and grow your store.',
        action: 'Manage Store',
        href: '/inventory',
    },
    logistics: {
        label: 'Logistics',
        icon: Package,
        accent: '#94601f',
        light: '#e5bc7c',
        description: 'Monitor incoming parcels, sorting operations, and outgoing dispatches.',
        action: 'Manage Parcels',
        href: '/deliveries',
    },
    rider: {
        label: 'Rider',
        icon: Bike,
        accent: '#7351a6',
        light: '#c0a6e8',
        description: 'Stay updated on assignments, deliveries, and earnings.',
        action: 'View Assignments',
        href: '/deliveries',
    },
} satisfies Record<UserRole, unknown>;

/** Quiet, two-tone vector scenes; decorative and intentionally free of live metrics. */
function BannerIllustration({ role }: { role: UserRole }) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 320 200"
            className="h-auto w-full"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M36 177h248" strokeOpacity=".16" />
            {role === 'admin' && (
                <>
                    <rect x="49" y="27" width="222" height="143" rx="12" className="fill-card" strokeOpacity=".4" />
                    <path d="M49 55h222M85 55v115" strokeOpacity=".18" />
                    <path d="M64 41h30M62 74h10M62 90h10M62 106h10" strokeOpacity=".35" />
                    <rect x="104" y="74" width="70" height="76" rx="7" fill="currentColor" fillOpacity=".05" stroke="none" />
                    <path d="M116 134v-17m18 17V104m18 30V90" strokeWidth="9" strokeOpacity=".65" />
                    <circle cx="218" cy="104" r="25" strokeWidth="10" strokeOpacity=".12" />
                    <path d="M218 79a25 25 0 0 1 25 25" strokeWidth="10" strokeOpacity=".7" />
                    <path d="M201 148h34" strokeOpacity=".25" />
                </>
            )}
            {role === 'buyer' && (
                <>
                    <path d="M112 65h111l13 103a7 7 0 0 1-7 8H106a7 7 0 0 1-7-8Z" fill="currentColor" fillOpacity=".08" strokeOpacity=".65" />
                    <path d="M140 78V51a28 28 0 0 1 56 0v27" strokeWidth="3" />
                    <rect x="64" y="117" width="75" height="59" rx="5" className="fill-card" strokeOpacity=".5" />
                    <path d="M91 117v21h21v-21M83 158h14" strokeOpacity=".4" />
                </>
            )}
            {role === 'seller' && (
                <>
                    <path d="M72 81v95h176V81" className="fill-card" strokeOpacity=".5" />
                    <path d="m64 79 17-42h158l17 42" fill="currentColor" fillOpacity=".08" strokeOpacity=".6" />
                    {[64, 112, 160, 208].map((x, i) => (
                        <path
                            key={x}
                            d={`M${x} 79v7a24 18 0 0 0 48 0v-7`}
                            fill="currentColor"
                            fillOpacity={i % 2 ? '.04' : '.16'}
                            strokeOpacity=".5"
                        />
                    ))}
                    <path d="m112 79 8-42m40 42V37m48 42-8-42" strokeOpacity=".3" />
                    <rect x="91" y="115" width="74" height="42" rx="3" fill="currentColor" fillOpacity=".06" strokeOpacity=".3" />
                    <path d="M186 176v-62h40v62M216 143v8" strokeOpacity=".6" />
                </>
            )}
            {role === 'logistics' && (
                <>
                    <path d="M63 77 160 29l97 48v99H63Z" className="fill-card" strokeOpacity=".55" />
                    <path d="m52 82 108-54 108 54M92 176V91h136v85M105 103h110M105 115h110" strokeOpacity=".35" />
                    <rect x="113" y="138" width="48" height="38" rx="3" fill="currentColor" fillOpacity=".13" strokeOpacity=".5" />
                    <rect x="165" y="138" width="48" height="38" rx="3" fill="currentColor" fillOpacity=".06" strokeOpacity=".5" />
                    <rect x="138" y="104" width="48" height="34" rx="3" className="fill-card" strokeOpacity=".5" />
                    <path d="M137 138v12m52-12v12m-27-46v12" strokeOpacity=".6" />
                </>
            )}
            {role === 'rider' && (
                <>
                    <circle cx="95" cy="155" r="22" className="fill-card" strokeOpacity=".7" strokeWidth="3" />
                    <circle cx="231" cy="155" r="22" className="fill-card" strokeOpacity=".7" strokeWidth="3" />
                    <circle cx="95" cy="155" r="7" strokeOpacity=".2" />
                    <circle cx="231" cy="155" r="7" strokeOpacity=".2" />
                    <path d="m95 154 26-68h22l-17 54h51l17-32h38l17 30h-28l-14 16H120" fill="currentColor" fillOpacity=".1" strokeOpacity=".7" />
                    <path d="m121 86 7-24h-20M178 107h48" strokeWidth="5" strokeOpacity=".65" />
                    <rect x="184" y="58" width="56" height="43" rx="5" fill="currentColor" fillOpacity=".08" strokeOpacity=".55" />
                    <path d="M205 58v16h14V58M113 101h10" strokeOpacity=".4" />
                </>
            )}
        </svg>
    );
}

export default function DashboardBanner({ role }: { role: UserRole }) {
    const { auth, adminWorkspace } = usePage<SharedData>().props;
    const config = roles[role];
    const Icon = config.icon;
    const firstName = auth.user.name.trim().split(/\s+/)[0];
    const canNavigate = role !== 'admin' || (adminWorkspace?.permissions ?? []).includes('accounts');
    return (
        <section
            aria-label={`${config.label} dashboard welcome`}
            data-dashboard-banner={role}
            style={{ '--banner-accent': config.accent, '--banner-light': config.light } as CSSProperties}
            className="bg-card text-card-foreground min-w-0 rounded-2xl border p-5 font-sans shadow-xs sm:p-7 lg:px-8"
        >
            <div className="grid min-w-0 items-center gap-6 md:min-h-[202px] md:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 flex-col items-start gap-4">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                        <div className="flex items-center gap-1.5">
                            <AppLogoIcon className="size-8 shrink-0" />
                            <AppWordmark className="text-lg!" />
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--banner-accent)_8%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--banner-accent)] dark:bg-[color-mix(in_srgb,var(--banner-light)_10%,transparent)] dark:text-[var(--banner-light)]">
                            <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.75} />
                            {config.label} Dashboard
                        </span>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-2xl leading-tight font-semibold tracking-tight break-words sm:text-[28px]">
                            Welcome back{firstName ? `, ${firstName}` : ''}!
                        </h2>
                        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6 break-words">{config.description}</p>
                    </div>
                    {canNavigate && (
                        <Link
                            href={config.href}
                            className={cn(
                                buttonClass,
                                'min-h-11 max-w-full rounded-xl bg-[var(--banner-accent)] px-4 text-sm text-white shadow-none hover:bg-[var(--banner-accent)] hover:brightness-95 dark:bg-[var(--banner-light)] dark:text-slate-950',
                            )}
                        >
                            {config.action}
                        </Link>
                    )}
                </div>
                <div className="pointer-events-none hidden text-[var(--banner-accent)] md:block dark:text-[var(--banner-light)]">
                    <BannerIllustration role={role} />
                </div>
            </div>
        </section>
    );
}
