import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import ItemDetailDrawer from '@/pages/kanban/components/ItemDetailDrawer';
import KanbanBoardView from '@/pages/kanban/components/KanbanBoardView';
import { BoardPermissions, KanbanBoard, Task, User } from '@/pages/kanban/types';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    CheckSquare,
    Clock,
    Download,
    ExternalLink,
    FileText,
    FolderKanban,
    Kanban,
    Layers,
    MessageCircle,
    Paperclip,
    RotateCcw,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    User as UserIcon,
} from 'lucide-react';
import React, { useState } from 'react';

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
    };
    activeTab?: 'overview' | 'projects' | 'board' | 'reviews';
    board?: KanbanBoard;
    permissions?: BoardPermissions;
    projects?: ClientProject[];
    deliverables?: any[];
    tasks?: any[];
    users?: User[];
}

export default function ClientPortalDashboard({
    client,
    stats = {
        total_items: 0,
        awaiting_review: 0,
        needs_revision: 0,
        approved: 0,
        total_projects: 0,
    },
    activeTab = 'overview',
    board,
    permissions: propPermissions,
    projects = [],
    deliverables = [],
    tasks = [],
    users = [],
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

    const [currentTab, setCurrentTab] = useState<'overview' | 'board' | 'projects' | 'reviews'>(
        activeTab === 'projects' || activeTab === 'board' || activeTab === 'reviews' ? activeTab : 'overview'
    );

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
                <div className="flex items-center gap-2 border-b border-[#ECECF0] pb-px dark:border-[#28283E] text-xs font-bold">
                    <button
                        onClick={() => setCurrentTab('overview')}
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
                        onClick={() => setCurrentTab('board')}
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
                        onClick={() => setCurrentTab('projects')}
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
                        onClick={() => setCurrentTab('reviews')}
                        className={`flex items-center gap-1.5 border-b-2 px-3 pb-3 transition-colors ${
                            currentTab === 'reviews'
                                ? 'border-[#0073ea] text-[#0073ea]'
                                : 'border-transparent text-[#777785] hover:text-[#191927] dark:hover:text-white'
                        }`}
                    >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Reviews & Approvals ({stats.awaiting_review})</span>
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
