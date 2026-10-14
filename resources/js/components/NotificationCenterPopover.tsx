import React, { useState, useEffect } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { router, usePage } from '@inertiajs/react';
import {
    Bell,
    Check,
    CheckCheck,
    Clock,
    FileText,
    MessageCircle,
    Settings2,
    ShieldAlert,
    Trash2,
    UserCheck,
    Zap,
} from 'lucide-react';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { csrfHeaders } from '@/lib/utils';

interface NotificationItem {
    id: number;
    user_id: number;
    actor_id?: number | null;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'danger';
    category: 'mentions' | 'assignments' | 'reviews' | 'deadlines' | 'automations' | 'system';
    link?: string | null;
    is_read: boolean;
    created_at: string;
    actor?: {
        id: number;
        name: string;
        email?: string;
        avatar?: string | null;
    } | null;
}

export function NotificationCenterPopover() {
    const pageProps = usePage().props as any;
    const initialUnread = pageProps.unreadNotificationsCount || 0;
    const initialRecent = (pageProps.recentNotifications || []) as NotificationItem[];

    const [open, setOpen] = useState(false);
    const [preferencesOpen, setPreferencesOpen] = useState(false);
    const [tab, setTab] = useState<'all' | 'unread'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [notifications, setNotifications] = useState<NotificationItem[]>(initialRecent);
    const [unreadCount, setUnreadCount] = useState<number>(initialUnread);
    const [loading, setLoading] = useState(false);

    // Sync with page props changes
    useEffect(() => {
        if (pageProps.unreadNotificationsCount !== undefined) {
            setUnreadCount(pageProps.unreadNotificationsCount);
        }
    }, [pageProps.unreadNotificationsCount]);

    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open, tab, categoryFilter]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (tab === 'unread') params.set('tab', 'unread');
            if (categoryFilter !== 'all') params.set('category', categoryFilter);

            const res = await fetch(`/notifications?${params.toString()}`, {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications?.data || []);
                if (typeof data.unread_count === 'number') {
                    setUnreadCount(data.unread_count);
                }
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (notifId: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            const res = await fetch(`/notifications/${notifId}/read`, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    ...csrfHeaders(),
                },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
                );
                if (typeof data.unread_count === 'number') {
                    setUnreadCount(data.unread_count);
                }
            }
        } catch (err) {
            console.error('Failed to mark read:', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const res = await fetch('/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    ...csrfHeaders(),
                },
            });
            if (res.ok) {
                setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    };

    const handleDelete = async (notifId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/notifications/${notifId}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    ...csrfHeaders(),
                },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications((prev) => prev.filter((n) => n.id !== notifId));
                if (typeof data.unread_count === 'number') {
                    setUnreadCount(data.unread_count);
                }
            }
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const handleNotificationClick = async (notif: NotificationItem) => {
        if (!notif.is_read) {
            await handleMarkAsRead(notif.id);
        }
        setOpen(false);
        if (notif.link) {
            router.visit(notif.link);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'mentions':
                return <MessageCircle className="h-3 w-3 text-[#0073ea]" />;
            case 'assignments':
                return <UserCheck className="h-3 w-3 text-emerald-500" />;
            case 'reviews':
                return <FileText className="h-3 w-3 text-purple-500" />;
            case 'deadlines':
                return <Clock className="h-3 w-3 text-amber-500" />;
            case 'automations':
                return <Zap className="h-3 w-3 text-indigo-500" />;
            default:
                return <Bell className="h-3 w-3 text-slate-400" />;
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
            if (diffSec < 60) return 'Just now';
            if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
            if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
            if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    const categories = [
        { key: 'all', label: 'All' },
        { key: 'mentions', label: 'Mentions' },
        { key: 'assignments', label: 'Assignments' },
        { key: 'reviews', label: 'Reviews' },
        { key: 'deadlines', label: 'Deadlines' },
        { key: 'automations', label: 'Automations' },
    ];

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="relative h-9 w-9 rounded-xl border border-[#ECECF0] bg-white text-[#191927] shadow-xs transition-all hover:bg-slate-50 dark:border-[#2A2A3D] dark:bg-[#1E1E2F] dark:text-white dark:hover:bg-[#252538]"
                    >
                        <Bell className="h-4 w-4 text-[#191927] dark:text-white" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e2445c] px-1 text-[10px] font-bold text-white shadow-xs">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="end"
                    sideOffset={8}
                    className="w-[380px] sm:w-[420px] rounded-2xl border-[#ECECF0] bg-white p-0 shadow-2xl dark:border-[#2A2A3D] dark:bg-[#1A1A2A]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#ECECF0] px-4 py-3 dark:border-[#2A2A3D]">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#191927] dark:text-white">
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-[#0073ea]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0073ea] dark:bg-[#0073ea]/20">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    title="Mark all as read"
                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0073ea] dark:text-slate-400 dark:hover:bg-[#252538] dark:hover:text-[#0073ea]"
                                >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    <span>Mark all read</span>
                                </button>
                            )}

                            <button
                                onClick={() => setPreferencesOpen(true)}
                                title="Notification settings"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-[#252538] dark:hover:text-white"
                            >
                                <Settings2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs & Filter Chips */}
                    <div className="space-y-2 border-b border-[#ECECF0] px-4 py-2.5 dark:border-[#2A2A3D]">
                        {/* All vs Unread Tabs */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTab('all')}
                                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                                    tab === 'all'
                                        ? 'bg-[#191927] text-white dark:bg-white dark:text-[#191927]'
                                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#252538]'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setTab('unread')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                                    tab === 'unread'
                                        ? 'bg-[#191927] text-white dark:bg-white dark:text-[#191927]'
                                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#252538]'
                                }`}
                            >
                                <span>Unread</span>
                                {unreadCount > 0 && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#e2445c]" />
                                )}
                            </button>
                        </div>

                        {/* Category horizontal scrolling pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                            {categories.map((cat) => (
                                <button
                                    key={cat.key}
                                    onClick={() => setCategoryFilter(cat.key)}
                                    className={`shrink-0 rounded-full px-2.5 py-0.5 font-medium transition-all ${
                                        categoryFilter === cat.key
                                            ? 'bg-[#0073ea] text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#252538] dark:text-slate-400 dark:hover:bg-[#2e2e46]'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-[#ECECF0]/70 dark:divide-[#2A2A3D]/70">
                        {loading ? (
                            <div className="py-12 text-center text-xs text-slate-400">
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-[#252538]">
                                    <Bell className="h-6 w-6" />
                                </div>
                                <h4 className="mt-3 text-xs font-bold text-[#191927] dark:text-white">
                                    All caught up!
                                </h4>
                                <p className="mt-1 text-[11px] text-[#777785] dark:text-slate-400">
                                    {tab === 'unread'
                                        ? 'No unread notifications to review.'
                                        : 'No notifications in this category yet.'}
                                </p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                                        !notif.is_read
                                            ? 'bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30'
                                            : 'hover:bg-slate-50 dark:hover:bg-[#252538]/60'
                                    }`}
                                >
                                    {/* Actor Avatar or Category Badge */}
                                    <div className="relative mt-0.5 shrink-0">
                                        {notif.actor?.avatar ? (
                                            <img
                                                src={notif.actor.avatar}
                                                alt={notif.actor.name}
                                                className="h-8 w-8 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-[#2e2e44] dark:text-slate-200">
                                                {notif.actor?.name
                                                    ? notif.actor.name.charAt(0).toUpperCase()
                                                    : 'A'}
                                            </div>
                                        )}
                                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-2xs dark:bg-[#1A1A2A]">
                                            {getCategoryIcon(notif.category)}
                                        </span>
                                    </div>

                                    {/* Text content */}
                                    <div className="flex-1 min-w-0 pr-8">
                                        <div className="flex items-center gap-1.5">
                                            <p
                                                className={`truncate text-xs font-semibold ${
                                                    !notif.is_read
                                                        ? 'text-[#191927] dark:text-white'
                                                        : 'text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                {notif.title}
                                            </p>
                                            {!notif.is_read && (
                                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0073ea]" />
                                            )}
                                        </div>

                                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 line-clamp-2 dark:text-slate-400">
                                            {notif.message}
                                        </p>

                                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                                            <span className="capitalize">{notif.category}</span>
                                            <span>•</span>
                                            <span>{formatTimeAgo(notif.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        {!notif.is_read && (
                                            <button
                                                type="button"
                                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                                title="Mark as read"
                                                className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-500 shadow-2xs hover:bg-slate-100 hover:text-[#0073ea] dark:bg-[#252538] dark:text-slate-400 dark:hover:text-white"
                                            >
                                                <Check className="h-3 w-3" />
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={(e) => handleDelete(notif.id, e)}
                                            title="Delete"
                                            className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-500 shadow-2xs hover:bg-red-50 hover:text-red-600 dark:bg-[#252538] dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            <NotificationPreferencesModal
                open={preferencesOpen}
                onOpenChange={setPreferencesOpen}
            />
        </>
    );
}
