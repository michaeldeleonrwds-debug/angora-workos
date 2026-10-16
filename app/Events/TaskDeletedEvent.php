<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskDeletedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $boardId,
        public int $taskId,
        public ?int $parentId = null,
        public ?int $userId = null
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('boards.' . $this->boardId),
            new PrivateChannel('tasks.' . $this->taskId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'task.deleted';
    }

    public function broadcastWith(): array
    {
        return [
            'task_id' => $this->taskId,
            'board_id' => $this->boardId,
            'parent_id' => $this->parentId,
            'deleted_by' => $this->userId,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
