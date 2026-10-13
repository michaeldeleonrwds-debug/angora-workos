import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';
import { ChevronDown, ChevronRight, CornerDownRight, Link2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { KanbanBoard, Task, User } from '../types';

interface GanttViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
}

export default function GanttView({ board, searchTerm, personFilter, priorityFilter, users = [], onSelectTask }: GanttViewProps) {
    const [zoomLevel, setZoomLevel] = useState<'days' | 'weeks' | 'months'>('weeks');
    const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});

    // Modal state for linking dependencies
    const [isDepModalOpen, setIsDepModalOpen] = useState(false);
    const [sourceTask, setSourceTask] = useState<Task | null>(null);
    const [depTargetId, setDepTargetId] = useState<string>('');
    const [depType, setDepType] = useState<string>('finish_to_start');

    // Flatten all root tasks & their subtasks
    const allRootTasks = useMemo(() => {
        return (board.groups || [])
            .flatMap((g) => g.tasks || [])
            .filter((task) => !task.parent_id)
            .filter((task) => {
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    if (!task.title.toLowerCase().includes(term)) return false;
                }
                if (personFilter !== 'all' && String(task.assigned_to) !== personFilter) return false;
                if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
                return true;
            });
    }, [board.groups, searchTerm, personFilter, priorityFilter]);

    // Calculate overall time range for Gantt header
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

        // Add 7-day padding on either side
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

    const toggleExpand = (taskId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    // Helper to calculate bar left % and width %
    const getBarMetrics = (startDate?: string | null, dueDate?: string | null) => {
        const start = startDate ? new Date(startDate) : new Date();
        const due = dueDate ? new Date(dueDate) : new Date(start.getTime() + 86400000 * 3);

        const startOffset = Math.max(0, (start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, (due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        const leftPercent = Math.min(100, Math.max(0, (startOffset / totalDays) * 100));
        const widthPercent = Math.min(100 - leftPercent, Math.max(2, (duration / totalDays) * 100));

        return { leftPercent, widthPercent };
    };

    // Open Dependency link modal
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

    const handleDeleteDependency = (depId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Remove this dependency link?')) {
            router.delete(`/kanban/dependencies/${depId}`);
        }
    };

    // Handle interactive drag-to-shift task dates on timeline
    const handleShiftTaskDays = (task: Task, daysOffset: number) => {
        const curStart = task.start_date ? new Date(task.start_date) : new Date();
        const curDue = task.due_date ? new Date(task.due_date) : new Date();

        curStart.setDate(curStart.getDate() + daysOffset);
        curDue.setDate(curDue.getDate() + daysOffset);

        router.patch(`/kanban/tasks/${task.id}/schedule`, {
            start_date: curStart.toISOString().split('T')[0],
            due_date: curDue.toISOString().split('T')[0],
        });
    };

    return (
        <div className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-xs">
            {/* Header Toolbar */}
            <div className="border-border/50 flex flex-col items-start justify-between gap-3 border-b pb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <h3 className="text-foreground text-sm font-black">Interactive Gantt & Schedule Sequencing</h3>
                    <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs">{allRootTasks.length} items</span>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                    <div className="bg-muted/60 border-border/50 flex rounded-xl border p-0.5 text-xs">
                        <button
                            onClick={() => setZoomLevel('days')}
                            className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                                zoomLevel === 'days' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                            }`}
                        >
                            Days
                        </button>
                        <button
                            onClick={() => setZoomLevel('weeks')}
                            className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                                zoomLevel === 'weeks' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                            }`}
                        >
                            Weeks
                        </button>
                        <button
                            onClick={() => setZoomLevel('months')}
                            className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                                zoomLevel === 'months' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                            }`}
                        >
                            Months
                        </button>
                    </div>
                </div>
            </div>

            {/* Gantt Chart Container */}
            <div className="border-border/60 bg-background min-w-[700px] overflow-x-auto rounded-xl border">
                {/* Header Timeline Scale */}
                <div className="border-border/60 bg-muted/40 text-muted-foreground sticky top-0 z-10 flex border-b py-2 text-xs font-bold">
                    <div className="border-border/40 w-[300px] flex-shrink-0 border-r px-4">Task & Hierarchy</div>
                    <div className="relative h-6 flex-1">
                        {timeMarkers.map((marker, idx) => (
                            <div
                                key={idx}
                                className="text-muted-foreground border-border/40 absolute top-0 flex h-full -translate-x-1/2 transform items-center border-l pl-1 text-[10px]"
                                style={{ left: `${marker.leftPercent}%` }}
                            >
                                {marker.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Gantt Rows */}
                <div className="divide-border/40 divide-y">
                    {allRootTasks.map((task) => {
                        const hasSubtasks = (task.subitems || []).length > 0;
                        const isExpanded = !!expandedTasks[task.id];
                        const { leftPercent, widthPercent } = getBarMetrics(task.start_date, task.due_date);
                        const isDone = !!task.completed_at;

                        return (
                            <React.Fragment key={task.id}>
                                {/* Root Task Row */}
                                <div
                                    onClick={() => onSelectTask(task)}
                                    className="hover:bg-muted/20 group flex min-h-[44px] cursor-pointer items-center transition-colors"
                                >
                                    {/* Left Label Column */}
                                    <div className="border-border/40 flex w-[300px] flex-shrink-0 items-center justify-between gap-2 border-r px-4 py-2">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            {hasSubtasks ? (
                                                <button
                                                    onClick={(e) => toggleExpand(task.id, e)}
                                                    className="hover:bg-muted text-muted-foreground rounded p-0.5"
                                                >
                                                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                                </button>
                                            ) : (
                                                <div className="w-4.5" />
                                            )}

                                            <span
                                                className={`group-hover:text-primary truncate text-xs font-bold transition-colors ${
                                                    isDone ? 'text-muted-foreground line-through' : 'text-foreground'
                                                }`}
                                            >
                                                {task.title}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                                onClick={(e) => handleOpenDepModal(task, e)}
                                                title="Add dependency link"
                                                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1"
                                            >
                                                <Link2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right Gantt Bar Track */}
                                    <div className="relative flex h-9 flex-1 items-center px-2">
                                        {/* Task Bar */}
                                        <div
                                            className="group/bar absolute flex h-6 items-center justify-between rounded-lg px-2 text-[10px] font-bold text-white shadow-xs transition-all"
                                            style={{
                                                left: `${leftPercent}%`,
                                                width: `${widthPercent}%`,
                                                backgroundColor: isDone ? '#00c875' : task.priority === 'Urgent' ? '#e2445c' : '#579bfc',
                                            }}
                                        >
                                            <span className="truncate">{task.progress || 0}%</span>

                                            {/* Quick Shift Controls on Hover */}
                                            <div className="ml-1 flex items-center gap-0.5 opacity-0 group-hover/bar:opacity-100">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShiftTaskDays(task, -1);
                                                    }}
                                                    title="-1 day"
                                                    className="flex h-3.5 w-3.5 items-center justify-center rounded bg-black/30 hover:bg-black/50"
                                                >
                                                    ‹
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShiftTaskDays(task, 1);
                                                    }}
                                                    title="+1 day"
                                                    className="flex h-3.5 w-3.5 items-center justify-center rounded bg-black/30 hover:bg-black/50"
                                                >
                                                    ›
                                                </button>
                                            </div>
                                        </div>

                                        {/* Dependency Badges */}
                                        {(task.dependencies || []).map((dep) => (
                                            <div
                                                key={dep.id}
                                                className="absolute top-0.5 flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/20 px-1 text-[9px] font-bold text-amber-700 dark:text-amber-300"
                                                style={{ left: `${Math.max(0, leftPercent - 5)}%` }}
                                            >
                                                <span>↳ after #{dep.depends_on_task_id}</span>
                                                <button onClick={(e) => handleDeleteDependency(dep.id, e)} className="hover:text-red-500">
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Expanded Subtasks */}
                                {isExpanded &&
                                    (task.subitems || []).map((sub) => {
                                        const subMetrics = getBarMetrics(sub.start_date, sub.due_date);
                                        const subIsDone = !!sub.completed_at;

                                        return (
                                            <div
                                                key={sub.id}
                                                onClick={() => onSelectTask(sub)}
                                                className="hover:bg-muted/15 bg-muted/5 flex min-h-[38px] cursor-pointer items-center transition-colors"
                                            >
                                                <div className="border-border/40 flex w-[300px] min-w-0 flex-shrink-0 items-center gap-1.5 border-r px-4 py-1.5 pl-8">
                                                    <CornerDownRight className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
                                                    <span
                                                        className={`truncate text-xs ${
                                                            subIsDone ? 'text-muted-foreground line-through' : 'text-foreground'
                                                        }`}
                                                    >
                                                        {sub.title}
                                                    </span>
                                                </div>

                                                <div className="relative flex h-7 flex-1 items-center px-2">
                                                    <div
                                                        className="absolute flex h-4 items-center rounded-md px-1 text-[9px] font-bold text-white shadow-2xs transition-all"
                                                        style={{
                                                            left: `${subMetrics.leftPercent}%`,
                                                            width: `${subMetrics.widthPercent}%`,
                                                            backgroundColor: subIsDone ? '#00c875' : '#a25ddc',
                                                        }}
                                                    >
                                                        <span className="truncate">{sub.title}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </React.Fragment>
                        );
                    })}

                    {allRootTasks.length === 0 && (
                        <div className="text-muted-foreground py-12 text-center text-xs">
                            No tasks found for Gantt display. Add tasks with start and due dates.
                        </div>
                    )}
                </div>
            </div>

            {/* Dependency Link Modal */}
            <Dialog open={isDepModalOpen} onOpenChange={setIsDepModalOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleCreateDependency}>
                        <DialogHeader>
                            <DialogTitle>Link Task Dependency</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-xs">
                            <p className="text-muted-foreground">
                                Set a prerequisite dependency for: <strong className="text-foreground">{sourceTask?.title}</strong>
                            </p>

                            <div>
                                <label className="mb-1 block font-semibold">Prerequisite Task (Must finish first):</label>
                                <Select value={depTargetId} onValueChange={setDepTargetId}>
                                    <SelectTrigger className="h-9 w-full rounded-xl">
                                        <SelectValue placeholder="Select preceding task..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-56">
                                        {allRootTasks
                                            .filter((t) => t.id !== sourceTask?.id)
                                            .map((t) => (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    #{t.id} — {t.title}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="mb-1 block font-semibold">Dependency Relationship:</label>
                                <Select value={depType} onValueChange={setDepType}>
                                    <SelectTrigger className="h-9 w-full rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="finish_to_start">Finish to Start (FS - Standard)</SelectItem>
                                        <SelectItem value="start_to_start">Start to Start (SS)</SelectItem>
                                        <SelectItem value="finish_to_finish">Finish to Finish (FF)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDepModalOpen(false)} className="h-9 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!depTargetId} className="bg-primary hover:bg-primary/90 h-9 rounded-xl">
                                Create Link
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
