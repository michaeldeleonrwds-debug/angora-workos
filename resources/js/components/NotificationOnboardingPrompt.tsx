import React, { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Bell, CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    dismissNotificationOnboarding,
    enableNotificationsAutomatically,
    getNotificationPermission,
    hasDismissedNotificationOnboarding,
    isNotificationSupported,
    syncPushSubscriptionIfNeeded,
} from '@/services/desktop-notifications';

export function NotificationOnboardingPrompt() {
    const page = usePage<any>();
    const user = page.props.auth?.user;
    const vapidPublicKey = page.props.vapidPublicKey;

    const [visible, setVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [statusSuccess, setStatusSuccess] = useState(false);

    useEffect(() => {
        if (!user || typeof window === 'undefined' || !isNotificationSupported()) {
            return;
        }

        const currentPerm = getNotificationPermission();

        // Returning user with permission already granted: silently sync push subscription if needed
        if (currentPerm === 'granted') {
            syncPushSubscriptionIfNeeded(vapidPublicKey);
            return;
        }

        // Only show prompt if permission is 'default' and user has not dismissed it
        if (currentPerm === 'default' && !hasDismissedNotificationOnboarding()) {
            // Small delay so dashboard finishes loading smoothly before prompt appears
            const timer = setTimeout(() => {
                setVisible(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user, vapidPublicKey]);

    if (!visible) return null;

    const handleEnable = async () => {
        setIsLoading(true);
        try {
            const res = await enableNotificationsAutomatically(vapidPublicKey);
            if (res.success) {
                setStatusSuccess(true);
                setTimeout(() => {
                    setVisible(false);
                }, 2000);
            } else {
                // If user closed dialog or denied permission, dismiss prompt smoothly
                dismissNotificationOnboarding();
                setVisible(false);
            }
        } catch {
            dismissNotificationOnboarding();
            setVisible(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = () => {
        dismissNotificationOnboarding();
        setVisible(false);
    };

    return (
        <div
            role="dialog"
            aria-label="Notification onboarding"
            className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl transition-all duration-200 dark:border-white/[0.08] dark:bg-[#19192A]"
        >
            {statusSuccess ? (
                <div className="flex items-center gap-3 py-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00c875]/10 text-[#00c875]">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                            Notifications Enabled
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Desktop alerts are active and ready.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0073ea]/10 text-[#0073ea] dark:bg-[#579BFC]/10 dark:text-[#579BFC]">
                                <Bell className="h-4 w-4" />
                            </div>
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                                Stay updated with Angora
                            </h4>
                        </div>
                        <button
                            type="button"
                            onClick={handleDismiss}
                            aria-label="Close"
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        Get desktop alerts for task assignments, mentions, reviews, and important updates—even when Chrome is minimized.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            disabled={isLoading}
                            className="h-8 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
                        >
                            Not Now
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleEnable}
                            disabled={isLoading}
                            className="h-8 rounded-lg bg-[#0073ea] px-3.5 text-xs font-medium text-white hover:bg-[#0060c0] dark:bg-[#0073ea] dark:hover:bg-[#0060c0]"
                        >
                            {isLoading ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            <span>Enable Notifications</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
