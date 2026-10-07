import AuthFeedback from '@/components/auth-feedback';
import AppLayout from '@/layouts/app-layout';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useId } from 'react';

export const money = (value: string | number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value));
export const buttonClass =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryClass =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';
export const inputClass =
    'min-h-11 w-full min-w-0 rounded-xl border bg-background px-3.5 py-2.5 text-sm transition-colors placeholder:text-muted-foreground/65 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:outline-none aria-invalid:border-primary disabled:cursor-not-allowed disabled:opacity-60';
export function Page({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
    const { auth, status, errors } = usePage<SharedData>().props;
    const content = (
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
            <Head title={title} />
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
                    {description && <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">{description}</p>}
                </div>
                {action}
            </div>
            {status && (
                <div role="status" className="border-primary/15 bg-accent/60 rounded-xl border px-4 py-3 text-sm leading-relaxed">
                    {status}
                </div>
            )}
            {Object.keys(errors).length > 0 && (
                <div role="alert" className="border-primary/15 bg-accent/60 rounded-xl border px-4 py-3 text-sm leading-relaxed">
                    {[...new Set(Object.values(errors))].map((error, i) => (
                        <p key={i} className={i ? 'mt-1' : ''}>
                            {error}
                        </p>
                    ))}
                </div>
            )}
            {children}
        </div>
    );
    return auth.user ? (
        <AppLayout breadcrumbs={[{ title, href: '#' }]}>{content}</AppLayout>
    ) : (
        <>
            <header className="bg-card border-b">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <img src="/logo.svg" alt="" className="size-9" />
                        LubosMart
                    </Link>
                    <nav aria-label="Marketplace navigation" className="flex items-center gap-4">
                        <Link href="/" className="text-muted-foreground hover:text-primary hidden text-sm sm:inline-flex">
                            Home
                        </Link>
                        <Link href="/login" className={secondaryClass}>
                            Log in
                        </Link>
                    </nav>
                </div>
            </header>
            <main>{content}</main>
        </>
    );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <section className={`bg-card min-w-0 rounded-2xl border p-5 shadow-sm shadow-black/[.02] sm:p-6 ${className}`}>{children}</section>;
}
export function Empty({ title, description, href, label }: { title: string; description: string; href?: string; label?: string }) {
    return (
        <Card className="flex flex-col items-center gap-2 !py-12 text-center sm:!py-16">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{description}</p>
            {href && (
                <Link href={href} className={`${buttonClass} mt-3`}>
                    {label}
                </Link>
            )}
        </Card>
    );
}
export function Badge({ status }: { status: string }) {
    const good = ['completed', 'delivered', 'approved', 'active', 'reconciled'].includes(status);
    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${good ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : ['cancelled', 'rejected', 'suspended', 'deactivated', 'blocked', 'failed', 'hidden'].includes(status) ? 'bg-destructive/10 text-destructive' : 'bg-accent text-primary'}`}
        >
            {status.replaceAll('_', ' ')}
        </span>
    );
}
export type Pagination<T> = { data: T[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
export function Pager({ links }: { links: Pagination<unknown>['links'] }) {
    return (
        <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-2">
            {links.length > 3 &&
                links.map((link, i) =>
                    link.url ? (
                        <Link
                            key={i}
                            href={link.url}
                            preserveScroll
                            className={`${secondaryClass} ${link.active ? 'bg-accent text-primary' : ''}`}
                            aria-current={link.active ? 'page' : undefined}
                        >
                            {link.label.replace(/&laquo;|&raquo;/g, '').trim()}
                        </Link>
                    ) : (
                        <span key={i} className={`${secondaryClass} opacity-40`}>
                            {link.label.replace(/&laquo;|&raquo;/g, '').trim()}
                        </span>
                    ),
                )}
        </nav>
    );
}
export function Field({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
        <div className="grid gap-2">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>
            <input
                className={inputClass}
                {...props}
                id={id}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : props['aria-describedby']}
            />
            <AuthFeedback id={`${id}-error`} message={error} />
        </div>
    );
}
export function Select({ label, children, error, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
        <div className="grid gap-2">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>
            <select
                className={inputClass}
                {...props}
                id={id}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : props['aria-describedby']}
            >
                {children}
            </select>
            <AuthFeedback id={`${id}-error`} message={error} />
        </div>
    );
}
