import AuthFeedback from '@/components/auth/auth-feedback';
import LogisticsPageBanner from '@/components/logistics/page-banner';
import PublicHeader from '@/components/navigation/public-header';
import { SkipLink } from '@/components/shell/skip-link';
import { buttonVariants } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useId } from 'react';

export const money = (value: string | number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value));
const roleLabels: Record<string, string> = { buyer: 'Buyer', seller: 'Seller', rider: 'Rider', logistics: 'Logistics', admin: 'Admin' };
export const roleLabel = (role: string | null | undefined) => (role ? (roleLabels[role] ?? role.replaceAll('_', ' ')) : 'No Role Selected');
export const buttonClass = buttonVariants();
export const secondaryClass = buttonVariants({ variant: 'outline' });
export const inputClass =
    'min-h-11 w-full min-w-0 rounded-control border border-input bg-background px-4 py-2 text-base leading-6 transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60 md:text-sm';

export function Notice({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'error' | 'warning' }) {
    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={cn('rounded-xl border px-4 py-3 text-sm leading-relaxed', {
                'border-success/30 bg-success/5 text-success': tone === 'success',
                'border-destructive/30 bg-destructive/5 text-destructive': tone === 'error',
                'border-warning/30 bg-warning/5 text-warning': tone === 'warning',
            })}
        >
            {children}
        </div>
    );
}
export function Page({
    title,
    description,
    action,
    children,
    embedded = false,
    headerInNavbar = false,
    storefront = false,
    banner = 'shopping',
    showLogisticsBanner = true,
    logisticsBannerTitle,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    embedded?: boolean;
    headerInNavbar?: boolean;
    storefront?: boolean;
    banner?: 'shopping' | 'orders';
    showLogisticsBanner?: boolean;
    logisticsBannerTitle?: string;
}) {
    const { auth, status, errors } = usePage<SharedData>().props;
    const logisticsBanner = showLogisticsBanner && auth.user?.role === 'logistics' && !embedded && !storefront;
    const NavbarHeading = logisticsBanner ? 'span' : 'h1';
    const ContentHeading = embedded ? 'h2' : 'h1';
    const useNavbarHeader = (headerInNavbar || !!auth.user) && !embedded && !storefront;
    const pageHeader = (
        <div className="min-w-0">
            <NavbarHeading className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">{title}</NavbarHeading>
            {description && !logisticsBanner && (
                <p
                    title={description}
                    className={cn(
                        'text-muted-foreground mt-1 text-xs leading-relaxed md:truncate md:text-sm',
                        auth.user?.role === 'logistics' && 'hidden sm:block',
                    )}
                >
                    {description}
                </p>
            )}
        </div>
    );
    const content = (
        <div className={cn('workspace-page flex w-full min-w-0 flex-col gap-6 px-4 py-6', storefront && 'catalog-storefront gap-4 py-4')}>
            {!embedded && <Head title={title} />}
            {logisticsBanner && <LogisticsPageBanner title={logisticsBannerTitle ?? title} description={description} />}
            {!useNavbarHeader && (
                <div
                    className={cn(
                        'flex flex-wrap items-start justify-between gap-4 border-b pb-6',
                        storefront && `catalog-intro catalog-intro-${banner}`,
                    )}
                >
                    <div className="min-w-0">
                        <ContentHeading className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</ContentHeading>
                        {description && <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">{description}</p>}
                    </div>
                    {action}
                </div>
            )}
            {useNavbarHeader && action && <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">{action}</div>}
            {status && !['buyer', 'seller', 'rider', 'logistics'].includes(auth.user?.role ?? '') && <Notice>{status}</Notice>}
            {Object.keys(errors).length > 0 && (
                <Notice tone="error">
                    {[...new Set(Object.values(errors))].map((error, i) => (
                        <p key={i} className={i ? 'mt-1' : ''}>
                            {error}
                        </p>
                    ))}
                </Notice>
            )}
            {children}
        </div>
    );
    if (embedded) return content;
    return auth.user ? (
        <AppLayout breadcrumbs={[{ title, href: '#' }]} pageHeader={useNavbarHeader ? pageHeader : undefined}>
            {content}
        </AppLayout>
    ) : (
        <div className={storefront ? 'reference-page reference-catalog' : 'reference-page'}>
            <SkipLink />
            <div className="reference-page reference-home" style={{ minHeight: 0 }}>
                <PublicHeader home />
            </div>
            <main id="main-content" tabIndex={-1}>
                {content}
            </main>
        </div>
    );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <section className={cn('workspace-card bg-card min-w-0 rounded-2xl border p-5 sm:p-6', className)}>{children}</section>;
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
export function Badge({ status, label }: { status: string; label?: string }) {
    const good = ['completed', 'delivered', 'approved', 'active', 'reconciled'].includes(status);
    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${good ? 'bg-success/10 text-success' : ['cancelled', 'rejected', 'suspended', 'deactivated', 'blocked', 'failed', 'hidden'].includes(status) ? 'bg-destructive/10 text-destructive' : 'bg-accent text-primary'}`}
        >
            {label ?? status.replaceAll('_', ' ')}
        </span>
    );
}
export type Pagination<T> = { data: T[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
export function Pager({ links }: { links: Pagination<unknown>['links'] }) {
    if (links.length <= 3) return null;
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
export function Field({
    label,
    error,
    hint,
    className,
    reserveFeedback = true,
    ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; reserveFeedback?: boolean }) {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
        <div className="grid min-w-0 content-start gap-2">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>
            <input
                className={cn(inputClass, className)}
                {...props}
                id={id}
                aria-invalid={error ? true : props['aria-invalid']}
                aria-describedby={[props['aria-describedby'], hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined}
            />
            {hint && (
                <p id={`${id}-hint`} className="text-muted-foreground text-sm leading-relaxed">
                    {hint}
                </p>
            )}
            <AuthFeedback id={`${id}-error`} message={error} reserveSpace={reserveFeedback} />
        </div>
    );
}
export function Select({
    label,
    children,
    error,
    className,
    reserveFeedback = true,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; reserveFeedback?: boolean }) {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
        <div className="grid min-w-0 grid-cols-1 content-start gap-2">
            <label htmlFor={id} className={cn('text-sm font-medium', reserveFeedback && 'min-h-5')}>
                {label}
            </label>
            <select
                className={cn(inputClass, 'max-w-full min-w-0', className)}
                {...props}
                id={id}
                aria-invalid={error ? true : props['aria-invalid']}
                aria-describedby={[props['aria-describedby'], error && `${id}-error`].filter(Boolean).join(' ') || undefined}
            >
                {children}
            </select>
            <AuthFeedback id={`${id}-error`} message={error} reserveSpace={reserveFeedback} />
        </div>
    );
}

export function Textarea({ label, error, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
        <div className="grid min-w-0 content-start gap-2">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>
            <textarea
                {...props}
                id={id}
                className={cn(inputClass, 'resize-none overflow-y-auto', className)}
                aria-invalid={error ? true : props['aria-invalid']}
                aria-describedby={[props['aria-describedby'], error && `${id}-error`].filter(Boolean).join(' ') || undefined}
            />
            <AuthFeedback id={`${id}-error`} message={error} reserveSpace />
        </div>
    );
}
