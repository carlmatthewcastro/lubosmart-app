import { ThemeModeIcon, ThemeSwitchTrack } from '@/components/navigation/theme-toggle-visual';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';

export function SidebarThemeToggle() {
    const { appearance, updateAppearance } = useAppearance();
    const dark = appearance === 'dark';
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    type="button"
                    role="switch"
                    aria-checked={dark}
                    onClick={() => updateAppearance(dark ? 'light' : 'dark')}
                    aria-label="Dark mode"
                    tooltip={label}
                    className="border-primary/15 bg-accent/60 text-foreground hover:bg-accent min-h-14 gap-3 rounded-2xl border px-3 shadow-sm group-data-[collapsible=icon]:justify-center"
                >
                    <ThemeModeIcon dark={dark} className="group-data-[collapsible=icon]:size-5" />
                    <span className="min-w-0 flex-1 text-sm font-medium group-data-[collapsible=icon]:hidden">
                        {dark ? 'Dark mode' : 'Light mode'}
                    </span>
                    <ThemeSwitchTrack dark={dark} className="group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
