import { usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    Flame,
    PieChart,
    Sparkles,
    Timer,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { isUserAssignedToTask, KanbanBoard, Task, User } from '../types';

interface ChartViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
}

export default function ChartView({
    board,
    searchTerm,
    personFilter,
    priorityFilter,
    users = [],
    onSelectTask,
}: ChartViewProps) {
    const { auth } = usePage<any>().props;
    const currentUserId = auth?.user?.id;
    const [remoteMetrics, setRemoteMetrics] = useState<any | null>(null);
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

    // Fetch backend delivery metrics for rich review cycle turnaround & throughput
    useEffect(() => {
        if (!board.id) return;
        let isMounted = true;
        setIsLoadingMetrics(true);

        axios
            .get(`/kanban/boards/${board.id}/delivery-metrics`)
            .then((res) => {
                if (isMounted) {
                    setRemoteMetrics(res.data);
                }
            })
            .catch((err) => {
                console.warn('Could not load backend delivery metrics:', err);
            })
            .finally(() => {
                if (isMounted) setIsLoadingMetrics(false);
            });

        return () => {
            isMounted = false;
        };
    }, [board.id]);

    // Filter tasks
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

    // 1. Status Aggregation
    const statusStats = useMemo(() => {
        const counts: Record<string, { count: number; color: string }> = {};

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
            High: { count: 0, color: '#e2445c' },
            Medium: { count: 0, color: '#579bfc' },
            Low: { count: 0, color: '#00c875' },
        };

        tasks.forEach((t) => {
            const p = t.priority === 'High' ? 'High' : t.priority === 'Low' ? 'Low' : 'Medium';
            pCounts[p].count++;
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

    // 4. Local Delivery Metrics (Instant fallback from task records)
    const localDeliveryMetrics = useMemo(() => {
        const completed = tasks.filter((t) => !!t.completed_at);
        const total = tasks.length;

        // Lead time: created_at -> completed_at
        const leadTimes = completed.map((t) => {
            const start = new Date(t.created_at || Date.now()).getTime();
            const end = new Date(t.completed_at!).getTime();
            return Math.max(0.1, (end - start) / (1000 * 60 * 60 * 24));
        });
        const avgLeadTime = leadTimes.length > 0
            ? Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 10) / 10
            : 0;

        // Cycle time: start_date (or created_at) -> completed_at
        const cycleTimes = completed.map((t) => {
            const start = t.start_date ? new Date(t.start_date).getTime() : new Date(t.created_at || Date.now()).getTime();
            const end = new Date(t.completed_at!).getTime();
            return Math.max(0.1, (end - start) / (1000 * 60 * 60 * 24));
        });
        const avgCycleTime = cycleTimes.length > 0
            ? Math.round((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 10) / 10
            : 0;

        // On-time delivery rate
        let onTime = 0;
        let late = 0;
        completed.forEach((t) => {
            if (t.due_date) {
                const deadline = new Date(`${t.due_date}T23:59:59`).getTime();
                const finished = new Date(t.completed_at!).getTime();
                if (finished <= deadline) {
                    onTime++;
                } else {
                    late++;
                }
            } else {
                onTime++;
            }
        });

        const totalWithDeadlines = onTime + late;
        const onTimeRate = totalWithDeadlines > 0
            ? Math.round((onTime / totalWithDeadlines) * 100)
            : 100;

        return {
            total,
            completedCount: completed.length,
            activeCount: total - completed.length,
            avgLeadTime,
            avgCycleTime,
            onTimeRate,
            onTimeCount: onTime,
            lateCount: late,
        };
    }, [tasks]);

    // Merge remote metrics or fallback to local
    const onTimeRate = remoteMetrics?.on_time_delivery?.rate_percentage ?? localDeliveryMetrics.onTimeRate;
    const avgCycleDays = remoteMetrics?.cycle_time?.avg_days ?? localDeliveryMetrics.avgCycleTime;
    const avgLeadDays = remoteMetrics?.lead_time?.avg_days ?? localDeliveryMetrics.avgLeadTime;
    const reviewTurnaround = remoteMetrics?.review_turnaround?.avg_hours ?? 0;
    const firstTimeApproval = remoteMetrics?.review_turnaround?.first_time_approval_rate ?? 100;
    const throughput = remoteMetrics?.throughput?.weekly_breakdown ?? [];

    return (
        <div className="space-y-6">
            {/* 1. Production Delivery & Operational Velocity KPI Section */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h2 className="text-foreground flex items-center gap-2 text-base font-black tracking-tight">
                            <Zap className="text-amber-500 h-5 w-5" />
                            Production Delivery & Operational Velocity
                        </h2>
                        <p className="text-muted-foreground text-xs">
                            Core flow metrics: Lead time, Cycle time, On-time fulfillment, and Review turnaround.
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-2.5 py-0.5 text-[11px] font-bold">
                            Live Telemetry
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* On-Time Delivery Rate */}
                    <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
                        <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs font-semibold">
                            <span>On-Time Delivery</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-foreground text-2xl font-black">{onTimeRate}%</span>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                {localDeliveryMetrics.onTimeCount} on-time
                            </span>
                        </div>
                        <div className="text-muted-foreground mt-1 text-[11px]">
                            {localDeliveryMetrics.lateCount > 0 ? (
                                <span className="font-semibold text-rose-500">{localDeliveryMetrics.lateCount} delayed past deadline</span>
                            ) : (
                                <span>Zero overdue deliveries recorded</span>
                            )}
                        </div>
                    </div>

                    {/* Cycle Time */}
                    <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
                        <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs font-semibold">
                            <span>Avg Cycle Time</span>
                            <Timer className="text-primary h-4 w-4" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-foreground text-2xl font-black">{avgCycleDays}d</span>
                            <span className="text-muted-foreground text-[11px]">start to finish</span>
                        </div>
                        <div className="text-muted-foreground mt-1 text-[11px]">
                            Active development execution speed
                        </div>
                    </div>

                    {/* Lead Time */}
                    <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
                        <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs font-semibold">
                            <span>Avg Lead Time</span>
                            <Clock className="text-indigo-500 h-4 w-4" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-foreground text-2xl font-black">{avgLeadDays}d</span>
                            <span className="text-muted-foreground text-[11px]">created to done</span>
                        </div>
                        <div className="text-muted-foreground mt-1 text-[11px]">
                            Full intake to completion duration
                        </div>
                    </div>

                    {/* Review Turnaround Time */}
                    <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
                        <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs font-semibold">
                            <span>Review Turnaround</span>
                            <Activity className="text-rose-500 h-4 w-4" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-foreground text-2xl font-black">
                                {reviewTurnaround > 0 ? `${reviewTurnaround}h` : 'Direct'}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                                {firstTimeApproval}% 1st pass
                            </span>
                        </div>
                        <div className="text-muted-foreground mt-1 text-[11px]">
                            Average review and approval latency
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Throughput Velocity Breakdown */}
            {throughput.length > 0 && (
                <div className="border-border bg-card space-y-4 rounded-2xl border p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
                            <TrendingUp className="text-primary h-4 w-4" /> Production Velocity & Throughput (Past 4 Weeks)
                        </h3>
                        <span className="text-muted-foreground text-xs font-semibold">
                            Avg {remoteMetrics?.throughput?.avg_weekly ?? 0} items/week
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {throughput.map((item: any, idx: number) => (
                            <div key={idx} className="border-border/60 bg-background rounded-xl border p-3">
                                <div className="text-muted-foreground text-xs font-semibold">{item.period}</div>
                                <div className="text-foreground text-lg font-black">{item.completed_count} items</div>
                                <div className="text-muted-foreground text-[11px]">{item.total_hours}h effort • {item.date_range}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Status and Priority Charts Grid */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Status Distribution Bar Chart */}
                <div className="border-border bg-card space-y-4 rounded-2xl border p-5 shadow-xs">
                    <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
                        <PieChart className="text-primary h-4 w-4" /> Workflow Stage Breakdown
                    </h3>
                    <div className="space-y-3 pt-2">
                        {Object.entries(statusStats).map(([status, item]) => {
                            const percent = localDeliveryMetrics.total > 0
                                ? Math.round((item.count / localDeliveryMetrics.total) * 100)
                                : 0;
                            return (
                                <div key={status} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-foreground">{status}</span>
                                        <span className="text-muted-foreground">
                                            {item.count} items ({percent}%)
                                        </span>
                                    </div>
                                    <div className="bg-muted/60 h-2.5 w-full overflow-hidden rounded-full">
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

                {/* Priority Distribution Chart */}
                <div className="border-border bg-card space-y-4 rounded-2xl border p-5 shadow-xs">
                    <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
                        <BarChart3 className="text-primary h-4 w-4" /> Task Priority Distribution
                    </h3>
                    <div className="space-y-3 pt-2">
                        {Object.entries(priorityStats).map(([priority, item]) => {
                            const percent = localDeliveryMetrics.total > 0
                                ? Math.round((item.count / localDeliveryMetrics.total) * 100)
                                : 0;
                            return (
                                <div key={priority} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-foreground">{priority}</span>
                                        <span className="text-muted-foreground">
                                            {item.count} items ({percent}%)
                                        </span>
                                    </div>
                                    <div className="bg-muted/60 h-2.5 w-full overflow-hidden rounded-full">
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

                {/* Assignee Ownership */}
                <div className="border-border bg-card space-y-4 rounded-2xl border p-5 shadow-xs lg:col-span-2">
                    <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
                        <Users className="text-primary h-4 w-4" /> Task Ownership by Member
                    </h3>
                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 md:grid-cols-4">
                        {Object.entries(assigneeStats).map(([assignee, count]) => {
                            const percent = localDeliveryMetrics.total > 0
                                ? Math.round((count / localDeliveryMetrics.total) * 100)
                                : 0;
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
