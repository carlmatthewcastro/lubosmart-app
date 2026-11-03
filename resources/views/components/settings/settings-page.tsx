import { roleSettingsItems, SettingsSections } from '@/components/settings/settings-sections';
import { Page } from '@/components/shared/marketplace-ui';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem, SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

export default function SettingsPage({ title, breadcrumbs, children }: { title: string; breadcrumbs?: BreadcrumbItem[]; children: ReactNode }) {
    const { auth } = usePage<SharedData>().props;
    if (auth.user.role === 'admin')
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <SettingsLayout>{children}</SettingsLayout>
            </AppLayout>
        );
    return (
        <Page title={title} description="Manage your account details, preferences, and security.">
            <SettingsSections items={roleSettingsItems(auth.user.role)}>
                <section className="max-w-3xl space-y-8">{children}</section>
            </SettingsSections>
        </Page>
    );
}
