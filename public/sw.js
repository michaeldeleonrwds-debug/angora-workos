// Angora Work OS — Standards-based Web Push Service Worker
/* eslint-env serviceworker */

self.addEventListener('install', (event) => {
    // Force immediate activation without waiting for tabs to close
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Become active for all connected client tabs immediately
    event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
    if (!event.data) {
        return;
    }

    let payload = {};
    try {
        payload = event.data.json();
    } catch (e) {
        payload = {
            title: 'Angora Work OS',
            body: event.data.text() || 'You have a new update.',
            data: {},
        };
    }

    const title = payload.title || 'Angora Work OS';
    const tag = payload.tag || (payload.id ? `notification-${payload.id}` : 'angora-notification');
    const targetUrl = payload.url || (payload.data && payload.data.url) || '/dashboard';

    const notificationOptions = {
        body: payload.body || payload.message || 'New notification',
        icon: payload.icon || '/icon.png',
        badge: payload.badge || '/favicon.ico',
        tag: tag, // Ensures browser deduplication
        renotify: true,
        requireInteraction: false,
        data: {
            url: targetUrl,
            notificationId: payload.id || null,
            category: payload.category || 'system',
            timestamp: payload.timestamp || Date.now(),
        },
    };

    // If an Angora window is actively focused and visible, check if we need to display
    const promiseChain = clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Even if minimized or in background, showNotification displays a native OS notification!
        return self.registration.showNotification(title, notificationOptions);
    });

    event.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const notifData = event.notification.data || {};
    const targetUrl = notifData.url || '/dashboard';
    const notificationId = notifData.notificationId;

    // Mark as read in background if notification ID exists
    if (notificationId && notificationId > 0) {
        fetch(`/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        }).catch((err) => {
            console.debug('[SW] Error marking notification as read:', err);
        });
    }

    // Focus existing window or open a new one
    const clickAction = clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
            // Find existing Angora window
            if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                return client.focus().then((focusedClient) => {
                    if (focusedClient && 'navigate' in focusedClient && targetUrl) {
                        return focusedClient.navigate(targetUrl);
                    }
                    return focusedClient;
                });
            }
        }

        // No existing tab open -> open new window
        if (clients.openWindow) {
            return clients.openWindow(targetUrl);
        }
    });

    event.waitUntil(clickAction);
});
