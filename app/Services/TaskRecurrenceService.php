<?php

namespace App\Services;

use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskActivity;
use App\Models\TaskRecurrenceLog;
use App\Models\TaskRecurrenceRule;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TaskRecurrenceService
{
    /**
     * Create or update a recurrence rule for a task.
     */
    public function createOrUpdateRule(KanbanTask $task, array $data, ?User $user = null): TaskRecurrenceRule
    {
        $interval = max(1, (int) ($data['interval'] ?? 1));
        $frequency = $data['frequency'] ?? 'weekly';
        $endType = $data['end_type'] ?? 'never';

        if (!in_array($frequency, ['daily', 'weekly', 'monthly', 'custom', 'on_completion'])) {
            throw ValidationException::withMessages(['frequency' => 'Invalid recurrence frequency.']);
        }

        if (!in_array($endType, ['never', 'after_occurrences', 'on_date'])) {
            throw ValidationException::withMessages(['end_type' => 'Invalid recurrence end type.']);
        }

        $workspaceId = $task->board ? $task->board->workspace_id : 1;

        $rule = TaskRecurrenceRule::updateOrCreate(
            ['task_id' => $task->id],
            [
                'workspace_id' => $workspaceId,
                'frequency' => $frequency,
                'interval' => $interval,
                'days_of_week' => isset($data['days_of_week']) && is_array($data['days_of_week']) ? array_values(array_map('intval', $data['days_of_week'])) : null,
                'time_of_day' => !empty($data['time_of_day']) ? substr(trim($data['time_of_day']), 0, 5) : null,
                'end_type' => $endType,
                'max_occurrences' => !empty($data['max_occurrences']) ? max(1, (int) $data['max_occurrences']) : null,
                'end_date' => !empty($data['end_date']) ? Carbon::parse($data['end_date'])->format('Y-m-d') : null,
                'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
                'copy_subtasks' => array_key_exists('copy_subtasks', $data) ? (bool) $data['copy_subtasks'] : true,
                'copy_assignees' => array_key_exists('copy_assignees', $data) ? (bool) $data['copy_assignees'] : true,
                'copy_custom_values' => array_key_exists('copy_custom_values', $data) ? (bool) $data['copy_custom_values'] : true,
                'created_by' => $user?->id ?? $rule?->created_by ?? $task->created_by,
            ]
        );

        // Compute and set next run time
        $nextRun = $this->calculateNextRun($rule, now());
        $rule->update(['next_run_at' => $nextRun]);

        // Link task to rule
        $task->update(['recurrence_rule_id' => $rule->id]);

        // Log activity
        TaskActivityService::log(
            task: $task,
            eventType: 'recurrence_configured',
            description: "Recurrence configured ({$frequency}, interval: {$interval})",
            metadata: [
                'frequency' => $frequency,
                'interval' => $interval,
                'next_run_at' => $nextRun?->toIso8601String(),
            ]
        );

        return $rule->fresh(['task', 'logs']);
    }

    /**
     * Calculate the next execution time for a rule.
     */
    public function calculateNextRun(TaskRecurrenceRule $rule, ?Carbon $from = null): ?Carbon
    {
        if (!$rule->is_active) {
            return null;
        }

        // Check occurrence limit
        if ($rule->end_type === 'after_occurrences' && $rule->max_occurrences !== null) {
            if ($rule->occurrences_count >= $rule->max_occurrences) {
                $rule->update(['is_active' => false]);
                return null;
            }
        }

        $base = $from ? $from->copy() : ($rule->last_run_at ? Carbon::parse($rule->last_run_at) : now());

        $next = null;
        switch ($rule->frequency) {
            case 'daily':
                $next = $base->copy()->addDays($rule->interval);
                break;

            case 'weekly':
                $days = $rule->days_of_week;
                if (!empty($days) && is_array($days)) {
                    // 1 = Monday, 7 = Sunday
                    sort($days);
                    $currentDay = $base->dayOfWeekIso; // 1-7
                    $found = null;
                    foreach ($days as $day) {
                        if ($day > $currentDay) {
                            $found = $day;
                            break;
                        }
                    }
                    if ($found !== null) {
                        $diff = $found - $currentDay;
                        $next = $base->copy()->addDays($diff);
                    } else {
                        // Jump by intervals of weeks to the first configured day
                        $weeksToAdd = max(1, $rule->interval);
                        $firstDay = $days[0];
                        $daysToNextWeekFirstDay = (7 - $currentDay) + $firstDay + (($weeksToAdd - 1) * 7);
                        $next = $base->copy()->addDays($daysToNextWeekFirstDay);
                    }
                } else {
                    $next = $base->copy()->addWeeks($rule->interval);
                }
                break;

            case 'monthly':
                $next = $base->copy()->addMonths($rule->interval);
                break;

            case 'custom':
                $next = $base->copy()->addDays($rule->interval);
                break;

            case 'on_completion':
                // For on_completion, scheduled next run is dynamically set when task is completed
                $next = $base->copy()->addDays($rule->interval);
                break;

            default:
                $next = $base->copy()->addWeeks($rule->interval);
                break;
        }

        if ($rule->time_of_day && $next) {
            $parts = explode(':', $rule->time_of_day);
            $hour = (int) ($parts[0] ?? 9);
            $minute = (int) ($parts[1] ?? 0);
            $next->setTime($hour, $minute, 0);
        }

        // Check end date limit
        if ($rule->end_type === 'on_date' && $rule->end_date) {
            $endDate = Carbon::parse($rule->end_date)->endOfDay();
            if ($next && $next->gt($endDate)) {
                $rule->update(['is_active' => false]);
                return null;
            }
        }

        return $next;
    }

    /**
     * Spawn a new task instance from an active recurrence rule.
     */
    public function spawnNextTask(TaskRecurrenceRule $rule, bool $force = false): ?KanbanTask
    {
        return DB::transaction(function () use ($rule, $force) {
            $rule = TaskRecurrenceRule::lockForUpdate()->find($rule->id);
            if (!$rule || (!$rule->is_active && !$force)) {
                return null;
            }

            // Check end conditions
            if ($rule->end_type === 'after_occurrences' && $rule->max_occurrences !== null) {
                if ($rule->occurrences_count >= $rule->max_occurrences) {
                    $rule->update(['is_active' => false]);
                    return null;
                }
            }

            if ($rule->end_type === 'on_date' && $rule->end_date) {
                if (now()->gt(Carbon::parse($rule->end_date)->endOfDay())) {
                    $rule->update(['is_active' => false]);
                    return null;
                }
            }

            // Idempotency: prevent duplicate execution within 60 seconds
            if (!$force && $rule->last_run_at && Carbon::parse($rule->last_run_at)->diffInSeconds(now()) < 60) {
                return null;
            }

            $sourceTask = KanbanTask::with(['subitems', 'column'])->find($rule->task_id);
            if (!$sourceTask) {
                $rule->update(['is_active' => false]);
                TaskRecurrenceLog::create([
                    'recurrence_rule_id' => $rule->id,
                    'source_task_id' => $rule->task_id,
                    'executed_at' => now(),
                    'status' => 'failed',
                    'notes' => 'Blueprint source task not found or was deleted.',
                ]);
                return null;
            }

            // Determine starting column (prefer first column or To Do)
            $targetColumn = KanbanColumn::where('board_id', $sourceTask->board_id)
                ->where(function ($q) {
                    $q->whereRaw('LOWER(title) LIKE ?', ['%to do%'])
                        ->orWhereRaw('LOWER(title) LIKE ?', ['%todo%'])
                        ->orWhereRaw('LOWER(title) LIKE ?', ['%backlog%']);
                })
                ->orderBy('position')
                ->first()
                ?? KanbanColumn::where('board_id', $sourceTask->board_id)->orderBy('position')->first()
                ?? $sourceTask->column;

            // Calculate schedule dates
            $newStartDate = now()->format('Y-m-d');
            $newDueDate = null;

            if ($sourceTask->start_date && $sourceTask->due_date) {
                $duration = Carbon::parse($sourceTask->start_date)->diffInDays(Carbon::parse($sourceTask->due_date));
                $newDueDate = now()->addDays($duration)->format('Y-m-d');
            } elseif ($sourceTask->due_date) {
                $newDueDate = now()->addDays(max(1, $rule->interval))->format('Y-m-d');
            }

            $newTask = KanbanTask::create([
                'board_id' => $sourceTask->board_id,
                'column_id' => $targetColumn ? $targetColumn->id : $sourceTask->column_id,
                'board_group_id' => $sourceTask->board_group_id ?? $sourceTask->group_id,
                'group_id' => $sourceTask->group_id ?? $sourceTask->board_group_id,
                'title' => $sourceTask->title,
                'description' => $sourceTask->description,
                'priority' => $sourceTask->priority,
                'start_date' => $newStartDate,
                'start_time' => $sourceTask->start_time ?? $rule->time_of_day,
                'due_date' => $newDueDate,
                'due_time' => $sourceTask->due_time ?? $rule->time_of_day,
                'estimated_hours' => $sourceTask->estimated_hours,
                'progress' => 0,
                'assigned_to' => $rule->copy_assignees ? $sourceTask->assigned_to : null,
                'custom_values' => $rule->copy_custom_values ? $sourceTask->custom_values : null,
                'labels' => $sourceTask->labels,
                'recurrence_rule_id' => $rule->id,
                'created_by' => $rule->created_by ?? $sourceTask->created_by,
                'position' => KanbanTask::where('board_id', $sourceTask->board_id)->max('position') + 1,
            ]);

            // Copy subtasks if requested
            if ($rule->copy_subtasks && $sourceTask->subitems->isNotEmpty()) {
                foreach ($sourceTask->subitems as $subitem) {
                    KanbanTask::create([
                        'board_id' => $newTask->board_id,
                        'column_id' => $subitem->column_id,
                        'board_group_id' => $newTask->board_group_id,
                        'group_id' => $newTask->group_id,
                        'parent_id' => $newTask->id,
                        'title' => $subitem->title,
                        'description' => $subitem->description,
                        'priority' => $subitem->priority,
                        'progress' => 0,
                        'assigned_to' => $rule->copy_assignees ? $subitem->assigned_to : null,
                        'custom_values' => $rule->copy_custom_values ? $subitem->custom_values : null,
                        'created_by' => $rule->created_by ?? $newTask->created_by,
                        'position' => $subitem->position,
                    ]);
                }
            }

            // Record execution log
            TaskRecurrenceLog::create([
                'recurrence_rule_id' => $rule->id,
                'source_task_id' => $sourceTask->id,
                'generated_task_id' => $newTask->id,
                'executed_at' => now(),
                'status' => 'success',
                'notes' => "Spawned task #{$newTask->id} from recurring schedule.",
            ]);

            // Update rule statistics
            $newCount = $rule->occurrences_count + 1;
            $rule->occurrences_count = $newCount;
            $rule->last_run_at = now();
            $nextRun = $this->calculateNextRun($rule, now());

            $rule->update([
                'occurrences_count' => $newCount,
                'last_run_at' => now(),
                'next_run_at' => $nextRun,
            ]);

            // Log activity on new task
            TaskActivityService::log(
                task: $newTask,
                eventType: 'task_spawned_from_recurrence',
                description: "Task spawned from recurring blueprint #{$sourceTask->id} (occurrence #{$newCount})",
                metadata: [
                    'source_task_id' => $sourceTask->id,
                    'recurrence_rule_id' => $rule->id,
                    'occurrence_number' => $newCount,
                ]
            );

            return $newTask;
        });
    }

    /**
     * Process all due recurrence rules (called via Artisan command / cron).
     */
    public function processDueRules(): int
    {
        $dueRules = TaskRecurrenceRule::where('is_active', true)
            ->whereNotNull('next_run_at')
            ->where('next_run_at', '<=', now())
            ->get();

        $spawnedCount = 0;
        foreach ($dueRules as $rule) {
            $task = $this->spawnNextTask($rule);
            if ($task) {
                $spawnedCount++;
            }
        }

        return $spawnedCount;
    }

    /**
     * Handle trigger when a task is completed (for frequency = 'on_completion').
     */
    public function handleTaskCompleted(KanbanTask $task): ?KanbanTask
    {
        $rule = $task->recurrenceRule;
        if (!$rule && $task->recurrence_rule_id) {
            $rule = TaskRecurrenceRule::find($task->recurrence_rule_id);
        }

        if ($rule && $rule->is_active && $rule->frequency === 'on_completion') {
            return $this->spawnNextTask($rule);
        }

        return null;
    }

    /**
     * Pause or resume a recurrence rule.
     */
    public function togglePause(TaskRecurrenceRule $rule, ?User $user = null): TaskRecurrenceRule
    {
        $newState = !$rule->is_active;
        $rule->is_active = $newState;
        $nextRun = $newState ? $this->calculateNextRun($rule, now()) : null;

        $rule->update([
            'is_active' => $newState,
            'next_run_at' => $nextRun,
        ]);

        if ($rule->task) {
            TaskActivityService::log(
                task: $rule->task,
                eventType: $newState ? 'recurrence_resumed' : 'recurrence_paused',
                description: $newState ? 'Recurrence schedule resumed' : 'Recurrence schedule paused',
                metadata: ['is_active' => $newState]
            );
        }

        return $rule->fresh(['task', 'logs']);
    }

    /**
     * Delete a recurrence rule.
     */
    public function deleteRule(TaskRecurrenceRule $rule, ?User $user = null): void
    {
        if ($rule->task) {
            TaskActivityService::log(
                task: $rule->task,
                eventType: 'recurrence_deleted',
                description: 'Recurrence schedule removed',
                metadata: ['rule_id' => $rule->id]
            );
        }

        KanbanTask::where('recurrence_rule_id', $rule->id)
            ->where('id', $rule->task_id)
            ->update(['recurrence_rule_id' => null]);

        $rule->delete();
    }
}
