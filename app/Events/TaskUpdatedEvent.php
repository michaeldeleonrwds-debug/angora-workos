<?php

namespace App\Events;

use App\Models\KanbanTask;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskUpdatedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public KanbanTask $task,
        public string $action = 'updated',
        public ?int $userId = null
    ) {}

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
