import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { Toaster } from './components/toast';
import { initializeTheme } from './hooks/use-appearance';
import { installPermissionErrorHandlers } from './lib/permission-errors';
import { setCsrfToken } from './lib/utils';
import { registerServiceWorker } from './services/desktop-notifications';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        if (typeof window !== 'undefined') {
            installPermissionErrorHandlers();
            registerServiceWorker();

            const initialToken = (props.initialPage.props as any)?.csrf_token;
            if (initialToken) {
                setCsrfToken(initialToken);
            }

            router.on('navigate', (event) => {
                const token = (event.detail.page.props as any)?.csrf_token;
                if (token) {
                    setCsrfToken(token);
                }
            });
        }

        const root = createRoot(el);

        root.render(
            <>
                <App {...props} />
                <Toaster />
            </>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
