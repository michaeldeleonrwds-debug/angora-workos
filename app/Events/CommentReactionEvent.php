<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CommentReactionEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels, Queueable;

    public int $tries = 3;
    public int $backoff = 3;
    public int $timeout = 10;
    public int $maxExceptions = 3;

    public function __construct(
        public int $taskId,
        public int $commentId,
        public array $reactions = [],
        public ?int $userId = null
    ) {
        $this->afterCommit = true;
        $this->queue = config('broadcasting.queue', env('BROADCAST_QUEUE', 'realtime'));
    }

    public function broadcastQueue(): string
    {
        return config('broadcasting.queue', env('BROADCAST_QUEUE', 'realtime'));
    }

    public function failed(?\Throwable $e = null): void
    {
        Log::warning('[Broadcasting] CommentReactionEvent broadcast failed: ' . ($e ? $e->getMessage() : 'unknown error'));
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
