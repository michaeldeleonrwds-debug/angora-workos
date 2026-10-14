<?php

namespace App\Services;

use App\Models\AgencyProject;
use App\Models\AnalyticsReport;
use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\ProjectDeliverable;
use App\Models\User;
use Carbon\Carbon;

class ReportExportService
{
    /**
     * Generate report data rows based on report configuration
     */
    public function generateReportData(AnalyticsReport $report, User $user): array
    {
        $config = $report->config ?? [];
        $type = $report->report_type;
        $boardIds = $config['board_ids'] ?? [];

        return match ($type) {
            'project_status' => $this->getProjectStatusReportData($config),
            'task_completion' => $this->getTaskCompletionReportData($boardIds, $config),
            'overdue_tasks' => $this->getOverdueTasksReportData($boardIds, $config),
            'team_workload' => $this->getTeamWorkloadReportData($boardIds, $config),
            'deliverables' => $this->getDeliverablesReportData($config),
            'production_delivery' => $this->getProductionDeliveryReportData($boardIds, $config),
            'workload_capacity' => $this->getWorkloadCapacityReportData($boardIds, $config),
            default => $this->getTaskCompletionReportData($boardIds, $config),
        };
    }

    /**
     * Mitigate CSV formula injection (OWASP / CWE-1236).
     * If a cell begins with '=', '+', '-', '@', tab, or carriage return,
     * prefix with a single quote to force spreadsheet programs to render as raw text.
     */
    public static function sanitizeCsvCell(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        $str = (string) $value;
        if ($str === '') {
            return '';
        }

        $trimmed = ltrim($str);
        if ($trimmed !== '' && in_array($trimmed[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'" . $str;
        }

        if (in_array($str[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'" . $str;
        }

        return $str;
    }

    /**
     * Generate CSV content for the report with formula injection sanitization
     */
    public function generateCsv(AnalyticsReport $report, User $user): string
    {
        $data = $this->generateReportData($report, $user);
        $headers = $data['headers'] ?? [];
        $rows = $data['rows'] ?? [];

        $output = fopen('php://temp', 'r+');
        fputcsv($output, array_map([self::class, 'sanitizeCsvCell'], $headers));

        foreach ($rows as $row) {
            $sanitizedRow = array_map([self::class, 'sanitizeCsvCell'], array_values($row));
            fputcsv($output, $sanitizedRow);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv;
    }

    /**
     * Generate JSON export payload
     */
    public function generateJson(AnalyticsReport $report, User $user): array
    {
        $data = $this->generateReportData($report, $user);
        return [
            'report' => [
                'id' => $report->id,
                'title' => $report->title,
                'description' => $report->description,
                'report_type' => $report->report_type,
                'generated_at' => now()->toIso8601String(),
                'generated_by' => $user->name,
            ],
            'headers' => $data['headers'] ?? [],
            'rows' => $data['rows'] ?? [],
            'summary' => $data['summary'] ?? [],
        ];
    }

    /**
     * Generate clean, print-ready HTML layout for the report
     */
    public function generateHtmlPrintLayout(AnalyticsReport $report, User $user): string
    {
        $data = $this->generateReportData($report, $user);
        $headers = $data['headers'] ?? [];
        $rows = $data['rows'] ?? [];
        $summary = $data['summary'] ?? [];

        $headersHtml = implode('', array_map(fn($h) => "<th style='padding:10px 14px; text-align:left; background:#12121E; color:#FFFFFF; font-size:12px; font-weight:600; text-transform:uppercase;'>{$h}</th>", $headers));

        $rowsHtml = '';
        foreach ($rows as $index => $row) {
            $bg = $index % 2 === 0 ? '#FFFFFF' : '#F8F9F7';
            $tds = implode('', array_map(fn($v) => "<td style='padding:10px 14px; border-bottom:1px solid #E5E7EB; font-size:13px; color:#1F2937;'>{$v}</td>", array_values($row)));
            $rowsHtml .= "<tr style='background:{$bg};'>{$tds}</tr>";
        }

        $summaryCardsHtml = '';
        foreach ($summary as $key => $val) {
            $label = ucwords(str_replace('_', ' ', $key));
            $summaryCardsHtml .= "
            <div style='background:#F8F9F7; border:1px solid #E5E7EB; border-radius:8px; padding:12px 18px; margin-right:16px; min-width:140px;'>
                <div style='font-size:11px; text-transform:uppercase; color:#6B7280; font-weight:600;'>{$label}</div>
                <div style='font-size:22px; font-weight:700; color:#12121E; margin-top:4px;'>{$val}</div>
            </div>";
        }

        $title = htmlspecialchars($report->title);
        $desc = htmlspecialchars($report->description ?? 'Executive Analytics & Performance Report');
        $date = now()->format('M d, Y H:i');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{$title} — Angora Work OS</title>
    <style>
        @media print {
            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .no-print { display: none; }
        }
        body { margin: 0; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FFFFFF; color: #12121E; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; border-radius: 8px; overflow: hidden; }
        .btn-print { background: #12121E; color: #FFFFFF; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 24px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; color:#6B7280;">Preview Mode &bull; Click Print to generate PDF or send to printer</span>
        <button class="btn-print" onclick="window.print()">Print / Save PDF</button>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #E5E7EB; padding-bottom: 20px;">
        <div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="background:#C8AEF5; color:#12121E; font-weight:800; padding:4px 8px; border-radius:4px; font-size:12px; letter-spacing:1px;">ANGORA WORK OS</span>
            </div>
            <h1 style="margin: 12px 0 4px 0; font-size: 26px; color: #12121E;">{$title}</h1>
            <p style="margin: 0; font-size: 14px; color: #6B7280;">{$desc}</p>
        </div>
        <div style="text-align:right; font-size: 12px; color: #6B7280;">
            <div><strong>Generated:</strong> {$date}</div>
            <div><strong>By:</strong> {$user->name}</div>
            <div><strong>Format:</strong> Print / PDF Layout</div>
        </div>
    </div>

    <div style="display:flex; margin-top:24px; flex-wrap:wrap;">
        {$summaryCardsHtml}
    </div>

    <table>
        <thead>
            <tr>{$headersHtml}</tr>
        </thead>
        <tbody>
            {$rowsHtml}
        </tbody>
    </table>

    <div style="margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 16px; font-size: 11px; color: #9CA3AF; text-align: center;">
        Angora Work OS &bull; Confidential Business Operations Report &bull; Generated automatically
    </div>
</body>
</html>
HTML;
    }

    private function getProjectStatusReportData(array $config): array
    {
        $projects = AgencyProject::with(['client:id,name', 'projectManager:id,name'])->get();
        $headers = ['Project Code', 'Project Name', 'Client', 'Manager', 'Status', 'Start Date', 'Target Date', 'Budget'];

        $rows = $projects->map(function ($p) {
            return [
                'code' => $p->code ?: ('PRJ-' . $p->id),
                'name' => $p->name,
                'client' => $p->client?->name ?? 'Internal',
                'manager' => $p->projectManager?->name ?? 'Unassigned',
                'status' => ucfirst($p->status),
                'start_date' => $p->start_date?->toDateString() ?? 'N/A',
                'target_date' => $p->due_date?->toDateString() ?? 'N/A',
                'budget' => '$' . number_format($p->budget ?? 0, 2),
            ];
        })->all();

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_projects' => count($rows),
            ],
        ];
    }

    private function getTaskCompletionReportData(array $boardIds, array $config): array
    {
        $query = KanbanTask::with(['board:id,title', 'assignee:id,name', 'column:id,title']);
        if (!empty($boardIds)) {
            $query->whereIn('board_id', $boardIds);
        }

        $tasks = $query->orderByDesc('updated_at')->get();
        $headers = ['Task ID', 'Title', 'Board', 'Assignee', 'Status', 'Priority', 'Progress (%)', 'Due Date'];

        $rows = $tasks->map(function ($t) {
            return [
                'id' => $t->id,
                'title' => $t->title,
                'board' => $t->board?->title ?? 'N/A',
                'assignee' => $t->assignee?->name ?? 'Unassigned',
                'status' => $t->column?->title ?? ($t->completed_at ? 'Done' : 'In Progress'),
                'priority' => ucfirst($t->priority ?? 'Medium'),
                'progress' => ($t->progress ?? 0) . '%',
                'due_date' => $t->due_date ?? 'N/A',
            ];
        })->all();

        $completed = $tasks->whereNotNull('completed_at')->count();

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_tasks' => count($rows),
                'completed_tasks' => $completed,
                'completion_rate' => count($rows) > 0 ? round(($completed / count($rows)) * 100, 1) . '%' : '0%',
            ],
        ];
    }

    private function getOverdueTasksReportData(array $boardIds, array $config): array
    {
        $query = KanbanTask::with(['board:id,title', 'assignee:id,name', 'column:id,title'])
            ->where('due_date', '<', Carbon::now()->toDateString())
            ->whereNull('completed_at');

        if (!empty($boardIds)) {
            $query->whereIn('board_id', $boardIds);
        }

        $tasks = $query->orderBy('due_date')->get();
        $headers = ['Task ID', 'Title', 'Board', 'Assignee', 'Status', 'Priority', 'Due Date', 'Days Overdue'];

        $rows = $tasks->map(function ($t) {
            $daysOverdue = Carbon::parse($t->due_date)->diffInDays(Carbon::now());
            return [
                'id' => $t->id,
                'title' => $t->title,
                'board' => $t->board?->title ?? 'N/A',
                'assignee' => $t->assignee?->name ?? 'Unassigned',
                'status' => $t->column?->title ?? 'In Progress',
                'priority' => ucfirst($t->priority ?? 'Medium'),
                'due_date' => $t->due_date,
                'days_overdue' => $daysOverdue . ' days',
            ];
        })->all();

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_overdue' => count($rows),
            ],
        ];
    }

    private function getTeamWorkloadReportData(array $boardIds, array $config): array
    {
        $users = User::withCount(['assignedTasks' => function ($q) use ($boardIds) {
            if (!empty($boardIds)) {
                $q->whereIn('board_id', $boardIds);
            }
            $q->whereNull('completed_at');
        }])->get();

        $headers = ['User Name', 'Email', 'Role', 'Active Tasks', 'Capacity Status'];

        $rows = $users->map(function ($u) {
            $status = $u->assigned_tasks_count > 5 ? 'Overloaded' : ($u->assigned_tasks_count > 0 ? 'Normal' : 'Available');
            return [
                'name' => $u->name,
                'email' => $u->email,
                'role' => ucfirst(str_replace('_', ' ', $u->role)),
                'active_tasks' => $u->assigned_tasks_count,
                'status' => $status,
            ];
        })->all();

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_members' => count($rows),
            ],
        ];
    }

    private function getDeliverablesReportData(array $config): array
    {
        $deliverables = ProjectDeliverable::with(['project:id,name', 'assignee:id,name'])->get();
        $headers = ['Deliverable', 'Project', 'Assignee', 'Version', 'Status', 'Due Date'];

        $rows = $deliverables->map(function ($d) {
            return [
                'title' => $d->title,
                'project' => $d->project?->name ?? 'N/A',
                'assignee' => $d->assignee?->name ?? 'Unassigned',
                'version' => 'v' . $d->version,
                'status' => ucfirst(str_replace('_', ' ', $d->status)),
                'due_date' => $d->due_date?->toDateString() ?? 'N/A',
            ];
        })->all();

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_deliverables' => count($rows),
            ],
        ];
    }

    private function getProductionDeliveryReportData(array $boardIds, array $config): array
    {
        $headers = ['Board', 'On-Time Rate (%)', 'Avg Lead Time (Days)', 'Avg Cycle Time (Days)', 'Review Turnaround (Hours)', 'Completed Throughput', 'Health Score'];
        $rows = [];
        $totalCompleted = 0;

        $boardsQuery = KanbanBoard::query();
        if (!empty($boardIds)) {
            $boardsQuery->whereIn('id', $boardIds);
        }
        $boards = $boardsQuery->get();

        $analyticsService = app(ProductionAnalyticsService::class);

        foreach ($boards as $board) {
            $metrics = $analyticsService->calculateDeliveryMetrics($board);
            $throughput = $metrics['throughput']['total_recent'] ?? 0;
            $totalCompleted += $throughput;

            $rows[] = [
                'board' => $board->title,
                'on_time_rate' => ($metrics['on_time_delivery']['rate_percentage'] ?? 0) . '%',
                'lead_time' => $metrics['lead_time']['avg_days'] ?? 0,
                'cycle_time' => $metrics['cycle_time']['avg_days'] ?? 0,
                'review_turnaround' => $metrics['review_turnaround']['avg_hours'] ?? 0,
                'completed_throughput' => $throughput,
                'health_score' => ($metrics['summary']['health_score'] ?? 0) . '/100',
            ];
        }

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_boards' => count($rows),
                'total_completed_throughput' => $totalCompleted,
            ],
        ];
    }

    private function getWorkloadCapacityReportData(array $boardIds, array $config): array
    {
        $headers = ['Board', 'Member', 'Role', 'Capacity (Hours)', 'Allocated Hours', 'Utilization (%)', 'Active Tasks', 'Status'];
        $rows = [];
        $overallocatedCount = 0;

        $boardsQuery = KanbanBoard::query();
        if (!empty($boardIds)) {
            $boardsQuery->whereIn('id', $boardIds);
        }
        $boards = $boardsQuery->get();

        $capacityService = app(WorkloadCapacityService::class);

        foreach ($boards as $board) {
            $workload = $capacityService->calculateBoardWorkload($board);
            foreach ($workload['members'] ?? [] as $m) {
                if (($m['status'] ?? '') === 'overallocated') {
                    $overallocatedCount++;
                }
                $userObj = $m['user'] ?? [];
                $rows[] = [
                    'board' => $board->title,
                    'member' => $userObj['name'] ?? ($m['name'] ?? ''),
                    'role' => ucfirst(str_replace('_', ' ', $userObj['role'] ?? ($m['role'] ?? 'member'))),
                    'capacity' => $m['capacity_hours'] ?? 0,
                    'allocated' => $m['allocated_hours'] ?? 0,
                    'utilization' => ($m['utilization_rate'] ?? $m['utilization_percentage'] ?? 0) . '%',
                    'active_tasks' => $m['active_tasks_count'] ?? ($m['task_count'] ?? 0),
                    'status' => ucfirst($m['status'] ?? 'optimal'),
                ];
            }
        }

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_allocations' => count($rows),
                'overallocated_members' => $overallocatedCount,
            ],
        ];
    }
}
