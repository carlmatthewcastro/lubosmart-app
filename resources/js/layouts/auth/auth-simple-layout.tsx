import AppLogoIcon from '@/components/app-logo-icon';
import { SkipLink } from '@/components/skip-link';
import { Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <SkipLink />
            <main id="main-content" tabIndex={-1} className="bg-card w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link href={route('home')} className="flex flex-col items-center gap-2 font-medium">
                            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-md">
                                <AppLogoIcon className="size-9 fill-current text-[var(--foreground)] dark:text-white" />
                            </div>
                            <span className="sr-only">LubosMart home</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                            <p className="text-muted-foreground text-center text-sm leading-relaxed">{description}</p>
                        </div>
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}
