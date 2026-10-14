<?php

namespace App\Http\Controllers;

use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Services\ProductionAnalyticsService;
use App\Services\ReportExportService;
use App\Services\WorkloadCapacityService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class BoardDataExportController extends Controller
{
    /**
     * Export all board tasks with optional filters (status, group, assignee, date range).
     * Supports CSV and JSON formats with formula injection sanitization.
     */
    public function exportBoardTasks(Request $request, KanbanBoard $board): Response
    {
        Gate::authorize('export', $board);

        $query = $board->tasks()
            ->with(['column', 'group', 'assignee', 'subitems'])
            ->orderBy('position', 'asc');

        if ($request->filled('group_id')) {
            $query->where('group_id', $request->input('group_id'));
        }

        if ($request->filled('column_id')) {
            $query->where('column_id', $request->input('column_id'));
        }

        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->input('assigned_to'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('due_date', '>=', $request->input('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('due_date', '<=', $request->input('to_date'));
        }

        if ($request->filled('status')) {
            $status = $request->input('status');
            if ($status === 'completed') {
                $query->where(function ($q) {
                    $q->whereNotNull('completed_at')
                        ->orWhereHas('column', fn($sq) => $sq->where('semantic_category', 'completed'));
                });
            } elseif ($status === 'open') {
                $query->whereNull('completed_at')
                    ->whereHas('column', fn($sq) => $sq->where('semantic_category', '!=', 'completed'));
            }
        }

        $tasks = $query->get();

        $format = strtolower($request->query('format', 'csv'));

        if ($format === 'json') {
            $payload = [
                'board' => [
                    'id' => $board->id,
                    'title' => $board->title,
                    'workspace_id' => $board->workspace_id,
                ],
                'exported_at' => now()->toIso8601String(),
                'total_tasks' => $tasks->count(),
                'tasks' => $tasks->map(function (KanbanTask $t) {
                    return [
                        'id' => $t->id,
                        'title' => $t->title,
                        'group' => $t->group?->title ?? 'Default',
                        'status' => $t->column?->title ?? 'Backlog',
                        'priority' => ucfirst($t->priority ?? 'medium'),
                        'assigned_to' => $t->assignee?->name ?? 'Unassigned',
                        'progress' => (int) ($t->progress ?? 0),
                        'start_date' => $t->start_date ? ($t->start_time ? "{$t->start_date} {$t->start_time}" : $t->start_date) : null,
                        'due_date' => $t->due_date ? ($t->due_time ? "{$t->due_date} {$t->due_time}" : $t->due_date) : null,
                        'completed_at' => $t->completed_at ? Carbon::parse($t->completed_at)->toIso8601String() : null,
                        'estimated_hours' => (float) ($t->estimated_hours ?? 0),
                        'subtasks_count' => $t->subitems->count(),
                    ];
                }),
            ];

            return response(json_encode($payload, JSON_PRETTY_PRINT), 200, [
                'Content-Type' => 'application/json',
            ]);
        }

        // CSV generation
        $headers = [
            'ID',
            'Task Title',
            'Group',
            'Status',
            'Priority',
            'Assignee',
            'Progress (%)',
            'Start Date',
            'Due Date',
            'Completed At',
            'Estimated Hours',
            'Subtasks Count',
        ];

        $output = fopen('php://temp', 'r+');
        fputcsv($output, array_map([ReportExportService::class, 'sanitizeCsvCell'], $headers));

        foreach ($tasks as $task) {
            $row = [
                $task->id,
                $task->title,
                $task->group?->title ?? 'Default',
                $task->column?->title ?? 'Backlog',
                ucfirst($task->priority ?? 'Medium'),
                $task->assignee?->name ?? 'Unassigned',
                ($task->progress ?? 0) . '%',
                $task->start_date ? ($task->start_time ? "{$task->start_date} {$task->start_time}" : $task->start_date) : 'N/A',
                $task->due_date ? ($task->due_time ? "{$task->due_date} {$task->due_time}" : $task->due_date) : 'N/A',
                $task->completed_at ? Carbon::parse($task->completed_at)->toDateTimeString() : 'N/A',
                $task->estimated_hours ?? 0,
                $task->subitems->count(),
            ];

            $sanitizedRow = array_map([ReportExportService::class, 'sanitizeCsvCell'], $row);
            fputcsv($output, $sanitizedRow);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        $filename = 'board-' . Str::slug($board->title) . '-tasks-' . date('Y-m-d') . '.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Export board workload & resource allocation.
     */
    public function exportWorkload(Request $request, KanbanBoard $board, WorkloadCapacityService $service): Response
    {
        Gate::authorize('export', $board);

        $analytics = $service->calculateBoardWorkload($board, $request->all());

        $format = strtolower($request->query('format', 'csv'));

        if ($format === 'json') {
            return response(json_encode($analytics, JSON_PRETTY_PRINT), 200, [
                'Content-Type' => 'application/json',
            ]);
        }

        $headers = [
            'User ID',
            'Name',
            'Email',
            'Role',
            'Capacity (Hours)',
            'Allocated (Hours)',
            'Utilization (%)',
            'Active Tasks',
            'Overdue Tasks',
            'Status',
        ];

        $output = fopen('php://temp', 'r+');
        fputcsv($output, array_map([ReportExportService::class, 'sanitizeCsvCell'], $headers));

        foreach ($analytics['members'] ?? [] as $m) {
            $userObj = $m['user'] ?? [];
            $row = [
                $userObj['id'] ?? ($m['id'] ?? ''),
                $userObj['name'] ?? ($m['name'] ?? ''),
                $userObj['email'] ?? ($m['email'] ?? ''),
                ucfirst(str_replace('_', ' ', $userObj['role'] ?? ($m['role'] ?? 'member'))),
                $m['capacity_hours'] ?? 0,
                $m['allocated_hours'] ?? 0,
                ($m['utilization_rate'] ?? $m['utilization_percentage'] ?? 0) . '%',
                $m['active_tasks_count'] ?? ($m['task_count'] ?? 0),
                $m['overdue_tasks_count'] ?? ($m['overdue_task_count'] ?? 0),
                ucfirst($m['status'] ?? 'optimal'),
            ];

            fputcsv($output, array_map([ReportExportService::class, 'sanitizeCsvCell'], $row));
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        $filename = 'board-' . Str::slug($board->title) . '-workload-' . date('Y-m-d') . '.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Export board production delivery metrics.
     */
    public function exportDeliveryMetrics(Request $request, KanbanBoard $board, ProductionAnalyticsService $service): Response
    {
        Gate::authorize('export', $board);

        $metrics = $service->calculateDeliveryMetrics($board, $request->all());

        $format = strtolower($request->query('format', 'csv'));

        if ($format === 'json') {
            return response(json_encode($metrics, JSON_PRETTY_PRINT), 200, [
                'Content-Type' => 'application/json',
            ]);
        }

        $headers = ['Metric', 'Value', 'Details'];

        $onTimeRate = $metrics['on_time_delivery']['rate_percentage'] ?? 0;
        $avgLeadTime = $metrics['lead_time']['avg_days'] ?? 0;
        $avgCycleTime = $metrics['cycle_time']['avg_days'] ?? 0;
        $avgReview = $metrics['review_turnaround']['avg_hours'] ?? 0;
        $healthScore = $metrics['summary']['health_score'] ?? 0;
        $totalThroughput = $metrics['throughput']['total_recent'] ?? 0;

        $rows = [
            ['On-Time Delivery Rate', $onTimeRate . '%', 'Percentage of completed tasks delivered on or before deadline'],
            ['Average Lead Time', $avgLeadTime . ' days', 'Elapsed time from task creation to completion'],
            ['Average Cycle Time', $avgCycleTime . ' days', 'Elapsed time from in-progress start to completion'],
            ['Review Turnaround Time', $avgReview . ' hours', 'Average time from review submission to approval'],
            ['Overall Health Score', $healthScore . '/100', 'Composite operational health score'],
            ['Total Throughput Completed', $totalThroughput, 'Total completed tasks in measurement window'],
        ];

        foreach ($metrics['throughput']['weekly_breakdown'] ?? [] as $b) {
            $rows[] = [
                'Throughput (' . ($b['week_label'] ?? 'Week') . ')',
                ($b['completed_count'] ?? 0) . ' tasks',
                'Completed throughput',
            ];
        }

        $output = fopen('php://temp', 'r+');
        fputcsv($output, array_map([ReportExportService::class, 'sanitizeCsvCell'], $headers));

        foreach ($rows as $row) {
            fputcsv($output, array_map([ReportExportService::class, 'sanitizeCsvCell'], $row));
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        $filename = 'board-' . Str::slug($board->title) . '-delivery-metrics-' . date('Y-m-d') . '.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
