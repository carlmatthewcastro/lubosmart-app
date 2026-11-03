import { SettingsSections, roleSettingsItems } from '@/components/settings/settings-sections';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        url: '/settings/profile',
        icon: null,
    },
    {
        title: 'Password',
        url: '/settings/password',
        icon: null,
    },
    { title: 'Addresses', url: '/settings/addresses', icon: null },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const {
        props: { auth },
        url,
    } = usePage<SharedData>();
    const currentPath = url.split(/[?#]/)[0];
    const [hash, setHash] = useState('');
    useEffect(() => {
        const updateHash = () => setHash(window.location.hash);
        updateHash();
        window.addEventListener('hashchange', updateHash);
        return () => window.removeEventListener('hashchange', updateHash);
    }, [url]);
    const items =
        auth.user.role === 'logistics'
            ? [
                  sidebarNavItems[0],
                  { title: 'Account settings', url: '/settings/account', icon: null },
                  { title: 'Contact details', url: '/settings/profile#contact-details', icon: null },
                  { title: 'Personal information', url: '/settings/profile#personal-information', icon: null },
                  { title: 'Business details', url: '/settings/profile#business-details', icon: null },
                  { title: 'Submitted documents', url: '/settings/profile#submitted-documents', icon: null },
                  ...sidebarNavItems.slice(1),
              ]
            : ['rider', 'seller'].includes(auth.user.role)
              ? [
                    { title: 'Personal details', url: '/settings/profile#personal-information', icon: null },
                    {
                        title: auth.user.role === 'seller' ? 'Store and bank details' : 'Rider details',
                        url: auth.user.role === 'seller' ? '/settings/profile#business-details' : '/settings/profile#rider-details',
                        icon: null,
                    },
                    { title: 'Registered address', url: '/settings/profile#registered-address', icon: null },
                    { title: 'Submitted documents', url: '/settings/profile#submitted-documents', icon: null },
                    { title: 'Contact and security', url: '/settings/profile#contact-details', icon: null },
                    ...sidebarNavItems.slice(1),
                ]
              : sidebarNavItems;
    const isActive = (target: string) => target === currentPath + (currentPath === '/settings/profile' ? hash : '');

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
            <div className="mb-8 space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">{auth.user.role === 'admin' ? 'My Account' : 'Settings'}</h1>
                <p className="text-muted-foreground text-sm">
                    {auth.user.role === 'admin' ? 'Profile and sign-in security.' : 'Manage your profile and account settings'}
                </p>
            </div>

            {auth.user.role !== 'admin' ? (
                <SettingsSections items={roleSettingsItems(auth.user.role)}>
                    <section className="max-w-3xl space-y-8">{children}</section>
                </SettingsSections>
            ) : (
                <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
                    <aside className="w-full max-w-xl lg:w-48">
                        <nav className="grid grid-cols-2 gap-1 lg:flex lg:flex-col" aria-label="Account settings">
                            {items
                                .filter((item) => auth.user.role !== 'admin' || item.url !== '/settings/addresses')
                                .map((item) => (
                                    <Button
                                        key={item.url}
                                        size="sm"
                                        variant="ghost"
                                        asChild
                                        className={cn('min-h-11 w-full justify-start text-left whitespace-normal', {
                                            'bg-accent text-primary': isActive(item.url),
                                        })}
                                    >
                                        {item.url.includes('#') ? (
                                            <a href={item.url} aria-current={isActive(item.url) ? 'location' : undefined}>
                                                {item.title}
                                            </a>
                                        ) : (
                                            <Link href={item.url} prefetch aria-current={isActive(item.url) ? 'page' : undefined}>
                                                {auth.user.role === 'admin' && item.url === '/settings/profile' ? 'Profile' : item.title}
                                            </Link>
                                        )}
                                    </Button>
                                ))}
                        </nav>
                    </aside>

                    <div className="min-w-0 flex-1">
                        <section className="max-w-3xl space-y-8">{children}</section>
                    </div>
                </div>
            )}
        </div>
    );
}
