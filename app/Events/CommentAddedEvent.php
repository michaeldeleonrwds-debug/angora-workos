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
        $channels = [
            new PrivateChannel('tasks.' . $this->comment->task_id),
        ];

        if ($this->comment->is_client_visible && $this->comment->task?->is_client_visible) {
            $channels[] = new PrivateChannel('client-tasks.' . $this->comment->task_id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'comment.added';
    }

    public function broadcastWith(): array
    {
        $author = $this->comment->user;
        $body = $this->comment->message ?? $this->comment->content ?? '';

        return [
            'id' => $this->comment->id,
            'task_id' => $this->comment->task_id,
            'parent_id' => $this->comment->parent_id,
            'user_id' => $this->comment->user_id,
            'user_name' => $author?->name,
            'user_avatar' => $author?->avatar_url,
            'content' => $body,
            'message' => $body,
            'is_client_visible' => (bool) $this->comment->is_client_visible,
            'reactions' => $this->comment->reactions ?? [],
            'created_at' => $this->comment->created_at?->toIso8601String(),
        ];
    }
}
