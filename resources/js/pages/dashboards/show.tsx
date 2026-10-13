import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Activity, ArrowLeft, BarChart3, CheckSquare, Layers, PieChart, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import React, { useState } from 'react';

import { ActivityFeedWidget } from './widgets/ActivityFeedWidget';
import { BatteryProgressWidget } from './widgets/BatteryProgressWidget';
import { ChartWidget } from './widgets/ChartWidget';
import { NumbersWidget } from './widgets/NumbersWidget';
import { TaskListWidget } from './widgets/TaskListWidget';
import { WorkloadWidget } from './widgets/WorkloadWidget';

interface Widget {
    id: number;
    title: string;
    type: 'numbers' | 'battery' | 'chart' | 'workload' | 'timeline' | 'calendar' | 'task_list' | 'activity';
    config: any;
    layout: { w?: number; h?: number };
    position: number;
    data: any;
}

interface Dashboard {
    id: number;
    name: string;
    description?: string;
    type: string;
    visibility: string;
    is_favorite: boolean;
    widgets: Widget[];
    owner: { id: number; name: string };
    project?: { id: number; name: string; code: string };
}

interface Props {
    dashboard: Dashboard;
    boards: Array<{ id: number; title: string }>;
    projects: Array<{ id: number; name: string }>;
    canEdit: boolean;
}

export default function DashboardShow({ dashboard, boards, projects, canEdit }: Props) {
    const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
    const [selectedWidgetType, setSelectedWidgetType] = useState<string>('numbers');
    const [widgetTitle, setWidgetTitle] = useState('');
    const [metricType, setMetricType] = useState('total_tasks');
    const [chartType, setChartType] = useState('bar');
    const [chartXAxis, setChartXAxis] = useState('status');
    const [selectedBoards, setSelectedBoards] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddWidget = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            `/dashboards/${dashboard.id}/widgets`,
            {
                title: widgetTitle || 'New Widget',
                type: selectedWidgetType,
                config: {
                    metric: metricType,
                    chart_type: chartType,
                    x_axis: chartXAxis,
                    board_ids: selectedBoards,
                },
                layout: {
                    w: selectedWidgetType === 'numbers' ? 3 : selectedWidgetType === 'battery' ? 6 : 6,
                    h: 4,
                },
            },
            {
                onSuccess: () => {
                    setIsAddWidgetOpen(false);
                    setWidgetTitle('');
                },
            },
        );
    };

    const handleDeleteWidget = (widgetId: number) => {
        if (confirm('Are you sure you want to remove this widget?')) {
            router.delete(`/dashboards/${dashboard.id}/widgets/${widgetId}`);
        }
    };

    const renderWidgetContent = (widget: Widget) => {
        switch (widget.type) {
            case 'numbers':
                return <NumbersWidget title={widget.title} data={widget.data} />;
            case 'battery':
                return <BatteryProgressWidget title={widget.title} data={widget.data} />;
            case 'chart':
                return <ChartWidget title={widget.title} data={widget.data} />;
            case 'workload':
                return <WorkloadWidget title={widget.title} data={widget.data} />;
            case 'task_list':
                return <TaskListWidget title={widget.title} data={widget.data} />;
            case 'activity':
                return <ActivityFeedWidget title={widget.title} data={widget.data} />;
            default:
                return <div className="flex h-48 items-center justify-center text-xs text-gray-400">Widget renderer for {widget.type}</div>;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard Hub', href: '/dashboards' },
                { title: dashboard.name, href: `/dashboards/${dashboard.id}` },
            ]}
        >
            <Head title={`${dashboard.name} | Angora Dashboards`} />

            <div className="mx-auto max-w-7xl space-y-6 p-6">
                {/* Header Controls */}
                <div className="flex flex-col justify-between gap-4 border-b border-gray-200/80 pb-4 sm:flex-row sm:items-center dark:border-gray-800">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href="/dashboards" className="text-gray-400 transition-colors hover:text-gray-600">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <h1 className="text-2xl font-black tracking-tight text-[#12121E] dark:text-white">{dashboard.name}</h1>
                            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-purple-700 uppercase dark:bg-purple-950/60 dark:text-purple-300">
                                {dashboard.type}
                            </span>
                            {dashboard.project && (
                                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                    Project: {dashboard.project.name}
                                </span>
                            )}
                        </div>
                        {dashboard.description && <p className="mt-1 pl-8 text-xs text-gray-500">{dashboard.description}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <Button
                                onClick={() => setIsAddWidgetOpen(true)}
                                className="rounded-xl bg-[#C8AEF5] text-xs font-semibold text-[#12121E] shadow-sm hover:bg-[#b89cee]"
                            >
                                <Plus className="mr-1.5 h-4 w-4" /> Add Widget
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => router.reload()} className="rounded-xl border-gray-200 text-xs dark:border-gray-800">
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
                        </Button>
                    </div>
                </div>

                {/* Widgets Responsive Grid */}
                {dashboard.widgets.length === 0 ? (
                    <div className="space-y-3 rounded-[28px] border border-gray-100 bg-white py-20 text-center dark:border-gray-800 dark:bg-gray-900">
                        <BarChart3 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">This dashboard has no widgets</h3>
                        <p className="mx-auto max-w-sm text-xs text-gray-400">
                            Add widgets to visualize cross-board task completion, member workload, numbers, or activities.
                        </p>
                        {canEdit && (
                            <Button
                                onClick={() => setIsAddWidgetOpen(true)}
                                className="rounded-xl bg-[#C8AEF5] text-xs font-semibold text-[#12121E] hover:bg-[#b89cee]"
                            >
                                <Plus className="mr-1 h-4 w-4" /> Add Your First Widget
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
                        {dashboard.widgets.map((widget) => {
                            // Compute col-span based on layout config
                            const colSpan = widget.layout?.w ? `lg:col-span-${Math.min(widget.layout.w, 12)}` : 'lg:col-span-6';

                            return (
                                <div
                                    key={widget.id}
                                    className={`col-span-12 ${colSpan} flex flex-col justify-between rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900`}
                                >
                                    <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800/80">
                                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">{widget.title}</h3>
                                        {canEdit && (
                                            <button
                                                onClick={() => handleDeleteWidget(widget.id)}
                                                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-rose-500 dark:hover:bg-gray-800"
                                                title="Remove Widget"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1">{renderWidgetContent(widget)}</div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add Widget Modal */}
                <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
                    <DialogContent className="max-w-xl rounded-[24px]">
                        <DialogHeader>
                            <DialogTitle>Add Dashboard Widget</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddWidget} className="space-y-4 pt-2">
                            <div className="space-y-1">
                                <Label>Widget Title</Label>
                                <Input
                                    value={widgetTitle}
                                    onChange={(e) => setWidgetTitle(e.target.value)}
                                    placeholder="e.g. Q4 Overdue Work Items"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Widget Type</Label>
                                <div className="grid grid-cols-3 gap-2 pt-1">
                                    {[
                                        { type: 'numbers', label: 'Numbers / KPI', icon: BarChart3 },
                                        { type: 'battery', label: 'Battery Progress', icon: Layers },
                                        { type: 'chart', label: 'Chart Visual', icon: PieChart },
                                        { type: 'workload', label: 'Team Workload', icon: Users },
                                        { type: 'task_list', label: 'Task List', icon: CheckSquare },
                                        { type: 'activity', label: 'Activity Feed', icon: Activity },
                                    ].map((t) => (
                                        <button
                                            key={t.type}
                                            type="button"
                                            onClick={() => setSelectedWidgetType(t.type)}
                                            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition-all ${
                                                selectedWidgetType === t.type
                                                    ? 'border-[#C8AEF5] bg-purple-50/50 text-purple-900 ring-2 ring-[#C8AEF5]/50 dark:bg-purple-950/40 dark:text-purple-200'
                                                    : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <t.icon className="h-5 w-5 text-gray-500" />
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedWidgetType === 'numbers' && (
                                <div className="space-y-1">
                                    <Label>Select Metric</Label>
                                    <select
                                        value={metricType}
                                        onChange={(e) => setMetricType(e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <option value="total_tasks">Total Tasks</option>
                                        <option value="completed_tasks">Completed Tasks</option>
                                        <option value="overdue_tasks">Overdue Tasks</option>
                                        <option value="in_progress_tasks">In Progress Tasks</option>
                                        <option value="agency_active_projects">Active Agency Projects</option>
                                        <option value="deliverables_pending">Pending Deliverables</option>
                                        <option value="finance_budget_total">Total Finance Budgets</option>
                                        <option value="finance_expenses_total">Total Finance Expenses</option>
                                        <option value="hr_headcount">Active HR Headcount</option>
                                    </select>
                                </div>
                            )}

                            {selectedWidgetType === 'chart' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>Chart Type</Label>
                                        <select
                                            value={chartType}
                                            onChange={(e) => setChartType(e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <option value="bar">Bar Chart</option>
                                            <option value="line">Line Trend</option>
                                            <option value="pie">Donut / Pie Chart</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>X-Axis Dimension</Label>
                                        <select
                                            value={chartXAxis}
                                            onChange={(e) => setChartXAxis(e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <option value="status">By Status</option>
                                            <option value="priority">By Priority</option>
                                            <option value="assignee">By Assignee</option>
                                            <option value="due_date">By Due Date</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 border-t pt-3">
                                <Button type="button" variant="ghost" onClick={() => setIsAddWidgetOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-[#C8AEF5] text-[#12121E] hover:bg-[#b89cee]">
                                    Add Widget
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
