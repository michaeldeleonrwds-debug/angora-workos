<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\AutomationExecution;
use App\Models\BoardAutomation;
use App\Models\BoardGroup;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutomationEngineService
{
    /**
     * Recursion prevention safeguard stack.
     * Keeps track of [taskId_actionType_timestamp] to break cascading infinite loops.
     */
    protected static array $executionTrace = [];
    protected const MAX_EXECUTION_DEPTH = 5;

    /**
     * Entry point: Trigger matching automations on a board for a given event.
     */
    public function dispatch(
        string $triggerType,
        KanbanTask $task,
        array $eventContext = [],
        ?User $triggeredBy = null
    ): array {
        $board = $task->board;
        if (!$board) {
            return [];
        }

        // 1. Fetch all active automations on this board matching this trigger
        $automations = BoardAutomation::where('board_id', $board->id)
            ->where('is_active', true)
            ->where('trigger_type', $triggerType)
            ->get();

        $results = [];

        foreach ($automations as $automation) {
            $results[] = $this->evaluateAndExecute($automation, $task, $eventContext, $triggeredBy);
        }

        return $results;
    }

    /**
     * Evaluates a single automation and executes its actions if conditions match.
     */
    public function evaluateAndExecute(
        BoardAutomation $automation,
        KanbanTask $task,
        array $eventContext = [],
        ?User $triggeredBy = null
    ): array {
        $startTime = microtime(true);
        $correlationKey = "{$automation->id}_{$task->id}_{$automation->trigger_type}";

        // Recursion guard: check depth
        $currentDepth = static::$executionTrace[$correlationKey] ?? 0;
        if ($currentDepth >= self::MAX_EXECUTION_DEPTH) {
            Log::warning("Automation recursion threshold hit for {$correlationKey}. Aborting execution.");
            return [
                'status' => 'skipped',
                'reason' => 'Recursion threshold exceeded',
            ];
        }

        static::$executionTrace[$correlationKey] = $currentDepth + 1;

        try {
            // 1. Evaluate Trigger Config filters (e.g. from_status, to_status)
            if (!$this->matchesTriggerConfig($automation->trigger_config ?? [], $eventContext, $task)) {
                return ['status' => 'skipped', 'reason' => 'Trigger config mismatch'];
            }

            // 2. Evaluate IF conditions
            if (!$this->evaluateConditions($automation->conditions ?? [], $task, $triggeredBy)) {
                return ['status' => 'skipped', 'reason' => 'Conditions not met'];
            }

            // 3. Execute actions inside database transaction with isolation
            $actionsAttempted = [];
            $actionsSucceeded = [];
            $actionsFailed = [];

            DB::beginTransaction();

            foreach ($automation->actions ?? [] as $actionDef) {
                $actionType = $actionDef['type'] ?? 'unknown';
                $actionsAttempted[] = $actionDef;

                try {
                    $this->executeAction($actionDef, $task, $triggeredBy);
                    $actionsSucceeded[] = $actionDef;
                } catch (\Throwable $e) {
                    $actionsFailed[] = [
                        'action' => $actionDef,
                        'error' => $e->getMessage(),
                    ];
                    Log::error("Automation action {$actionType} failed: " . $e->getMessage());
                }
            }

            DB::commit();

            $durationMs = (int) round((microtime(true) - $startTime) * 1000);
            $executionStatus = count($actionsFailed) === 0 ? 'success' : (count($actionsSucceeded) > 0 ? 'partial' : 'failed');

            // 4. Record execution log
            $execution = AutomationExecution::create([
                'automation_id' => $automation->id,
                'board_id' => $automation->board_id,
                'task_id' => $task->id,
                'triggered_by_user_id' => $triggeredBy?->id ?? auth()->id(),
                'trigger_event' => $automation->trigger_type,
                'status' => $executionStatus,
                'actions_attempted' => $actionsAttempted,
                'actions_succeeded' => $actionsSucceeded,
                'actions_failed' => $actionsFailed,
                'error_message' => count($actionsFailed) > 0 ? json_encode($actionsFailed) : null,
                'execution_duration_ms' => $durationMs,
            ]);

            // 5. Update automation execution counters
            $automation->increment('execution_count');
            $automation->update(['last_executed_at' => now()]);

            return [
                'status' => $executionStatus,
                'execution_id' => $execution->id,
                'duration_ms' => $durationMs,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Automation engine fatal execution error: " . $e->getMessage());

            AutomationExecution::create([
                'automation_id' => $automation->id,
                'board_id' => $automation->board_id,
                'task_id' => $task->id,
                'triggered_by_user_id' => $triggeredBy?->id ?? auth()->id(),
                'trigger_event' => $automation->trigger_type,
                'status' => 'failed',
                'actions_attempted' => $automation->actions ?? [],
                'actions_succeeded' => [],
                'actions_failed' => $automation->actions ?? [],
                'error_message' => $e->getMessage(),
                'execution_duration_ms' => (int) round((microtime(true) - $startTime) * 1000),
            ]);

            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
            ];
        } finally {
            // Decrement recursion count
            static::$executionTrace[$correlationKey] = max(0, (static::$executionTrace[$correlationKey] ?? 1) - 1);
        }
    }

    /**
     * Verify trigger-specific parameters match.
     */
    protected function matchesTriggerConfig(array $config, array $context, KanbanTask $task): bool
    {
        if (empty($config)) {
            return true;
        }

        // e.g. status_changed with to_status or from_status
        if (isset($config['to_status'])) {
            $currentStatus = $task->column?->title;
            if (strtolower(trim($currentStatus ?? '')) !== strtolower(trim($config['to_status']))) {
                return false;
            }
        }

        if (isset($config['from_status']) && isset($context['prev_column'])) {
            if (strtolower(trim($context['prev_column'])) !== strtolower(trim($config['from_status']))) {
                return false;
            }
        }

        // e.g. priority_changed with to_priority
        if (isset($config['to_priority'])) {
            if ($task->priority !== $config['to_priority']) {
                return false;
            }
        }

        // e.g. assigned_to
        if (isset($config['assigned_to'])) {
            if ((int)$task->assigned_to !== (int)$config['assigned_to']) {
                return false;
            }
        }

        return true;
    }

    /**
     * Evaluates nested IF conditions (supports AND/OR logic).
     */
    public function evaluateConditions(array $conditions, KanbanTask $task, ?User $triggeredBy = null): bool
    {
        if (empty($conditions)) {
            return true;
        }

        // Standard format: [ { field: 'priority', operator: 'equals', value: 'Urgent' }, ... ]
        // Condition group logic defaults to 'AND' unless 'match_type' => 'OR' is specified
        $matchType = strtolower($conditions['match_type'] ?? 'and');
        $rules = $conditions['rules'] ?? $conditions;

        if (!is_array($rules)) {
            return true;
        }

        foreach ($rules as $rule) {
            if (!is_array($rule) || !isset($rule['field'])) {
                continue;
            }

            $rulePasses = $this->evaluateSingleRule($rule, $task, $triggeredBy);

            if ($matchType === 'or' && $rulePasses) {
                return true;
            }

            if ($matchType === 'and' && !$rulePasses) {
                return false;
            }
        }

        return $matchType !== 'or';
    }

    protected function evaluateSingleRule(array $rule, KanbanTask $task, ?User $triggeredBy = null): bool
    {
        $field = $rule['field'];
        $op = strtolower($rule['operator'] ?? 'equals');
        $targetValue = $rule['value'] ?? null;

        // Resolve actual value from task
        $actualValue = match ($field) {
            'status' => $task->column?->title,
            'priority' => $task->priority,
            'assignee', 'assigned_to' => $task->assigned_to,
            'group' => $task->group?->title,
            'title' => $task->title,
            'progress' => $task->progress,
            'department' => $task->board?->department,
            'due_date' => $task->due_date,
            'start_date' => $task->start_date,
            'current_user' => $triggeredBy?->id ?? auth()->id(),
            default => $task->custom_values[$field] ?? null,
        };

        return match ($op) {
            'equals', '==' => strtolower((string)$actualValue) === strtolower((string)$targetValue),
            'not_equals', '!=' => strtolower((string)$actualValue) !== strtolower((string)$targetValue),
            'contains' => str_contains(strtolower((string)$actualValue), strtolower((string)$targetValue)),
            'does_not_contain' => !str_contains(strtolower((string)$actualValue), strtolower((string)$targetValue)),
            'is_empty' => empty($actualValue),
            'is_not_empty' => !empty($actualValue),
            'greater_than', '>' => (float)$actualValue > (float)$targetValue,
            'less_than', '<' => (float)$actualValue < (float)$targetValue,
            'before_date' => $actualValue && Carbon::parse($actualValue)->isBefore(Carbon::parse($targetValue)),
            'after_date' => $actualValue && Carbon::parse($actualValue)->isAfter(Carbon::parse($targetValue)),
            default => true,
        };
    }

    /**
     * Executes an individual automation action.
     */
    protected function executeAction(array $action, KanbanTask $task, ?User $triggeredBy = null): void
    {
        $type = $action['type'] ?? '';

        switch ($type) {
            case 'change_status':
            case 'move_stage':
                $stageTitle = $action['status'] ?? $action['stage'] ?? null;
                if ($stageTitle) {
                    $col = KanbanColumn::where('board_id', $task->board_id)
                        ->whereRaw('LOWER(title) = ?', [strtolower(trim($stageTitle))])
                        ->first();
                    if ($col && !$col->is_archived) {
                        $task->applyWorkflowStatus($col);
                        $task->save();
                    }
                }
                break;

            case 'change_priority':
                if (!empty($action['priority'])) {
                    $task->priority = $action['priority'];
                    $task->save();
                }
                break;

            case 'assign_user':
                $userId = $action['user_id'] ?? null;
                if ($userId) {
                    $task->assigned_to = (int)$userId;
                    $task->save();
                }
                break;

            case 'remove_assignee':
                $task->assigned_to = null;
                $task->save();
                break;

            case 'move_to_group':
                $groupTitle = $action['group_title'] ?? null;
                if ($groupTitle) {
                    $grp = BoardGroup::where('board_id', $task->board_id)
                        ->whereRaw('LOWER(title) = ?', [strtolower(trim($groupTitle))])
                        ->first();
                    if ($grp) {
                        $task->group_id = $grp->id;
                        $task->save();
                    }
                }
                break;

            case 'create_subitem':
                if (!empty($action['title'])) {
                    KanbanTask::create([
                        'board_id' => $task->board_id,
                        'group_id' => $task->group_id,
                        'parent_id' => $task->id,
                        'column_id' => $task->column_id,
                        'title' => $action['title'],
                        'assigned_to' => $action['assigned_to'] ?? $task->assigned_to,
                        'priority' => $action['priority'] ?? 'Medium',
                        'created_by' => $triggeredBy?->id ?? auth()->id() ?? 1,
                        'position' => $task->subitems()->count(),
                    ]);
                    $task->recalculateProgressFromSubtasks();
                }
                break;

            case 'create_task':
                if (!empty($action['title'])) {
                    KanbanTask::create([
                        'board_id' => $action['board_id'] ?? $task->board_id,
                        'group_id' => $task->group_id,
                        'column_id' => $task->column_id,
                        'title' => $action['title'],
                        'priority' => $action['priority'] ?? 'Medium',
                        'assigned_to' => $action['assigned_to'] ?? null,
                        'due_date' => $action['due_date'] ?? null,
                        'created_by' => $triggeredBy?->id ?? auth()->id() ?? 1,
                        'position' => KanbanTask::where('board_id', $task->board_id)->count(),
                    ]);
                }
                break;

            case 'set_deadline':
                if (!empty($action['days_from_now'])) {
                    $task->due_date = Carbon::now()->addDays((int)$action['days_from_now'])->format('Y-m-d');
                    $task->save();
                } elseif (!empty($action['due_date'])) {
                    $task->due_date = $action['due_date'];
                    $task->save();
                }
                break;

            case 'add_comment':
                if (!empty($action['message'])) {
                    KanbanComment::create([
                        'task_id' => $task->id,
                        'user_id' => $triggeredBy?->id ?? auth()->id() ?? 1,
                        'message' => $action['message'],
                    ]);
                }
                break;

            case 'notify_user':
            case 'notify_assignee':
                $recipientId = match ($type) {
                    'notify_assignee' => $task->assigned_to,
                    'notify_creator' => $task->created_by,
                    default => $action['user_id'] ?? $task->assigned_to,
                };

                if ($recipientId) {
                    SystemNotification::create([
                        'user_id' => $recipientId,
                        'title' => $action['title'] ?? "Task Update: {$task->title}",
                        'message' => $action['message'] ?? "Automation triggered update on item: {$task->title}",
                        'type' => 'info',
                        'link' => "/kanban?board={$task->board_id}&item={$task->id}",
                        'is_read' => false,
                    ]);
                }
                break;

            case 'create_audit_event':
                AuditLog::log(
                    action: 'AUTOMATION_ACTION_EXECUTED',
                    department: $task->board?->department ?? 'Operations',
                    entityType: 'KanbanTask',
                    entityId: $task->id,
                    description: $action['description'] ?? "Automation executed on task '{$task->title}'"
                );
                break;

            case 'cross_board_update':
                $this->executeCrossBoardUpdate($action, $task, $triggeredBy);
                break;

            case 'notify_connected_items':
                $this->executeNotifyConnectedItems($action, $task);
                break;

            default:
                Log::info("Unhandled automation action: {$type}");
                break;
        }
    }

    /**
     * Cross-board update action: update fields on connected/mirrored items.
     */
    protected function executeCrossBoardUpdate(array $action, KanbanTask $task, ?User $triggeredBy = null): void
    {
        $targetField = $action['target_field'] ?? 'status';
        $targetValue = $action['target_value'] ?? null;
        $connectColKey = $action['column_key'] ?? null;

        $query = \App\Models\BoardItemRelationship::where('source_task_id', $task->id);
        if ($connectColKey) {
            $query->where('column_key', $connectColKey);
        }
        $connectedRels = $query->with('targetTask')->get();

        foreach ($connectedRels as $rel) {
            $targetTask = $rel->targetTask;
            if (!$targetTask) continue;

            if ($targetField === 'status' && !empty($targetValue)) {
                $targetCol = KanbanColumn::where('board_id', $targetTask->board_id)
                    ->where(function ($q) use ($targetValue) {
                        $q->where('title', $targetValue)
                            ->orWhereRaw('LOWER(title) LIKE ?', ['%' . strtolower($targetValue) . '%']);
                    })
                    ->first();
                if ($targetCol && !$targetCol->is_archived) {
                    $targetTask->applyWorkflowStatus($targetCol);
                    $targetTask->save();
                }
            } elseif ($targetField === 'priority') {
                $targetTask->priority = $targetValue;
                $targetTask->save();
            } elseif ($targetField === 'progress') {
                $targetTask->progress = (int) $targetValue;
                $targetTask->save();
            }
        }
    }

    /**
     * Notify assignees/collaborators on connected boards.
     */
    protected function executeNotifyConnectedItems(array $action, KanbanTask $task): void
    {
        $connectedRels = \App\Models\BoardItemRelationship::where('source_task_id', $task->id)
            ->with('targetTask')
            ->get();

        foreach ($connectedRels as $rel) {
            $targetTask = $rel->targetTask;
            if (!$targetTask || !$targetTask->assigned_to) continue;

            SystemNotification::create([
                'user_id' => $targetTask->assigned_to,
                'title' => $action['title'] ?? "Connected Work Update on '{$task->title}'",
                'message' => $action['message'] ?? "Item '{$task->title}' updated on board {$task->board?->title}",
                'type' => 'cross_board_update',
                'link' => "/kanban?board={$targetTask->board_id}&item={$targetTask->id}",
            ]);
        }
    }

    /**
     * Cross-department action dispatcher (Marketing, HR, Production, Operations).
     */
    protected function executeCrossDepartmentAction(array $action, KanbanTask $task): void
    {
        $targetDept = $action['department'] ?? 'Operations';
        $eventTitle = $action['title'] ?? "Dispatched action from {$task->title}";

        AuditLog::log(
            action: 'CROSS_DEPT_AUTOMATION',
            department: $targetDept,
            entityType: 'KanbanTask',
            entityId: $task->id,
            description: "Cross-department automation [{$targetDept}]: {$eventTitle}"
        );
    }

    /**
     * Run scheduled / recurring automations (e.g. overdue checks, recurring task generators, and deadline reminders).
     */
    public function runScheduledAutomations(): int
    {
        $nowUtc = Carbon::now('UTC');
        $processedCount = 0;

        // 1. Process Due Date Arrived & Overdue Automations with exact time-awareness
        $overdueAutomations = BoardAutomation::where('is_active', true)
            ->whereIn('trigger_type', ['due_date_arrives', 'task_overdue'])
            ->get();

        foreach ($overdueAutomations as $auto) {
            $tasks = KanbanTask::where('board_id', $auto->board_id)
                ->whereNull('completed_at')
                ->where('progress', '<', 100)
                ->whereNotNull('due_date')
                ->get();

            foreach ($tasks as $task) {
                $dueUtc = $task->getDueDateTimeUtc();
                if ($dueUtc && $nowUtc->gte($dueUtc)) {
                    // Check if already executed for this task and automation today or recently
                    $alreadyLogged = AutomationExecution::where('automation_id', $auto->id)
                        ->where('task_id', $task->id)
                        ->where('created_at', '>=', $nowUtc->copy()->subHours(24))
                        ->exists();

                    if (!$alreadyLogged) {
                        $this->evaluateAndExecute($auto, $task, ['overdue' => true]);
                        $processedCount++;
                    }
                }
            }
        }

        // 2. Process Deadline Reminders (Database-backed, idempotent)
        $processedCount += $this->processTaskReminders();

        // 3. Process Recurring Schedule Automations (e.g. Every Monday or Daily)
        $recurringAutomations = BoardAutomation::where('is_active', true)
            ->where('trigger_type', 'recurring_schedule')
            ->get();

        foreach ($recurringAutomations as $auto) {
            $cfg = $auto->trigger_config ?? [];
            $frequency = $cfg['frequency'] ?? 'daily'; // daily, weekly, monthly

            // Check if already executed today
            $alreadyRunToday = $auto->last_executed_at && $auto->last_executed_at->isToday();
            if ($alreadyRunToday) {
                continue;
            }

            if ($frequency === 'weekly') {
                $dayOfWeek = (int)($cfg['day_of_week'] ?? 1); // 1 = Monday
                if ($nowUtc->dayOfWeekIso !== $dayOfWeek) {
                    continue;
                }
            }

            // Create recurring task template if defined
            $firstTask = KanbanTask::where('board_id', $auto->board_id)->first();
            if ($firstTask) {
                $this->evaluateAndExecute($auto, $firstTask, ['recurring' => true]);
                $processedCount++;
            }
        }

        return $processedCount;
    }

    /**
     * Process database-backed reminders with strict idempotency.
     */
    public function processTaskReminders(): int
    {
        $nowUtc = Carbon::now('UTC');
        $remindersCount = 0;

        // A. Tasks with reminder_lead_minutes configured directly on task
        $tasksWithLead = KanbanTask::whereNotNull('due_date')
            ->whereNotNull('reminder_lead_minutes')
            ->whereNull('completed_at')
            ->where(function ($q) {
                $q->whereNull('progress')->orWhere('progress', '<', 100);
            })
            ->whereNull('reminder_sent_at')
            ->with(['assignee', 'creator'])
            ->get();

        foreach ($tasksWithLead as $task) {
            $dueUtc = $task->getDueDateTimeUtc();
            if (!$dueUtc) continue;

            $leadMinutes = (int) $task->reminder_lead_minutes;
            $alertTimeUtc = $dueUtc->copy()->subMinutes($leadMinutes);

            if ($nowUtc->gte($alertTimeUtc)) {
                $recipientId = $task->assigned_to ?? $task->created_by;
                if ($recipientId) {
                    // Check duplicate prevention in SystemNotification
                    $recentAlertExists = SystemNotification::where('user_id', $recipientId)
                        ->where('type', 'task_reminder')
                        ->where('link', 'like', "%item={$task->id}%")
                        ->where('created_at', '>=', $nowUtc->copy()->subHours(12))
                        ->exists();

                    if (!$recentAlertExists) {
                        $timeDesc = $leadMinutes === 0 ? "is due now" : "is due in {$leadMinutes} minutes";
                        SystemNotification::create([
                            'user_id' => $recipientId,
                            'title' => "Deadline Reminder: {$task->title}",
                            'message' => "Task '{$task->title}' {$timeDesc} ({$task->due_date}" . ($task->due_time ? " at {$task->due_time}" : "") . ").",
                            'type' => 'task_reminder',
                            'link' => "/kanban?board={$task->board_id}&item={$task->id}",
                            'is_read' => false,
                        ]);
                        $remindersCount++;
                    }
                }

                $task->update(['reminder_sent_at' => $nowUtc]);
            }
        }

        // B. Process task_reminders table queue
        $pendingReminders = \App\Models\TaskReminder::where('status', 'pending')
            ->where('scheduled_for', '<=', $nowUtc)
            ->with(['task', 'user'])
            ->get();

        foreach ($pendingReminders as $reminder) {
            $task = $reminder->task;
            $user = $reminder->user;

            if (!$task || !$user || $task->completed_at || ($task->progress ?? 0) === 100) {
                $reminder->update(['status' => 'cancelled']);
                continue;
            }

            // Check if notification already created
            $alreadySent = SystemNotification::where('user_id', $user->id)
                ->where('type', 'task_reminder')
                ->where('link', 'like', "%item={$task->id}%")
                ->where('created_at', '>=', $nowUtc->copy()->subHours(6))
                ->exists();

            if (!$alreadySent) {
                SystemNotification::create([
                    'user_id' => $user->id,
                    'title' => "Reminder: {$task->title}",
                    'message' => "Scheduled reminder for item '{$task->title}' (Due: {$task->due_date}" . ($task->due_time ? " {$task->due_time}" : "") . ").",
                    'type' => 'task_reminder',
                    'link' => "/kanban?board={$task->board_id}&item={$task->id}",
                    'is_read' => false,
                ]);
                $remindersCount++;
            }

            $reminder->update([
                'status' => 'sent',
                'sent_at' => $nowUtc,
            ]);
        }

        return $remindersCount;
    }
}
