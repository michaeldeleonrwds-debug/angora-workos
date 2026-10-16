<?php

namespace App\Events;

use App\Models\KanbanTask;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class TaskUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels, Queueable;

    public int $tries = 3;
    public int $backoff = 3;
    public int $timeout = 10;
    public int $maxExceptions = 3;

    public function __construct(
        public KanbanTask $task,
        public string $action = 'updated',
        public ?int $userId = null
    ) {
        $this->afterCommit = true;
    }

    public function failed(?\Throwable $e = null): void
    {
        Log::warning('[Broadcasting] TaskUpdatedEvent broadcast failed: ' . ($e ? $e->getMessage() : 'unknown error'));
    }

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('boards.' . $this->task->board_id),
            new PrivateChannel('tasks.' . $this->task->id),
        ];

        if ($this->task->is_client_visible) {
            $channels[] = new PrivateChannel('client-tasks.' . $this->task->id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'task.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'task_id' => $this->task->id,
            'board_id' => $this->task->board_id,
            'column_id' => $this->task->column_id,
            'group_id' => $this->task->group_id,
            'title' => $this->task->title,
            'status' => $this->task->status,
            'priority' => $this->task->priority,
            'action' => $this->action,
            'updated_by' => $this->userId,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
