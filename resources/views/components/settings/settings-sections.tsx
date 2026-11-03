import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { type ReactNode, useEffect, useState } from 'react';

export type SettingsItem = { title: string; url: string };
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
            <aside className="w-full shrink-0 lg:w-56">
                <nav aria-label="Account settings categories" className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
                    {items.map((item) => {
                        const target = item.url.startsWith('#') ? path + item.url : item.url;
                        const active = target === path + hash || (!hash && target === path + '#personal-information');
                        return (
                            <Button
                                key={item.url}
                                asChild
                                variant="ghost"
                                className={cn('min-h-11 justify-start text-left whitespace-normal', active && 'bg-accent text-primary')}
                            >
                                {target.split('#')[0] === path && target.includes('#') ? (
                                    <a
                                        href={`#${target.split('#')[1]}`}
                                        aria-current={active ? 'location' : undefined}
                                        onClick={() => onSelect?.(target)}
                                    >
                                        {item.title}
                                    </a>
                                ) : (
                                    <Link href={target} aria-current={active ? 'page' : undefined} onClick={() => onSelect?.(target)}>
                                        {item.title}
                                    </Link>
                                )}
                            </Button>
                        );
                    })}
                </nav>
            </aside>
            <div className="min-w-0 flex-1 space-y-6">{children}</div>
        </div>
    );
}

export function roleSettingsItems(role: string): SettingsItem[] {
    const root = role === 'logistics' ? '/settings/account' : '/settings/profile';
    const categories =
        role === 'buyer'
            ? []
            : [
                  { title: 'Personal details', url: `${root}#personal-information` },
                  {
                      title: role === 'seller' ? 'Store and bank details' : role === 'rider' ? 'Rider details' : 'Company registration',
                      url: `${root}#${role === 'rider' ? 'rider-details' : 'business-details'}`,
                  },
                  { title: 'Registered address', url: `${root}#registered-address` },
                  ...(role === 'logistics' ? [{ title: 'Service areas', url: `${root}#service-areas` }] : []),
                  { title: 'Submitted documents', url: `${root}#submitted-documents` },
                  { title: 'Contact and security', url: `${root}#contact-details` },
              ];
    return [
        ...(role === 'buyer' ? [{ title: 'Profile', url: root }] : categories),
        { title: 'Password', url: '/settings/password' },
        { title: 'Addresses', url: '/settings/addresses' },
    ];
}
