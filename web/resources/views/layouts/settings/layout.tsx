import { SettingsSections, roleSettingsItems } from '@/components/settings/settings-sections';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const { auth } = usePage<SharedData>().props;
    return (
        <div className="w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mb-6 space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
                <p className="text-muted-foreground text-sm">Manage your profile and sign-in security.</p>
            </div>
            <SettingsSections items={roleSettingsItems(auth.user.role)}>
                <section className="min-w-0 space-y-6">{children}</section>
            </SettingsSections>
        </div>
    );
}
