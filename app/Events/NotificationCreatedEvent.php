<?php

namespace App\Events;

use App\Models\SystemNotification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreatedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public SystemNotification $notification
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('users.' . $this->notification->user_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id,
            'title' => $this->notification->title,
            'message' => $this->notification->message,
            'type' => $this->notification->type,
            'category' => $this->notification->category,
            'link' => $this->notification->link,
            'metadata' => $this->notification->metadata,
            'is_read' => $this->notification->is_read,
            'created_at' => $this->notification->created_at?->toISOString() ?? now()->toISOString(),
        ];
    }
}
