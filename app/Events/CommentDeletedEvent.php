<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentDeletedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $taskId,
        public int $commentId,
        public ?int $parentId = null,
        public ?int $userId = null
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tasks.' . $this->taskId),
            new PrivateChannel('client-tasks.' . $this->taskId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'comment.deleted';
    }

    public function broadcastWith(): array
    {
        return [
            'task_id' => $this->taskId,
            'comment_id' => $this->commentId,
            'parent_id' => $this->parentId,
            'deleted_by' => $this->userId,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
