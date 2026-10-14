<?php

namespace App\Services;

use App\Events\TaskUpdatedEvent;
use App\Models\KanbanTask;
use App\Models\TaskDependency;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class TaskDependencyService
{
    /**
     * Establish a dependency or relationship between two tasks.
     * Supported relationship types:
     * - 'blocks': $task blocks $targetTaskId ($targetTaskId cannot proceed until $task is done)
     * - 'blocked_by': $task is blocked by $targetTaskId ($task cannot proceed until $targetTaskId is done)
     * - 'related_to': symmetric association between $task and $targetTaskId
     */
    public function addDependency(
        KanbanTask $task,
        int $targetTaskId,
        string $relationshipType,
        User $user,
        ?int $lagDays = 0,
        string $dependencyType = 'finish_to_start'
    ): TaskDependency {
        // 1. Prevent self-dependencies
        if ((int) $task->id === (int) $targetTaskId) {
            throw ValidationException::withMessages([
                'target_task_id' => 'A task cannot depend on or relate to itself.',
            ]);
        }

        // 2. Fetch target task and verify existence
        $targetTask = KanbanTask::with('board')->find($targetTaskId);
        if (!$targetTask) {
            throw ValidationException::withMessages([
                'target_task_id' => 'Target task does not exist.',
            ]);
        }

        // 3. Authorization check on both tasks
        if (Gate::forUser($user)->denies('update', $task)) {
            abort(403, 'Unauthorized to update this task.');
        }
        if (Gate::forUser($user)->denies('view', $targetTask)) {
            abort(403, 'Unauthorized to access target task.');
        }

        // 4. Workspace isolation: both tasks must share the same workspace
        $taskWorkspaceId = $task->board?->workspace_id;
        $targetWorkspaceId = $targetTask->board?->workspace_id;

        if ($taskWorkspaceId && $targetWorkspaceId && (int) $taskWorkspaceId !== (int) $targetWorkspaceId) {
            throw ValidationException::withMessages([
                'target_task_id' => 'Cross-workspace dependencies are strictly prohibited.',
            ]);
        }

        $workspaceId = $taskWorkspaceId ?: $targetWorkspaceId;

        // 5. Canonical mapping:
        // For 'blocks': Task A blocks Task B -> B is blocked by A ($task_id = B, $depends_on_task_id = A, rel = 'blocked_by')
        // For 'blocked_by': Task A is blocked by Task B -> A is blocked by B ($task_id = A, $depends_on_task_id = B, rel = 'blocked_by')
        // For 'related_to': Symmetric -> ($task_id = min(A,B), $depends_on_task_id = max(A,B), rel = 'related_to')
        if ($relationshipType === 'blocks') {
            $successorId = (int) $targetTaskId;
            $predecessorId = (int) $task->id;
            $canonicalRel = 'blocked_by';
        } elseif ($relationshipType === 'blocked_by') {
            $successorId = (int) $task->id;
            $predecessorId = (int) $targetTaskId;
            $canonicalRel = 'blocked_by';
        } elseif ($relationshipType === 'related_to') {
            $successorId = min((int) $task->id, (int) $targetTaskId);
            $predecessorId = max((int) $task->id, (int) $targetTaskId);
            $canonicalRel = 'related_to';
        } else {
            throw ValidationException::withMessages([
                'relationship_type' => 'Invalid relationship type provided.',
            ]);
        }

        // 6. Circular dependency check for blocking dependencies
        if ($canonicalRel === 'blocked_by') {
            // Successor depends on Predecessor.
            // Would adding (successor -> predecessor) create a directed cycle?
            // Cycle occurs if predecessor already depends on successor directly or indirectly.
            if ($this->hasDirectedPath($predecessorId, $successorId)) {
                throw ValidationException::withMessages([
                    'target_task_id' => 'Circular dependency detected. A task cannot directly or indirectly block a task it depends on.',
                ]);
            }
        }

        // 7. Check for duplicate or inverse conflict
        $existing = TaskDependency::where('task_id', $successorId)
            ->where('depends_on_task_id', $predecessorId)
            ->first();

        if ($existing) {
            $existing->update([
                'relationship_type' => $canonicalRel,
                'dependency_type' => $dependencyType,
                'lag_days' => $lagDays ?? 0,
            ]);
            $dependency = $existing;
        } else {
            $dependency = TaskDependency::create([
                'workspace_id' => $workspaceId,
                'task_id' => $successorId,
                'depends_on_task_id' => $predecessorId,
                'relationship_type' => $canonicalRel,
                'dependency_type' => $dependencyType,
                'lag_days' => $lagDays ?? 0,
                'created_by' => $user->id,
            ]);
        }

        // 8. Log activity
        $relLabel = match ($relationshipType) {
            'blocks' => 'blocking',
            'blocked_by' => 'blocker dependency on',
            'related_to' => 'relation to',
        };
        TaskActivityService::log(
            task: $task,
            eventType: 'dependency_added',
            description: "{$user->name} added {$relLabel} '{$targetTask->title}'",
            metadata: [
                'target_id' => $targetTask->id,
                'target_title' => $targetTask->title,
                'relationship_type' => $relationshipType,
                'lag_days' => $lagDays,
            ]
        );

        TaskUpdatedEvent::dispatch($task, 'dependency_added', $user->id);
        TaskUpdatedEvent::dispatch($targetTask, 'dependency_added', $user->id);

        return $dependency;
    }

    /**
     * Remove an existing dependency.
     */
    public function removeDependency(TaskDependency $dependency, User $user): bool
    {
        $task = $dependency->task;
        $targetTask = $dependency->dependencyTask;

        if ($task && Gate::forUser($user)->denies('update', $task)) {
            abort(403, 'Unauthorized to remove this dependency.');
        }

        $targetTitle = $targetTask?->title ?? "#{$dependency->depends_on_task_id}";
        $dependency->delete();

        if ($task) {
            TaskActivityService::log(
                task: $task,
                eventType: 'dependency_removed',
                description: "{$user->name} removed dependency with '{$targetTitle}'",
                metadata: [
                    'target_id' => $dependency->depends_on_task_id,
                    'target_title' => $targetTitle,
                ]
            );
            TaskUpdatedEvent::dispatch($task, 'dependency_removed', $user->id);
        }

        if ($targetTask) {
            TaskUpdatedEvent::dispatch($targetTask, 'dependency_removed', $user->id);
        }

        return true;
    }

    /**
     * Check if a directed dependency path exists from startTaskId to endTaskId.
     * Edge: A -> B means A is blocked by B (A depends on B).
     */
    public function hasDirectedPath(int $startTaskId, int $endTaskId, array &$visited = []): bool
    {
        if ($startTaskId === $endTaskId) {
            return true;
        }

        if (isset($visited[$startTaskId])) {
            return false;
        }
        $visited[$startTaskId] = true;

        // Find all tasks that $startTaskId depends on (where task_id = startTaskId and rel != 'related_to')
        $directPredecessors = TaskDependency::where('task_id', $startTaskId)
            ->where('relationship_type', '!=', 'related_to')
            ->pluck('depends_on_task_id')
            ->all();

        foreach ($directPredecessors as $nextId) {
            if ($this->hasDirectedPath((int) $nextId, $endTaskId, $visited)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Compute whether a task is currently blocked by any unfinished predecessor.
     */
    public function isTaskBlocked(KanbanTask $task): bool
    {
        if ($task->completed_at !== null || $task->column?->isCompletionStatus()) {
            return false;
        }

        $blockers = TaskDependency::where('task_id', $task->id)
            ->where('relationship_type', '!=', 'related_to')
            ->with(['dependencyTask.column'])
            ->get();

        foreach ($blockers as $dep) {
            $t = $dep->dependencyTask;
            if ($t) {
                $isDone = $t->completed_at !== null || $t->column?->isCompletionStatus();
                if (!$isDone) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Fetch formatted dependencies for a task:
     * - 'blocked_by': tasks that this task is waiting on
     * - 'blocks': tasks waiting on this task
     * - 'related': symmetrically associated tasks
     */
    public function getTaskDependenciesSummary(KanbanTask $task): array
    {
        // 1. Blocked By (task_id = this task)
        $blockedByRecords = TaskDependency::where('task_id', $task->id)
            ->where('relationship_type', '!=', 'related_to')
            ->with(['dependencyTask.column', 'dependencyTask.assignee'])
            ->get()
            ->map(function ($d) {
                $t = $d->dependencyTask;
                $isDone = $t && ($t->completed_at !== null || $t->column?->isCompletionStatus());
                return [
                    'id' => $d->id,
                    'task_id' => $t?->id,
                    'title' => $t?->title ?? 'Unknown task',
                    'status' => $t?->column?->title ?? 'Pending',
                    'status_color' => $t?->column?->color ?? '#94A3B8',
                    'due_date' => $t?->due_date,
                    'is_completed' => $isDone,
                    'lag_days' => $d->lag_days,
                    'dependency_type' => $d->dependency_type,
                    'assignee' => $t?->assignee ? ['id' => $t->assignee->id, 'name' => $t->assignee->name] : null,
                ];
            });

        // 2. Blocks (depends_on_task_id = this task)
        $blocksRecords = TaskDependency::where('depends_on_task_id', $task->id)
            ->where('relationship_type', '!=', 'related_to')
            ->with(['task.column', 'task.assignee'])
            ->get()
            ->map(function ($d) {
                $t = $d->task;
                $isDone = $t && ($t->completed_at !== null || $t->column?->isCompletionStatus());
                return [
                    'id' => $d->id,
                    'task_id' => $t?->id,
                    'title' => $t?->title ?? 'Unknown task',
                    'status' => $t?->column?->title ?? 'Pending',
                    'status_color' => $t?->column?->color ?? '#94A3B8',
                    'due_date' => $t?->due_date,
                    'is_completed' => $isDone,
                    'lag_days' => $d->lag_days,
                    'dependency_type' => $d->dependency_type,
                    'assignee' => $t?->assignee ? ['id' => $t->assignee->id, 'name' => $t->assignee->name] : null,
                ];
            });

        // 3. Related To
        $relatedRecords = TaskDependency::where('relationship_type', 'related_to')
            ->where(function ($q) use ($task) {
                $q->where('task_id', $task->id)
                  ->orWhere('depends_on_task_id', $task->id);
            })
            ->with(['task.column', 'dependencyTask.column'])
            ->get()
            ->map(function ($d) use ($task) {
                $otherTask = (int) $d->task_id === (int) $task->id ? $d->dependencyTask : $d->task;
                return [
                    'id' => $d->id,
                    'task_id' => $otherTask?->id,
                    'title' => $otherTask?->title ?? 'Unknown task',
                    'status' => $otherTask?->column?->title ?? 'Pending',
                    'status_color' => $otherTask?->column?->color ?? '#94A3B8',
                    'due_date' => $otherTask?->due_date,
                ];
            });

        $hasUnfinishedBlockers = $blockedByRecords->contains('is_completed', false);
        $isCurrentDone = $task->completed_at !== null || (int) $task->progress === 100;

        return [
            'is_blocked' => !$isCurrentDone && $hasUnfinishedBlockers,
            'blocked_by' => $blockedByRecords->values()->all(),
            'blocks' => $blocksRecords->values()->all(),
            'related' => $relatedRecords->values()->all(),
        ];
    }
}
