import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { Building2, FileText, KeyRound, MapPin, MapPinned, ShieldCheck, UserRound } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

export type SettingsItem = { title: string; url: string; group?: string };
export function SettingsSections({ items, children, onSelect }: { items: SettingsItem[]; children: ReactNode; onSelect?: (url: string) => void }) {
    const { url } = usePage();
    const [hash, setHash] = useState('');
    useEffect(() => {
        const update = () => setHash(window.location.hash);
        update();
        window.addEventListener('hashchange', update);
        return () => window.removeEventListener('hashchange', update);
    }, [url]);
    const originalPath = url.split(/[?#]/)[0];
    const path =
        originalPath === '/settings/profile' && items.some((item) => item.url.startsWith('/settings/account#')) ? '/settings/account' : originalPath;
    return (
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:gap-8">
            <aside className="workspace-card bg-card w-full shrink-0 self-start rounded-2xl border p-3 lg:sticky lg:top-24 lg:w-64">
                <nav aria-label="Account settings categories" className="grid grid-cols-1 gap-1 sm:grid-cols-1">
                    {items.map((item, index) => {
                        const target = item.url.startsWith('#') ? path + item.url : item.url;
                        const active = target === path + hash || (!hash && target === path + '#personal-information');
                        const Icon = /password/.test(target)
                            ? KeyRound
                            : /documents/.test(target)
                              ? FileText
                              : /service-areas/.test(target)
                                ? MapPinned
                                : /address/.test(target)
                                  ? MapPin
                                  : /business|rider-details/.test(target)
                                    ? Building2
                                    : /contact/.test(target)
                                      ? ShieldCheck
                                      : UserRound;
                        return (
                            <div key={item.url} className="min-w-0">
                                {item.group && item.group !== items[index - 1]?.group && (
                                    <p className={cn('text-foreground px-3 pt-3 pb-2 text-sm font-semibold', index > 0 && 'mt-3 border-t')}>
                                        {item.group}
                                    </p>
                                )}
                                <Button
                                    asChild
                                    variant="ghost"
                                    className={cn(
                                        'min-h-11 w-full justify-start gap-3 text-left font-normal whitespace-normal',
                                        active && 'bg-accent text-primary font-semibold',
                                    )}
                                >
                                    {target.split('#')[0] === path && target.includes('#') ? (
                                        <a
                                            href={`#${target.split('#')[1]}`}
                                            aria-current={active ? 'location' : undefined}
                                            onClick={() => onSelect?.(target)}
                                        >
                                            <Icon aria-hidden="true" className="size-5 shrink-0" />
                                            {item.title}
                                        </a>
                                    ) : (
                                        <Link href={target} aria-current={active ? 'page' : undefined} onClick={() => onSelect?.(target)}>
                                            <Icon aria-hidden="true" className="size-5 shrink-0" />
                                            {item.title}
                                        </Link>
                                    )}
                                </Button>
                            </div>
                        );
                    })}
                </nav>
            </aside>
            <div className="min-w-0 flex-1 space-y-6">{children}</div>
        </div>
    );
}

export function roleSettingsItems(role: string): SettingsItem[] {
    if (role === 'admin')
        return [
            { title: 'Administrator profile', url: '/settings/profile', group: 'Account information' },
            { title: 'Password', url: '/settings/password', group: 'Security' },
        ];
    const root = role === 'logistics' ? '/settings/account' : '/settings/profile';
    const categories = [
        { title: 'Personal details', group: 'Account information', url: `${root}#personal-information` },
        ...(role === 'buyer'
            ? []
            : [
                  {
                      group: role === 'rider' ? 'Rider registration' : 'Business information',
                      title: role === 'seller' ? 'Store and bank details' : role === 'rider' ? 'Rider details' : 'Company registration',
                      url: `${root}#${role === 'rider' ? 'rider-details' : 'business-details'}`,
                  },
              ]),
        { title: 'Registered address', url: `${root}#registered-address` },
        ...(role === 'logistics' ? [{ title: 'Service areas', url: `${root}#service-areas` }] : []),
        { title: 'Submitted documents', url: `${root}#submitted-documents` },
        { title: 'Contact and security', group: 'Security', url: `${root}#contact-details` },
    ];
    return [
        ...categories,
        { title: 'Password', group: undefined, url: '/settings/password' },
        { title: 'My addresses', group: 'Address management', url: '/settings/addresses' },
    ];
}
