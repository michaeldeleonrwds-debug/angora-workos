import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    Flame,
    PieChart,
    Settings2,
    Sliders,
    Sparkles,
    TrendingUp,
    Users,
} from 'lucide-react';
import { usePage } from '@inertiajs/react';
import React, { useMemo, useState } from 'react';
import { getTaskAssignedUserIds, isUserAssignedToTask, KanbanBoard, Task, User } from '../types';

interface WorkloadViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
}

export default function WorkloadView({
    board,
    searchTerm,
    personFilter,
    priorityFilter,
    users = [],
    onSelectTask,
}: WorkloadViewProps) {
    const { auth } = usePage<any>().props;
    const currentUserId = auth?.user?.id;
    const [timeframe, setTimeframe] = useState<'weekly' | 'daily'>('weekly');
    const [effortSplitMode, setEffortSplitMode] = useState<'equal' | 'full'>('equal');

    // Capacity editing modal state
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [weeklyCapacityInput, setWeeklyCapacityInput] = useState<string>('40');
    const [isSavingCapacity, setIsSavingCapacity] = useState(false);
    const [userCapacities, setUserCapacities] = useState<Record<number, number>>({});

    // Filter tasks based on search & filters
    const tasks = useMemo(() => {
        return (board.groups || [])
            .flatMap((g) => g.tasks || [])
            .filter((task) => {
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    if (!task.title.toLowerCase().includes(term)) return false;
                }
                if (personFilter !== 'all' && !isUserAssignedToTask(task, personFilter, currentUserId)) return false;
                if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
                return true;
            });
    }, [board.groups, searchTerm, personFilter, priorityFilter, currentUserId]);

    // Calculate workload per user
    const workloadAnalytics = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        const memberMap: Record<
            number,
            {
                user: User;
                tasks: {
                    task: Task;
                    allocatedHours: number;
                    isOverdue: boolean;
                }[];
                totalAllocatedHours: number;
                completedTasksCount: number;
                activeTasksCount: number;
                overdueTasksCount: number;
                capacityHours: number;
                utilizationPercent: number;
                status: 'optimal' | 'overallocated' | 'underutilized';
            }
        > = {};

        // Seed members
        users.forEach((u) => {
            const configuredWeekly = userCapacities[u.id] ?? u.weekly_capacity_hours ?? 40;
            const capHours = timeframe === 'daily' ? round(configuredWeekly / 5, 1) : configuredWeekly;

            memberMap[u.id] = {
                user: u,
                tasks: [],
                totalAllocatedHours: 0,
                completedTasksCount: 0,
                activeTasksCount: 0,
                overdueTasksCount: 0,
                capacityHours: capHours,
                utilizationPercent: 0,
                status: 'underutilized',
            };
        });

        const unassignedTasks: Task[] = [];

        tasks.forEach((t) => {
            const assignedIds = getTaskAssignedUserIds(t);

            if (assignedIds.length === 0) {
                unassignedTasks.push(t);
                return;
            }

            const rawHours = Number(t.estimated_hours) || (t.priority === 'High' ? 10 : t.priority === 'Medium' ? 6 : 4);
            const effectiveHours = effortSplitMode === 'equal' && assignedIds.length > 1
                ? round(rawHours / assignedIds.length, 1)
                : rawHours;

            const isCompleted = !!t.completed_at || (t.column?.title || '').toLowerCase() === 'done';
            const isOverdue = !isCompleted && !!t.due_date && t.due_date < today;

            assignedIds.forEach((uid) => {
                if (!memberMap[uid]) {
                    // Member not in primary workspace list
                    const fallbackUser: User = {
                        id: uid,
                        name: `User #${uid}`,
                        role: 'Member',
                    };
                    const cap = timeframe === 'daily' ? 8 : 40;
                    memberMap[uid] = {
                        user: fallbackUser,
                        tasks: [],
                        totalAllocatedHours: 0,
                        completedTasksCount: 0,
                        activeTasksCount: 0,
                        overdueTasksCount: 0,
                        capacityHours: cap,
                        utilizationPercent: 0,
                        status: 'underutilized',
                    };
                }

                const item = memberMap[uid];
                if (isCompleted) {
                    item.completedTasksCount++;
                } else {
                    item.activeTasksCount++;
                    item.totalAllocatedHours += effectiveHours;
                    if (isOverdue) {
                        item.overdueTasksCount++;
                    }
                    item.tasks.push({
                        task: t,
                        allocatedHours: effectiveHours,
                        isOverdue,
                    });
                }
            });
        });

        // Compute utilization and status for each member
        let totalCapacity = 0;
        let totalAllocated = 0;
        let overallocatedCount = 0;
        let optimalCount = 0;
        let underutilizedCount = 0;

        Object.values(memberMap).forEach((entry) => {
            entry.totalAllocatedHours = round(entry.totalAllocatedHours, 1);
            entry.utilizationPercent = entry.capacityHours > 0
                ? Math.round((entry.totalAllocatedHours / entry.capacityHours) * 100)
                : 0;

            if (entry.utilizationPercent > 100) {
                entry.status = 'overallocated';
                overallocatedCount++;
            } else if (entry.utilizationPercent >= 70) {
                entry.status = 'optimal';
                optimalCount++;
            } else {
                entry.status = 'underutilized';
                underutilizedCount++;
            }

            totalCapacity += entry.capacityHours;
            totalAllocated += entry.totalAllocatedHours;
        });

        const teamUtilizationRate = totalCapacity > 0
            ? Math.round((totalAllocated / totalCapacity) * 100)
            : 0;

        return {
            members: Object.values(memberMap).filter((m) => m.tasks.length > 0 || personFilter === 'all'),
            unassignedTasks,
            summary: {
                totalCapacity: round(totalCapacity, 1),
                totalAllocated: round(totalAllocated, 1),
                teamUtilizationRate,
                overallocatedCount,
                optimalCount,
                underutilizedCount,
            },
        };
    }, [tasks, users, personFilter, timeframe, effortSplitMode, userCapacities]);

    const handleOpenEditCapacity = (user: User) => {
        setEditingUser(user);
        const currentCap = userCapacities[user.id] ?? user.weekly_capacity_hours ?? 40;
        setWeeklyCapacityInput(String(currentCap));
    };

    const handleSaveCapacity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        const hours = Number(weeklyCapacityInput);
        if (isNaN(hours) || hours <= 0 || hours > 168) {
            alert('Please specify valid weekly hours between 1 and 168.');
            return;
        }

        setIsSavingCapacity(true);
        try {
            await axios.patch(`/users/${editingUser.id}/capacity`, {
                weekly_capacity_hours: hours,
                daily_capacity_hours: round(hours / 5, 1),
            });

            setUserCapacities((prev) => ({
                ...prev,
                [editingUser.id]: hours,
            }));
            setEditingUser(null);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update capacity.');
        } finally {
            setIsSavingCapacity(false);
        }
    };

    return (
        <div className="border-border bg-card space-y-5 rounded-2xl border p-4 shadow-xs">
            {/* Header Toolbar */}
            <div className="border-border/50 flex flex-col items-start justify-between gap-4 border-b pb-4 lg:flex-row lg:items-center">
                <div className="space-y-1">
                    <h3 className="text-foreground flex items-center gap-2 text-base font-black">
                        <Users className="text-primary h-5 w-5" />
                        Resource Capacity & Workload Allocation
                    </h3>
                    <p className="text-muted-foreground text-xs">
                        Balance team effort, detect bottlenecks, and reallocate active project demands.
                    </p>
                </div>

                {/* View Toggles & Split Mode */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Timeframe switch */}
                    <div className="bg-muted/70 border-border inline-flex rounded-xl border p-0.5 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setTimeframe('weekly')}
                            className={`rounded-lg px-2.5 py-1 transition-all ${
                                timeframe === 'weekly'
                                    ? 'bg-background text-foreground shadow-2xs font-bold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Weekly View
                        </button>
                        <button
                            type="button"
                            onClick={() => setTimeframe('daily')}
                            className={`rounded-lg px-2.5 py-1 transition-all ${
                                timeframe === 'daily'
                                    ? 'bg-background text-foreground shadow-2xs font-bold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Daily View
                        </button>
                    </div>

                    {/* Effort split mode */}
                    <div className="bg-muted/70 border-border inline-flex rounded-xl border p-0.5 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setEffortSplitMode('equal')}
                            title="Split estimated task hours equally across all assignees"
                            className={`rounded-lg px-2.5 py-1 transition-all ${
                                effortSplitMode === 'equal'
                                    ? 'bg-background text-foreground shadow-2xs font-bold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Split Effort
                        </button>
                        <button
                            type="button"
                            onClick={() => setEffortSplitMode('full')}
                            title="Each assignee accounts for the full estimated hours"
                            className={`rounded-lg px-2.5 py-1 transition-all ${
                                effortSplitMode === 'full'
                                    ? 'bg-background text-foreground shadow-2xs font-bold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Full Effort
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="border-border/60 bg-background rounded-xl border p-3">
                    <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold">
                        <span>Total Capacity</span>
                        <Clock className="text-primary h-3.5 w-3.5" />
                    </div>
                    <div className="text-foreground mt-1 text-lg font-black tracking-tight">
                        {workloadAnalytics.summary.totalCapacity}h
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                        Available team effort ({timeframe})
                    </div>
                </div>

                <div className="border-border/60 bg-background rounded-xl border p-3">
                    <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold">
                        <span>Allocated Effort</span>
                        <TrendingUp className="text-indigo-500 h-3.5 w-3.5" />
                    </div>
                    <div className="text-foreground mt-1 text-lg font-black tracking-tight">
                        {workloadAnalytics.summary.totalAllocated}h
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                        Active estimated task hours
                    </div>
                </div>

                <div className="border-border/60 bg-background rounded-xl border p-3">
                    <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold">
                        <span>Team Utilization</span>
                        <PieChart className="text-emerald-500 h-3.5 w-3.5" />
                    </div>
                    <div className="text-foreground mt-1 text-lg font-black tracking-tight">
                        {workloadAnalytics.summary.teamUtilizationRate}%
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                        Across {workloadAnalytics.members.length} team members
                    </div>
                </div>

                <div className="border-border/60 bg-background rounded-xl border p-3">
                    <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold">
                        <span>Bottlenecks</span>
                        <Flame className="text-rose-500 h-3.5 w-3.5" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5 text-lg font-black tracking-tight text-rose-500">
                        {workloadAnalytics.summary.overallocatedCount}
                        <span className="text-muted-foreground text-[11px] font-normal">overallocated</span>
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                        {workloadAnalytics.summary.optimalCount} optimal • {workloadAnalytics.summary.underutilizedCount} under
                    </div>
                </div>
            </div>

            {/* Status Legend Indicator */}
            <div className="border-border/40 bg-muted/20 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs">
                <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Status Benchmark:
                </span>
                <div className="flex flex-wrap items-center gap-4 text-[11px]">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Optimal (70% - 100%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span className="font-semibold text-rose-600 dark:text-rose-400">Overallocated (&gt;100%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                        <span className="text-muted-foreground font-semibold">Underutilized (&lt;70%)</span>
                    </div>
                </div>
            </div>

            {/* Member Resource Cards Grid */}
            <div className="space-y-3.5">
                {workloadAnalytics.members.map((entry) => {
                    const isOverallocated = entry.status === 'overallocated';
                    const isOptimal = entry.status === 'optimal';
                    const barColor = isOverallocated ? '#f43f5e' : isOptimal ? '#10b981' : '#3b82f6';

                    return (
                        <div
                            key={entry.user.id}
                            className={`border-border/70 bg-background hover:border-primary/40 space-y-3.5 rounded-2xl border p-4 transition-all ${
                                isOverallocated ? 'ring-1 ring-rose-500/30' : ''
                            }`}
                        >
                            {/* Member Bar Header */}
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-3">
                                    <Avatar className="bg-primary/20 text-primary flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black shadow-2xs">
                                        <AvatarFallback>{entry.user.name.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-foreground text-sm font-bold tracking-tight">
                                                {entry.user.name}
                                            </h4>
                                            <span className="text-muted-foreground text-[10px]">
                                                ({entry.user.role || 'Member'})
                                            </span>

                                            {/* Status Badge */}
                                            {isOverallocated ? (
                                                <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold">
                                                    <AlertCircle className="h-3 w-3" /> Overallocated
                                                </span>
                                            ) : isOptimal ? (
                                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold">
                                                    <CheckCircle2 className="h-3 w-3" /> Optimal Load
                                                </span>
                                            ) : (
                                                <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold">
                                                    <Clock className="h-3 w-3" /> Available Capacity
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                                            <span>{entry.activeTasksCount} active tasks</span>
                                            <span>•</span>
                                            <span>{entry.completedTasksCount} completed</span>
                                            {entry.overdueTasksCount > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-semibold text-rose-500">
                                                        {entry.overdueTasksCount} overdue
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Allocated Ratio & Edit Capacity Action */}
                                <div className="flex items-center gap-4 sm:justify-end">
                                    <div className="text-right">
                                        <div className="text-foreground text-xs font-black">
                                            {entry.totalAllocatedHours}h{' '}
                                            <span className="text-muted-foreground font-normal">
                                                / {entry.capacityHours}h
                                            </span>
                                        </div>
                                        <div className="text-[11px] font-bold" style={{ color: barColor }}>
                                            {entry.utilizationPercent}% Allocated
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenEditCapacity(entry.user)}
                                        className="h-8 rounded-xl px-2.5 text-xs"
                                        title="Configure working hours capacity"
                                    >
                                        <Settings2 className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                                        Capacity
                                    </Button>
                                </div>
                            </div>

                            {/* Progress / Capacity Bar */}
                            <div className="bg-muted/60 relative h-2.5 w-full overflow-hidden rounded-full">
                                <div
                                    className="h-full rounded-full shadow-2xs transition-all duration-500"
                                    style={{
                                        width: `${Math.min(100, entry.utilizationPercent)}%`,
                                        backgroundColor: barColor,
                                    }}
                                />
                            </div>

                            {/* Active Tasks Grid */}
                            {entry.tasks.length > 0 && (
                                <div className="border-border/40 grid grid-cols-1 gap-2 border-t pt-2.5 sm:grid-cols-2 md:grid-cols-3">
                                    {entry.tasks.map(({ task, allocatedHours, isOverdue }) => (
                                        <div
                                            key={task.id}
                                            onClick={() => onSelectTask(task)}
                                            className="border-border/60 bg-card hover:border-primary/50 flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2 text-xs transition-all shadow-2xs hover:shadow-xs"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="text-foreground truncate font-semibold">
                                                    {task.title}
                                                </div>
                                                <div className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
                                                    <span>{task.priority || 'Medium'}</span>
                                                    {task.due_date && <span>• Due {task.due_date}</span>}
                                                    {isOverdue && <span className="font-bold text-rose-500">• Overdue</span>}
                                                </div>
                                            </div>
                                            <span className="bg-muted text-foreground flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                                                {allocatedHours}h
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Unassigned Tasks Bucket */}
                {workloadAnalytics.unassignedTasks.length > 0 && (
                    <div className="space-y-3 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                                <AlertCircle className="h-4 w-4" /> Unassigned Tasks ({workloadAnalytics.unassignedTasks.length})
                            </h4>
                            <span className="text-muted-foreground text-[11px]">
                                Assign team members to track accurate capacity
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                            {workloadAnalytics.unassignedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => onSelectTask(task)}
                                    className="border-border/60 bg-card hover:border-primary/50 flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2 text-xs transition-all shadow-2xs"
                                >
                                    <span className="truncate font-semibold">{task.title}</span>
                                    <span className="text-muted-foreground text-[10px]">{task.priority}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Capacity Configuration Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleSaveCapacity}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-primary" />
                                Working Hours & Capacity
                            </DialogTitle>
                        </DialogHeader>

                        {editingUser && (
                            <div className="space-y-4 py-3">
                                <div className="bg-muted/30 border-border flex items-center gap-3 rounded-xl border p-3">
                                    <Avatar className="bg-primary/20 text-primary h-8 w-8 rounded-lg text-xs font-bold">
                                        <AvatarFallback>{editingUser.name.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="text-xs font-bold">{editingUser.name}</div>
                                        <div className="text-muted-foreground text-[11px]">{editingUser.email}</div>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="capacity-hours">Weekly Working Capacity (Hours)</Label>
                                    <Input
                                        id="capacity-hours"
                                        type="number"
                                        min="1"
                                        max="168"
                                        step="0.5"
                                        value={weeklyCapacityInput}
                                        onChange={(e) => setWeeklyCapacityInput(e.target.value)}
                                        required
                                        className="mt-1"
                                    />
                                    <p className="text-muted-foreground mt-1 text-[11px]">
                                        Standard full-time is 40h/week (8h/day). Part-time or contracted roles can be customized.
                                    </p>
                                </div>

                                <div className="bg-muted/40 rounded-xl p-3 text-xs">
                                    <div className="flex justify-between font-semibold">
                                        <span>Daily Equivalent (5 days):</span>
                                        <span className="text-primary font-bold">
                                            {round(Number(weeklyCapacityInput || 0) / 5, 1)}h / day
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSavingCapacity}>
                                {isSavingCapacity ? 'Saving...' : 'Save Capacity'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function round(val: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
}
