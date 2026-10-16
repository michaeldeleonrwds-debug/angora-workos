<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CommentDeletedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels, Queueable;

    public int $tries = 3;
    public int $backoff = 3;
    public int $timeout = 10;
    public int $maxExceptions = 3;

    public function __construct(
        public int $taskId,
        public int $commentId,
        public ?int $parentId = null,
        public ?int $userId = null
    ) {
        $this->afterCommit = true;
    }

    public function failed(?\Throwable $e = null): void
    {
        Log::warning('[Broadcasting] CommentDeletedEvent broadcast failed: ' . ($e ? $e->getMessage() : 'unknown error'));
    }

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
