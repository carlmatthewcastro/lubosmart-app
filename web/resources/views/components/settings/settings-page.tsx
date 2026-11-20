import { roleSettingsItems, SettingsSections } from '@/components/settings/settings-sections';
import { Page } from '@/components/shared/marketplace-ui';
import type { BreadcrumbItem, SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

export default function SettingsPage({ title, children }: { title: string; breadcrumbs?: BreadcrumbItem[]; children: ReactNode }) {
    const { auth } = usePage<SharedData>().props;
    return (
        <Page title={title} description="Manage your account details, preferences, and security.">
            <SettingsSections items={roleSettingsItems(auth.user.role)}>
                <section className="min-w-0 space-y-6">{children}</section>
            </SettingsSections>
        </Page>
    );
}
