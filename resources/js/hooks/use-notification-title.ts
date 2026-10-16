/**
 * Angora Work OS — Dynamic Browser Tab Title & Unread Count Manager
 *
 * Automatically manages dynamic tab title prefixes (e.g. "(3) Dashboard — Angora"),
 * synchronizes across multiple open tabs via BroadcastChannel, handles Reverb events,
 * and seamlessly preserves Inertia's page-specific document titles.
 */

import { useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { getEcho } from '@/echo';

const SYNC_CHANNEL_NAME = 'angora_notification_sync';
const UNREAD_PREFIX_REGEX = /^\((\d+\+?)\)\s*/;

let globalUnreadCount = 0;
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
        broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    } catch {
        broadcastChannel = null;
    }
}

/**
 * Format count into string: 0 -> '', 1-99 -> '(1) ', >99 -> '(99+) '
 */
export function formatUnreadPrefix(count: number): string {
    if (!count || count <= 0) return '';
    if (count > 99) return '(99+) ';
    return `(${count}) `;
}

/**
 * Clean document title by removing any existing unread count prefix.
 */
export function getCleanBaseTitle(title: string): string {
    return title.replace(UNREAD_PREFIX_REGEX, '').trim();
}

/**
 * Update the document title safely without infinite mutation loops.
 */
let isSettingTitle = false;
export function applyTitleCount(count: number): void {
    if (typeof document === 'undefined') return;

    globalUnreadCount = Math.max(0, count);
    const cleanBase = getCleanBaseTitle(document.title) || 'Angora Work OS';
    const prefix = formatUnreadPrefix(globalUnreadCount);
    const newTitle = `${prefix}${cleanBase}`;

    if (document.title !== newTitle) {
        isSettingTitle = true;
        document.title = newTitle;
        setTimeout(() => {
            isSettingTitle = false;
        }, 50);
    }
}

/**
 * Broadcast count update to other open browser tabs.
 */
export function broadcastUnreadCount(count: number): void {
    const safeCount = Math.max(0, count);
    applyTitleCount(safeCount);

    if (broadcastChannel) {
        try {
            broadcastChannel.postMessage({ type: 'UNREAD_COUNT', count: safeCount });
        } catch {
            // ignore
        }
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('angora:unread-count', { detail: { count: safeCount } }));
    }
}

/**
 * React hook to mount the title observer, Reverb listener, and cross-tab synchronizer.
 */
export function useNotificationTitle(): void {
    const page = usePage<any>();
    const userId = page.props.auth?.user?.id;
    const initialUnread = page.props.unreadNotificationsCount;
    const observerRef = useRef<MutationObserver | null>(null);

    // 1. Sync initial unread count from Inertia shared page props
    useEffect(() => {
        if (typeof initialUnread === 'number') {
            broadcastUnreadCount(initialUnread);
        } else if (!userId) {
            broadcastUnreadCount(0);
        }
    }, [initialUnread, userId]);

    // 2. Observe changes to <title> (e.g. Inertia page transitions with <Head title="..." />)
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const titleEl = document.querySelector('title');
        if (titleEl) {
            observerRef.current = new MutationObserver(() => {
                if (isSettingTitle) return;
                applyTitleCount(globalUnreadCount);
            });

            observerRef.current.observe(titleEl, {
                subtree: true,
                characterData: true,
                childList: true,
            });
        }

        return () => {
            observerRef.current?.disconnect();
        };
    }, []);

    // 3. Listen to cross-tab BroadcastChannel and CustomEvent
    useEffect(() => {
        const handleChannelMessage = (event: MessageEvent) => {
            if (event.data?.type === 'UNREAD_COUNT' && typeof event.data.count === 'number') {
                applyTitleCount(event.data.count);
            }
        };

        const handleCustomEvent = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail && typeof detail.count === 'number') {
                applyTitleCount(detail.count);
            }
        };

        broadcastChannel?.addEventListener('message', handleChannelMessage);
        window.addEventListener('angora:unread-count', handleCustomEvent);

        return () => {
            broadcastChannel?.removeEventListener('message', handleChannelMessage);
            window.removeEventListener('angora:unread-count', handleCustomEvent);
        };
    }, []);

    // 4. Real-time Echo listener for new incoming notifications
    useEffect(() => {
        if (!userId) return;

        const echo = getEcho();
        if (!echo) return;

        const channel = echo.private(`users.${userId}`);
        channel.listen('.notification.created', () => {
            broadcastUnreadCount(globalUnreadCount + 1);
        });

        return () => {
            channel.stopListening('.notification.created');
        };
    }, [userId]);
}
