import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getEcho } from '@/echo';
import AppLayout from '@/layouts/app-layout';
import ItemDetailDrawer from '@/pages/kanban/components/ItemDetailDrawer';
import KanbanBoardView from '@/pages/kanban/components/KanbanBoardView';
import { BoardPermissions, KanbanBoard, Task, User } from '@/pages/kanban/types';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Bell,
    BellOff,
    Calendar,
    Check,
    CheckCheck,
    CheckCircle2,
    CheckSquare,
    Clock,
    Download,
    ExternalLink,
    FileCheck,
    FileText,
    Filter,
    FolderKanban,
    Inbox,
    Kanban,
    Layers,
    MessageCircle,
    MessageSquare,
    Paperclip,
    RotateCcw,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Client Workspace',
        href: '/client-portal',
    },
    {
        title: 'Dashboard',
        href: '/client-portal',
    },
];

interface ClientDeliverable {
    id: number;
    title: string;
    description?: string;
    file_url?: string;
    external_url?: string;
    version: number;
    client_status: 'pending' | 'approved' | 'revision_requested';
    client_feedback?: string;
}

interface ClientProject {
    id: number;
    name: string;
    description?: string;
    status: string;
    priority: string;
    start_date?: string;
    due_date?: string;
    project_manager?: {
        name: string;
        email: string;
    } | null;
    deliverables_count: number;
    pending_review_count: number;
    approved_count: number;
}

export interface ClientNotificationItem {
    id: number;
    actor_id?: number | null;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'danger' | string;
    category?: string;
    link?: string | null;
    metadata?: any;
    is_read: boolean;
    created_at: string;
    actor?: {
        id: number;
        name: string;
        email: string;
        avatar?: string;
        avatar_url?: string;
    } | null;
}

interface ClientPortalDashboardProps {
    client: {
        id: number;
        name: string;
        company?: string;
        email: string;
    };
    stats?: {
        total_items: number;
        awaiting_review: number;
        needs_revision: number;
        approved: number;
        total_projects: number;
        unread_notifications?: number;
    };
    activeTab?: 'overview' | 'projects' | 'board' | 'reviews' | 'notifications';
    board?: KanbanBoard;
    permissions?: BoardPermissions;
    projects?: ClientProject[];
    deliverables?: any[];
    tasks?: any[];
    users?: User[];
    notifications?: {
        data: ClientNotificationItem[];
        total?: number;
        current_page?: number;
        last_page?: number;
    };
}

function formatNotificationTime(dateString?: string) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffSeconds < 60) return 'Just now';
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    } catch {
        return dateString;
    }
}

export default function ClientPortalDashboard({
    client,
    stats = {
        total_items: 0,
        awaiting_review: 0,
        needs_revision: 0,
        approved: 0,
        total_projects: 0,
        unread_notifications: 0,
    },
    activeTab = 'overview',
    board,
    permissions: propPermissions,
    projects = [],
    deliverables = [],
    tasks = [],
    users = [],
    notifications,
}: ClientPortalDashboardProps) {
    const defaultPermissions: BoardPermissions = {
        canView: true,
        canCreateTask: false,
        canEditTask: false,
        canEditProgress: false,
        canChangeStatus: false,
        canMoveAssignedTask: false,
        canAssignUsers: false,
        canChangeDeadlines: false,
        canChangePriority: false,
        canDeleteTask: false,
        canViewAllTasks: true,
        canFilterPersonalTasks: false,
        canManageBoard: false,
        canManageColumns: false,
        canManageGroups: false,
        canManageAutomations: false,
        canManageBlueprints: false,
        canManageDependencies: false,
        canManageRecurrence: false,
        canManageSubtasks: false,
        canApproveReview: true,
        canExport: false,
    };
    const permissions: BoardPermissions = { ...defaultPermissions, ...propPermissions };
    const { auth } = usePage<any>().props;
    const currentUser = auth?.user;
    const firstName = client?.name?.split(' ')[0] || currentUser?.name?.split(' ')[0] || 'Client';

    const [currentTab, setCurrentTab] = useState<'overview' | 'board' | 'projects' | 'reviews' | 'notifications'>(
        activeTab === 'projects' || activeTab === 'board' || activeTab === 'reviews' || activeTab === 'notifications'
            ? activeTab
            : 'overview'
    );

    const handleTabChange = (tab: 'overview' | 'board' | 'projects' | 'reviews' | 'notifications') => {
        setCurrentTab(tab);
        if (typeof window !== 'undefined') {
            const pathMap: Record<string, string> = {
                overview: '/client-portal',
                board: '/client-portal/board',
                projects: '/client-portal/projects',
                reviews: '/client-portal/reviews',
                notifications: '/client-portal/notifications',
            };
            window.history.pushState({}, '', pathMap[tab] || '/client-portal');
        }
    };

    // Client Notifications State
    const [notificationList, setNotificationList] = useState<ClientNotificationItem[]>(
        notifications?.data || []
    );
    const [unreadNotifCount, setUnreadNotifCount] = useState<number>(
        stats.unread_notifications ?? (notifications?.data ? notifications.data.filter((n) => !n.is_read).length : 0)
    );
    const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'reviews' | 'comments' | 'system'>('all');
    const [markingAll, setMarkingAll] = useState(false);

    // Sync notification list if prop updates
    useEffect(() => {
        if (notifications?.data) {
            setNotificationList(notifications.data);
            setUnreadNotifCount(notifications.data.filter((n) => !n.is_read).length);
        }
    }, [notifications?.data]);

    // Listen for real-time notifications via Reverb
    useEffect(() => {
        if (!currentUser?.id) return;

        const echoInstance = getEcho();
        if (!echoInstance) return;

        const channel = echoInstance.private(`users.${currentUser.id}`);
        channel.listen('.notification.created', (event: any) => {
            const newItem: ClientNotificationItem = {
                id: event.id,
                actor_id: event.actor_id ?? null,
                title: event.title || 'Angora Work OS',
                message: event.message || '',
                type: event.type ?? 'info',
                category: event.category ?? 'system',
                link: event.link ?? null,
                is_read: false,
                created_at: event.created_at ?? new Date().toISOString(),
                actor: event.actor ?? null,
            };

            setNotificationList((prev) => [newItem, ...prev.filter((n) => n.id !== event.id)]);
            setUnreadNotifCount((prev) => prev + 1);
        });

        return () => {
            channel.stopListening('.notification.created');
        };
    }, [currentUser?.id]);

    const handleMarkAsRead = async (notifId: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            setNotificationList((prev) =>
                prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
            );
            setUnreadNotifCount((prev) => Math.max(0, prev - 1));

            await fetch(`/notifications/${notifId}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            setMarkingAll(true);
            setNotificationList((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadNotifCount(0);

            await fetch('/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
        } finally {
            setMarkingAll(false);
        }
    };

    const handleDeleteNotification = async (notifId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const target = notificationList.find((n) => n.id === notifId);
            setNotificationList((prev) => prev.filter((n) => n.id !== notifId));
            if (target && !target.is_read) {
                setUnreadNotifCount((prev) => Math.max(0, prev - 1));
            }

            await fetch(`/notifications/${notifId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const handleNotificationClick = async (notif: ClientNotificationItem) => {
        if (!notif.is_read) {
            handleMarkAsRead(notif.id);
        }

        if (!notif.link) return;

        // If link targets reviews tab
        if (notif.link.includes('/client-portal/reviews') || notif.link.includes('tab=reviews')) {
            handleTabChange('reviews');
            return;
        }

        // If link targets projects tab
        if (notif.link.includes('/client-portal/projects') || notif.link.includes('tab=projects')) {
            handleTabChange('projects');
            return;
        }

        // If link points to task item, try opening drawer
        const match = notif.link.match(/[?&](?:item|task_id)=([0-9]+)/);
        if (match && match[1]) {
            const taskId = Number(match[1]);
            const foundTask = (tasks as Task[]).find((t) => t.id === taskId);
            if (foundTask) {
                handleTabChange('board');
                handleOpenTask(foundTask);
                return;
            }
        }

        router.visit(notif.link);
    };

    const filteredNotifications = notificationList.filter((notif) => {
        if (notificationFilter === 'unread') return !notif.is_read;
        if (notificationFilter === 'reviews') return notif.category === 'reviews' || notif.category === 'deliverables';
        if (notificationFilter === 'comments') return notif.category === 'mentions' || notif.category === 'comments';
        if (notificationFilter === 'system') return notif.category === 'system' || notif.category === 'deadlines';
        return true;
    });

    const initialTaskFromUrl = () => {
        if (typeof window !== 'undefined') {
            const urlItem = new URLSearchParams(window.location.search).get('item')
                || new URLSearchParams(window.location.search).get('task_id');
            if (urlItem) {
                return (tasks as Task[]).find((t) => t.id === Number(urlItem)) || null;
            }
        }
        return null;
    };
    const [selectedTask, setSelectedTask] = useState<Task | null>(() => initialTaskFromUrl());

    const initialDrawerTab = typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('tab') as any) || undefined
        : undefined;

    const initialHighlightId = typeof window !== 'undefined'
        ? Number(new URLSearchParams(window.location.search).get('target_id') || new URLSearchParams(window.location.search).get('comment_id')) || null
        : null;

    const handleOpenTask = (t: Task) => {
        setSelectedTask(t);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('item', String(t.id));
            window.history.pushState({}, '', url.toString());
        }
    };

    const handleCloseDrawer = () => {
        setSelectedTask(null);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('item');
            url.searchParams.delete('task_id');
            url.searchParams.delete('tab');
            url.searchParams.delete('target_id');
            url.searchParams.delete('comment_id');
            window.history.pushState({}, '', url.toString());
        }
    };

    const [searchTerm, setSearchTerm] = useState('');

    const awaitingTasks = tasks.filter(
        (t) => t.is_awaiting_approval || t.client_review_status === 'submitted' || t.stage_key === 'client_under_review'
    );
    const revisionTasks = tasks.filter(
        (t) => t.is_revision_requested || t.client_review_status === 'revision_requested'
    );
    const approvedTasks = tasks.filter((t) => t.is_complete || t.client_review_status === 'approved');

    // Default empty board placeholder if none passed
    const activeBoard: KanbanBoard = board || {
        id: 0,
        title: `${client.company || client.name} — Client Review Board`,
        department: 'Client Portal',
        visibility: 'private' as const,
        is_favorite: false,
        is_template: false,
        created_by: 0,
        columns: [
            { id: 1, board_id: 0, title: 'Awaiting Review', color: '#579BFC', position: 0, stage_key: 'client_under_review', tasks: awaitingTasks },
            { id: 2, board_id: 0, title: 'Needs Revision', color: '#FF642E', position: 1, stage_key: 'for_revision', tasks: revisionTasks },
            { id: 3, board_id: 0, title: 'Approved / Completed', color: '#00C875', position: 2, stage_key: 'complete', tasks: approvedTasks },
        ],
        groups: [],
        views: [],
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Client Portal — Angora Work OS" />

            <div className="flex min-h-full flex-col space-y-7 bg-[#F8F9F7] p-6 transition-colors md:p-8 dark:bg-[#161624]">
                {/* Header Banner */}
                <div className="flex flex-col justify-between gap-4 pb-2 md:flex-row md:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#191927] sm:text-3xl lg:text-4xl dark:text-white">
                                Good day, {firstName}! 👋
                            </h1>
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#0073ea]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0073ea] dark:bg-[#0073ea]/20 dark:text-[#579bfc]">
                                <Sparkles className="h-3 w-3" />
                                Client Portal
                            </span>
                        </div>
                        <p className="mt-1.5 text-xs text-[#777785] sm:text-sm dark:text-slate-400">
                            {client.company ? <strong className="text-foreground">{client.company}</strong> : null}
                            {client.company ? ' · ' : ''}
                            Review deliverables, track production milestones, and provide approvals directly with your project team.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Button
                            onClick={() => setCurrentTab('board')}
                            className="flex h-10 items-center gap-1.5 rounded-xl bg-[#0073ea] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0060c0]"
                        >
                            <Kanban className="h-4 w-4 text-white" />
                            Open Client Board
                        </Button>
                        <Button
                            onClick={() => setCurrentTab('reviews')}
                            variant="outline"
                            className="flex h-10 items-center gap-1.5 rounded-xl border border-[#ECECF0] bg-white px-4 text-xs font-semibold text-[#191927] shadow-xs transition-colors hover:bg-slate-50 dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white dark:hover:bg-[#252538]"
                        >
                            <ShieldCheck className="h-4 w-4 text-[#0073ea]" />
                            Reviews & Approvals
                        </Button>
                    </div>
                </div>

                {/* 5 KPI Metric Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-5">
                    {/* Card 1: Total Items */}
                    <div
                        onClick={() => setCurrentTab('overview')}
                        className="flex cursor-pointer flex-col justify-between space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-[#28283E] dark:bg-[#1E1E2F]"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#777785] uppercase dark:text-slate-400">Total Items</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0073ea]/10 text-[#0073ea] dark:bg-[#0073ea]/20">
                                <CheckSquare className="h-5 w-5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-[#191927] dark:text-white">{stats.total_items}</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">
                                Across {stats.total_projects} active {stats.total_projects === 1 ? 'project' : 'projects'}
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Awaiting Review */}
                    <div
                        onClick={() => setCurrentTab('reviews')}
                        className="flex cursor-pointer flex-col justify-between space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-[#28283E] dark:bg-[#1E1E2F]"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#777785] uppercase dark:text-slate-400">Awaiting Review</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0073ea]/10 text-[#0073ea] dark:bg-[#0073ea]/20">
                                <Clock className="h-5 w-5 text-[#0073ea]" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-[#0073ea] dark:text-[#579bfc]">{stats.awaiting_review}</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">
                                {stats.awaiting_review > 0 ? 'Your sign-off required' : 'All deliverables reviewed'}
                            </p>
                        </div>
                    </div>

                    {/* Card 3: Needs Revision */}
                    <div
                        onClick={() => setCurrentTab('board')}
                        className="flex cursor-pointer flex-col justify-between space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-[#28283E] dark:bg-[#1E1E2F]"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#777785] uppercase dark:text-slate-400">In Revision</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF642E]/10 text-[#FF642E] dark:bg-[#FF642E]/20">
                                <RotateCcw className="h-5 w-5 text-[#FF642E]" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-[#FF642E]">{stats.needs_revision}</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">
                                In agency rework queue
                            </p>
                        </div>
                    </div>

                    {/* Card 4: Approved */}
                    <div
                        onClick={() => setCurrentTab('board')}
                        className="flex cursor-pointer flex-col justify-between space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-[#28283E] dark:bg-[#1E1E2F]"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#777785] uppercase dark:text-slate-400">Approved</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00c875]/10 text-[#00c875] dark:bg-[#00c875]/20">
                                <CheckCircle2 className="h-5 w-5 text-[#00c875]" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-[#00c875]">{stats.approved}</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">
                                Completed deliverables
                            </p>
                        </div>
                    </div>

                    {/* Card 5: Active Projects */}
                    <div
                        onClick={() => setCurrentTab('projects')}
                        className="flex cursor-pointer flex-col justify-between space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-[#28283E] dark:bg-[#1E1E2F]"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#777785] uppercase dark:text-slate-400">Active Projects</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20">
                                <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-[#191927] dark:text-white">{stats.total_projects}</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">
                                Managed engagements
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 border-b border-[#ECECF0] pb-px dark:border-[#28283E] text-xs font-bold overflow-x-auto">
                    <button
                        onClick={() => handleTabChange('overview')}
                        className={`flex items-center gap-1.5 border-b-2 px-3 pb-3 transition-colors ${
                            currentTab === 'overview'
                                ? 'border-[#0073ea] text-[#0073ea]'
                                : 'border-transparent text-[#777785] hover:text-[#191927] dark:hover:text-white'
                        }`}
                    >
                        <Layers className="h-4 w-4" />
                        <span>Overview</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('board')}
                        className={`flex items-center gap-1.5 border-b-2 px-3 pb-3 transition-colors ${
                            currentTab === 'board'
                                ? 'border-[#0073ea] text-[#0073ea]'
                                : 'border-transparent text-[#777785] hover:text-[#191927] dark:hover:text-white'
                        }`}
                    >
                        <Kanban className="h-4 w-4" />
                        <span>Client Board</span>
                        {stats.awaiting_review > 0 && (
                            <span className="flex h-2 w-2 rounded-full bg-[#0073ea] animate-pulse" />
                        )}
                    </button>

                    <button
                        onClick={() => handleTabChange('projects')}
                        className={`flex items-center gap-1.5 border-b-2 px-3 pb-3 transition-colors ${
                            currentTab === 'projects'
                                ? 'border-[#0073ea] text-[#0073ea]'
                                : 'border-transparent text-[#777785] hover:text-[#191927] dark:hover:text-white'
                        }`}
                    >
                        <FolderKanban className="h-4 w-4" />
                        <span>My Projects ({projects.length})</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('reviews')}
                        className={`flex items-center gap-1.5 border-b-2 px-3 pb-3 transition-colors ${
                            currentTab === 'reviews'
                                ? 'border-[#0073ea] text-[#0073ea]'
                                : 'border-transparent text-[#777785] hover:text-[#191927] dark:hover:text-white'
                        }`}
                    >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Reviews & Approvals ({stats.awaiting_review})</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('notifications')}
                        className={`flex items-center gap-1.5 border-b-2 px-3 pb-3 transition-colors ${
                            currentTab === 'notifications'
                                ? 'border-[#0073ea] text-[#0073ea]'
                                : 'border-transparent text-[#777785] hover:text-[#191927] dark:hover:text-white'
                        }`}
                    >
                        <Bell className="h-4 w-4" />
                        <span>Notifications</span>
                        {unreadNotifCount > 0 && (
                            <span className="flex items-center justify-center rounded-full bg-[#00c875] px-1.5 py-0.2 text-[10px] font-bold text-white leading-tight">
                                {unreadNotifCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab 1: OVERVIEW */}
                {currentTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Awaiting Review Attention Queue */}
                        <div className="rounded-2xl border border-[#ECECF0] bg-white p-6 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-foreground">
                                        Deliverables Awaiting Your Approval ({awaitingTasks.length})
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Tasks submitted by your agency production team ready for client sign-off.
                                    </p>
                                </div>
                                {awaitingTasks.length > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={() => setCurrentTab('reviews')}
                                        className="rounded-xl bg-[#0073ea] text-white text-xs font-semibold hover:bg-[#0060c0]"
                                    >
                                        Review All Items
                                    </Button>
                                )}
                            </div>

                            {awaitingTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                                    <p className="font-semibold text-foreground">All deliverables are up to date!</p>
                                    <p>No deliverables currently require your review.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/60">
                                    {awaitingTasks.map((t) => (
                                        <div
                                            key={t.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 transition-colors hover:bg-muted/20 rounded-xl px-2.5"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-foreground">{t.title}</span>
                                                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200">
                                                        Awaiting Sign-off
                                                    </Badge>
                                                    {t.client_revision_count > 0 && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            (Round {t.client_revision_count + 1})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                    {t.project?.name && (
                                                        <span>Project: <strong className="text-foreground">{t.project.name}</strong></span>
                                                    )}
                                                    {t.client_deadline && (
                                                        <span className="flex items-center gap-1 font-semibold text-foreground">
                                                            <Calendar className="h-3 w-3 text-primary" />
                                                            Deadline: {t.client_deadline}
                                                        </span>
                                                    )}
                                                    <span>{t.deliverables_count ?? t.deliverables?.length ?? 0} Deliverables</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenTask(t)}
                                                    className="rounded-xl bg-[#0073ea] text-white text-xs font-semibold gap-1.5 hover:bg-[#0060c0]"
                                                >
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    <span>Review & Decide</span>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Two Columns: Recent Projects & Quick Deliverables */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Projects Summary */}
                            <div className="rounded-2xl border border-[#ECECF0] bg-white p-6 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-bold text-foreground">Active Projects ({projects.length})</h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentTab('projects')}
                                        className="text-xs font-semibold text-primary hover:underline p-0 h-auto"
                                    >
                                        View all
                                    </Button>
                                </div>

                                {projects.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No projects assigned yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {projects.slice(0, 4).map((p) => (
                                            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
                                                <div className="space-y-0.5 truncate pr-3">
                                                    <h4 className="font-bold text-foreground truncate">{p.name}</h4>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        PM: {p.project_manager?.name || 'Assigned Lead'} · {p.deliverables_count} Deliverables
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                                                    {p.status?.replace('_', ' ') || 'Active'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Recent Revisions */}
                            <div className="rounded-2xl border border-[#ECECF0] bg-white p-6 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-bold text-foreground">Revisions in Progress ({revisionTasks.length})</h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentTab('board')}
                                        className="text-xs font-semibold text-primary hover:underline p-0 h-auto"
                                    >
                                        View board
                                    </Button>
                                </div>

                                {revisionTasks.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No active revision requests.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {revisionTasks.slice(0, 4).map((t) => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTask(t)}
                                                className="cursor-pointer flex items-center justify-between rounded-xl border border-rose-200/60 bg-rose-50/40 p-3 text-xs transition-colors hover:bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/20"
                                            >
                                                <div className="space-y-0.5 truncate pr-3">
                                                    <h4 className="font-bold text-foreground truncate">{t.title}</h4>
                                                    <p className="text-[11px] text-rose-700 dark:text-rose-300">
                                                        Round {t.client_revision_count || 1} rework in production
                                                    </p>
                                                </div>
                                                <span className="rounded-full bg-rose-600/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 shrink-0">
                                                    Reworking
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: CLIENT KANBAN BOARD */}
                {currentTab === 'board' && (
                    <div className="flex-1 min-h-[620px] rounded-2xl border border-[#ECECF0] bg-card p-4 shadow-xs dark:border-[#28283E]">
                        <KanbanBoardView
                            board={activeBoard}
                            currentUser={currentUser}
                            permissions={permissions}
                            users={users}
                            searchTerm={searchTerm}
                            personFilter="all"
                            priorityFilter="all"
                            onSelectTask={(task) => handleOpenTask(task)}
                            onQuickAddTask={() => {}}
                        />
                    </div>
                )}

                {/* Tab 3: MY PROJECTS */}
                {currentTab === 'projects' && (
                    <div className="rounded-2xl border border-[#ECECF0] bg-white p-6 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <h3 className="text-base font-bold text-foreground mb-4">My Client Projects</h3>
                        {projects.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No projects assigned.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-border/80 text-muted-foreground uppercase text-[10px] font-bold">
                                            <th className="py-2.5 px-3">Project Name</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Project Manager</th>
                                            <th className="py-2.5 px-3">Deliverables</th>
                                            <th className="py-2.5 px-3">Target Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {projects.map((p) => (
                                            <tr key={p.id} className="hover:bg-muted/20">
                                                <td className="py-3 px-3 font-bold text-foreground">{p.name}</td>
                                                <td className="py-3 px-3">
                                                    <Badge variant="outline" className="text-[10px] capitalize">
                                                        {p.status?.replace('_', ' ') || 'Active'}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3 text-muted-foreground">
                                                    {p.project_manager?.name || 'Team Lead'}
                                                </td>
                                                <td className="py-3 px-3 font-semibold text-foreground">
                                                    {p.deliverables_count} items ({p.pending_review_count} in review)
                                                </td>
                                                <td className="py-3 px-3 text-muted-foreground">
                                                    {p.due_date || 'Ongoing'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 4: REVIEWS & APPROVALS */}
                {currentTab === 'reviews' && (
                    <div className="rounded-2xl border border-[#ECECF0] bg-white p-6 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="mb-4">
                            <h3 className="text-base font-bold text-foreground">Reviews & Deliverable Sign-offs</h3>
                            <p className="text-xs text-muted-foreground">
                                Inspect deliverable files, evaluate designer updates, and click to approve or request revisions.
                            </p>
                        </div>

                        {tasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No items available for review.</p>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => handleOpenTask(t)}
                                        className="cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-xs"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-foreground">{t.title}</h4>
                                                {t.client_review_status === 'approved' || t.is_complete ? (
                                                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                        Approved
                                                    </span>
                                                ) : t.client_review_status === 'revision_requested' ? (
                                                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                                        Needs Revision (Round {t.client_revision_count || 1})
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                        Awaiting Review
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                {t.client_deadline && (
                                                    <span className="flex items-center gap-1 font-semibold text-foreground">
                                                        <Calendar className="h-3 w-3 text-primary" />
                                                        Deadline: {t.client_deadline}
                                                    </span>
                                                )}
                                                <span>{t.deliverables_count ?? t.deliverables?.length ?? 0} Deliverables</span>
                                                {t.comments?.length > 0 && <span>{t.comments.length} Comments</span>}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenTask(t);
                                                }}
                                                className="rounded-xl bg-[#0073ea] text-white text-xs font-semibold gap-1.5 hover:bg-[#0060c0]"
                                            >
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                <span>Open Review</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 5: NOTIFICATIONS & ACTIVITY */}
                {currentTab === 'notifications' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-[#ECECF0] bg-white p-6 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#ECECF0] dark:border-[#28283E]">
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0073ea]/10 text-[#0073ea] dark:bg-[#0073ea]/20 dark:text-[#579bfc]">
                                            <Bell className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-foreground">Notifications & Activity</h3>
                                            <p className="text-xs text-muted-foreground">
                                                Review deliverables, feedback requests, designer comments, and deadline alerts.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={unreadNotifCount === 0 || markingAll}
                                        onClick={handleMarkAllAsRead}
                                        className="h-8 rounded-xl border-[#ECECF0] text-xs font-semibold gap-1.5 dark:border-[#28283E] dark:bg-[#151522] dark:hover:bg-[#252538]"
                                    >
                                        <CheckCheck className="h-3.5 w-3.5 text-[#00c875]" />
                                        <span>Mark all read</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Filter Chips */}
                            <div className="flex items-center gap-1.5 pt-4 pb-2 overflow-x-auto">
                                <button
                                    onClick={() => setNotificationFilter('all')}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                        notificationFilter === 'all'
                                            ? 'bg-[#0073ea] text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#28283E] dark:text-slate-300 dark:hover:bg-[#353550]'
                                    }`}
                                >
                                    All ({notificationList.length})
                                </button>

                                <button
                                    onClick={() => setNotificationFilter('unread')}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                        notificationFilter === 'unread'
                                            ? 'bg-[#0073ea] text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#28283E] dark:text-slate-300 dark:hover:bg-[#353550]'
                                    }`}
                                >
                                    Unread ({unreadNotifCount})
                                </button>

                                <button
                                    onClick={() => setNotificationFilter('reviews')}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                        notificationFilter === 'reviews'
                                            ? 'bg-[#0073ea] text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#28283E] dark:text-slate-300 dark:hover:bg-[#353550]'
                                    }`}
                                >
                                    Reviews & Approvals
                                </button>

                                <button
                                    onClick={() => setNotificationFilter('comments')}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                        notificationFilter === 'comments'
                                            ? 'bg-[#0073ea] text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#28283E] dark:text-slate-300 dark:hover:bg-[#353550]'
                                    }`}
                                >
                                    Comments & Mentions
                                </button>

                                <button
                                    onClick={() => setNotificationFilter('system')}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                        notificationFilter === 'system'
                                            ? 'bg-[#0073ea] text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#28283E] dark:text-slate-300 dark:hover:bg-[#353550]'
                                    }`}
                                >
                                    System & Deadlines
                                </button>
                            </div>

                            {/* Notifications List */}
                            <div className="mt-3 divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                {filteredNotifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-[#28283E] dark:text-slate-500">
                                            <BellOff className="h-6 w-6" />
                                        </div>
                                        <h4 className="mt-3 text-sm font-bold text-foreground">
                                            {notificationFilter === 'unread' ? 'All caught up!' : 'No notifications found'}
                                        </h4>
                                        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                                            {notificationFilter === 'unread'
                                                ? 'You have reviewed all pending notifications and deliverable updates.'
                                                : 'When tasks are assigned, deliverables submitted, or comments added, they will appear here.'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredNotifications.map((notif) => {
                                        const isReview = notif.category === 'reviews' || notif.category === 'deliverables';
                                        const isComment = notif.category === 'mentions' || notif.category === 'comments';

                                        return (
                                            <div
                                                key={notif.id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className={`group flex items-start gap-4 p-4 transition-all cursor-pointer rounded-xl ${
                                                    !notif.is_read
                                                        ? 'bg-blue-50/40 hover:bg-blue-50/70 dark:bg-blue-950/20 dark:hover:bg-blue-950/30'
                                                        : 'hover:bg-slate-50/80 dark:hover:bg-[#252538]/50'
                                                }`}
                                            >
                                                {/* Left Icon or Avatar */}
                                                <div className="relative mt-0.5 shrink-0">
                                                    {notif.actor?.avatar ? (
                                                        <img
                                                            src={notif.actor.avatar}
                                                            alt={notif.actor.name}
                                                            className="h-9 w-9 rounded-full object-cover ring-2 ring-background"
                                                        />
                                                    ) : (
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-[#2e2e44] dark:text-slate-200">
                                                            {notif.actor?.name ? notif.actor.name.charAt(0).toUpperCase() : 'A'}
                                                        </div>
                                                    )}
                                                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-2xs dark:bg-[#1E1E2F]">
                                                        {isReview ? (
                                                            <ShieldCheck className="h-2.5 w-2.5 text-[#0073ea]" />
                                                        ) : isComment ? (
                                                            <MessageSquare className="h-2.5 w-2.5 text-[#fdab3d]" />
                                                        ) : (
                                                            <Bell className="h-2.5 w-2.5 text-[#00c875]" />
                                                        )}
                                                    </span>
                                                </div>

                                                {/* Notification Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4
                                                            className={`text-xs font-bold ${
                                                                !notif.is_read
                                                                    ? 'text-[#0073ea] dark:text-[#579bfc]'
                                                                    : 'text-foreground'
                                                            }`}
                                                        >
                                                            {notif.title}
                                                        </h4>
                                                        {!notif.is_read && (
                                                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0073ea]" />
                                                        )}
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-[#28283E] dark:text-slate-400">
                                                            {notif.category || 'General'}
                                                        </span>
                                                    </div>

                                                    <p className="mt-1 text-xs text-foreground/80 leading-relaxed">
                                                        {notif.message}
                                                    </p>

                                                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                                                        <span>{formatNotificationTime(notif.created_at)}</span>
                                                        {notif.actor?.name && (
                                                            <>
                                                                <span>•</span>
                                                                <span>From {notif.actor.name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Quick Action Buttons */}
                                                <div className="flex items-center gap-1.5 shrink-0 self-center">
                                                    {notif.link && (
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleNotificationClick(notif);
                                                            }}
                                                            className="h-7 rounded-lg bg-[#0073ea] px-2.5 text-[11px] font-semibold text-white hover:bg-[#0060c0]"
                                                        >
                                                            <span>View</span>
                                                            <ArrowRight className="h-3 w-3 ml-1" />
                                                        </Button>
                                                    )}

                                                    {!notif.is_read && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                                                            title="Mark as read"
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#ECECF0] text-slate-500 hover:border-[#0073ea] hover:text-[#0073ea] dark:border-[#28283E] dark:text-slate-400 dark:hover:text-white"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteNotification(notif.id, e)}
                                                        title="Delete notification"
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#ECECF0] text-slate-500 hover:border-rose-400 hover:text-rose-500 dark:border-[#28283E] dark:text-slate-400 dark:hover:text-rose-400"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Shared Item Detail Drawer with client capabilities */}
            {selectedTask && (
                <ItemDetailDrawer
                    task={selectedTask}
                    board={activeBoard}
                    users={users}
                    permissions={permissions}
                    onClose={handleCloseDrawer}
                    onSelectTask={(task) => handleOpenTask(task)}
                    initialTab={initialDrawerTab}
                    targetHighlightId={initialHighlightId}
                />
            )}
        </AppLayout>
    );
}
