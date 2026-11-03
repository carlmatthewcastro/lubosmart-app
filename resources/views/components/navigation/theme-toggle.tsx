import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
    const { appearance, updateAppearance } = useAppearance();
    const dark = appearance === 'dark';
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';

    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            aria-label={label}
            title={label}
            onClick={() => updateAppearance(dark ? 'light' : 'dark')}
        >
            {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
    );
}
