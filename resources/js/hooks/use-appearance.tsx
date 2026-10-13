import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const prefersDark = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const applyTheme = (appearance: Appearance) => {
    if (typeof document === 'undefined') return;
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());
    document.documentElement.classList.toggle('dark', isDark);
};

const getMediaQuery = () => {
    if (typeof window === 'undefined') return null;
    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = () => {
    if (typeof window === 'undefined') return;
    const currentAppearance = (localStorage.getItem('appearance') as Appearance) || 'light';
    applyTheme(currentAppearance);
};

export function initializeTheme() {
    if (typeof window === 'undefined') return;
    let savedAppearance = localStorage.getItem('appearance') as Appearance;
    if (!savedAppearance || savedAppearance === 'system') {
        savedAppearance = 'light';
        localStorage.setItem('appearance', 'light');
    }
    applyTheme(savedAppearance);

    const mq = getMediaQuery();
    if (mq) {
        mq.addEventListener('change', handleSystemThemeChange);
    }
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('appearance') as Appearance) || 'light';
        }
        return 'light';
    });

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('appearance', mode);
        }
        applyTheme(mode);
    };

    useEffect(() => {
        const saved = (localStorage.getItem('appearance') as Appearance) || 'light';
        setAppearance(saved);
        applyTheme(saved);

        const mq = getMediaQuery();
        if (mq) {
            mq.addEventListener('change', handleSystemThemeChange);
            return () => mq.removeEventListener('change', handleSystemThemeChange);
        }
    }, []);

    return { appearance, updateAppearance };
}
