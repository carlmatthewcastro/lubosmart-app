import { secondaryClass } from '@/components/marketplace-ui';
import OnboardingSteps from '@/components/onboarding-steps';
import { SkipLink } from '@/components/skip-link';
import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

export default function OnboardingLayout({
    title,
    step,
    children,
    authenticated = true,
}: {
    title: string;
    step?: 1 | 2 | 3 | 4;
    children: ReactNode;
    authenticated?: boolean;
}) {
    return (
        <div className="bg-background min-h-svh">
            <Head title={title} />
            <SkipLink />
            <header className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <img src="/logo.svg" alt="" className="size-9" />
                    LubosMart
                </Link>
                {authenticated ? (
                    <Link href={route('logout')} method="post" as="button" className={secondaryClass}>
                        Log out
                    </Link>
                ) : (
                    <Link href="/login" className={secondaryClass}>
                        Log in
                    </Link>
                )}
            </header>
            <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl space-y-7 px-4 pb-12 sm:px-6">
                {step && <OnboardingSteps current={step} />}
                <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-8">{children}</section>
            </main>
        </div>
    );
}
