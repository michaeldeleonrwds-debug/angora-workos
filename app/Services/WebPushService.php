<?php

namespace App\Services;

use App\Models\NotificationPreference;
use App\Models\SystemNotification;
use App\Models\User;
use App\Models\WebPushSubscription;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    /**
     * Get VAPID configuration array for Minishlink WebPush.
     */
    public static function getVapidAuth(): ?array
    {
        $subject = config('webpush.vapid.subject', env('VAPID_SUBJECT', 'mailto:admin@angora.test'));
        $publicKey = config('webpush.vapid.public_key', env('VAPID_PUBLIC_KEY'));
        $privateKey = config('webpush.vapid.private_key', env('VAPID_PRIVATE_KEY'));

        if (!$publicKey || !$privateKey) {
            return null;
        }

        return [
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ];
    }

    /**
     * Get public VAPID key to provide to the browser frontend.
     */
    public function getPublicKey(): ?string
    {
        return config('webpush.vapid.public_key', env('VAPID_PUBLIC_KEY'));
    }

    /**
     * Register or update a browser push subscription for a user.
     */
    public function subscribe(User $user, array $data, ?string $userAgent = null, ?string $ip = null): WebPushSubscription
    {
        $endpoint = trim($data['endpoint']);
        $endpointHash = WebPushSubscription::hashEndpoint($endpoint);

        $subscription = WebPushSubscription::updateOrCreate(
            [
                'user_id' => $user->id,
                'endpoint_hash' => $endpointHash,
            ],
            [
                'endpoint' => $endpoint,
                'public_key' => $data['publicKey'] ?? $data['keys']['p256dh'] ?? '',
                'auth_token' => $data['authToken'] ?? $data['keys']['auth'] ?? '',
                'content_encoding' => $data['contentEncoding'] ?? 'aes128gcm',
                'device_name' => $data['device_name'] ?? $this->detectDeviceName($userAgent),
                'user_agent' => $userAgent,
                'last_used_at' => now(),
            ]
        );

        // Update user preference flag
        $user->update([
            'push_notifications_enabled' => true,
            'desktop_notifications_enabled' => true,
        ]);

        return $subscription;
    }

    /**
     * Unsubscribe a browser endpoint.
     */
    public function unsubscribe(User $user, string $endpoint): bool
    {
        $endpointHash = WebPushSubscription::hashEndpoint($endpoint);
        $deleted = WebPushSubscription::where('user_id', $user->id)
            ->where('endpoint_hash', $endpointHash)
            ->delete();

        return $deleted > 0;
    }

    /**
     * Send Web Push notification for a SystemNotification to all user's registered devices.
     */
    public function sendNotification(User $user, SystemNotification $notification): array
    {
        // 1. Check user-level push preference
        if (isset($user->push_notifications_enabled) && !$user->push_notifications_enabled) {
            return ['status' => 'skipped', 'reason' => 'push_disabled_by_user'];
        }

        // 2. Check category-level preference
        $preference = NotificationPreference::where('user_id', $user->id)
            ->where('category', $notification->category)
            ->first();

        if ($preference && isset($preference->push_enabled) && !$preference->push_enabled) {
            return ['status' => 'skipped', 'reason' => 'category_push_disabled'];
        }

        // 3. Prepare payload with client privacy filtering
        $isClient = $user->isClientUser();
        $payload = [
            'id' => $notification->id,
            'title' => $notification->title,
            'body' => $notification->message,
            'icon' => '/favicon.ico',
            'badge' => '/favicon.ico',
            'url' => $this->sanitizeTargetUrl($notification->link, $isClient),
            'tag' => 'notification-' . $notification->id,
            'category' => $notification->category,
            'timestamp' => now()->timestamp * 1000,
            'data' => [
                'notificationId' => $notification->id,
                'url' => $this->sanitizeTargetUrl($notification->link, $isClient),
                'category' => $notification->category,
            ],
        ];

        return $this->sendToUserSubscriptions($user, $payload);
    }

    /**
     * Deliver a raw payload to all valid push subscriptions of a user.
     */
    public function sendToUserSubscriptions(User $user, array $payload): array
    {
        $subscriptions = $user->webPushSubscriptions()->get();
        if ($subscriptions->isEmpty()) {
            return ['status' => 'no_subscriptions', 'delivered' => 0];
        }

        $auth = self::getVapidAuth();
        if (!$auth) {
            Log::warning('[WebPush] VAPID credentials missing or invalid in configuration.');
            return ['status' => 'error', 'message' => 'VAPID credentials not configured'];
        }

        $defaultOptions = [
            'TTL' => 3600, // 1 hour time-to-live
            'urgency' => 'high',
            'topic' => $payload['tag'] ?? 'angora-notification',
            'timeout' => 15,
        ];

        $jsonPayload = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $webPush = new WebPush($auth, $defaultOptions);

        $subscriptionMap = [];
        foreach ($subscriptions as $sub) {
            try {
                $minishlinkSub = $sub->toMinishlinkSubscription();
                $webPush->queueNotification($minishlinkSub, $jsonPayload);
                $subscriptionMap[$sub->endpoint] = $sub;
            } catch (\Throwable $e) {
                Log::debug("[WebPush] Failed queuing subscription #{$sub->id}: " . $e->getMessage());
            }
        }

        $deliveredCount = 0;
        $expiredCount = 0;
        $failedCount = 0;

        try {
            foreach ($webPush->flush() as $report) {
                $endpoint = $report->getRequest()->getUri()->__toString();
                /** @var WebPushSubscription|null $subRecord */
                $subRecord = $subscriptionMap[$endpoint] ?? null;

                if ($report->isSuccess()) {
                    $deliveredCount++;
                    if ($subRecord) {
                        $subRecord->update(['last_used_at' => now()]);
                    }
                } else {
                    $failedCount++;
                    $reason = $report->getReason();
                    $isExpired = $report->isSubscriptionExpired();

                    // If 404 Not Found, 410 Gone, or expired, delete subscription record
                    if ($isExpired || str_contains($reason, '410') || str_contains($reason, '404')) {
                        $expiredCount++;
                        if ($subRecord) {
                            Log::info("[WebPush] Pruning expired subscription #{$subRecord->id} ({$endpoint})");
                            $subRecord->delete();
                        }
                    } else {
                        Log::warning("[WebPush] Delivery failed for endpoint {$endpoint}: {$reason}");
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error('[WebPush] Exception during flush: ' . $e->getMessage());
            return ['status' => 'error', 'message' => $e->getMessage()];
        }

        return [
            'status' => 'processed',
            'total' => $subscriptions->count(),
            'delivered' => $deliveredCount,
            'expired_pruned' => $expiredCount,
            'failed' => $failedCount,
        ];
    }

    /**
     * Send test notification to user's registered devices.
     */
    public function sendTestNotification(User $user): array
    {
        $payload = [
            'id' => 0,
            'title' => 'Angora Work OS',
            'body' => 'Test Notification: Native desktop and Web Push alerts are working properly!',
            'icon' => '/favicon.ico',
            'badge' => '/favicon.ico',
            'url' => '/settings/notifications',
            'tag' => 'angora-test-notification',
            'category' => 'system',
            'timestamp' => now()->timestamp * 1000,
            'data' => [
                'notificationId' => 0,
                'url' => '/settings/notifications',
                'category' => 'system',
            ],
        ];

        return $this->sendToUserSubscriptions($user, $payload);
    }

    /**
     * Helper to sanitize and validate notification target URLs against trusted routes.
     */
    private function sanitizeTargetUrl(?string $link, bool $isClient): string
    {
        if (!$link) {
            return $isClient ? route('client-portal.dashboard') : '/dashboard';
        }

        // Relative paths within Angora
        if (str_starts_with($link, '/')) {
            if ($isClient && !str_starts_with($link, '/client-portal')) {
                return route('client-portal.dashboard');
            }
            return $link;
        }

        // Validate full URL host
        $appHost = parse_url(config('app.url', 'https://angora.test'), PHP_URL_HOST);
        $linkHost = parse_url($link, PHP_URL_HOST);

        if ($linkHost && $appHost && strcasecmp($linkHost, $appHost) === 0) {
            $pathAndQuery = (parse_url($link, PHP_URL_PATH) ?: '/') .
                (parse_url($link, PHP_URL_QUERY) ? '?' . parse_url($link, PHP_URL_QUERY) : '');
            if ($isClient && !str_starts_with($pathAndQuery, '/client-portal')) {
                return route('client-portal.dashboard');
            }
            return $link;
        }

        return $isClient ? route('client-portal.dashboard') : '/dashboard';
    }

    /**
     * Guess human-friendly device name from user agent string.
     */
    private function detectDeviceName(?string $userAgent): string
    {
        if (!$userAgent) {
            return 'Desktop Device';
        }

        $browser = 'Browser';
        if (str_contains($userAgent, 'Edg/')) {
            $browser = 'Microsoft Edge';
        } elseif (str_contains($userAgent, 'Chrome/')) {
            $browser = 'Google Chrome';
        } elseif (str_contains($userAgent, 'Firefox/')) {
            $browser = 'Mozilla Firefox';
        } elseif (str_contains($userAgent, 'Safari/') && !str_contains($userAgent, 'Chrome/')) {
            $browser = 'Apple Safari';
        }

        $os = 'Desktop';
        if (str_contains($userAgent, 'Windows')) {
            $os = 'Windows';
        } elseif (str_contains($userAgent, 'Macintosh')) {
            $os = 'macOS';
        } elseif (str_contains($userAgent, 'Linux')) {
            $os = 'Linux';
        } elseif (str_contains($userAgent, 'Android')) {
            $os = 'Android';
        } elseif (str_contains($userAgent, 'iPhone') || str_contains($userAgent, 'iPad')) {
            $os = 'iOS';
        }

        return "{$browser} on {$os}";
    }
}
