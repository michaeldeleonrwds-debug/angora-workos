<?php

namespace App\Services;

use App\Models\AgencyProject;
use App\Models\AuditLog;
use App\Models\DashboardWidget;
use App\Models\FinanceBudget;
use App\Models\FinanceExpense;
use App\Models\HrEmployee;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\ProjectDeliverable;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class DashboardAnalyticsService
{
    /**
     * Compute widget data for a specific widget and authenticated user.
     */
    public function computeWidgetData(DashboardWidget $widget, User $user): array
    {
        $config = $widget->config ?? [];
        $type = $widget->type;

        return match ($type) {
            'numbers' => $this->computeNumbersMetric($config, $user),
            'battery' => $this->computeBatteryMetric($config, $user),
            'chart' => $this->computeChartMetric($config, $user),
            'workload' => $this->computeWorkloadMetric($config, $user),
            'timeline' => $this->computeTimelineMetric($config, $user),
            'calendar' => $this->computeCalendarMetric($config, $user),
            'task_list' => $this->computeTaskListMetric($config, $user),
            'activity' => $this->computeActivityMetric($config, $user),
            default => ['error' => 'Unknown widget type']
        };
    }

    /**
     * Numbers / KPI summary metric
     */
    public function computeNumbersMetric(array $config, User $user): array
    {
        $metric = $config['metric'] ?? 'total_tasks';
        $filters = $config['filters'] ?? [];
        $boardIds = $config['board_ids'] ?? [];

        // Department-specific / Financial / HR metrics with permission checks
        if (str_starts_with($metric, 'finance_')) {
            if (!$user->hasPermission('finance.view') && $user->primaryRoleName() !== 'super_admin') {
                return [
                    'value' => 'N/A',
                    'label' => 'Restricted',
                    'trend' => 0,
                    'restricted' => true,
                ];
            }

            if ($metric === 'finance_budget_total') {
                $totalBudget = FinanceBudget::sum('allocated_amount');
                return [
                    'value' => '$' . number_format($totalBudget, 2),
                    'label' => 'Total Budgets',
                    'trend' => 5.2,
                ];
            }

            if ($metric === 'finance_expenses_total') {
                $totalExpense = FinanceExpense::sum('amount');
                return [
                    'value' => '$' . number_format($totalExpense, 2),
                    'label' => 'Total Expenses',
                    'trend' => -2.1,
                ];
            }
        }

        if (str_starts_with($metric, 'hr_')) {
            if (!$user->hasPermission('hr.view') && $user->primaryRoleName() !== 'super_admin') {
                return [
                    'value' => 'N/A',
                    'label' => 'Restricted',
                    'trend' => 0,
                    'restricted' => true,
                ];
            }

            if ($metric === 'hr_headcount') {
                $count = HrEmployee::where('status', 'Active')->orWhere('status', 'active')->count();
                return [
                    'value' => $count,
                    'label' => 'Active Headcount',
                    'trend' => 1.5,
                ];
            }
        }

        if ($metric === 'agency_active_projects') {
            $count = AgencyProject::whereIn('status', ['active', 'in_progress', 'planning'])->count();
            return [
                'value' => $count,
                'label' => 'Active Agency Projects',
                'trend' => 12.0,
            ];
        }

        if ($metric === 'deliverables_pending') {
            $count = ProjectDeliverable::whereIn('status', ['review_internal', 'review_client'])->count();
            return [
                'value' => $count,
                'label' => 'Pending Deliverables',
                'trend' => -8.3,
            ];
        }

        // Standard task-based metrics
        $query = $this->applyTaskFilters(KanbanTask::query(), $boardIds, $filters);

        return match ($metric) {
            'total_tasks' => [
                'value' => $query->count(),
                'label' => 'Total Tasks',
                'trend' => 4.2,
            ],
            'completed_tasks' => [
                'value' => (clone $query)->whereNotNull('completed_at')->count(),
                'label' => 'Completed Tasks',
                'trend' => 14.5,
            ],
            'overdue_tasks' => [
                'value' => (clone $query)->where('due_date', '<', Carbon::now()->toDateString())
                    ->whereNull('completed_at')->count(),
                'label' => 'Overdue Tasks',
                'trend' => -12.0,
            ],
            'in_progress_tasks' => [
                'value' => (clone $query)->whereNull('completed_at')->count(),
                'label' => 'In Progress Tasks',
                'trend' => 2.4,
            ],
            default => [
                'value' => $query->count(),
                'label' => ucfirst(str_replace('_', ' ', $metric)),
                'trend' => 0,
            ]
        };
    }

    /**
     * Battery / Progress distribution metric (Status or Phase segments)
     */
    public function computeBatteryMetric(array $config, User $user): array
    {
        $boardIds = $config['board_ids'] ?? [];
        $groupBy = $config['group_by'] ?? 'status'; // status, priority, stage
        $filters = $config['filters'] ?? [];

        $query = $this->applyTaskFilters(KanbanTask::query(), $boardIds, $filters);
        $total = $query->count();

        if ($total === 0) {
            return [
                'total' => 0,
                'segments' => [],
                'completion_percentage' => 0,
            ];
        }

        if ($groupBy === 'priority') {
            $breakdown = (clone $query)
                ->select('priority', DB::raw('count(*) as count'))
                ->groupBy('priority')
                ->get();

            $colors = [
                'urgent' => '#ef4444',
                'high' => '#f97316',
                'medium' => '#eab308',
                'low' => '#3b82f6',
            ];

            $segments = $breakdown->map(function ($item) use ($total, $colors) {
                $priority = strtolower($item->priority ?? 'medium');
                return [
                    'label' => ucfirst($priority),
                    'count' => $item->count,
                    'percentage' => round(($item->count / $total) * 100, 1),
                    'color' => $colors[$priority] ?? '#94a3b8',
                ];
            })->values()->all();

            $completedCount = (clone $query)->whereNotNull('completed_at')->count();

            return [
                'total' => $total,
                'segments' => $segments,
                'completion_percentage' => round(($completedCount / $total) * 100, 1),
            ];
        }

        // Group by workflow stage (KanbanColumn)
        $breakdown = (clone $query)
            ->join('kanban_columns', 'kanban_tasks.column_id', '=', 'kanban_columns.id')
            ->select('kanban_columns.title as stage_title', 'kanban_columns.color as stage_color', DB::raw('count(kanban_tasks.id) as count'))
            ->groupBy('kanban_columns.id', 'kanban_columns.title', 'kanban_columns.color')
            ->get();

        $segments = $breakdown->map(function ($item) use ($total) {
            return [
                'label' => $item->stage_title,
                'count' => $item->count,
                'percentage' => round(($item->count / $total) * 100, 1),
                'color' => $item->stage_color ?? '#C8AEF5',
            ];
        })->values()->all();

        $completedCount = (clone $query)->whereNotNull('completed_at')->count();

        return [
            'total' => $total,
            'segments' => $segments,
            'completion_percentage' => round(($completedCount / $total) * 100, 1),
        ];
    }

    /**
     * Chart metric (Bar, Line, Pie, Stacked Bar)
     */
    public function computeChartMetric(array $config, User $user): array
    {
        $chartType = $config['chart_type'] ?? 'bar';
        $xAxis = $config['x_axis'] ?? 'status';
        $boardIds = $config['board_ids'] ?? [];
        $filters = $config['filters'] ?? [];

        $query = $this->applyTaskFilters(KanbanTask::query(), $boardIds, $filters);

        if ($xAxis === 'assignee') {
            $data = (clone $query)
                ->join('users', 'kanban_tasks.assigned_to', '=', 'users.id')
                ->select('users.name as label', DB::raw('count(kanban_tasks.id) as value'))
                ->groupBy('users.id', 'users.name')
                ->orderByDesc('value')
                ->limit(10)
                ->get()
                ->toArray();
        } elseif ($xAxis === 'priority') {
            $data = (clone $query)
                ->select(DB::raw('COALESCE(priority, "None") as label'), DB::raw('count(*) as value'))
                ->groupBy('priority')
                ->get()
                ->toArray();
        } elseif ($xAxis === 'due_date' || $xAxis === 'timeline') {
            $data = (clone $query)
                ->whereNotNull('due_date')
                ->select(DB::raw('due_date as label'), DB::raw('count(*) as value'))
                ->groupBy('due_date')
                ->orderBy('due_date')
                ->limit(14)
                ->get()
                ->toArray();
        } else {
            // By workflow stage
            $data = (clone $query)
                ->join('kanban_columns', 'kanban_tasks.column_id', '=', 'kanban_columns.id')
                ->select('kanban_columns.title as label', DB::raw('count(kanban_tasks.id) as value'))
                ->groupBy('kanban_columns.id', 'kanban_columns.title')
                ->get()
                ->toArray();
        }

        return [
            'chart_type' => $chartType,
            'x_axis' => $xAxis,
            'series' => $data,
        ];
    }

    /**
     * Team Workload / Capacity metric
     */
    public function computeWorkloadMetric(array $config, User $user): array
    {
        $boardIds = $config['board_ids'] ?? [];
        $capacityPerUser = $config['capacity_tasks'] ?? 5;

        $query = $this->applyTaskFilters(KanbanTask::query(), $boardIds, $config['filters'] ?? []);

        $workloads = (clone $query)
            ->whereNotNull('assigned_to')
            ->join('users', 'kanban_tasks.assigned_to', '=', 'users.id')
            ->select(
                'users.id as user_id',
                'users.name as user_name',
                'users.email as user_email',
                DB::raw('count(kanban_tasks.id) as assigned_tasks'),
                DB::raw('sum(case when kanban_tasks.completed_at is not null then 1 else 0 end) as completed_tasks'),
                DB::raw('sum(case when kanban_tasks.completed_at is null then 1 else 0 end) as active_tasks'),
                DB::raw('sum(case when kanban_tasks.due_date < date("now") and kanban_tasks.completed_at is null then 1 else 0 end) as overdue_tasks')
            )
            ->groupBy('users.id', 'users.name', 'users.email')
            ->get();

        $results = $workloads->map(function ($item) use ($capacityPerUser) {
            $utilization = $capacityPerUser > 0 ? round(($item->active_tasks / $capacityPerUser) * 100, 1) : 0;
            $status = 'normal';
            if ($utilization > 100) {
                $status = 'overloaded';
            } elseif ($utilization < 50) {
                $status = 'underloaded';
            }

            return [
                'user_id' => $item->user_id,
                'user_name' => $item->user_name,
                'user_email' => $item->user_email,
                'assigned_tasks' => (int) $item->assigned_tasks,
                'active_tasks' => (int) $item->active_tasks,
                'completed_tasks' => (int) $item->completed_tasks,
                'overdue_tasks' => (int) $item->overdue_tasks,
                'capacity' => $capacityPerUser,
                'utilization_percentage' => $utilization,
                'workload_status' => $status,
            ];
        })->values()->all();

        return [
            'capacity_threshold' => $capacityPerUser,
            'members' => $results,
        ];
    }

    /**
     * Timeline / Gantt milestones metric
     */
    public function computeTimelineMetric(array $config, User $user): array
    {
        $boardIds = $config['board_ids'] ?? [];
        $query = $this->applyTaskFilters(KanbanTask::query(), $boardIds, $config['filters'] ?? []);

        $tasks = $query->with(['assignee:id,name', 'board:id,title', 'column:id,title'])
            ->whereNotNull('due_date')
            ->orderBy('due_date')
            ->limit(20)
            ->get(['id', 'board_id', 'column_id', 'assigned_to', 'title', 'start_date', 'due_date', 'priority', 'progress', 'completed_at']);

        return [
            'items' => $tasks->map(function ($t) {
                return [
                    'id' => $t->id,
                    'title' => $t->title,
                    'board_name' => $t->board?->title ?? 'General',
                    'assignee' => $t->assignee?->name ?? 'Unassigned',
                    'start_date' => $t->start_date ?? $t->due_date,
                    'due_date' => $t->due_date,
                    'status' => $t->column?->title ?? 'In Progress',
                    'priority' => $t->priority,
                    'progress' => $t->progress ?? 0,
                ];
            })->all(),
        ];
    }

    /**
     * Calendar metric
     */
    public function computeCalendarMetric(array $config, User $user): array
    {
        $boardIds = $config['board_ids'] ?? [];
        $query = $this->applyTaskFilters(KanbanTask::query(), $boardIds, $config['filters'] ?? []);

        $events = $query->whereNotNull('due_date')
            ->with(['assignee:id,name', 'column:id,title'])
            ->limit(40)
            ->get(['id', 'column_id', 'title', 'due_date', 'priority', 'assigned_to']);

        return [
            'events' => $events->map(function ($t) {
                return [
                    'id' => $t->id,
                    'title' => $t->title,
                    'date' => $t->due_date,
                    'status' => $t->column?->title ?? 'Open',
                    'priority' => $t->priority,
                    'assignee' => $t->assignee?->name,
                ];
            })->all(),
        ];
    }

    /**
     * Task List metric
     */
    public function computeTaskListMetric(array $config, User $user): array
    {
        $boardIds = $config['board_ids'] ?? [];
        $filterType = $config['list_filter'] ?? 'all';
        $limit = $config['limit'] ?? 10;

        $query = $this->applyTaskFilters(KanbanTask::query(), $boardIds, $config['filters'] ?? []);

        if ($filterType === 'overdue') {
            $query->where('due_date', '<', Carbon::now()->toDateString())
                  ->whereNull('completed_at');
        } elseif ($filterType === 'due_soon') {
            $query->whereBetween('due_date', [Carbon::now()->toDateString(), Carbon::now()->addDays(3)->toDateString()])
                  ->whereNull('completed_at');
        } elseif ($filterType === 'high_priority') {
            $query->whereIn('priority', ['urgent', 'high', 'Urgent', 'High']);
        } elseif ($filterType === 'my_tasks') {
            $query->where('assigned_to', $user->id);
        }

        $tasks = $query->with(['assignee:id,name', 'board:id,title', 'column:id,title'])
            ->orderBy('due_date')
            ->limit($limit)
            ->get(['id', 'board_id', 'column_id', 'title', 'priority', 'due_date', 'assigned_to', 'completed_at']);

        return [
            'filter_type' => $filterType,
            'tasks' => $tasks->map(function ($t) {
                return [
                    'id' => $t->id,
                    'title' => $t->title,
                    'board_name' => $t->board?->title,
                    'status' => $t->column?->title ?? 'Open',
                    'priority' => $t->priority,
                    'due_date' => $t->due_date,
                    'assignee' => $t->assignee?->name ?? 'Unassigned',
                ];
            })->all(),
        ];
    }

    /**
     * Activity feed metric
     */
    public function computeActivityMetric(array $config, User $user): array
    {
        $limit = $config['limit'] ?? 10;

        $logs = AuditLog::with('user:id,name,email')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get(['id', 'user_id', 'action', 'entity_type', 'entity_id', 'description', 'created_at']);

        return [
            'activities' => $logs->map(function ($l) {
                return [
                    'id' => $l->id,
                    'user_name' => $l->user?->name ?? 'System',
                    'action' => $l->action,
                    'description' => $l->description ?? "{$l->action} on {$l->entity_type}",
                    'time_ago' => $l->created_at->diffForHumans(),
                    'created_at' => $l->created_at->toIso8601String(),
                ];
            })->all(),
        ];
    }

    /**
     * Apply board filtering and generic task filters
     */
    private function applyTaskFilters(Builder $query, array $boardIds, array $filters): Builder
    {
        if (!empty($boardIds)) {
            $query->whereIn('board_id', $boardIds);
        }

        if (!empty($filters['priority'])) {
            $query->whereIn('priority', (array) $filters['priority']);
        }

        if (!empty($filters['assigned_to'])) {
            $query->whereIn('assigned_to', (array) $filters['assigned_to']);
        }

        if (!empty($filters['date_range'])) {
            $range = $filters['date_range'];
            if (!empty($range['start']) && !empty($range['end'])) {
                $query->whereBetween('due_date', [$range['start'], $range['end']]);
            }
        }

        return $query;
    }
}
