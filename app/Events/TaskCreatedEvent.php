<?php

namespace App\Events;

use App\Models\KanbanTask;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskCreatedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public KanbanTask $task,
        public ?int $userId = null
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('boards.' . $this->task->board_id),
        ];

        if ($this->task->is_client_visible) {
            $channels[] = new PrivateChannel('client-tasks.' . $this->task->id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'task.created';
    }

    public function broadcastWith(): array
    {
        return [
            'task_id' => $this->task->id,
            'board_id' => $this->task->board_id,
            'column_id' => $this->task->column_id,
            'group_id' => $this->task->group_id,
            'parent_id' => $this->task->parent_id,
            'title' => $this->task->title,
            'status' => $this->task->status,
            'priority' => $this->task->priority,
            'assigned_to' => $this->task->assigned_to,
            'created_by' => $this->userId ?? $this->task->created_by,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
