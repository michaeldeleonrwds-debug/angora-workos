import React, { useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronRight,
    Clock,
    CornerDownRight,
    Folder,
    Link2,
    Plus,
    SlidersHorizontal,
    Star,
    User as UserIcon,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatTime } from '@/lib/utils';
import { isProductionDeadlineHidden, isUserAssignedToTask, KanbanBoard, Task, User } from '../types';
import CalendarDayDetailModal from './CalendarDayDetailModal';

interface GanttViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
}

export default function GanttView({
    board,
    searchTerm,
    personFilter,
    priorityFilter,
    users = [],
    onSelectTask,
}: GanttViewProps) {
    const { auth } = usePage<any>().props;
    const currentUserId = auth?.user?.id;
    const [zoomLevel, setZoomLevel] = useState<'days' | 'weeks' | 'months'>('weeks');
    const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
    const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
    const [selectedDateForModal, setSelectedDateForModal] = useState<string | null>(null);

    // Modal state for linking dependencies
    const [isDepModalOpen, setIsDepModalOpen] = useState(false);
    const [sourceTask, setSourceTask] = useState<Task | null>(null);
    const [depTargetId, setDepTargetId] = useState<string>('');
    const [depType, setDepType] = useState<string>('finish_to_start');

    // Group tasks by board groups
    const groupsWithTasks = useMemo(() => {
        return (board.groups || []).map((group) => {
            const filteredTasks = (group.tasks || []).filter((task) => {
                if (task.parent_id) return false; // top-level in group
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    if (!task.title.toLowerCase().includes(term)) return false;
                }
                if (personFilter !== 'all' && !isUserAssignedToTask(task, personFilter, currentUserId)) return false;
                if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
                return true;
            });
            return {
                ...group,
                tasks: filteredTasks,
            };
        });
    }, [board.groups, searchTerm, personFilter, priorityFilter, currentUserId]);

    // Flatten all visible root tasks
    const allRootTasks = useMemo(() => {
        return groupsWithTasks.flatMap((g) => g.tasks || []);
    }, [groupsWithTasks]);

    // Calculate overall timeline time range
    const { minDate, maxDate, totalDays } = useMemo(() => {
        let min = new Date();
        let max = new Date();
        max.setDate(min.getDate() + 30);

        const dates: Date[] = [];
        allRootTasks.forEach((t) => {
            if (t.start_date) dates.push(new Date(t.start_date));
            if (t.due_date) dates.push(new Date(t.due_date));
            (t.subitems || []).forEach((st) => {
                if (st.start_date) dates.push(new Date(st.start_date));
                if (st.due_date) dates.push(new Date(st.due_date));
            });
        });

        if (dates.length > 0) {
            min = new Date(Math.min(...dates.map((d) => d.getTime())));
            max = new Date(Math.max(...dates.map((d) => d.getTime())));
        }

        // Add padding on either side
        min.setDate(min.getDate() - 7);
        max.setDate(max.getDate() + 14);

        const diffTime = Math.abs(max.getTime() - min.getTime());
        const total = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 30;

        return { minDate: min, maxDate: max, totalDays: total };
    }, [allRootTasks]);

    // Generate timeline time markers
    const timeMarkers = useMemo(() => {
        const markers: { label: string; dateStr: string; leftPercent: number }[] = [];
        const step = zoomLevel === 'days' ? 2 : zoomLevel === 'weeks' ? 7 : 30;

        for (let i = 0; i < totalDays; i += step) {
            const d = new Date(minDate);
            d.setDate(minDate.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const label =
                zoomLevel === 'months'
                    ? d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                    : `${d.toLocaleDateString(undefined, { month: 'short' })} ${d.getDate()}`;
            markers.push({
                label,
                dateStr,
                leftPercent: (i / totalDays) * 100,
            });
        }
        return markers;
    }, [minDate, totalDays, zoomLevel]);

    // Calculate "Today" position
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOffsetDays = (new Date().getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const todayLeftPercent = (todayOffsetDays / totalDays) * 100;
    const isTodayVisible = todayLeftPercent >= 0 && todayLeftPercent <= 100;

    const toggleGroupCollapse = (groupId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const toggleTaskExpand = (taskId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    // Calculate bar left % and width %
    const getBarMetrics = (startDate?: string | null, dueDate?: string | null) => {
        const start = startDate ? new Date(startDate) : new Date();
        const due = dueDate ? new Date(dueDate) : new Date(start.getTime() + 86400000 * 3);

        const startOffset = Math.max(0, (start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, (due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        const leftPercent = Math.min(100, Math.max(0, (startOffset / totalDays) * 100));
        const widthPercent = Math.min(100 - leftPercent, Math.max(2.5, (duration / totalDays) * 100));

        return { leftPercent, widthPercent };
    };

    const handleOpenDepModal = (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        setSourceTask(task);
        setDepTargetId('');
        setIsDepModalOpen(true);
    };

    const handleCreateDependency = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceTask || !depTargetId) return;

        router.post(
            `/kanban/tasks/${sourceTask.id}/dependencies`,
            {
                depends_on_task_id: Number(depTargetId),
                dependency_type: depType,
            },
            {
                onSuccess: () => {
                    setIsDepModalOpen(false);
                    setSourceTask(null);
                },
            },
        );
    };

    return (
        <div className="border border-border/70 bg-card dark:border-[#28283E] dark:bg-[#161624] space-y-4 rounded-2xl p-4 shadow-sm select-none transition-colors">
            {/* Header Toolbar */}
            <div className="flex flex-col items-start justify-between gap-3 border-b border-border/50 dark:border-[#28283E] pb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <h3 className="text-foreground text-sm font-black tracking-tight">
                            Interactive Gantt & Schedule Sequencing
                        </h3>
                    </div>
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {allRootTasks.length} items
                    </span>
                </div>

                {/* Zoom Level & Actions */}
                <div className="flex items-center gap-2">
                    <div className="flex rounded-xl border border-border/60 bg-muted/40 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
                        <button
                            type="button"
                            onClick={() => setZoomLevel('days')}
                            className={`rounded-lg px-3 py-1 font-bold transition-all cursor-pointer ${
                                zoomLevel === 'days'
                                    ? 'bg-card text-foreground shadow-xs dark:bg-[#1f1f33] dark:text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Days
                        </button>
                        <button
                            type="button"
                            onClick={() => setZoomLevel('weeks')}
                            className={`rounded-lg px-3 py-1 font-bold transition-all cursor-pointer ${
                                zoomLevel === 'weeks'
                                    ? 'bg-card text-foreground shadow-xs dark:bg-[#1f1f33] dark:text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Weeks
                        </button>
                        <button
                            type="button"
                            onClick={() => setZoomLevel('months')}
                            className={`rounded-lg px-3 py-1 font-bold transition-all cursor-pointer ${
                                zoomLevel === 'months'
                                    ? 'bg-card text-foreground shadow-xs dark:bg-[#1f1f33] dark:text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Months
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const anyCollapsed = Object.values(collapsedGroups).some(Boolean);
                            if (anyCollapsed) {
                                setCollapsedGroups({});
                            } else {
                                const allCollapsed: Record<number, boolean> = {};
                                groupsWithTasks.forEach((g) => {
                                    allCollapsed[g.id] = true;
                                });
                                setCollapsedGroups(allCollapsed);
                            }
                        }}
                        className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/60 dark:border-white/10 rounded-lg"
                    >
                        {Object.values(collapsedGroups).some(Boolean) ? 'Expand All' : 'Collapse All'}
                    </Button>
                </div>
            </div>

            {/* Gantt Chart Main Container */}
            <div className="overflow-x-auto rounded-xl border border-border/60 dark:border-[#28283E] bg-background dark:bg-[#12121d] min-w-[760px]">
                {/* Header Timeline Scale (Clickable Date Markers) */}
                <div className="sticky top-0 z-20 flex border-b border-border/60 dark:border-[#28283E] bg-muted/40 dark:bg-[#181827] text-xs font-bold text-muted-foreground py-2.5">
                    {/* Left Hierarchy Column Header */}
                    <div className="w-[320px] flex-shrink-0 border-r border-border/40 dark:border-[#28283E] px-4 font-black uppercase tracking-wider text-[11px] text-foreground/80 flex items-center justify-between">
                        <span>Task & Hierarchy</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Click date to view popup</span>
                    </div>

                    {/* Right Timeline Date Track Header */}
                    <div className="relative h-6 flex-1 cursor-pointer">
                        {timeMarkers.map((marker, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedDateForModal(marker.dateStr)}
                                title={`Click to open popup for ${marker.dateStr}`}
                                className="absolute top-0 flex h-full -translate-x-1/2 transform items-center border-l border-border/40 dark:border-white/10 pl-1.5 text-[10px] font-bold text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xs transition-colors cursor-pointer group/marker"
                                style={{ left: `${marker.leftPercent}%` }}
                            >
                                <span className="group-hover/marker:underline">{marker.label}</span>
                            </button>
                        ))}

                        {/* Today Marker in Header */}
                        {isTodayVisible && (
                            <div
                                onClick={() => setSelectedDateForModal(todayStr)}
                                className="absolute top-0 -translate-x-1/2 rounded-full bg-[#0073ea] text-white text-[9px] font-black px-1.5 py-0.5 shadow-md cursor-pointer z-30"
                                style={{ left: `${todayLeftPercent}%` }}
                                title="Click to view Today's scheduled items"
                            >
                                TODAY
                            </div>
                        )}
                    </div>
                </div>

                {/* Gantt Body with Vertical Today Line */}
                <div className="relative divide-y divide-border/40 dark:divide-[#28283E]/60">
                    {/* Continuous vertical line for Today */}
                    {isTodayVisible && (
                        <div
                            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px border-l-2 border-dashed border-[#0073ea]/60"
                            style={{ left: `calc(320px + ${todayLeftPercent}%)` }}
                        />
                    )}

                    {groupsWithTasks.map((group) => {
                        const isGroupCollapsed = Boolean(collapsedGroups[group.id]);
                        const groupTasks = group.tasks || [];

                        return (
                            <div key={group.id} className="divide-y divide-border/30 dark:divide-[#28283E]/40">
                                {/* Group Header Row */}
                                <div
                                    onClick={(e) => toggleGroupCollapse(group.id, e)}
                                    className="flex min-h-[38px] cursor-pointer items-center bg-muted/20 dark:bg-white/[0.02] hover:bg-muted/40 dark:hover:bg-white/[0.05] transition-colors"
                                >
                                    <div className="w-[320px] flex-shrink-0 border-r border-border/40 dark:border-[#28283E] px-3 py-1.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <button
                                                type="button"
                                                onClick={(e) => toggleGroupCollapse(group.id, e)}
                                                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                                            >
                                                {isGroupCollapsed ? (
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                ) : (
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                            <span
                                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: group.color || '#579BFC' }}
                                            />
                                            <span className="truncate text-xs font-black uppercase tracking-wider text-foreground">
                                                {group.title}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-muted/40 dark:bg-white/5">
                                            {groupTasks.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 px-4 text-[10px] text-muted-foreground italic">
                                        {groupTasks.length === 0 ? 'No tasks in this group' : `${groupTasks.length} scheduled tasks`}
                                    </div>
                                </div>

                                {/* Group Tasks (if not collapsed) */}
                                {!isGroupCollapsed &&
                                    groupTasks.map((task) => {
                                        const hasSubtasks = (task.subitems || []).length > 0;
                                        const isExpanded = Boolean(expandedTasks[task.id]);
                                        const { leftPercent, widthPercent } = getBarMetrics(task.start_date, task.due_date);
                                        const isDone = isProductionDeadlineHidden(task);
                                        const isOverdue = !isDone && task.deadline_status === 'overdue';
                                        const statusCol = task.column?.color || '#579bfc';

                                        return (
                                            <React.Fragment key={task.id}>
                                                {/* Task Row */}
                                                <div
                                                    onClick={() => onSelectTask(task)}
                                                    className="group flex min-h-[42px] cursor-pointer items-center hover:bg-muted/30 dark:hover:bg-white/[0.04] transition-colors"
                                                >
                                                    {/* Left Label Column */}
                                                    <div className="w-[320px] flex-shrink-0 border-r border-border/40 dark:border-[#28283E] px-4 py-2 flex items-center justify-between gap-2">
                                                        <div className="flex min-w-0 items-center gap-1.5 pl-3">
                                                            {hasSubtasks ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => toggleTaskExpand(task.id, e)}
                                                                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                                    ) : (
                                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <div className="w-4 shrink-0" />
                                                            )}

                                                            <span
                                                                className={`truncate text-xs font-bold transition-colors group-hover:text-primary ${
                                                                    isDone
                                                                        ? 'text-muted-foreground line-through'
                                                                        : 'text-foreground'
                                                                }`}
                                                            >
                                                                {task.title}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleOpenDepModal(task, e)}
                                                                title="Add dependency link"
                                                                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-white/10"
                                                            >
                                                                <Link2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Right Gantt Bar Track */}
                                                    <div className="relative flex h-9 flex-1 items-center px-2">
                                                        {/* Task Bar or Milestone Diamond */}
                                                        {task.is_milestone ? (
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (task.due_date) {
                                                                        setSelectedDateForModal(task.due_date);
                                                                    } else {
                                                                        onSelectTask(task);
                                                                    }
                                                                }}
                                                                className="group/bar absolute flex h-5 w-5 -translate-x-1/2 rotate-45 items-center justify-center rounded-xs shadow-md transition-all hover:scale-125 cursor-pointer z-10"
                                                                style={{
                                                                    left: `${leftPercent}%`,
                                                                    backgroundColor: isDone ? '#00c875' : '#f59e0b',
                                                                }}
                                                                title={`Milestone: ${task.title} (Due: ${task.due_date || 'N/A'})\nClick to open date popup`}
                                                            >
                                                                <Star className="h-2.5 w-2.5 -rotate-45 fill-white text-white" />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (task.due_date) {
                                                                        setSelectedDateForModal(task.due_date);
                                                                    } else {
                                                                        onSelectTask(task);
                                                                    }
                                                                }}
                                                                className="group/bar absolute flex h-7 items-center justify-between rounded-lg px-2 text-[10px] font-bold text-white shadow-sm transition-all hover:shadow-md cursor-pointer z-10 border border-white/20"
                                                                style={{
                                                                    left: `${leftPercent}%`,
                                                                    width: `${widthPercent}%`,
                                                                    backgroundColor: isDone
                                                                        ? '#00c875'
                                                                        : isOverdue
                                                                        ? '#e2445c'
                                                                        : statusCol,
                                                                }}
                                                                title={`${task.title}\nSchedule: ${task.start_date || 'N/A'} – ${task.due_date || 'N/A'}\nClick to open date popup`}
                                                            >
                                                                <span className="truncate pr-1">{task.title}</span>

                                                                {task.assignee && (
                                                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black/30 text-[9px] font-bold text-white">
                                                                        {task.assignee.name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Subtasks (if expanded) */}
                                                {isExpanded &&
                                                    (task.subitems || []).map((subtask) => {
                                                        const subMetrics = getBarMetrics(subtask.start_date, subtask.due_date);
                                                        const isSubDone = isProductionDeadlineHidden(subtask);

                                                        return (
                                                            <div
                                                                key={`sub-${subtask.id}`}
                                                                onClick={() => onSelectTask(subtask)}
                                                                className="group flex min-h-[36px] cursor-pointer items-center bg-muted/10 dark:bg-white/[0.01] hover:bg-muted/20 dark:hover:bg-white/[0.03] transition-colors"
                                                            >
                                                                <div className="w-[320px] flex-shrink-0 border-r border-border/40 dark:border-[#28283E] px-4 py-1.5 flex items-center gap-2 pl-9">
                                                                    <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                    <span
                                                                        className={`truncate text-[11px] font-medium ${
                                                                            isSubDone
                                                                                ? 'text-muted-foreground line-through'
                                                                                : 'text-foreground'
                                                                        }`}
                                                                    >
                                                                        {subtask.title}
                                                                    </span>
                                                                </div>

                                                                <div className="relative flex h-7 flex-1 items-center px-2">
                                                                    <div
                                                                        className="absolute flex h-5 items-center rounded-md px-1.5 text-[9px] font-medium text-white shadow-xs opacity-90 transition-all hover:opacity-100"
                                                                        style={{
                                                                            left: `${subMetrics.leftPercent}%`,
                                                                            width: `${subMetrics.widthPercent}%`,
                                                                            backgroundColor: isSubDone ? '#00c875' : '#8c9ba5',
                                                                        }}
                                                                        title={`Subtask: ${subtask.title}`}
                                                                    >
                                                                        <span className="truncate">{subtask.title}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </React.Fragment>
                                        );
                                    })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* DEPENDENCY MODAL */}
            <Dialog open={isDepModalOpen} onOpenChange={setIsDepModalOpen}>
                <DialogContent className="max-w-md border-white/10 bg-[#1e1e30] text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                            <Link2 className="h-4 w-4 text-[#A25DDC]" />
                            <span>Link Task Dependency</span>
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateDependency} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Dependent Task</label>
                            <div className="rounded-lg border border-white/10 bg-[#28283E] p-2 text-xs font-bold text-white">
                                {sourceTask?.title}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Depends On (Predecessor)</label>
                            <Select value={depTargetId} onValueChange={setDepTargetId}>
                                <SelectTrigger className="h-8 border-white/10 bg-[#28283E] text-xs text-white">
                                    <SelectValue placeholder="Select prerequisite item..." />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1e1e30] text-white">
                                    {allRootTasks
                                        .filter((t) => t.id !== sourceTask?.id)
                                        .map((t) => (
                                            <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                                                {t.title}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Dependency Rule</label>
                            <Select value={depType} onValueChange={setDepType}>
                                <SelectTrigger className="h-8 border-white/10 bg-[#28283E] text-xs text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1e1e30] text-white">
                                    <SelectItem value="finish_to_start" className="text-xs">
                                        Finish to Start (FS) — Standard Sequence
                                    </SelectItem>
                                    <SelectItem value="start_to_start" className="text-xs">
                                        Start to Start (SS) — Parallel Initiation
                                    </SelectItem>
                                    <SelectItem value="finish_to_finish" className="text-xs">
                                        Finish to Finish (FF) — Synchronous Completion
                                    </SelectItem>
                                    <SelectItem value="start_to_finish" className="text-xs">
                                        Start to Finish (SF)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsDepModalOpen(false)}
                                className="h-8 text-xs text-slate-400 hover:text-white"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!depTargetId}
                                className="h-8 bg-[#0073ea] hover:bg-[#0060c0] text-xs font-bold text-white"
                            >
                                Create Link
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DYNAMIC DATE DETAIL MODAL (Opens on date click!) */}
            <CalendarDayDetailModal
                isOpen={Boolean(selectedDateForModal)}
                dateStr={selectedDateForModal}
                board={board}
                users={users}
                tasks={allRootTasks}
                onClose={() => setSelectedDateForModal(null)}
                onSelectTask={onSelectTask}
            />
        </div>
    );
}
