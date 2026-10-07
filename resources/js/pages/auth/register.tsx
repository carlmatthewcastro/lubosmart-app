import RegistrationForm from '@/components/registration-form';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check, Mail, ShieldCheck, Sparkles } from 'lucide-react';

export default function Register() {
    return (
        <div className="bg-background min-h-svh">
            <Head title="Create account" />
            <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
                <Link href="/" className="flex items-center gap-3 text-lg font-semibold">
                    <img src="/logo.svg" alt="" className="size-10" />
                    LubosMart
                </Link>
                <Link href="/login" className="text-primary text-sm">
                    <span className="hidden sm:inline">Already a member? </span>Log in
                </Link>
            </header>
            <main className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-5 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-16 lg:py-10">
                <aside className="hidden lg:sticky lg:top-10 lg:block">
                    <Link href="/shop" className="text-muted-foreground mb-8 inline-flex items-center gap-2 text-sm">
                        <ArrowLeft className="size-4" />
                        Explore the marketplace
                    </Link>
                    <div className="relative overflow-hidden rounded-3xl bg-[#312344] p-7 text-white sm:p-9">
                        <div
                            className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full border-[45px] border-white/5"
                            aria-hidden="true"
                        />
                        <p className="relative flex items-center gap-2 text-xs tracking-widest text-purple-200 uppercase">
                            <Sparkles className="size-4" />A place for your everyday
                        </p>
                        <h2 className="relative mt-6 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                            Good things start
                            <br />
                            with community.
                        </h2>
                        <p className="relative mt-5 text-sm leading-7 text-purple-100">
                            Shop local, build a store, or help great products reach their new homes. There’s a place for you at LubosMart.
                        </p>
                        <div className="relative mt-8 hidden border-t border-white/15 pt-6 lg:block">
                            <p className="flex items-center gap-2 text-sm">
                                <ShieldCheck className="size-5 text-[#ECAA68]" />A community built on trust
                            </p>
                            <p className="mt-3 text-xs leading-6 text-purple-200">
                                Verified email helps protect your account. Sellers and delivery partners also complete reviewed applications.
                            </p>
                        </div>
                    </div>
                    <section className="mt-7 hidden lg:block">
                        <h2 className="text-sm font-semibold">Your next steps</h2>
                        <ol className="mt-5 space-y-5">
                            {[
                                { title: 'Create your account', text: 'Choose your role and add your sign-in details.', icon: Check },
                                {
                                    title: 'Verify your email',
                                    text: 'Confirm your email account. Google supplies a verified email automatically.',
                                    icon: Mail,
                                },
                                {
                                    title: 'Start shopping or finish onboarding',
                                    text: 'Buyers can shop after email verification. Sellers and delivery partners finish an application for review.',
                                    icon: ShieldCheck,
                                },
                            ].map(({ title, text, icon: Icon }, index) => (
                                <li key={title} className="flex gap-3">
                                    <span className="bg-accent text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                                        <Icon className="size-4" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium">
                                            0{index + 1} · {title}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{text}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>
                </aside>
                <section className="bg-card rounded-3xl border p-5 shadow-sm shadow-black/[.02] sm:p-8">
                    <div className="mb-7">
                        <p className="text-primary mb-2 text-xs font-semibold tracking-widest uppercase">Join LubosMart</p>
                        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">Email and password are all you need to start.</p>
                    </div>
                    <RegistrationForm />
                    <p className="text-muted-foreground mt-6 border-t pt-5 text-center text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary font-medium">
                            Log in
                        </Link>
                    </p>
                </section>
            </main>
        </div>
    );
}
