import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertCircle, Users } from 'lucide-react';
import { useMemo } from 'react';
import { getTaskAssignedUserIds, isUserAssignedToTask, KanbanBoard, Task, User } from '../types';

interface WorkloadViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
}

export default function WorkloadView({ board, searchTerm, personFilter, priorityFilter, users = [], onSelectTask }: WorkloadViewProps) {
    const DAILY_CAPACITY_HOURS = 8;
    const WEEKLY_CAPACITY_HOURS = 40;

    // Filter tasks
    const tasks = useMemo(() => {
        return (board.groups || [])
            .flatMap((g) => g.tasks || [])
            .filter((task) => {
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    if (!task.title.toLowerCase().includes(term)) return false;
                }
                if (personFilter !== 'all' && !isUserAssignedToTask(task, personFilter)) return false;
                if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
                return true;
            });
    }, [board.groups, searchTerm, personFilter, priorityFilter]);

    // Calculate workload per user
    const userWorkload = useMemo(() => {
        const result: Record<
            number,
            {
                user: User;
                tasks: Task[];
                totalEstimatedHours: number;
                completedTasksCount: number;
                activeTasksCount: number;
                overdueTasksCount: number;
                utilizationPercent: number;
            }
        > = {};

        const today = new Date().toISOString().split('T')[0];

        // Seed with all available users
        users.forEach((u) => {
            result[u.id] = {
                user: u,
                tasks: [],
                totalEstimatedHours: 0,
                completedTasksCount: 0,
                activeTasksCount: 0,
                overdueTasksCount: 0,
                utilizationPercent: 0,
            };
        });

        // Add an "Unassigned" placeholder if there are unassigned tasks
        const unassignedTasks = tasks.filter((t) => getTaskAssignedUserIds(t).length === 0);

        tasks.forEach((t) => {
            const assignedIds = getTaskAssignedUserIds(t);
            assignedIds.forEach((uid) => {
                if (result[uid]) {
                    const item = result[uid];
                    if (!item.tasks.some((existing) => existing.id === t.id)) {
                        item.tasks.push(t);
                        const taskHours = Number(t.estimated_hours) || (t.priority === 'Urgent' ? 12 : 8);
                        item.totalEstimatedHours += taskHours;

                        if (t.completed_at) {
                            item.completedTasksCount++;
                        } else {
                            item.activeTasksCount++;
                            if (t.due_date && t.due_date < today) {
                                item.overdueTasksCount++;
                            }
                        }
                    }
                }
            });
        });

        // Calculate utilization % against standard 40h weekly baseline
        Object.values(result).forEach((entry) => {
            entry.utilizationPercent = Math.round((entry.totalEstimatedHours / WEEKLY_CAPACITY_HOURS) * 100);
        });

        return {
            assigned: Object.values(result).filter((r) => r.tasks.length > 0 || personFilter === 'all'),
            unassignedTasks,
        };
    }, [tasks, users, personFilter]);

    return (
        <div className="border-border bg-card space-y-5 rounded-2xl border p-4 shadow-xs">
            {/* Header info */}
            <div className="border-border/50 flex flex-col items-start justify-between gap-3 border-b pb-3 sm:flex-row sm:items-center">
                <div className="space-y-0.5">
                    <h3 className="text-foreground flex items-center gap-2 text-sm font-black">
                        <Users className="text-primary h-4 w-4" />
                        Team Resource Capacity & Workload Allocation
                    </h3>
                    <p className="text-muted-foreground text-xs">
                        Standard effort model: 8h/day (40h/week capacity). Real-time load indicators flag overcapacity (&gt;100%).
                    </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-emerald-500" />
                        <span className="text-muted-foreground">Optimal (&lt;85%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-amber-500" />
                        <span className="text-muted-foreground">High (85-100%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-rose-500" />
                        <span className="text-muted-foreground">Overloaded (&gt;100%)</span>
                    </div>
                </div>
            </div>

            {/* Users Resource Grid */}
            <div className="space-y-3">
                {userWorkload.assigned.map((entry) => {
                    const isOverloaded = entry.utilizationPercent > 100;
                    const isHigh = entry.utilizationPercent >= 85 && !isOverloaded;
                    const barColor = isOverloaded ? '#f43f5e' : isHigh ? '#f59e0b' : '#10b981';

                    return (
                        <div
                            key={entry.user.id}
                            className="border-border/70 bg-background hover:border-primary/40 space-y-3 rounded-xl border p-3.5 transition-all"
                        >
                            {/* Member Bar Header */}
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-2.5">
                                    <Avatar className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold">
                                        <AvatarFallback>{entry.user.name.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="text-foreground flex items-center gap-2 text-xs font-bold">
                                            {entry.user.name}
                                            <span className="text-muted-foreground text-[10px] font-normal">({entry.user.role || 'Member'})</span>
                                            {isOverloaded && (
                                                <span className="py-0.2 flex items-center gap-1 rounded-md bg-rose-500/20 px-1.5 text-[10px] font-bold text-rose-600">
                                                    <AlertCircle className="h-3 w-3" /> Overloaded
                                                </span>
                                            )}
                                        </h4>
                                        <span className="text-muted-foreground text-[11px]">
                                            {entry.activeTasksCount} active tasks • {entry.completedTasksCount} done
                                            {entry.overdueTasksCount > 0 && (
                                                <span className="ml-1 font-semibold text-rose-500">• {entry.overdueTasksCount} overdue</span>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Hours & Capacity Ratio */}
                                <div className="text-right">
                                    <div className="text-foreground text-xs font-black">
                                        {entry.totalEstimatedHours}h{' '}
                                        <span className="text-muted-foreground font-normal">/ {WEEKLY_CAPACITY_HOURS}h capacity</span>
                                    </div>
                                    <div className="text-[10px] font-bold" style={{ color: barColor }}>
                                        {entry.utilizationPercent}% Allocated
                                    </div>
                                </div>
                            </div>

                            {/* Progress / Capacity Bar */}
                            <div className="bg-muted/60 relative h-3 w-full overflow-hidden rounded-full">
                                <div
                                    className="h-full rounded-full shadow-2xs transition-all duration-500"
                                    style={{
                                        width: `${Math.min(100, entry.utilizationPercent)}%`,
                                        backgroundColor: barColor,
                                    }}
                                />
                            </div>

                            {/* Member's Tasks List Preview */}
                            {entry.tasks.length > 0 && (
                                <div className="border-border/40 grid grid-cols-1 gap-2 border-t pt-1 sm:grid-cols-2 md:grid-cols-3">
                                    {entry.tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => onSelectTask(task)}
                                            className="border-border/50 bg-card hover:border-primary/40 flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all"
                                        >
                                            <span className="text-foreground truncate font-semibold">{task.title}</span>
                                            <span className="text-muted-foreground flex-shrink-0 text-[10px]">
                                                {task.estimated_hours ? `${task.estimated_hours}h` : '8h'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Unassigned Workload Bucket */}
                {userWorkload.unassignedTasks.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3.5">
                        <div className="flex items-center justify-between">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                                <AlertCircle className="h-4 w-4" /> Unassigned Tasks ({userWorkload.unassignedTasks.length})
                            </h4>
                            <span className="text-muted-foreground text-[11px]">Needs assignment</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                            {userWorkload.unassignedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => onSelectTask(task)}
                                    className="border-border/60 bg-card hover:border-primary/50 flex cursor-pointer items-center justify-between gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-all"
                                >
                                    <span className="truncate font-semibold">{task.title}</span>
                                    <span className="text-muted-foreground text-[10px]">{task.priority}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
