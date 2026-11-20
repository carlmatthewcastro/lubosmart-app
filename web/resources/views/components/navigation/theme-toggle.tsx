import { ThemeModeIcon } from '@/components/navigation/theme-toggle-visual';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';

export function ThemeToggle() {
    const { appearance, updateAppearance } = useAppearance();
    const dark = appearance === 'dark';
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';

    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-2xl"
            aria-label={label}
            title={label}
            onClick={() => updateAppearance(dark ? 'light' : 'dark')}
        >
            <ThemeModeIcon dark={dark} />
        </Button>
    );
}
