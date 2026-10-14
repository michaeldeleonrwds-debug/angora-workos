import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    ArrowUpRight,
    Calendar,
    CheckCircle2,
    CheckSquare,
    Clock,
    FolderKanban,
    Kanban,
    Layers,
    Plus,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Workspaces',
        href: '/dashboard',
    },
    {
        title: 'Monday.com Dashboard',
        href: '/dashboard',
    },
];

interface DashboardProps {
    stats: {
        total_tasks: number;
        completed_tasks: number;
        in_progress_tasks: number;
        urgent_tasks: number;
        overdue_tasks?: number;
        pending_reviews?: number;
        approved_reviews?: number;
        revision_reviews?: number;
        completion_rate: number;
        total_boards: number;
        total_workspaces: number;
    };
    recentTasks: Array<{
        id: number;
        title: string;
        priority: string;
        due_date: string | null;
        completed_at: string | null;
        board?: { id: number; title: string };
        column?: { id: number; title?: string; name?: string; color?: string };
        group?: { id: number; title: string; color?: string };
        assignee?: { id: number; name: string; email: string; avatar?: string };
    }>;
    activeBoards: Array<{
        id: number;
        title: string;
        description?: string;
        workspace?: { id: number; name: string };
        tasks_count: number;
        groups_count: number;
        updated_at: string;
    }>;
    statusBreakdown: {
        done: number;
        working_on_it: number;
        review?: number;
        stuck: number;
        backlog: number;
    };
    teamWorkload?: Array<{
        id: number;
        name: string;
        email: string;
        avatar?: string;
        role: string;
        department?: string;
        active_tasks: number;
        completed_tasks: number;
        overdue_tasks: number;
    }>;
    selectedWorkspaceId?: number | null;
}

export default function Dashboard({
    stats = {
        total_tasks: 0,
        completed_tasks: 0,
        in_progress_tasks: 0,
        urgent_tasks: 0,
        overdue_tasks: 0,
        pending_reviews: 0,
        approved_reviews: 0,
        revision_reviews: 0,
        completion_rate: 0,
        total_boards: 0,
        total_workspaces: 0,
    },
    recentTasks = [],
    activeBoards = [],
    statusBreakdown = { done: 0, working_on_it: 0, review: 0, stuck: 0, backlog: 0 },
    teamWorkload = [],
    selectedWorkspaceId = null,
}: DashboardProps) {
    const { auth, userWorkspaces = [] } = usePage<SharedData>().props as any;
    const user = auth?.user as any;
    const firstName = user?.name?.split(' ')[0] || 'Team';

    // Battery calculation
    const totalBattery =
        (statusBreakdown.done || 0) + (statusBreakdown.working_on_it || 0) + (statusBreakdown.stuck || 0) + (statusBreakdown.backlog || 0);

    const donePct = totalBattery > 0 ? Math.round((statusBreakdown.done / totalBattery) * 100) : 0;
    const workingPct = totalBattery > 0 ? Math.round((statusBreakdown.working_on_it / totalBattery) * 100) : 0;
    const stuckPct = totalBattery > 0 ? Math.round((statusBreakdown.stuck / totalBattery) * 100) : 0;
    const backlogPct = Math.max(0, 100 - (donePct + workingPct + stuckPct));

    const getPriorityBadgeClass = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'urgent':
                return 'bg-[#e2445c]/10 text-[#e2445c] border-[#e2445c]/30';
            case 'high':
                return 'bg-[#fdab3d]/10 text-[#fdab3d] border-[#fdab3d]/30';
            case 'medium':
                return 'bg-[#0073ea]/10 text-[#0073ea] border-[#0073ea]/30';
            default:
                return 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:text-slate-400';
        }
    };

    const getStatusStyle = (task: any) => {
        if (task.completed_at) {
            return {
                bg: 'bg-[#00c875] text-white',
                label: 'Done',
            };
        }
        const colName = (task.column?.title || task.column?.name || '').toLowerCase();
        if (colName.includes('progress') || colName.includes('working')) {
            return {
                bg: 'bg-[#fdab3d] text-white',
                label: 'Working on it',
            };
        }
        if (task.priority?.toLowerCase() === 'urgent') {
            return {
                bg: 'bg-[#e2445c] text-white',
                label: 'Stuck',
            };
        }
        return {
            bg: 'bg-[#579bfc] text-white',
            label: task.column?.title || task.column?.name || 'To Do',
        };
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Monday.com Work OS — Dashboard" />

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
                                Monday Work OS
                            </span>
                        </div>
                        <p className="mt-1.5 text-xs text-[#777785] sm:text-sm dark:text-slate-400">
                            Here is an overview of your active tasks, sprint boards, and project progress.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Button
                            asChild
                            className="flex h-10 items-center gap-1.5 rounded-xl bg-[#0073ea] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0060c0]"
                        >
                            <Link href="/kanban">
                                <Plus className="h-4 w-4 text-white" />New Task
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="flex h-10 items-center gap-1.5 rounded-xl border border-[#ECECF0] bg-white px-4 text-xs font-semibold text-[#191927] shadow-xs transition-colors hover:bg-slate-50 dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white dark:hover:bg-[#252538]"
                        >
                            <Link href="/kanban">
                                <Kanban className="h-4 w-4 text-[#0073ea]" />
                                Open Boards
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* 5 KPI Metric Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-5">
                    {/* Card 1: Total Tasks */}
                    <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#777785] uppercase dark:text-slate-400">Total Items</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0073ea]/10 text-[#0073ea] dark:bg-[#0073ea]/20">
                                <CheckSquare className="h-5 w-5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-[#191927] dark:text-white">{stats.total_tasks}</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">
                                Across {stats.total_boards} active {stats.total_boards === 1 ? 'board' : 'boards'}
                            </p>
                        </div>
                    </div>

                    {/* Card 2: In Progress */}
                    <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#777785] uppercase dark:text-slate-400">Working On It</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fdab3d]/10 text-[#fdab3d] dark:bg-[#fdab3d]/20">
                                <Clock className="h-5 w-5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-[#fdab3d]">{stats.in_progress_tasks}</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">In active production</p>
                        </div>
                    </div>

                    {/* Card 3: Reviews & Approvals */}
                    <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#777785] uppercase dark:text-slate-400">In Review</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                                {stats.pending_reviews || 0}
                            </div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">
                                {stats.revision_reviews || 0} revisions requested
                            </p>
                        </div>
                    </div>

                    {/* Card 4: Completed */}
                    <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#777785] uppercase dark:text-slate-400">Completed</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00c875]/10 text-[#00c875] dark:bg-[#00c875]/20">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <div className="text-3xl font-black tracking-tight text-[#00c875]">{stats.completed_tasks}</div>
                                <span className="text-xs font-semibold text-[#00c875]">({stats.completion_rate}%)</span>
                            </div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">Finished sprint tasks</p>
                        </div>
                    </div>

                    {/* Card 5: Urgent & Overdue */}
                    <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#777785] uppercase dark:text-slate-400">Urgent & Overdue</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e2445c]/10 text-[#e2445c] dark:bg-[#e2445c]/20">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-[#e2445c]">
                                {(stats.urgent_tasks || 0) + (stats.overdue_tasks || 0)}
                            </div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">
                                {stats.overdue_tasks || 0} overdue deliverables
                            </p>
                        </div>
                    </div>
                </div>

                {/* Monday Signature Battery Widget */}
                <div className="rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-sm font-bold text-[#191927] dark:text-white">Task Status Battery</h2>
                            <p className="text-xs text-[#777785] dark:text-slate-400">High-level distribution of all board items</p>
                        </div>
                        <span className="text-xs font-semibold text-[#777785] dark:text-slate-400">{stats.total_tasks} total items</span>
                    </div>

                    {/* Multi-segment Battery Bar */}
                    <div className="mt-4">
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            {totalBattery === 0 ? (
                                <div className="h-full w-full bg-slate-200 dark:bg-slate-700" />
                            ) : (
                                <>
                                    {donePct > 0 && (
                                        <div
                                            className="h-full bg-[#00c875] transition-all"
                                            style={{ width: `${donePct}%` }}
                                            title={`Done: ${statusBreakdown.done} (${donePct}%)`}
                                        />
                                    )}
                                    {workingPct > 0 && (
                                        <div
                                            className="h-full bg-[#fdab3d] transition-all"
                                            style={{ width: `${workingPct}%` }}
                                            title={`Working on it: ${statusBreakdown.working_on_it} (${workingPct}%)`}
                                        />
                                    )}
                                    {stuckPct > 0 && (
                                        <div
                                            className="h-full bg-[#e2445c] transition-all"
                                            style={{ width: `${stuckPct}%` }}
                                            title={`Stuck: ${statusBreakdown.stuck} (${stuckPct}%)`}
                                        />
                                    )}
                                    {backlogPct > 0 && (
                                        <div
                                            className="h-full bg-[#579bfc] transition-all"
                                            style={{ width: `${backlogPct}%` }}
                                            title={`To Do / Backlog: ${backlogPct}%`}
                                        />
                                    )}
                                </>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#00c875]" />
                                <span>Done</span>
                                <span className="text-muted-foreground font-normal">({statusBreakdown.done})</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#fdab3d]" />
                                <span>Working on it</span>
                                <span className="text-muted-foreground font-normal">({statusBreakdown.working_on_it})</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#e2445c]" />
                                <span>Stuck</span>
                                <span className="text-muted-foreground font-normal">({statusBreakdown.stuck})</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#579bfc]" />
                                <span>To Do / Backlog</span>
                                <span className="text-muted-foreground font-normal">({statusBreakdown.backlog})</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Workload & Capacity Section */}
                <div className="rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-[#0073ea]" />
                                <h2 className="text-sm font-bold text-[#191927] dark:text-white">Team Workload & Capacity</h2>
                            </div>
                            <p className="text-xs text-[#777785] dark:text-slate-400">
                                Live task distribution, bandwidth capacity, and delivery risk per team member
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-[#00c875]" /> Healthy (&le; 5)
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-[#fdab3d]" /> Moderate (6–8)
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-[#e2445c]" /> High Load (&gt; 8)
                            </span>
                        </div>
                    </div>

                    {teamWorkload.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                            No team workload data available.
                        </div>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {teamWorkload.map((member) => {
                                const maxCap = 8;
                                const active = member.active_tasks;
                                const capPct = Math.min(100, Math.round((active / maxCap) * 100));
                                const isOverloaded = active > 8;
                                const isModerate = active >= 5 && active <= 8;
                                const barColor = isOverloaded
                                    ? 'bg-[#e2445c]'
                                    : isModerate
                                    ? 'bg-[#fdab3d]'
                                    : 'bg-[#00c875]';

                                const roleLabel =
                                    member.role === 'dept_user'
                                        ? 'Designer'
                                        : member.role === 'project_manager'
                                        ? 'Project Manager'
                                        : member.role === 'account_manager'
                                        ? 'Account Manager'
                                        : member.role === 'admin'
                                        ? 'Admin'
                                        : member.role;

                                return (
                                    <div
                                        key={member.id}
                                        className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-all hover:border-[#0073ea]/30 hover:bg-white hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarFallback className="bg-[#0073ea]/15 text-xs font-bold text-[#0073ea] dark:bg-[#0073ea]/30 dark:text-[#579bfc]">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white" title={member.name}>
                                                        {member.name}
                                                    </p>
                                                    <p className="truncate text-[11px] text-slate-400 capitalize">
                                                        {roleLabel}
                                                    </p>
                                                </div>
                                            </div>
                                            {member.overdue_tasks > 0 && (
                                                <Badge
                                                    variant="outline"
                                                    className="shrink-0 border-[#e2445c]/30 bg-[#e2445c]/10 text-[10px] font-bold text-[#e2445c]"
                                                    title={`${member.overdue_tasks} overdue`}
                                                >
                                                    {member.overdue_tasks} overdue
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="mt-3 space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-medium text-slate-600 dark:text-slate-400">
                                                    {active} active {active === 1 ? 'task' : 'tasks'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {member.completed_tasks} completed
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                <div
                                                    className={`h-full transition-all duration-300 ${barColor}`}
                                                    style={{ width: `${Math.max(active > 0 ? 8 : 0, capPct)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Main Content Grid: Active Boards & Recent Work */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Active Boards (1 column) */}
                    <div className="flex flex-col space-y-4 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-[#191927] dark:text-white">Active Boards</h2>
                                <p className="text-xs text-[#777785] dark:text-slate-400">Workspaces and sprint pipelines</p>
                            </div>
                            <Link href="/kanban" className="flex items-center gap-1 text-xs font-semibold text-[#0073ea] hover:underline">
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {activeBoards.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                                    <FolderKanban className="mx-auto h-8 w-8 text-slate-400" />
                                    <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">No boards created yet</p>
                                    <Button asChild size="sm" className="mt-3 rounded-lg bg-[#0073ea] text-xs text-white">
                                        <Link href="/kanban">Create your first board</Link>
                                    </Button>
                                </div>
                            ) : (
                                activeBoards.map((board) => (
                                    <Link
                                        key={board.id}
                                        href={`/kanban?board=${board.id}`}
                                        className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-all hover:border-[#0073ea]/30 hover:bg-white hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-[#0073ea]/40 dark:hover:bg-slate-800/80"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0073ea]/10 text-[#0073ea] transition-transform group-hover:scale-105 dark:bg-[#0073ea]/20">
                                                <Layers className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-semibold text-slate-900 transition-colors group-hover:text-[#0073ea] dark:text-white">
                                                    {board.title}
                                                </h3>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {board.tasks_count} items • {board.groups_count || 1} groups
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0073ea]" />
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    {/* My Recent Tasks / Work Table (2 columns) */}
                    <div className="flex flex-col space-y-4 rounded-2xl border border-[#ECECF0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] lg:col-span-2 dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-[#191927] dark:text-white">Recent Items & Tasks</h2>
                                <p className="text-xs text-[#777785] dark:text-slate-400">Latest items updated in Monday Work OS</p>
                            </div>
                            <Button asChild size="sm" variant="ghost" className="text-xs text-[#0073ea] hover:bg-[#0073ea]/10">
                                <Link href="/kanban">Open Kanban Board</Link>
                            </Button>
                        </div>

                        {recentTasks.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                                <CheckSquare className="mx-auto h-8 w-8 text-slate-400" />
                                <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">No active tasks found</p>
                                <Button asChild size="sm" className="mt-3 rounded-lg bg-[#0073ea] text-xs text-white">
                                    <Link href="/kanban">+ Add Task</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="scrollbar-thin overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-[#777785] dark:border-slate-800 dark:text-slate-400">
                                            <th className="pb-2.5 font-semibold">Item Title</th>
                                            <th className="pb-2.5 font-semibold">Board / Group</th>
                                            <th className="pb-2.5 font-semibold">Status</th>
                                            <th className="pb-2.5 font-semibold">Priority</th>
                                            <th className="pb-2.5 font-semibold">Assignee</th>
                                            <th className="pb-2.5 text-right font-semibold">Due Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {recentTasks.map((task) => {
                                            const status = getStatusStyle(task);
                                            return (
                                                <tr key={task.id} className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                                                        <Link
                                                            href={task.board ? `/kanban?board=${task.board.id}` : '/kanban'}
                                                            className="transition-colors hover:text-[#0073ea]"
                                                        >
                                                            {task.title}
                                                        </Link>
                                                    </td>
                                                    <td className="py-3 text-slate-500 dark:text-slate-400">
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                                            {task.board?.title || 'Main Board'}
                                                        </span>
                                                        {task.group?.title && (
                                                            <span className="text-[11px] text-slate-400"> • {task.group.title}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        <span
                                                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold shadow-2xs ${status.bg}`}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] font-semibold ${getPriorityBadgeClass(task.priority)}`}
                                                        >
                                                            {task.priority || 'Normal'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3">
                                                        {task.assignee ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <Avatar className="h-5 w-5">
                                                                    <AvatarFallback className="bg-[#0073ea] text-[9px] font-bold text-white">
                                                                        {task.assignee.name.charAt(0)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-slate-700 dark:text-slate-300">
                                                                    {task.assignee.name.split(' ')[0]}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-right text-slate-500 dark:text-slate-400">
                                                        {task.due_date ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px]">
                                                                <Calendar className="h-3 w-3 text-slate-400" />
                                                                {task.due_date}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
