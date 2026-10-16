/**
 * Angora Work OS — Desktop & Web Push Notification Client
 *
 * Provides native desktop notification dispatching, Service Worker lifecycle
 * management, Push API subscription handling, and deduplication.
 */

import { router } from '@inertiajs/react';
import { csrfHeaders } from '@/lib/utils';

// Set of notification IDs handled in the current session to prevent duplicates
const handledNotificationIds = new Set<string | number>();

/**
 * Check if the browser supports standard Desktop Notifications.
 */
export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Check if the browser supports Service Worker & PushManager.
 */
export function isPushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * Get current notification permission state.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (!isNotificationSupported()) {
        return 'unsupported';
    }
    return Notification.permission;
}

/**
 * Request notification permission from the user.
 * IMPORTANT: MUST only be called in direct response to a user interaction (e.g. clicking 'Enable').
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isNotificationSupported()) {
        throw new Error('Notifications are not supported in this browser.');
    }

    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (e) {
        // Fallback for older browsers
        return new Promise((resolve) => {
            Notification.requestPermission((result) => {
                resolve(result);
            });
        });
    }
}

/**
 * Register the Service Worker located at /sw.js
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });
        return registration;
    } catch (err) {
        console.warn('[WebPush] Service Worker registration failed:', err);
        return null;
    }
}

/**
 * Helper to convert a Base64 URL-encoded VAPID public key string into a Uint8Array.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Get active Web Push subscription from the service worker if present.
 */
export async function getActivePushSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) return null;

    try {
        const registration = await navigator.serviceWorker.ready;
        return await registration.pushManager.getSubscription();
    } catch (e) {
        console.debug('[WebPush] Error checking push subscription:', e);
        return null;
    }
}

/**
 * Subscribe browser to Web Push using the VAPID Public Key and persist on backend.
 */
export async function subscribeToPush(vapidPublicKey?: string): Promise<{ success: boolean; error?: string }> {
    if (!isPushSupported()) {
        return { success: false, error: 'Web Push is not supported in this browser.' };
    }

    // 1. Ensure permission is granted
    if (Notification.permission !== 'granted') {
        const perm = await requestNotificationPermission();
        if (perm !== 'granted') {
            return { success: false, error: 'Notification permission was not granted by the browser.' };
        }
    }

    try {
        // 2. Fetch VAPID public key from backend if not provided
        let key = vapidPublicKey;
        if (!key) {
            const res = await fetch('/push/vapid-public-key', {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                key = data.public_key;
            }
        }

        if (!key) {
            return { success: false, error: 'VAPID public key could not be retrieved from server.' };
        }

        // 3. Register service worker and subscribe to push
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            const applicationServerKey = urlBase64ToUint8Array(key);
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey as any,
            });
        }

        const subJson = subscription.toJSON();

        // 4. Send subscription to Laravel backend
        const saveRes = await fetch('/push/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...csrfHeaders(),
            },
            body: JSON.stringify({
                endpoint: subscription.endpoint,
                publicKey: subJson.keys?.p256dh,
                authToken: subJson.keys?.auth,
                contentEncoding: 'aes128gcm',
            }),
        });

        if (!saveRes.ok) {
            const errData = await saveRes.json().catch(() => ({}));
            return { success: false, error: errData.message || 'Failed to save subscription on server.' };
        }

        return { success: true };
    } catch (err: any) {
        console.error('[WebPush] Error subscribing to push:', err);
        return { success: false, error: err.message || 'An unknown error occurred during push subscription.' };
    }
}

/**
 * Unsubscribe current browser device from Web Push.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    if (!isPushSupported()) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const endpoint = subscription.endpoint;
            // Tell server to remove record
            await fetch('/push/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...csrfHeaders(),
                },
                body: JSON.stringify({ endpoint }),
            }).catch(() => {});

            // Unsubscribe locally
            await subscription.unsubscribe();
        }

        return true;
    } catch (err) {
        console.warn('[WebPush] Error unsubscribing:', err);
        return false;
    }
}

/**
 * Display a native operating-system desktop notification when appropriate.
 *
 * Deduplication rules:
 * - If notification with same ID was displayed in the last 10 minutes, ignores it.
 * - Always uses stable `tag: 'notification-' + id` to collapse in Windows Action Center.
 */
export function displayDesktopNotification(options: {
    id: number | string;
    title: string;
    message: string;
    link?: string | null;
    icon?: string;
    soundEnabled?: boolean;
}): void {
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        return;
    }

    const { id, title, message, link, icon, soundEnabled } = options;

    // Check duplicate prevention
    const dedupeKey = `notif-${id}`;
    if (id && handledNotificationIds.has(dedupeKey)) {
        return;
    }
    if (id) {
        handledNotificationIds.add(dedupeKey);
        // Clean up from set after 10 minutes to save memory
        setTimeout(() => {
            handledNotificationIds.delete(dedupeKey);
        }, 10 * 60 * 1000);
    }

    // Play subtle notification chime if user consented to sound
    if (soundEnabled) {
        playNotificationChime();
    }

    const targetUrl = link || '/dashboard';
    const notificationTag = id ? `notification-${id}` : 'angora-notification';

    // If ServiceWorker is active, use showNotification for maximum background/minimized reliability
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
            (reg as any).showNotification(title, {
                body: message,
                icon: icon || '/icon.png',
                badge: '/favicon.ico',
                tag: notificationTag,
                renotify: true,
                data: {
                    url: targetUrl,
                    notificationId: id,
                },
            });
        });
        return;
    }

    // Standard Notification API fallback
    try {
        const notif = new Notification(title, {
            body: message,
            icon: icon || '/icon.png',
            tag: notificationTag,
        });

        notif.onclick = () => {
            window.focus();
            notif.close();

            if (targetUrl) {
                router.visit(targetUrl);
            }

            // Mark as read
            if (id && Number(id) > 0) {
                fetch(`/notifications/${id}/read`, {
                    method: 'PATCH',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        ...csrfHeaders(),
                    },
                }).catch(() => {});
            }
        };
    } catch (e) {
        console.debug('[DesktopNotifications] Error showing native notification:', e);
    }
}

/**
 * Play a subtle, pleasant 2-tone chime using Web Audio API without requiring external audio assets.
 */
export function playNotificationChime(): void {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Tone 1: 587.33 Hz (D5) -> Tone 2: 880 Hz (A5)
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
    } catch (e) {
        // Audio autoplay policy or context disabled
    }
}
