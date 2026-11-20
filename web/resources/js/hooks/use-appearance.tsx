import { useEffect, useState } from 'react';
export type Appearance = 'light' | 'dark';
function savedAppearance(): Appearance {
    try {
        return localStorage.getItem('appearance') === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
}
function applyTheme(value: Appearance) {
    document.documentElement.classList.toggle('dark', value === 'dark');
    document.documentElement.style.colorScheme = value;
}
export function initializeTheme() {
    applyTheme(savedAppearance());
}
export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(savedAppearance);
    useEffect(() => {
        const sync = (event: Event) => setAppearance((event as CustomEvent<Appearance>).detail);
        const syncStorage = (event: StorageEvent) => {
            if (event.key === 'appearance' || event.key === null) {
                const value = savedAppearance();
                setAppearance(value);
                applyTheme(value);
            }
        };
        window.addEventListener('appearance:changed', sync);
        window.addEventListener('storage', syncStorage);
        return () => {
            window.removeEventListener('appearance:changed', sync);
            window.removeEventListener('storage', syncStorage);
        };
    }, []);
    const updateAppearance = (value: Appearance) => {
        setAppearance(value);
        applyTheme(value);
        window.dispatchEvent(new CustomEvent('appearance:changed', { detail: value }));
        try {
            localStorage.setItem('appearance', value);
        } catch {
            /* Theme also works without storage. */
        }
    };
    return { appearance, updateAppearance };
}
