import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import { Moon, Sun } from 'lucide-react';

export function SidebarThemeToggle() {
    const { appearance, updateAppearance } = useAppearance();
    const dark = appearance === 'dark';
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    onClick={() => updateAppearance(dark ? 'light' : 'dark')}
                    aria-label={label}
                    tooltip={label}
                    className="min-h-11 group-data-[collapsible=icon]:min-h-11"
                >
                    {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
                    <span>{dark ? 'Light mode' : 'Dark mode'}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
