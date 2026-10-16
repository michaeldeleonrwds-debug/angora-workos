<?php

namespace App\Events;

use App\Models\ProjectDeliverable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DeliverableStatusChangedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ProjectDeliverable $deliverable,
        public string $eventSource = 'internal' // 'internal' or 'client'
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('client-projects.' . $this->deliverable->project_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'deliverable.status_changed';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->deliverable->id,
            'project_id' => $this->deliverable->project_id,
            'title' => $this->deliverable->title,
            'status' => $this->deliverable->status,
            'client_status' => $this->deliverable->client_status,
            'is_client_visible' => $this->deliverable->is_client_visible,
            'event_source' => $this->eventSource,
            'updated_at' => now()->toIso8601String(),
        ];
    }
}
