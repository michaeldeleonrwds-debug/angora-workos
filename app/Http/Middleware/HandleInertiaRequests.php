<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(\Illuminate\Foundation\Inspiring::quotes()->random())->explode('-');
        $user = $request->user();
        $userWorkspaces = [];
        $activeWorkspaceId = null;

        if ($user) {
            $workspacesQuery = \App\Models\Workspace::select('id', 'name', 'color', 'icon', 'owner_id')
                ->withCount('boards')
                ->orderBy('name');

            if (!$user->isSuperAdmin()) {
                $workspacesQuery->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', function ($mq) use ($user) {
                            $mq->where('user_id', $user->id);
                        });
                });
            }

            $userWorkspaces = $workspacesQuery->get();

            // Resolve active workspace from query parameter, session, or default
            $requestedWorkspaceId = $request->query('workspace');
            if ($requestedWorkspaceId && $userWorkspaces->contains('id', (int) $requestedWorkspaceId)) {
                $activeWorkspaceId = (int) $requestedWorkspaceId;
                session(['active_workspace_id' => $activeWorkspaceId]);
            } else {
                $sessionWorkspaceId = session('active_workspace_id');
                if ($sessionWorkspaceId && $userWorkspaces->contains('id', (int) $sessionWorkspaceId)) {
                    $activeWorkspaceId = (int) $sessionWorkspaceId;
                } elseif ($userWorkspaces->isNotEmpty()) {
                    $activeWorkspaceId = $userWorkspaces->first()->id;
                    session(['active_workspace_id' => $activeWorkspaceId]);
                }
            }
        }

        return array_merge(parent::share($request), [
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user ? array_merge($user->toArray(), [
                    'permissions' => $user->getAllPermissions()->pluck('name')->all(),
                    'is_super_admin' => $user->isSuperAdmin(),
                    'is_client' => $user->isClientUser(),
                    'role' => $user->primaryRoleName(),
                ]) : null,
                'capabilities' => $user ? [
                    'canManageUsers' => $user->can('create', \App\Models\User::class),
                    'canManageRbac' => app(\App\Services\Authorization\RbacGovernanceService::class)->canManage($user),
                    'canManageSystemSettings' => $user->isSuperAdmin() || $user->hasPermission('system.settings.manage'),
                    'canManageWorkspace' => $user->isSuperAdmin() || $user->hasRole('admin'),
                    'canAccessDataSecurity' => $user->isSuperAdmin() || $user->hasRole('admin'),
                ] : [],
            ],
            'unreadNotificationsCount' => $user ? \App\Models\SystemNotification::where('user_id', $user->id)->where('is_read', false)->count() : 0,
            'recentNotifications' => $user ? \App\Models\SystemNotification::with('actor:id,name,avatar,avatar_url')->where('user_id', $user->id)->latest()->take(10)->get() : [],
            'availablePersonas' => app()->environment('local', 'testing') && $user?->isSuperAdmin()
                ? \App\Models\User::select('id', 'name', 'email', 'department')->orderBy('id')->get()
                : [],
            'userWorkspaces' => $userWorkspaces,
            'activeWorkspaceId' => $activeWorkspaceId,
            'vapidPublicKey' => config('webpush.vapid.public_key', env('VAPID_PUBLIC_KEY')),
            'csrf_token' => csrf_token(),
        ]);
    }
}
