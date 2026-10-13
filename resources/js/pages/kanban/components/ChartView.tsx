import { BarChart3, CheckCircle2, Clock, PieChart, TrendingUp, Users } from 'lucide-react';
import { useMemo } from 'react';
import { KanbanBoard, Task, User } from '../types';

interface ChartViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
}

export default function ChartView({ board, searchTerm, personFilter, priorityFilter, users = [], onSelectTask }: ChartViewProps) {
    // Filter tasks
    const tasks = useMemo(() => {
        return (board.groups || [])
            .flatMap((g) => g.tasks || [])
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

    // 1. Status Aggregation
    const statusStats = useMemo(() => {
        const counts: Record<string, { count: number; color: string }> = {};

        // Seed with stages
        (board.columns || []).forEach((c) => {
            counts[c.title] = { count: 0, color: c.color || '#579bfc' };
        });

        tasks.forEach((t) => {
            const colName = t.column?.title || 'Uncategorized';
            if (!counts[colName]) {
                counts[colName] = { count: 0, color: '#94a3b8' };
            }
            counts[colName].count++;
        });

        return counts;
    }, [board.columns, tasks]);

    // 2. Priority Distribution
    const priorityStats = useMemo(() => {
        const pCounts: Record<string, { count: number; color: string }> = {
            Urgent: { count: 0, color: '#e2445c' },
            High: { count: 0, color: '#fdab3d' },
            Medium: { count: 0, color: '#579bfc' },
            Low: { count: 0, color: '#00c875' },
        };

        tasks.forEach((t) => {
            if (pCounts[t.priority]) {
                pCounts[t.priority].count++;
            }
        });

        return pCounts;
    }, [tasks]);

    // 3. Assignee Breakdown
    const assigneeStats = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach((t) => {
            const name = t.assignee?.name || 'Unassigned';
            counts[name] = (counts[name] || 0) + 1;
        });
        return counts;
    }, [tasks]);

    // 4. Overall Progress & Completion Stats
    const summary = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter((t) => !!t.completed_at).length;
        const avgProgress = total > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / total) : 0;
        const totalHours = tasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 8), 0);

        return { total, completed, avgProgress, totalHours };
    }, [tasks]);

    return (
        <div className="space-y-5">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
                    <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs font-semibold">
                        <span>Total Items</span>
                        <BarChart3 className="text-primary h-4 w-4" />
                    </div>
                    <div className="text-foreground text-2xl font-black">{summary.total}</div>
                    <div className="text-muted-foreground mt-1 text-[11px]">Across all workflow stages</div>
                </div>

                <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
                    <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs font-semibold">
                        <span>Completed Items</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.completed}</div>
                    <div className="text-muted-foreground mt-1 text-[11px]">
                        {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}% completion rate
                    </div>
                </div>

                <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
                    <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs font-semibold">
                        <span>Avg Item Progress</span>
                        <TrendingUp className="text-primary h-4 w-4" />
                    </div>
                    <div className="text-foreground text-2xl font-black">{summary.avgProgress}%</div>
                    <div className="text-muted-foreground mt-1 text-[11px]">Subtask weighted average</div>
                </div>

                <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
                    <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs font-semibold">
                        <span>Estimated Effort</span>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-foreground text-2xl font-black">{summary.totalHours}h</div>
                    <div className="text-muted-foreground mt-1 text-[11px]">Total planned work hours</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* 1. Status Distribution Bar Chart */}
                <div className="border-border bg-card space-y-4 rounded-2xl border p-5 shadow-xs">
                    <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
                        <PieChart className="text-primary h-4 w-4" /> Status Breakdown
                    </h3>
                    <div className="space-y-3 pt-2">
                        {Object.entries(statusStats).map(([status, item]) => {
                            const percent = summary.total > 0 ? Math.round((item.count / summary.total) * 100) : 0;
                            return (
                                <div key={status} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-foreground">{status}</span>
                                        <span className="text-muted-foreground">
                                            {item.count} items ({percent}%)
                                        </span>
                                    </div>
                                    <div className="bg-muted/60 h-3 w-full overflow-hidden rounded-full">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${percent}%`,
                                                backgroundColor: item.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Priority Distribution Chart */}
                <div className="border-border bg-card space-y-4 rounded-2xl border p-5 shadow-xs">
                    <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
                        <BarChart3 className="text-primary h-4 w-4" /> Priority Distribution
                    </h3>
                    <div className="space-y-3 pt-2">
                        {Object.entries(priorityStats).map(([priority, item]) => {
                            const percent = summary.total > 0 ? Math.round((item.count / summary.total) * 100) : 0;
                            return (
                                <div key={priority} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-foreground">{priority}</span>
                                        <span className="text-muted-foreground">
                                            {item.count} items ({percent}%)
                                        </span>
                                    </div>
                                    <div className="bg-muted/60 h-3 w-full overflow-hidden rounded-full">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${percent}%`,
                                                backgroundColor: item.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Assignee Workload Distribution */}
                <div className="border-border bg-card space-y-4 rounded-2xl border p-5 shadow-xs lg:col-span-2">
                    <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
                        <Users className="text-primary h-4 w-4" /> Task Ownership by Member
                    </h3>
                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 md:grid-cols-4">
                        {Object.entries(assigneeStats).map(([assignee, count]) => {
                            const percent = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
                            return (
                                <div key={assignee} className="border-border/60 bg-background space-y-2 rounded-xl border p-3.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-foreground truncate font-bold">{assignee}</span>
                                        <span className="text-primary font-black">{count}</span>
                                    </div>
                                    <div className="bg-muted/60 h-2 w-full overflow-hidden rounded-full">
                                        <div
                                            className="bg-primary h-full rounded-full transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className="text-muted-foreground text-[10px]">{percent}% of all tasks</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
