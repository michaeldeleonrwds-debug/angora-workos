<?php

namespace App\Jobs;

use App\Models\SystemNotification;
use App\Models\User;
use App\Services\WebPushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendWebPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 30;
    public int $backoff = 5;

    public function __construct(
        public SystemNotification $notification
    ) {
        $this->queue = config('broadcasting.queue', env('BROADCAST_QUEUE', 'realtime'));
    }

    public function handle(WebPushService $webPushService): void
    {
        $recipient = User::find($this->notification->user_id);
        if (!$recipient) {
            return;
        }

        try {
            $webPushService->sendNotification($recipient, $this->notification);
        } catch (\Throwable $e) {
            Log::warning("[WebPushJob] Failed sending push for notification #{$this->notification->id}: " . $e->getMessage());
        }
    }

    public function failed(?\Throwable $e = null): void
    {
        Log::warning("[WebPushJob] SendWebPushNotificationJob failed permanently for notification #{$this->notification->id}: " . ($e ? $e->getMessage() : 'unknown error'));
    }
}
