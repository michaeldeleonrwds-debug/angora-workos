<?php

namespace App\Jobs;

use App\Events\TaskUpdatedEvent;
use App\Models\KanbanAttachment;
use App\Services\ImageOptimizationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class OptimizeImageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 120;

    public function __construct(
        public KanbanAttachment $attachment
    ) {}

    public function handle(ImageOptimizationService $service): void
    {
        $this->attachment->update(['processing_status' => 'processing']);

        $result = $service->optimize($this->attachment);

        // Broadcast task updated event so collaborators receive optimized variant without refresh
        if ($this->attachment->task) {
            try {
                TaskUpdatedEvent::dispatch(
                    $this->attachment->task,
                    'attachment_optimized',
                    $this->attachment->user_id
                );
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Failed to broadcast TaskUpdatedEvent from OptimizeImageJob: " . $e->getMessage());
            }
        }
    }
}
