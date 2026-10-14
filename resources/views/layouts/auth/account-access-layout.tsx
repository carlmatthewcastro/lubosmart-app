import AppWordmark from '@/components/branding/app-wordmark';
import { SkipLink } from '@/components/shell/skip-link';
import { assets } from '@/config/assets';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AccountAccessLayout({
    title,
    description,
    children,
    registering = false,
    recovery = false,
    hideBackLink = false,
}: {
    title: string;
    description: string;
    children: ReactNode;
    registering?: boolean;
    recovery?: boolean;
    hideBackLink?: boolean;
}) {
    return (
        <div
            className={`bg-background text-foreground min-h-svh font-sans antialiased ${!registering ? 'overflow-hidden' : 'overflow-x-hidden'} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${registering ? 'lg:grid lg:grid-cols-5' : 'lg:grid lg:grid-cols-5'}`}
        >
            <Head title={registering ? 'Create account' : recovery ? 'Forgot password' : 'Sign in'} />
            <SkipLink />
            <aside
                className={`from-accent/40 via-accent to-primary/20 text-foreground relative hidden flex-col overflow-hidden bg-linear-to-br lg:flex ${registering ? 'h-svh gap-6 border-r p-8 lg:fixed lg:inset-y-0 lg:left-0 lg:w-1/3 xl:p-10' : 'min-h-svh gap-8 p-10 lg:col-span-3 xl:p-16'}`}
                aria-label="LubosMart"
            >
                <div
                    aria-hidden="true"
                    className="bg-card/40 pointer-events-none absolute -top-1/3 -left-1/2 h-2/3 w-[180%] -rotate-12 rounded-[50%]"
                />
                <div
                    aria-hidden="true"
                    className="bg-primary/5 pointer-events-none absolute -bottom-1/3 -left-1/2 h-2/3 w-[180%] rotate-12 rounded-[50%]"
                />
                <Link
                    href={route('home')}
                    className="text-foreground relative z-10 inline-flex w-fit shrink-0 items-center gap-[11px] rounded-xl text-[1.2rem] font-semibold"
                >
                    <img src={assets.brand.logo} width={40} height={40} alt="" className="size-10 shrink-0" />
                    <AppWordmark />
                </Link>
                <div
                    className={`relative z-10 ${registering ? 'flex min-h-0 flex-1 flex-col justify-center space-y-6 pb-12 [@media(max-height:640px)]:space-y-4 [@media(max-height:640px)]:pb-0' : 'flex w-1/2 flex-1 flex-col justify-center space-y-6 py-8'}`}
                >
                    <p
                        className={
                            registering
                                ? 'text-primary text-xs font-semibold tracking-[0.12em] uppercase'
                                : 'text-primary text-sm font-semibold tracking-[0.12em] uppercase'
                        }
                    >
                        Your local marketplace
                    </p>
                    <h2
                        className={`text-foreground font-serif leading-[1.08] font-normal tracking-[-0.04em] text-balance ${registering ? 'text-4xl xl:text-6xl 2xl:text-7xl [@media(max-height:640px)]:text-4xl' : 'text-[clamp(3rem,5.3vw,6rem)]'}`}
                    >
                        Local finds.
                        <br />
                        Everyday
                        <br />
                        <em className="text-primary">favorites.</em>
                    </h2>
                    <p className="text-muted-foreground text-base leading-7 text-pretty">
                        Shop local sellers, find something you love, and pay when it arrives.
                    </p>
                </div>
                {!registering && (
                    <img
                        src="/images/brand/auth-marketplace-3d.webp"
                        alt=""
                        width={1024}
                        height={1536}
                        className="auth-marketplace-illustration pointer-events-none absolute right-0 bottom-0 z-0 h-4/5 w-1/2 object-contain object-right-bottom"
                    />
                )}
            </aside>
            <main
                id="main-content"
                tabIndex={-1}
                className={`min-w-0 px-4 py-6 sm:px-8 ${registering ? 'lg:col-span-5 lg:ml-[33.333333%] lg:px-10 lg:py-8 xl:px-12' : 'flex min-h-svh flex-col justify-center lg:col-span-2 lg:col-start-4 lg:px-8 xl:px-12'}`}
            >
                <div className={`mx-auto w-full ${registering ? 'max-w-5xl' : 'max-w-lg'}`}>
                    <Link href={route('home')} className="mb-6 flex w-fit items-center gap-[11px] text-[1.2rem] font-semibold lg:hidden">
                        <img src={assets.brand.logo} alt="" width={40} height={40} className="size-10 shrink-0" />
                        <AppWordmark />
                    </Link>
                    {!hideBackLink && (
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                            <Link
                                href={route(recovery ? 'login' : 'home')}
                                className={
                                    recovery
                                        ? 'bg-card text-foreground hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none'
                                        : 'text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 text-sm'
                                }
                            >
                                {recovery ? (
                                    <ChevronLeft className="text-foreground size-4" aria-hidden="true" />
                                ) : (
                                    <ArrowLeft className="size-4" aria-hidden="true" />
                                )}
                                {recovery ? 'Back to Login' : 'Back to marketplace'}
                            </Link>
                        </div>
                    )}
                    <section className={registering ? 'min-w-0' : 'bg-card rounded-3xl border p-6 shadow-sm sm:p-9'} aria-labelledby="access-heading">
                        <div className="mb-8 space-y-2">
                            <h1 id="access-heading" className="text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance">
                                {title}
                            </h1>
                            <p className="text-muted-foreground text-sm leading-relaxed text-pretty">{description}</p>
                        </div>
                        {children}
                        {!recovery && !registering && (
                            <p className="text-muted-foreground mt-7 text-center text-sm">
                                New to LubosMart?{' '}
                                <Link href={route('register')} className="text-primary font-semibold underline underline-offset-4">
                                    Create an account
                                </Link>
                            </p>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
