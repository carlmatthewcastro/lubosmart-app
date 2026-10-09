import { useState } from 'react';
export type Appearance = 'light' | 'dark';
function savedAppearance(): Appearance {
    try { return localStorage.getItem('appearance') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}
function applyTheme(value: Appearance) {
    document.documentElement.classList.toggle('dark', value === 'dark');
    document.documentElement.style.colorScheme = value;
}
export function initializeTheme() { applyTheme(savedAppearance()); }
export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(savedAppearance);
    const updateAppearance = (value: Appearance) => {
        setAppearance(value); applyTheme(value);
        try { localStorage.setItem('appearance', value); } catch { /* Theme also works without storage. */ }
    };
    return { appearance, updateAppearance };
}
