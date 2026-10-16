<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentReactionEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $taskId,
        public int $commentId,
        public array $reactions = [],
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
        return 'comment.reaction';
    }

    public function broadcastWith(): array
    {
        return [
            'task_id' => $this->taskId,
            'comment_id' => $this->commentId,
            'reactions' => $this->reactions,
            'user_id' => $this->userId,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
