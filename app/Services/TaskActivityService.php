<?php

namespace App\Services;

use App\Models\KanbanTask;
use App\Models\TaskActivity;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TaskActivityService
{
    /**
     * Record a task activity event safely within a database transaction.
     */
    public static function log(
        KanbanTask $task,
        string $eventType,
        string $description,
        ?string $fieldName = null,
        mixed $oldValue = null,
        mixed $newValue = null,
        ?array $metadata = null,
        ?User $actor = null,
        ?User $user = null
    ): ?TaskActivity {
        $user = $user ?? $actor ?? auth()->user();

        // Avoid logging if old and new values are strictly equal
        if ($oldValue !== null && $newValue !== null && $oldValue === $newValue) {
            return null;
        }

        try {
            return DB::transaction(function () use ($task, $eventType, $description, $fieldName, $oldValue, $newValue, $metadata, $user) {
                return TaskActivity::create([
                    'task_id' => $task->id,
                    'board_id' => $task->board_id,
                    'user_id' => $user?->id,
                    'event_type' => $eventType,
                    'description' => $description,
                    'field_name' => $fieldName,
                    'old_value' => $oldValue !== null ? (is_array($oldValue) ? $oldValue : ['value' => $oldValue]) : null,
                    'new_value' => $newValue !== null ? (is_array($newValue) ? $newValue : ['value' => $newValue]) : null,
                    'metadata' => $metadata,
                ]);
            });
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to record task activity: {$e->getMessage()}");
            return null;
        }
    }
}
