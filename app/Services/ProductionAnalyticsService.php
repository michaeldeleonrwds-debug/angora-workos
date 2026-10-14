<?php

namespace App\Services;

use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\TaskReviewCycle;
use App\Models\Workspace;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class ProductionAnalyticsService
{
    /**
     * Compute comprehensive production delivery metrics for a board or workspace.
     */
    public function calculateDeliveryMetrics(KanbanBoard|Workspace $entity, array $options = []): array
    {
        $now = now();
        $daysWindow = (int) ($options['days_window'] ?? 30);
        $windowStart = $now->copy()->subDays($daysWindow)->startOfDay();

        // 1. Fetch tasks query
        if ($entity instanceof KanbanBoard) {
            $taskQuery = $entity->tasks()->whereNull('parent_id');
            $boardIds = [$entity->id];
        } else {
            $boardIds = $entity->boards()->pluck('id')->toArray();
            $taskQuery = KanbanTask::whereIn('board_id', $boardIds)->whereNull('parent_id');
        }

        $allTasks = (clone $taskQuery)->get();
        $completedTasks = (clone $taskQuery)
            ->whereNotNull('completed_at')
            ->orderBy('completed_at', 'asc')
            ->get();

        // 2. Lead Time (created_at -> completed_at)
        $leadTimesDays = [];
        foreach ($completedTasks as $t) {
            $created = Carbon::parse($t->created_at);
            $completed = Carbon::parse($t->completed_at);
            $days = max(0.1, round($created->floatDiffInDays($completed), 1));
            $leadTimesDays[] = $days;
        }

        $avgLeadTime = count($leadTimesDays) > 0 ? round(array_sum($leadTimesDays) / count($leadTimesDays), 1) : 0.0;
        $medianLeadTime = count($leadTimesDays) > 0 ? $this->calculateMedian($leadTimesDays) : 0.0;
        $minLeadTime = count($leadTimesDays) > 0 ? min($leadTimesDays) : 0.0;
        $maxLeadTime = count($leadTimesDays) > 0 ? max($leadTimesDays) : 0.0;

        // 3. Cycle Time (start_date/created_at -> completed_at)
        $cycleTimesDays = [];
        foreach ($completedTasks as $t) {
            if ($t->start_date) {
                $start = $t->start_time
                    ? Carbon::parse("{$t->start_date} {$t->start_time}")
                    : Carbon::parse($t->start_date)->startOfDay();
            } else {
                $start = Carbon::parse($t->created_at);
            }
            $completed = Carbon::parse($t->completed_at);
            $days = max(0.1, round($start->floatDiffInDays($completed), 1));
            $cycleTimesDays[] = $days;
        }

        $avgCycleTime = count($cycleTimesDays) > 0 ? round(array_sum($cycleTimesDays) / count($cycleTimesDays), 1) : 0.0;
        $medianCycleTime = count($cycleTimesDays) > 0 ? $this->calculateMedian($cycleTimesDays) : 0.0;
        $minCycleTime = count($cycleTimesDays) > 0 ? min($cycleTimesDays) : 0.0;
        $maxCycleTime = count($cycleTimesDays) > 0 ? max($cycleTimesDays) : 0.0;

        // 4. On-Time Delivery Rate
        $onTimeCount = 0;
        $lateCount = 0;
        $noDueDateCount = 0;

        foreach ($completedTasks as $t) {
            if (!$t->due_date) {
                $noDueDateCount++;
                continue;
            }

            $deadline = Carbon::parse($t->due_date)->endOfDay();
            $completedAt = Carbon::parse($t->completed_at);

            if ($completedAt->lte($deadline)) {
                $onTimeCount++;
            } else {
                $lateCount++;
            }
        }

        $measuredDeliveries = $onTimeCount + $lateCount;
        $onTimeRate = $measuredDeliveries > 0
            ? round(($onTimeCount / $measuredDeliveries) * 100, 1)
            : 100.0;

        // 5. Throughput Velocity (weekly breakdown over last 4 weeks)
        $weeklyThroughput = [];
        for ($w = 3; $w >= 0; $w--) {
            $wStart = $now->copy()->subWeeks($w)->startOfWeek();
            $wEnd = $now->copy()->subWeeks($w)->endOfWeek();

            $wTasks = $completedTasks->filter(function ($t) use ($wStart, $wEnd) {
                $c = Carbon::parse($t->completed_at);
                return $c->between($wStart, $wEnd);
            });

            $hours = $wTasks->sum(fn($t) => (float) ($t->estimated_hours ?? 8.0));

            $weeklyThroughput[] = [
                'period' => $w === 0 ? 'This Week' : ($w === 1 ? 'Last Week' : "Week -{$w}"),
                'date_range' => $wStart->format('M j') . ' - ' . $wEnd->format('M j'),
                'completed_count' => $wTasks->count(),
                'total_hours' => round($hours, 1),
            ];
        }

        $totalThroughputCompleted = array_sum(array_column($weeklyThroughput, 'completed_count'));
        $avgWeeklyThroughput = round($totalThroughputCompleted / 4, 1);

        // 6. Review Turnaround Time
        $taskIds = $allTasks->pluck('id')->toArray();
        $reviewCycles = TaskReviewCycle::whereIn('task_id', $taskIds)
            ->whereNotNull('resolved_at')
            ->get();

        $turnaroundHours = [];
        $roundOneCycles = 0;
        $roundOneApproved = 0;

        foreach ($reviewCycles as $cycle) {
            $sub = Carbon::parse($cycle->submitted_at);
            $res = Carbon::parse($cycle->resolved_at);
            $hours = max(0.1, round($sub->floatDiffInHours($res), 1));
            $turnaroundHours[] = $hours;

            if ($cycle->round_number === 1) {
                $roundOneCycles++;
                if ($cycle->state === 'approved') {
                    $roundOneApproved++;
                }
            }
        }

        $avgReviewTurnaroundHours = count($turnaroundHours) > 0
            ? round(array_sum($turnaroundHours) / count($turnaroundHours), 1)
            : 0.0;

        $firstTimeApprovalRate = $roundOneCycles > 0
            ? round(($roundOneApproved / $roundOneCycles) * 100, 1)
            : 100.0;

        // 7. Overall Production Health Score (0 - 100)
        // Weighted composite: On-time (40%), Completion progress (30%), First-time review pass (30%)
        $completionRate = $allTasks->count() > 0
            ? round(($completedTasks->count() / $allTasks->count()) * 100, 1)
            : 0.0;

        $healthScore = round(
            ($onTimeRate * 0.4) + ($completionRate * 0.3) + ($firstTimeApprovalRate * 0.3),
            1
        );

        return [
            'window_days' => $daysWindow,
            'summary' => [
                'total_tasks' => $allTasks->count(),
                'completed_tasks' => $completedTasks->count(),
                'active_tasks' => $allTasks->count() - $completedTasks->count(),
                'completion_rate' => $completionRate,
                'health_score' => $healthScore,
            ],
            'lead_time' => [
                'avg_days' => $avgLeadTime,
                'median_days' => $medianLeadTime,
                'min_days' => $minLeadTime,
                'max_days' => $maxLeadTime,
            ],
            'cycle_time' => [
                'avg_days' => $avgCycleTime,
                'median_days' => $medianCycleTime,
                'min_days' => $minCycleTime,
                'max_days' => $maxCycleTime,
            ],
            'on_time_delivery' => [
                'rate_percentage' => $onTimeRate,
                'on_time_count' => $onTimeCount,
                'late_count' => $lateCount,
                'no_due_date_count' => $noDueDateCount,
                'total_measured' => $measuredDeliveries,
            ],
            'throughput' => [
                'avg_weekly' => $avgWeeklyThroughput,
                'total_recent' => $totalThroughputCompleted,
                'weekly_breakdown' => $weeklyThroughput,
            ],
            'review_turnaround' => [
                'avg_hours' => $avgReviewTurnaroundHours,
                'total_cycles' => $reviewCycles->count(),
                'first_time_approval_rate' => $firstTimeApprovalRate,
                'round_one_cycles' => $roundOneCycles,
                'round_one_approved' => $roundOneApproved,
            ],
        ];
    }

    /**
     * Compute median of an array of numbers
     */
    protected function calculateMedian(array $numbers): float
    {
        sort($numbers);
        $count = count($numbers);
        if ($count === 0) return 0.0;

        $middle = (int) floor($count / 2);
        if ($count % 2 === 1) {
            return (float) $numbers[$middle];
        }

        return round(($numbers[$middle - 1] + $numbers[$middle]) / 2, 1);
    }
}
