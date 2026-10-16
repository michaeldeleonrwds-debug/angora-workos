import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getCsrfToken } from '@/lib/utils';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any> | null;
    }
}

window.Pusher = Pusher;

let echoInstance: Echo<any> | null = null;

/**
 * Resolves or creates a singleton Laravel Echo instance configured for Laravel Reverb.
 * Falls back gracefully if WebSocket configuration is missing or Reverb is unreachable.
 */
export function getEcho(): Echo<any> | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const key = import.meta.env.VITE_REVERB_APP_KEY;
    if (!key) {
        return null;
    }

    if (echoInstance) {
        return echoInstance;
    }

    const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
    const port = import.meta.env.VITE_REVERB_PORT ? parseInt(import.meta.env.VITE_REVERB_PORT, 10) : 8080;
    const scheme = import.meta.env.VITE_REVERB_SCHEME || (window.location.protocol === 'https:' ? 'https' : 'http');
    const isTls = scheme === 'https' || window.location.protocol === 'https:';

    try {
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: key,
            wsHost: host,
            wsPort: isTls ? (import.meta.env.VITE_REVERB_PORT ? port : 443) : port,
            wssPort: isTls ? (import.meta.env.VITE_REVERB_PORT ? port : 443) : port,
            forceTLS: isTls,
            enabledTransports: isTls ? ['wss', 'ws'] : ['ws'],
            authorizer: (channel: { name: string }) => {
                return {
                    authorize: (socketId: string, callback: (error: any, authData: any) => void) => {
                        fetch('/broadcasting/auth', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Accept: 'application/json',
                                'X-CSRF-TOKEN': getCsrfToken(),
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            credentials: 'same-origin',
                            body: JSON.stringify({
                                socket_id: socketId,
                                channel_name: channel.name,
                            }),
                        })
                            .then(async (response) => {
                                if (!response.ok) {
                                    const errData = await response.json().catch(() => ({}));
                                    throw new Error(errData.message || `Broadcasting auth failed (${response.status})`);
                                }
                                return response.json();
                            })
                            .then((data) => callback(null, data))
                            .catch((err) => callback(err, null));
                    },
                };
            },
        });

        window.Echo = echoInstance;
        return echoInstance;
    } catch (err) {
        console.warn('[Echo] Real-time collaboration initialization bypassed:', err);
        return null;
    }
}

/**
 * Disconnect and clean up Echo connection (e.g. on logout or teardown).
 */
export function disconnectEcho(): void {
    if (echoInstance) {
        try {
            echoInstance.disconnect();
        } catch {
            // ignore
        }
        echoInstance = null;
        window.Echo = null;
    }
}
