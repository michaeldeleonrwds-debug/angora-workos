<?php

namespace App\Console\Commands;

use App\Models\ScheduledReport;
use App\Services\ReportExportService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendScheduledReportsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'reports:send-scheduled';

    /**
     * The console command description.
     */
    protected $description = 'Process and dispatch scheduled analytics reports due for delivery';

    /**
     * Execute the console command.
     */
    public function handle(ReportExportService $reportService): int
    {
        $dueSchedules = ScheduledReport::with(['report.creator'])
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('next_run_at')
                    ->orWhere('next_run_at', '<=', Carbon::now());
            })
            ->get();

        $this->info("Found {$dueSchedules->count()} scheduled reports due for processing.");

        foreach ($dueSchedules as $schedule) {
            try {
                $report = $schedule->report;
                if (!$report || !$report->creator) {
                    continue;
                }

                $csvData = $reportService->generateCsv($report, $report->creator);

                // Simulate delivery logging / queuing
                Log::info("Dispatched scheduled report [{$schedule->title}] in format [{$schedule->format}] to: " . implode(', ', $schedule->recipients ?? []));

                // Advance next_run_at according to frequency
                $nextRun = match ($schedule->frequency) {
                    'daily' => Carbon::now()->addDay()->startOfDay()->addHours(8),
                    'weekly' => Carbon::now()->next(Carbon::MONDAY)->addHours(8),
                    'monthly' => Carbon::now()->addMonth()->startOfMonth()->addHours(8),
                    default => Carbon::now()->addDay(),
                };

                $schedule->update([
                    'last_sent_at' => Carbon::now(),
                    'next_run_at' => $nextRun,
                ]);

                $this->info("Processed report [{$schedule->title}] successfully.");
            } catch (\Throwable $e) {
                Log::error("Failed to process scheduled report {$schedule->id}: " . $e->getMessage());
                $this->error("Error on schedule {$schedule->id}: " . $e->getMessage());
            }
        }

        return self::SUCCESS;
    }
}
