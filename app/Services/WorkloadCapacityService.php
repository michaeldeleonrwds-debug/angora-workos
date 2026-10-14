<?php

namespace App\Services;

use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\User;
use Illuminate\Support\Carbon;

class WorkloadCapacityService
{
    /**
     * Calculate workload and resource capacity for a given board.
     *
     * @param KanbanBoard $board
     * @param array $options [
     *     'timeframe' => 'weekly' | 'daily' | 'monthly' | 'custom',
     *     'start_date' => 'Y-m-d',
     *     'end_date' => 'Y-m-d',
     *     'effort_split_mode' => 'equal' | 'full',
     *     'user_id' => int|null,
     * ]
     * @return array
     */
    public function calculateBoardWorkload(KanbanBoard $board, array $options = []): array
    {
        $timeframe = $options['timeframe'] ?? 'weekly';
        $effortSplitMode = $options['effort_split_mode'] ?? 'equal';
        $now = now();

        // 1. Resolve date range
        if (!empty($options['start_date']) && !empty($options['end_date'])) {
            $startDate = Carbon::parse($options['start_date'])->startOfDay();
            $endDate = Carbon::parse($options['end_date'])->endOfDay();
        } elseif ($timeframe === 'daily') {
            $startDate = $now->copy()->startOfDay();
            $endDate = $now->copy()->endOfDay();
        } elseif ($timeframe === 'monthly') {
            $startDate = $now->copy()->startOfMonth();
            $endDate = $now->copy()->endOfMonth();
        } else {
            // weekly
            $startDate = $now->copy()->startOfWeek();
            $endDate = $now->copy()->endOfWeek();
        }

        // 2. Fetch all board tasks with assignees and relationships
        $tasks = $board->tasks()
            ->with(['column', 'group', 'assignee'])
            ->whereNull('parent_id')
            ->get();

        // 3. Get team members (workspace users or active users)
        $workspace = $board->workspace;
        $users = $workspace ? $workspace->users : User::where('status', 'active')->get();
        if ($users->isEmpty()) {
            $users = User::where('status', 'active')->get();
        }

        // Initialize member stats map
        $memberWorkload = [];
        foreach ($users as $user) {
            $weeklyCap = (float) ($user->weekly_capacity_hours ?? 40.0);
            $dailyCap = (float) ($user->daily_capacity_hours ?? 8.0);

            $capacityHours = match ($timeframe) {
                'daily' => $dailyCap,
                'monthly' => $weeklyCap * 4.33,
                default => $weeklyCap,
            };

            $memberWorkload[$user->id] = [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'avatar' => $user->avatar,
                    'weekly_capacity_hours' => $weeklyCap,
                    'daily_capacity_hours' => $dailyCap,
                ],
                'capacity_hours' => round($capacityHours, 1),
                'allocated_hours' => 0.0,
                'completed_hours' => 0.0,
                'active_tasks_count' => 0,
                'completed_tasks_count' => 0,
                'overdue_tasks_count' => 0,
                'utilization_rate' => 0.0,
                'status' => 'underutilized',
                'tasks' => [],
            ];
        }

        $unassignedTasks = [];

        // 4. Process each task
        foreach ($tasks as $task) {
            $assignedUserIds = $this->extractTaskAssigneeIds($task);

            if (empty($assignedUserIds)) {
                $unassignedTasks[] = [
                    'id' => $task->id,
                    'title' => $task->title,
                    'priority' => $task->priority,
                    'estimated_hours' => (float) ($task->estimated_hours ?? $this->defaultHoursForPriority($task->priority)),
                    'due_date' => $task->due_date ? Carbon::parse($task->due_date)->toDateString() : null,
                    'stage' => $task->column?->title ?? 'To Do',
                ];
                continue;
            }

            $rawHours = (float) ($task->estimated_hours ?? $this->defaultHoursForPriority($task->priority));
            $effectiveHoursPerAssignee = ($effortSplitMode === 'equal' && count($assignedUserIds) > 1)
                ? round($rawHours / count($assignedUserIds), 2)
                : $rawHours;

            $isCompleted = !empty($task->completed_at) || $task->column?->isCompletionStatus();
            $isOverdue = !$isCompleted && $task->due_date && Carbon::parse($task->due_date)->isPast();

            foreach ($assignedUserIds as $uid) {
                if (!isset($memberWorkload[$uid])) {
                    $fallbackUser = User::find($uid);
                    if ($fallbackUser) {
                        $weeklyCap = (float) ($fallbackUser->weekly_capacity_hours ?? 40.0);
                        $dailyCap = (float) ($fallbackUser->daily_capacity_hours ?? 8.0);
                        $memberWorkload[$uid] = [
                            'user' => [
                                'id' => $fallbackUser->id,
                                'name' => $fallbackUser->name,
                                'email' => $fallbackUser->email,
                                'role' => $fallbackUser->role,
                                'avatar' => $fallbackUser->avatar,
                                'weekly_capacity_hours' => $weeklyCap,
                                'daily_capacity_hours' => $dailyCap,
                            ],
                            'capacity_hours' => $timeframe === 'daily' ? $dailyCap : $weeklyCap,
                            'allocated_hours' => 0.0,
                            'completed_hours' => 0.0,
                            'active_tasks_count' => 0,
                            'completed_tasks_count' => 0,
                            'overdue_tasks_count' => 0,
                            'utilization_rate' => 0.0,
                            'status' => 'underutilized',
                            'tasks' => [],
                        ];
                    } else {
                        continue;
                    }
                }

                if ($isCompleted) {
                    $memberWorkload[$uid]['completed_tasks_count']++;
                    $memberWorkload[$uid]['completed_hours'] += $effectiveHoursPerAssignee;
                } else {
                    $memberWorkload[$uid]['active_tasks_count']++;
                    $memberWorkload[$uid]['allocated_hours'] += $effectiveHoursPerAssignee;
                    if ($isOverdue) {
                        $memberWorkload[$uid]['overdue_tasks_count']++;
                    }

                    $memberWorkload[$uid]['tasks'][] = [
                        'id' => $task->id,
                        'title' => $task->title,
                        'priority' => $task->priority,
                        'stage' => $task->column?->title ?? 'In Progress',
                        'allocated_hours' => $effectiveHoursPerAssignee,
                        'total_task_hours' => $rawHours,
                        'assignees_count' => count($assignedUserIds),
                        'due_date' => $task->due_date ? Carbon::parse($task->due_date)->toDateString() : null,
                        'is_overdue' => $isOverdue,
                    ];
                }
            }
        }

        // 5. Compute utilization rate & status for all members
        $totalTeamCapacity = 0.0;
        $totalAllocatedHours = 0.0;
        $overallocatedCount = 0;
        $optimalCount = 0;
        $underutilizedCount = 0;

        foreach ($memberWorkload as &$entry) {
            $cap = $entry['capacity_hours'];
            $alloc = $entry['allocated_hours'];
            $entry['allocated_hours'] = round($alloc, 1);
            $entry['completed_hours'] = round($entry['completed_hours'], 1);

            $rate = $cap > 0 ? round(($alloc / $cap) * 100, 1) : 0.0;
            $entry['utilization_rate'] = $rate;

            if ($rate > 100.0) {
                $entry['status'] = 'overallocated';
                $overallocatedCount++;
            } elseif ($rate >= 70.0) {
                $entry['status'] = 'optimal';
                $optimalCount++;
            } else {
                $entry['status'] = 'underutilized';
                $underutilizedCount++;
            }

            $totalTeamCapacity += $cap;
            $totalAllocatedHours += $alloc;
        }
        unset($entry);

        $teamUtilizationRate = $totalTeamCapacity > 0
            ? round(($totalAllocatedHours / $totalTeamCapacity) * 100, 1)
            : 0.0;

        return [
            'timeframe' => $timeframe,
            'effort_split_mode' => $effortSplitMode,
            'date_range' => [
                'start' => $startDate->toDateString(),
                'end' => $endDate->toDateString(),
            ],
            'summary' => [
                'total_capacity_hours' => round($totalTeamCapacity, 1),
                'total_allocated_hours' => round($totalAllocatedHours, 1),
                'team_utilization_rate' => $teamUtilizationRate,
                'overallocated_count' => $overallocatedCount,
                'optimal_count' => $optimalCount,
                'underutilized_count' => $underutilizedCount,
                'unassigned_tasks_count' => count($unassignedTasks),
            ],
            'members' => array_values($memberWorkload),
            'unassigned_tasks' => $unassignedTasks,
        ];
    }

    /**
     * Helper to extract all assigned user IDs (assigned_to + custom multi-people)
     */
    public function extractTaskAssigneeIds(KanbanTask $task): array
    {
        $ids = [];
        if ($task->assigned_to) {
            $ids[] = (int) $task->assigned_to;
        }

        if (!empty($task->custom_values) && is_array($task->custom_values)) {
            foreach ($task->custom_values as $key => $val) {
                if (is_array($val)) {
                    foreach ($val as $subVal) {
                        if (is_numeric($subVal) && (int) $subVal > 0) {
                            $ids[] = (int) $subVal;
                        }
                    }
                }
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Update user weekly / daily capacity hours
     */
    public function updateUserCapacity(User $user, float $weeklyHours, ?float $dailyHours = null): User
    {
        $user->update([
            'weekly_capacity_hours' => $weeklyHours,
            'daily_capacity_hours' => $dailyHours ?? round($weeklyHours / 5, 2),
        ]);

        return $user;
    }

    /**
     * Default hours fallback based on priority
     */
    protected function defaultHoursForPriority(?string $priority): float
    {
        return match ($priority) {
            'Critical', 'Urgent' => 12.0,
            'High' => 8.0,
            'Medium' => 6.0,
            'Low' => 4.0,
            default => 8.0,
        };
    }
}
