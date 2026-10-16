<?php

namespace App\Http\Controllers;

use App\Models\SystemNotification;
use App\Services\NotificationService;
use App\Services\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebPushSubscriptionController extends Controller
{
    public function __construct(
        protected WebPushService $webPushService
    ) {}

    /**
     * Get the public VAPID key for browser subscription.
     */
    public function vapidPublicKey(): JsonResponse
    {
        return response()->json([
            'public_key' => $this->webPushService->getPublicKey(),
        ]);
    }

    /**
     * Register or refresh a browser push subscription for current user.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|string|url|max:1000',
            'keys' => 'nullable|array',
            'keys.p256dh' => 'required_without:publicKey|string',
            'keys.auth' => 'required_without:authToken|string',
            'publicKey' => 'nullable|string',
            'authToken' => 'nullable|string',
            'contentEncoding' => 'nullable|string|in:aes128gcm,aesgcm',
            'device_name' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $subscription = $this->webPushService->subscribe(
            user: $user,
            data: $validated,
            userAgent: $request->userAgent(),
            ip: $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => 'Push notifications enabled on this device',
            'subscription_id' => $subscription->id,
            'device_name' => $subscription->device_name,
        ]);
    }

    /**
     * Remove a browser push subscription.
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|string',
        ]);

        $user = $request->user();
        $this->webPushService->unsubscribe($user, $validated['endpoint']);

        // Check if any subscriptions remain
        $remaining = $user->webPushSubscriptions()->count();
        if ($remaining === 0) {
            $user->update(['push_notifications_enabled' => false]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Push notifications disabled on this device',
            'remaining_devices' => $remaining,
        ]);
    }

    /**
     * Send an immediate test notification to the authenticated user.
     */
    public function test(Request $request, NotificationService $notificationService): JsonResponse
    {
        $user = $request->user();

        // 1. Create and broadcast in-app notification via Reverb
        $notification = $notificationService->notify(
            recipient: $user,
            title: 'Angora Work OS: Test Alert',
            message: 'Desktop and Web Push notifications are active and working!',
            type: 'success',
            category: 'system',
            link: '/settings/notifications',
            actorId: null,
            metadata: ['is_test' => true]
        );

        // 2. Also send push directly via WebPushService
        $pushResult = $this->webPushService->sendTestNotification($user);

        return response()->json([
            'success' => true,
            'message' => 'Test notification delivered successfully',
            'notification_id' => $notification?->id,
            'push_result' => $pushResult,
        ]);
    }

    /**
     * Get current user's push subscriptions status and device summary.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $devices = $user->webPushSubscriptions()
            ->latest('last_used_at')
            ->get(['id', 'device_name', 'last_used_at', 'created_at']);

        return response()->json([
            'desktop_enabled' => (bool) $user->desktop_notifications_enabled,
            'push_enabled' => (bool) $user->push_notifications_enabled,
            'sound_enabled' => (bool) $user->sound_notifications_enabled,
            'device_count' => $devices->count(),
            'devices' => $devices,
            'public_key' => $this->webPushService->getPublicKey(),
        ]);
    }
}
