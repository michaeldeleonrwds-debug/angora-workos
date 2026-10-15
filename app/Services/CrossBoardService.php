<?php

namespace App\Services;

use App\Models\BoardColumn;
use App\Models\BoardItemRelationship;
use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\User;
use Illuminate\Support\Collection;

class CrossBoardService
{
    /**
     * Resolves mirrored values for a collection of tasks on a given board.
     * Prevents N+1 database queries via batching and eager loading.
     *
     * @param KanbanBoard $board
     * @param Collection<KanbanTask> $tasks
     * @param User|null $currentUser
     * @return array<int, array<string, mixed>>  Keyed by task ID => [colKey => mirrorResult]
     */
    public function resolveMirrorsForBoard(KanbanBoard $board, Collection $tasks, ?User $currentUser = null): array
    {
        $mirrorColumns = $board->boardColumns()
            ->where('type', 'mirror')
            ->where('is_visible', true)
            ->get();

        if ($mirrorColumns->isEmpty() || $tasks->isEmpty()
            || ($currentUser && ! $currentUser->can('view', $board))) {
            return [];
        }

        $taskIds = $tasks->pluck('id')->toArray();

        // 1. Fetch all outgoing relationships for these tasks
        $relationships = BoardItemRelationship::whereIn('source_task_id', $taskIds)
            ->with(['targetBoard', 'targetTask.column', 'targetTask.assignee'])
            ->get()
            ->groupBy('source_task_id');

        $result = [];

        foreach ($tasks as $task) {
            $taskRels = $relationships->get($task->id, collect());
            $taskMirrors = [];

            foreach ($mirrorColumns as $mirrorCol) {
                $config = $mirrorCol->config ?? [];
                $connectColKey = $config['connect_column_key'] ?? null;
                $sourceField = $config['source_field'] ?? 'status'; // status, priority, assignee, progress, due_date, text
                $aggregation = $config['aggregation'] ?? 'first'; // first, list, count, average, sum, comma

                // Filter relationships linked to this specific connect column (or all if omitted)
                $matchingRels = $taskRels->filter(function ($rel) use ($connectColKey) {
                    return empty($connectColKey) || $rel->column_key === $connectColKey;
                });

                // Enforce RBAC / Access checks on target items: if user cannot view target board, mask it
                $validTargetTasks = $matchingRels->map(function ($rel) use ($currentUser) {
                    $targetTask = $rel->targetTask;
                    if (!$targetTask) return null;

                    // A module permission never grants access to another board's task.
                    if ($currentUser && ! $currentUser->can('view', $targetTask)) {
                        return null;
                    }

                    return $targetTask;
                })->filter();

                $taskMirrors[$mirrorCol->key] = $this->aggregateFieldValues(
                    $validTargetTasks,
                    $sourceField,
                    $aggregation
                );
            }

            $result[$task->id] = $taskMirrors;
        }

        return $result;
    }

    /**
     * Resolves the aggregated value from a set of target tasks for a given field.
     */
    public function aggregateFieldValues(Collection $targetTasks, string $field, string $aggregation): mixed
    {
        if ($targetTasks->isEmpty()) {
            return null;
        }

        $extracted = $targetTasks->map(function (KanbanTask $t) use ($field) {
            return match ($field) {
                'status' => $t->column?->title ?? 'None',
                'priority' => $t->priority ?? 'Medium',
                'assignee' => $t->assignee?->name ?? 'Unassigned',
                'progress' => (int) ($t->progress ?? 0),
                'due_date' => $t->due_date,
                'title' => $t->title,
                default => $t->custom_values[$field] ?? $t->{$field} ?? null,
            };
        })->filter(fn($val) => $val !== null)->values();

        if ($extracted->isEmpty()) {
            return null;
        }

        return match ($aggregation) {
            'count' => $extracted->count(),
            'sum' => $extracted->sum(fn($v) => is_numeric($v) ? (float) $v : 0),
            'average' => round($extracted->avg(fn($v) => is_numeric($v) ? (float) $v : 0) ?? 0, 1),
            'list', 'comma' => $extracted->implode(', '),
            default => $extracted->first(), // 'first'
        };
    }
}
