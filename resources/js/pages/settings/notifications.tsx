import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Bell,
    Check,
    CheckCircle2,
    Laptop,
    Loader2,
    Mail,
    Radio,
    Send,
    Volume2,
    VolumeX,
    XCircle,
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';
import {
    getNotificationPermission,
    isNotificationSupported,
    isPushSupported,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    displayDesktopNotification,
    playNotificationChime,
} from '@/services/desktop-notifications';
import { csrfHeaders } from '@/lib/utils';

interface CategoryPref {
    category: string;
    in_app_enabled: boolean;
    desktop_enabled: boolean;
    push_enabled: boolean;
    email_enabled: boolean;
}

interface NotificationFormData {
    desktop_enabled: boolean;
    push_enabled: boolean;
    sound_enabled: boolean;
    email_task_assigned: boolean;
    email_task_comment: boolean;
    email_review_status: boolean;
    in_app_mentions: boolean;
    in_app_task_moves: boolean;
    category_preferences: CategoryPref[];
    [key: string]: any;
}

interface NotificationsPageProps {
    preferences: {
        email_task_assigned?: boolean;
        email_task_comment?: boolean;
        email_review_status?: boolean;
        in_app_mentions?: boolean;
        in_app_task_moves?: boolean;
        sound_enabled?: boolean;
        desktop_enabled?: boolean;
        push_enabled?: boolean;
    };
    categoryPreferences?: CategoryPref[];
    vapidPublicKey?: string;
    deviceCount?: number;
    desktopEnabled?: boolean;
    pushEnabled?: boolean;
    soundEnabled?: boolean;
}

const CATEGORY_NAMES: Record<string, { title: string; desc: string }> = {
    mentions: {
        title: 'Mentions & Replies',
        desc: 'When team members @mention you in task updates, comments, or notes',
    },
    assignments: {
        title: 'Task Assignments & Reassignments',
        desc: 'When tasks or subitems are assigned or reassigned to you',
    },
    reviews: {
        title: 'Reviews & Client Approvals',
        desc: 'When deliverables are submitted for review, approved, or revised',
    },
    deadlines: {
        title: 'Deadlines & Due Date Reminders',
        desc: 'Alerts for upcoming due dates, milestone shifts, and overdue items',
    },
    automations: {
        title: 'Board Automations & Workflows',
        desc: 'Automated stage transitions, rule executions, and status updates',
    },
    system: {
        title: 'System & Workspace Updates',
        desc: 'General workspace member invitations, role shifts, and maintenance',
    },
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'Notifications', href: '/settings/notifications' },
];

export default function NotificationsSettings({
    preferences,
    categoryPreferences = [],
    vapidPublicKey,
    deviceCount = 0,
    desktopEnabled = true,
    pushEnabled = false,
    soundEnabled = false,
}: NotificationsPageProps) {
    const [browserPerm, setBrowserPerm] = useState<NotificationPermission | 'unsupported'>('default');
    const [isPushSubscribing, setIsPushSubscribing] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testFeedback, setTestFeedback] = useState<string | null>(null);
    const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [autoSaveError, setAutoSaveError] = useState<string | null>(null);

    // Form state for updating backend preferences
    const { data, setData, put, processing, recentlySuccessful } = useForm<NotificationFormData>({
        desktop_enabled: desktopEnabled,
        push_enabled: pushEnabled,
        sound_enabled: soundEnabled,
        email_task_assigned: preferences.email_task_assigned ?? true,
        email_task_comment: preferences.email_task_comment ?? true,
        email_review_status: preferences.email_review_status ?? true,
        in_app_mentions: preferences.in_app_mentions ?? true,
        in_app_task_moves: preferences.in_app_task_moves ?? true,
        category_preferences: categoryPreferences.length > 0 ? categoryPreferences : [
            { category: 'mentions', in_app_enabled: true, desktop_enabled: true, push_enabled: true, email_enabled: true },
            { category: 'assignments', in_app_enabled: true, desktop_enabled: true, push_enabled: true, email_enabled: true },
            { category: 'reviews', in_app_enabled: true, desktop_enabled: true, push_enabled: true, email_enabled: true },
            { category: 'deadlines', in_app_enabled: true, desktop_enabled: true, push_enabled: true, email_enabled: true },
            { category: 'automations', in_app_enabled: true, desktop_enabled: true, push_enabled: true, email_enabled: false },
            { category: 'system', in_app_enabled: true, desktop_enabled: true, push_enabled: true, email_enabled: false },
        ],
    });

    useEffect(() => {
        setBrowserPerm(getNotificationPermission());
    }, []);

    // Instant auto-save to backend
    const triggerAutoSave = async (updatedFields: Partial<NotificationFormData>) => {
        setAutoSaveState('saving');
        setAutoSaveError(null);
        try {
            const payload = {
                ...data,
                ...updatedFields,
            };
            const res = await fetch('/settings/notifications', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...csrfHeaders(),
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to save changes');
            }

            setAutoSaveState('saved');
            setTimeout(() => {
                setAutoSaveState((curr) => (curr === 'saved' ? 'idle' : curr));
            }, 2500);
        } catch (err: any) {
            console.error('Auto-save error:', err);
            setAutoSaveState('error');
            setAutoSaveError(err.message || 'Failed to save changes');
        }
    };

    // Explicit user action: Request browser notification permission
    const handleEnableDesktop = async () => {
        try {
            const perm = await requestNotificationPermission();
            setBrowserPerm(perm);

            if (perm === 'granted') {
                setData('desktop_enabled', true);
                triggerAutoSave({ desktop_enabled: true });

                // Fire friendly native notification immediately to confirm
                displayDesktopNotification({
                    id: 'welcome',
                    title: 'Angora Work OS',
                    message: 'Desktop notifications are enabled and ready.',
                    link: '/settings/notifications',
                    soundEnabled: data.sound_enabled,
                });
            }
        } catch (e: any) {
            console.error('Permission request failed:', e);
        }
    };

    // Explicit user action: Subscribe or unsubscribe to Web Push
    const handleTogglePush = async (enable: boolean) => {
        setIsPushSubscribing(true);
        setTestFeedback(null);
        try {
            if (enable) {
                const res = await subscribeToPush(vapidPublicKey);
                if (res.success) {
                    setData((prev) => ({ ...prev, push_enabled: true, desktop_enabled: true }));
                    setBrowserPerm('granted');
                    setTestFeedback('Web Push subscribed successfully for this browser!');
                    triggerAutoSave({ push_enabled: true, desktop_enabled: true });
                } else {
                    setTestFeedback(res.error || 'Failed to enable Web Push');
                }
            } else {
                await unsubscribeFromPush();
                setData('push_enabled', false);
                setTestFeedback('Web Push disabled on this browser.');
                triggerAutoSave({ push_enabled: false });
            }
        } finally {
            setIsPushSubscribing(false);
        }
    };

    // Explicit user action: Test notification delivery
    const handleSendTest = async () => {
        setIsSendingTest(true);
        setTestFeedback(null);
        try {
            // Trigger native notification locally first
            if (browserPerm === 'granted') {
                displayDesktopNotification({
                    id: Date.now(),
                    title: 'Angora Work OS — Test Alert',
                    message: 'Native desktop notifications are active. Chrome minimizes safely.',
                    link: '/settings/notifications',
                    soundEnabled: data.sound_enabled,
                });
            } else if (data.sound_enabled) {
                playNotificationChime();
            }

            // Call backend test endpoint
            const res = await fetch('/push/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...csrfHeaders(),
                },
            });

            if (res.ok) {
                setTestFeedback('Test notification dispatched through Reverb & Web Push!');
            } else {
                setTestFeedback('Test triggered locally; server reported status ' + res.status);
            }
        } catch (err: any) {
            setTestFeedback('Test notification fired locally.');
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleCategoryToggle = (catIndex: number, channel: 'in_app' | 'desktop' | 'email') => {
        const currentList = data.category_preferences || [];
        const updated = [...currentList];
        const item = { ...updated[catIndex] };
        if (channel === 'in_app') {
            item.in_app_enabled = !item.in_app_enabled;
        } else if (channel === 'desktop') {
            item.desktop_enabled = !item.desktop_enabled;
            item.push_enabled = item.desktop_enabled;
        } else if (channel === 'email') {
            item.email_enabled = !item.email_enabled;
        }
        updated[catIndex] = item;
        setData('category_preferences', updated);
        triggerAutoSave({ category_preferences: updated });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('settings.notifications.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notification Preferences" />

            <SettingsLayout
                title="Notifications & Alerts"
                description="Configure native desktop notifications, offline Web Push alerts, sound chimes, and channel delivery rules"
            >
                <div className="space-y-6">
                    {/* SECTION 1: Desktop & Web Push Notification Hub */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#19192A]/50">
                        <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0073ea]/10 text-[#0073ea] dark:bg-[#579BFC]/10 dark:text-[#579BFC]">
                                    <Laptop className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                        Native Desktop & Web Push Notifications
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Receive Windows / Chrome OS popups when Angora is in background or minimized
                                    </p>
                                </div>
                            </div>

                            {/* Auto-save & Browser Permission Pill */}
                            <div className="flex items-center gap-3">
                                {autoSaveState === 'saving' && (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0073ea]" />
                                        <span>Saving...</span>
                                    </span>
                                )}
                                {autoSaveState === 'saved' && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00c875]">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>Saved</span>
                                    </span>
                                )}
                                {autoSaveState === 'error' && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span>{autoSaveError || 'Save failed'}</span>
                                    </span>
                                )}

                                {browserPerm === 'granted' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00c875]/10 px-2.5 py-1 text-xs font-semibold text-[#00c875]">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>Chrome Permission Granted</span>
                                    </span>
                                )}
                                {browserPerm === 'denied' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500">
                                        <XCircle className="h-3.5 w-3.5" />
                                        <span>Blocked in Chrome</span>
                                    </span>
                                )}
                                {browserPerm === 'default' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span>Permission Needed</span>
                                    </span>
                                )}
                                {browserPerm === 'unsupported' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-400">
                                        <span>Not Supported</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Denied helper banner */}
                        {browserPerm === 'denied' && (
                            <div className="mb-4 rounded-lg border border-red-200 bg-red-50/50 p-3 text-xs text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
                                <p className="font-semibold">Desktop notifications are blocked by your browser settings.</p>
                                <p className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">
                                    To enable them, click the tune/lock icon 🔒 beside the URL in Chrome's address bar, set
                                    <strong> Notifications</strong> to <strong>Allow</strong>, and reload the page.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Feature 1: Desktop Notifications */}
                            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/[0.06] dark:bg-[#1E1E30]/40">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                            Desktop Notifications
                                        </span>
                                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                                            Live Tabs
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        Shows operating-system notifications while Chrome is running, even when Angora tabs are in background or minimized.
                                    </p>
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    {browserPerm !== 'granted' ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleEnableDesktop}
                                            className="h-8 rounded-lg bg-[#0073ea] px-3 text-xs font-semibold text-white hover:bg-[#0060c0]"
                                        >
                                            <Bell className="mr-1.5 h-3.5 w-3.5" />
                                            <span>Enable Desktop Alerts</span>
                                        </Button>
                                    ) : (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(data.desktop_enabled)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setData('desktop_enabled', checked);
                                                    triggerAutoSave({ desktop_enabled: checked });
                                                }}
                                                className="h-4 w-4 rounded border-slate-300 bg-white text-[#0073ea] focus:ring-[#0073ea] dark:border-white/20 dark:bg-[#1E1E30]"
                                            />
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Active on this account
                                            </span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Feature 2: Web Push (Offline Alerts) */}
                            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/[0.06] dark:bg-[#1E1E30]/40">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                            Standards-based Web Push
                                        </span>
                                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                                            Service Worker
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        Delivers push alerts through service worker even when Angora tabs are completely closed.
                                    </p>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={isPushSubscribing}
                                            onClick={() => handleTogglePush(!data.push_enabled)}
                                            className="h-8 rounded-lg border-slate-300 text-xs font-medium dark:border-white/10"
                                        >
                                            {isPushSubscribing ? (
                                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Radio className="mr-1.5 h-3.5 w-3.5 text-purple-500 dark:text-[#A25DDC]" />
                                            )}
                                            <span>{data.push_enabled ? 'Disable Web Push' : 'Subscribe This Browser'}</span>
                                        </Button>
                                    </div>

                                    {deviceCount > 0 && (
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {deviceCount} device{deviceCount > 1 ? 's' : ''} paired
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Test Notification & Sound Chime Toolbar */}
                        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/[0.06] dark:bg-[#1E1E30]/20 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={isSendingTest}
                                    onClick={handleSendTest}
                                    className="h-8 gap-1.5 rounded-lg border-slate-300 text-xs font-medium text-slate-800 hover:bg-white dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                                >
                                    {isSendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 text-[#0073ea] dark:text-[#579BFC]" />}
                                    <span>Send Test Notification</span>
                                </Button>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(data.sound_enabled)}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setData('sound_enabled', checked);
                                            triggerAutoSave({ sound_enabled: checked });
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-[#0073ea] focus:ring-[#0073ea] dark:border-white/20 dark:bg-[#1E1E30]"
                                    />
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {data.sound_enabled ? (
                                            <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : (
                                            <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                                        )}
                                        <span>Notification Chime</span>
                                    </span>
                                </label>
                            </div>

                            {testFeedback && (
                                <span className="text-xs text-emerald-600 dark:text-[#00c875]">
                                    {testFeedback}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: Notification Channels by Category */}
                    <form onSubmit={submit} className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#19192A]/50">
                            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/[0.06]">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                        Delivery Rules by Category
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Choose which channels deliver notifications for specific types of activity
                                    </p>
                                </div>
                                <span className="text-[11px] font-mono text-slate-400">Role-aware RBAC</span>
                            </div>

                            <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                                {(data.category_preferences || []).map((item: CategoryPref, idx: number) => {
                                    const meta = CATEGORY_NAMES[item.category] || {
                                        title: item.category.toUpperCase(),
                                        desc: 'Notifications regarding ' + item.category,
                                    };

                                    return (
                                        <div
                                            key={item.category}
                                            className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                                                    {meta.title}
                                                </h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {meta.desc}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-5 sm:gap-6 shrink-0">
                                                {/* In-App Toggle */}
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(item.in_app_enabled)}
                                                        onChange={() => handleCategoryToggle(idx, 'in_app')}
                                                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#0073ea] focus:ring-[#0073ea] dark:border-white/20 dark:bg-[#1E1E30]"
                                                    />
                                                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                                        In-App
                                                    </span>
                                                </label>

                                                {/* Desktop / Push Toggle */}
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(item.desktop_enabled)}
                                                        onChange={() => handleCategoryToggle(idx, 'desktop')}
                                                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#0073ea] focus:ring-[#0073ea] dark:border-white/20 dark:bg-[#1E1E30]"
                                                    />
                                                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                                        Desktop & Push
                                                    </span>
                                                </label>

                                                {/* Email Toggle */}
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(item.email_enabled)}
                                                        onChange={() => handleCategoryToggle(idx, 'email')}
                                                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#0073ea] focus:ring-[#0073ea] dark:border-white/20 dark:bg-[#1E1E30]"
                                                    />
                                                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                                        Email
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Save Action */}
                        <div className="flex items-center gap-3">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="h-9 gap-1.5 rounded-xl bg-[#0073ea] px-5 text-xs font-semibold text-white hover:bg-[#0060c0]"
                            >
                                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Save All Notification Preferences</span>}
                            </Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out duration-300"
                                enterFrom="opacity-0 translate-y-1"
                                enterTo="opacity-100 translate-y-0"
                                leave="transition ease-in-out duration-300"
                                leaveFrom="opacity-100 translate-y-0"
                                leaveTo="opacity-0 translate-y-1"
                            >
                                <div className="flex items-center gap-1.5 rounded-lg border border-[#00c875]/20 bg-[#00c875]/10 px-3 py-1 text-xs font-medium text-[#00c875]">
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Preferences updated successfully</span>
                                </div>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
