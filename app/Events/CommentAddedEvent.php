<?php

namespace App\Events;

use App\Models\KanbanComment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentAddedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public KanbanComment $comment
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tasks.' . $this->comment->task_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'comment.added';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->comment->id,
            'task_id' => $this->comment->task_id,
            'user_id' => $this->comment->user_id,
            'user_name' => $this->comment->user?->name,
            'content' => $this->comment->content,
            'created_at' => $this->comment->created_at?->toIso8601String(),
        ];
    }
}
