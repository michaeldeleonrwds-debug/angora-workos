<?php

namespace App\Http\Controllers;

use App\Models\AnalyticsReport;
use App\Models\KanbanBoard;
use App\Models\ScheduledReport;
use App\Services\ReportExportService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class ReportBuilderController extends Controller
{
    public function __construct(
        protected ReportExportService $reportService
    ) {}

    /**
     * Reports index: List reports and scheduled reports
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if ($user->primaryRoleName() === 'external_user') {
            abort(403);
        }

        $reports = AnalyticsReport::with(['creator:id,name', 'schedules'])
            ->orderByDesc('created_at')
            ->get();

        $boards = KanbanBoard::select('id', 'title')->get();

        return Inertia::render('reports/index', [
            'reports' => $reports,
            'boards' => $boards,
        ]);
    }

    /**
     * Store new report configuration
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->primaryRoleName() === 'external_user') {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'report_type' => 'required|string|in:project_status,task_completion,overdue_tasks,team_workload,department_performance,portfolio,deliverables',
            'config' => 'nullable|array',
        ]);

        $report = AnalyticsReport::create([
            ...$validated,
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Report created.');
    }

    /**
     * Preview report data in JSON for UI
     */
    public function preview(Request $request, AnalyticsReport $report)
    {
        $user = $request->user();
        if ($user->primaryRoleName() === 'external_user') {
            abort(403);
        }

        $data = $this->reportService->generateReportData($report, $user);

        return response()->json($data);
    }

    /**
     * Export report as CSV download, JSON, or print-ready HTML
     */
    public function export(Request $request, AnalyticsReport $report): HttpResponse
    {
        $user = $request->user();
        if ($user->primaryRoleName() === 'external_user') {
            abort(403);
        }

        $format = $request->query('format', 'csv');

        if ($format === 'json') {
            $data = $this->reportService->generateJson($report, $user);
            return response(json_encode($data, JSON_PRETTY_PRINT), 200, [
                'Content-Type' => 'application/json',
            ]);
        }

        if ($format === 'print' || $format === 'html') {
            $html = $this->reportService->generateHtmlPrintLayout($report, $user);
            return response($html, 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
            ]);
        }

        $csv = $this->reportService->generateCsv($report, $user);
        $filename = 'angora-report-' . str_replace(' ', '-', strtolower($report->title)) . '-' . date('Y-m-d') . '.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Delete report
     */
    public function destroy(Request $request, AnalyticsReport $report): RedirectResponse
    {
        $user = $request->user();
        if ($report->created_by !== $user->id && $user->primaryRoleName() !== 'super_admin') {
            abort(403);
        }

        $report->delete();

        return back()->with('success', 'Report deleted.');
    }

    /**
     * Store scheduled report
     */
    public function storeSchedule(Request $request, AnalyticsReport $report): RedirectResponse
    {
        $user = $request->user();
        if ($user->primaryRoleName() === 'external_user') {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'frequency' => 'required|string|in:daily,weekly,monthly',
            'recipients' => 'nullable|array',
            'format' => 'required|string|in:csv,pdf,xlsx',
        ]);

        $nextRun = match ($validated['frequency']) {
            'daily' => Carbon::now()->addDay()->startOfDay()->addHours(8),
            'weekly' => Carbon::now()->next(Carbon::MONDAY)->addHours(8),
            'monthly' => Carbon::now()->addMonth()->startOfMonth()->addHours(8),
        };

        $report->schedules()->create([
            'title' => $validated['title'],
            'frequency' => $validated['frequency'],
            'recipients' => $validated['recipients'] ?? [$user->email],
            'format' => $validated['format'],
            'is_active' => true,
            'next_run_at' => $nextRun,
        ]);

        return back()->with('success', 'Scheduled report configured.');
    }

    /**
     * Delete scheduled report
     */
    public function destroySchedule(Request $request, ScheduledReport $schedule): RedirectResponse
    {
        $user = $request->user();
        if ($schedule->report->created_by !== $user->id && $user->primaryRoleName() !== 'super_admin') {
            abort(403);
        }

        $schedule->delete();

        return back()->with('success', 'Schedule removed.');
    }
}
