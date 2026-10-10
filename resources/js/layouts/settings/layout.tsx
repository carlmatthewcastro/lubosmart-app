import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

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
    const currentPath = url.split('?')[0];

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
            <Heading
                title={auth.user.role === 'admin' ? 'My Account' : 'Settings'}
                description={auth.user.role === 'admin' ? 'Profile and sign-in security.' : 'Manage your profile and account settings'}
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="grid grid-cols-2 gap-1 lg:flex lg:flex-col" aria-label="Account settings">
                        {sidebarNavItems
                            .filter((item) => auth.user.role !== 'admin' || item.url !== '/settings/addresses')
                            .map((item) => (
                                <Button
                                    key={item.url}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn('min-h-11 w-full justify-start', {
                                        'bg-accent text-primary': currentPath === item.url,
                                    })}
                                >
                                    <Link href={item.url} prefetch aria-current={currentPath === item.url ? 'page' : undefined}>
                                        {auth.user.role === 'admin' && item.url === '/settings/profile' ? 'Profile' : item.title}
                                    </Link>
                                </Button>
                            ))}
                    </nav>
                </aside>

                <div className="min-w-0 flex-1">
                    <section className="max-w-3xl space-y-8">{children}</section>
                </div>
            </div>
        </div>
    );
}
