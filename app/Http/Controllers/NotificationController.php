<?php

namespace App\Http\Controllers;

use App\Models\NotificationPreference;
use App\Models\SystemNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get paginated notifications with filters, or redirect page visits to appropriate views.
     */
    public function index(Request $request): mixed
    {
        $user = $request->user();

        // If accessed as a browser page or via an Inertia navigation
        if (!$request->wantsJson() || $request->header('X-Inertia')) {
            if ($user && ($user->isClientUser() || $user->hasRole('client') || $user->primaryRoleName() === 'external_user')) {
                return redirect()->route('client-portal.notifications');
            }

            return redirect()->route('dashboard');
        }

        $query = SystemNotification::with('actor:id,name,email,avatar,avatar_url')
            ->where('user_id', $user->id);

        if ($request->query('tab') === 'unread') {
            $query->where('is_read', false);
        }

        $category = $request->query('category');
        if ($category && $category !== 'all') {
            $query->where('category', $category);
        }

        $notifications = $query->latest()->paginate(25);
        $unreadCount = SystemNotification::where('user_id', $user->id)->where('is_read', false)->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markRead(Request $request, SystemNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id && !$request->user()->isSuperAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $notification->update(['is_read' => true]);
        $unreadCount = SystemNotification::where('user_id', $request->user()->id)->where('is_read', false)->count();

        return response()->json([
            'success' => true,
            'notification' => $notification,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark all notifications as read for current user.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        SystemNotification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'unread_count' => 0,
        ]);
    }

    /**
     * Delete/dismiss a notification.
     */
    public function destroy(Request $request, SystemNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id && !$request->user()->isSuperAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $notification->delete();
        $unreadCount = SystemNotification::where('user_id', $request->user()->id)->where('is_read', false)->count();

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Get notification preferences for current user.
     */
    public function getPreferences(Request $request): JsonResponse
    {
        $user = $request->user();
        $categories = ['mentions', 'assignments', 'reviews', 'deadlines', 'automations', 'system'];
        $existing = NotificationPreference::where('user_id', $user->id)->get()->keyBy('category');

        $result = [];
        foreach ($categories as $cat) {
            $pref = $existing->get($cat);
            $result[] = [
                'category' => $cat,
                'in_app_enabled' => $pref ? (bool) $pref->in_app_enabled : true,
                'desktop_enabled' => $pref ? (bool) ($pref->desktop_enabled ?? true) : true,
                'push_enabled' => $pref ? (bool) ($pref->push_enabled ?? true) : true,
                'email_enabled' => $pref ? (bool) $pref->email_enabled : true,
            ];
        }

        return response()->json([
            'preferences' => $result,
            'desktop_notifications_enabled' => (bool) $user->desktop_notifications_enabled,
            'push_notifications_enabled' => (bool) $user->push_notifications_enabled,
            'sound_notifications_enabled' => (bool) $user->sound_notifications_enabled,
        ]);
    }

    /**
     * Update notification preferences.
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preferences' => 'nullable|array',
            'preferences.*.category' => 'required|string',
            'preferences.*.in_app_enabled' => 'nullable|boolean',
            'preferences.*.desktop_enabled' => 'nullable|boolean',
            'preferences.*.push_enabled' => 'nullable|boolean',
            'preferences.*.email_enabled' => 'nullable|boolean',
            'desktop_notifications_enabled' => 'nullable|boolean',
            'push_notifications_enabled' => 'nullable|boolean',
            'sound_notifications_enabled' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $userUpdates = [];
        if ($request->has('desktop_notifications_enabled')) {
            $userUpdates['desktop_notifications_enabled'] = (bool) $validated['desktop_notifications_enabled'];
        }
        if ($request->has('push_notifications_enabled')) {
            $userUpdates['push_notifications_enabled'] = (bool) $validated['push_notifications_enabled'];
        }
        if ($request->has('sound_notifications_enabled')) {
            $userUpdates['sound_notifications_enabled'] = (bool) $validated['sound_notifications_enabled'];
        }
        if (!empty($userUpdates)) {
            $user->update($userUpdates);
        }

        if (!empty($validated['preferences'])) {
            foreach ($validated['preferences'] as $item) {
                NotificationPreference::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'category' => $item['category'],
                    ],
                    [
                        'in_app_enabled' => $item['in_app_enabled'] ?? true,
                        'desktop_enabled' => $item['desktop_enabled'] ?? true,
                        'push_enabled' => $item['push_enabled'] ?? true,
                        'email_enabled' => $item['email_enabled'] ?? true,
                    ]
                );
            }
        }

        return $this->getPreferences($request);
    }
}
