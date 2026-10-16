<?php

namespace App\Events;

use App\Models\KanbanColumn;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class BoardColumnUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels, Queueable;

    public int $tries = 3;
    public int $backoff = 3;
    public int $timeout = 10;
    public int $maxExceptions = 3;

    public function __construct(
        public int $boardId,
        public string $action = 'updated', // created, updated, reordered, deleted
        public ?int $columnId = null,
        public ?string $columnTitle = null
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
        Log::warning('[Broadcasting] BoardColumnUpdatedEvent broadcast failed: ' . ($e ? $e->getMessage() : 'unknown error'));
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('boards.' . $this->boardId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'column.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'board_id' => $this->boardId,
            'action' => $this->action,
            'column_id' => $this->columnId,
            'column_title' => $this->columnTitle,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
