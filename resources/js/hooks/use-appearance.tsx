export function initializeTheme() {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'only light';

    // Replace older saved preferences without depending on browser storage access.
    try {
        localStorage.setItem('appearance', 'light');
    } catch {
        // The light theme also works when browser storage is unavailable.
    }
}
