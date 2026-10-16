<?php

namespace App\Events;

use App\Models\ProjectDeliverable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DeliverableStatusChangedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels, Queueable;

    public int $tries = 3;
    public int $backoff = 3;
    public int $timeout = 10;
    public int $maxExceptions = 3;

    public function __construct(
        public ProjectDeliverable $deliverable,
        public string $eventSource = 'internal' // 'internal' or 'client'
    ) {
        $this->afterCommit = true;
    }

    public function failed(?\Throwable $e = null): void
    {
        Log::warning('[Broadcasting] DeliverableStatusChangedEvent broadcast failed: ' . ($e ? $e->getMessage() : 'unknown error'));
    }

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
