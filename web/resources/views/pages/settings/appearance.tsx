import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/settings/appearance-tabs';
import HeadingSmall from '@/components/shared/heading-small';
import { type BreadcrumbItem } from '@/types';

import SettingsPage from '@/components/settings/settings-page';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    return (
        <SettingsPage title="Appearance settings" breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <div className="space-y-6">
                <HeadingSmall
                    title="Website appearance"
                    description="Choose light or dark mode. Your preference stays on this browser, including after signing out."
                />
                <AppearanceTabs />
            </div>
        </SettingsPage>
    );
}
