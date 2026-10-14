<?php

namespace App\Http\Controllers;

use App\Models\NotificationPreference;
use App\Models\SystemNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get paginated notifications with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = SystemNotification::with('actor:id,name,email,avatar')
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
        $categories = ['mentions', 'assignments', 'reviews', 'deadlines', 'automations', 'system'];
        $existing = NotificationPreference::where('user_id', $request->user()->id)->get()->keyBy('category');

        $result = [];
        foreach ($categories as $cat) {
            $pref = $existing->get($cat);
            $result[] = [
                'category' => $cat,
                'in_app_enabled' => $pref ? (bool) $pref->in_app_enabled : true,
                'email_enabled' => $pref ? (bool) $pref->email_enabled : true,
            ];
        }

        return response()->json([
            'preferences' => $result,
        ]);
    }

    /**
     * Update notification preferences.
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preferences' => 'required|array',
            'preferences.*.category' => 'required|string',
            'preferences.*.in_app_enabled' => 'required|boolean',
            'preferences.*.email_enabled' => 'required|boolean',
        ]);

        foreach ($validated['preferences'] as $item) {
            NotificationPreference::updateOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'category' => $item['category'],
                ],
                [
                    'in_app_enabled' => $item['in_app_enabled'],
                    'email_enabled' => $item['email_enabled'],
                ]
            );
        }

        return $this->getPreferences($request);
    }
}
