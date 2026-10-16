<?php

namespace App\Events;

use App\Models\KanbanColumn;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BoardColumnUpdatedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $boardId,
        public string $action = 'updated', // created, updated, reordered, deleted
        public ?int $columnId = null,
        public ?string $columnTitle = null
    ) {}

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
