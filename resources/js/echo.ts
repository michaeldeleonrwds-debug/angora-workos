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

    const pageProtocol = window.location.protocol;
    const isPageSecure = pageProtocol === 'https:';

    // 1. Host: Explicit env var or current hostname (e.g. angora.test)
    const configuredHost = import.meta.env.VITE_REVERB_HOST;
    const host = configuredHost && configuredHost.trim() !== ''
        ? (configuredHost === 'localhost' ? '127.0.0.1' : configuredHost)
        : window.location.hostname;

    // 2. Port: Explicit env var or standard HTTPS/HTTP port
    const configuredPort = import.meta.env.VITE_REVERB_PORT;
    const port = configuredPort && String(configuredPort).trim() !== ''
        ? parseInt(String(configuredPort), 10)
        : (isPageSecure ? 443 : 80);

    // 3. Scheme & TLS: Explicit env var or match current page security
    const configuredScheme = import.meta.env.VITE_REVERB_SCHEME;
    const scheme = configuredScheme && configuredScheme.trim() !== ''
        ? configuredScheme
        : (isPageSecure ? 'https' : 'http');
    const isTls = scheme === 'https';

    try {
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: key,
            wsHost: host,
            wsPort: port,
            wssPort: port,
            forceTLS: isTls,
            enabledTransports: ['ws', 'wss'],
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

        // Connection state logging for smooth debugging & graceful reconnection
        if (echoInstance && (echoInstance as any).connector?.pusher?.connection) {
            const pusherConn = (echoInstance as any).connector.pusher.connection;
            pusherConn.bind('state_change', (states: { previous: string; current: string }) => {
                if (states.current === 'connected') {
                    console.info('[Echo] Real-time collaboration connected via Reverb.');
                } else if (states.current === 'unavailable' || states.current === 'failed') {
                    console.warn(`[Echo] WebSocket connection ${states.current}. Retrying automatically...`);
                }
            });
        }

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
