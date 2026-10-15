<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\KanbanBoard;
use App\Models\User;
use App\Models\UserInvitation;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use App\Models\BoardMember;
use App\Models\RbacRole;
use App\Services\Authorization\RbacGovernanceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of the users, invitations, and assigned resources.
     */
    public function index(Request $request)
    {
        Gate::authorize('create', User::class);

        $search = $request->query('search', '');
        $roleFilter = $request->query('role', '');
        $statusFilter = $request->query('status', '');

        $query = User::query()
            ->select('id', 'name', 'email', 'department', 'phone', 'status', 'created_at')
            ->with([
                'workspaces:id,name',
                'managedProjects:id,name,code',
                'projects:id,name,code',
            ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%");
            });
        }

        if ($roleFilter) {
            $query->whereHas('roles', fn ($roles) => $roles->where('name', $roleFilter));
        }

        if ($statusFilter) {
            $query->where('status', $statusFilter);
        }

        $users = $query->orderBy('name')->paginate(20)->withQueryString();
        $users->getCollection()->each(function (User $target): void {
            $target->setAttribute('can_edit', Gate::allows('update', $target));
            $target->setAttribute('can_suspend', Gate::allows('suspend', $target));
            $target->setAttribute('can_delete', Gate::allows('delete', $target));
        });

        $catalogRoles = \App\Support\RbacCapabilityCatalog::roles();
        $supportedRoleNames = array_keys($catalogRoles);

        $systemRoles = RbacRole::query()
            ->where(function ($q) use ($supportedRoleNames) {
                $q->whereIn('name', $supportedRoleNames)
                  ->orWhere('is_system', false);
            })
            ->get()
            ->mapWithKeys(fn (RbacRole $role) => [
                $role->name => $catalogRoles[$role->name]['label'] ?? str($role->name)->replace('_', ' ')->title()->toString(),
            ])
            ->all();

        $assignableRoles = RbacRole::query()
            ->where(function ($q) use ($supportedRoleNames) {
                $q->whereIn('name', $supportedRoleNames)
                  ->orWhere('is_system', false);
            })
            ->get()
            ->filter(fn (RbacRole $role) => app(RbacGovernanceService::class)->canAssignRole($request->user(), $role))
            ->mapWithKeys(fn (RbacRole $role) => [
                $role->name => $systemRoles[$role->name] ?? str($role->name)->replace('_', ' ')->title()->toString(),
            ])
            ->all();

        $invitations = UserInvitation::select('id', 'email', 'role', 'workspace_id', 'board_id', 'invited_by', 'expires_at', 'accepted_at', 'revoked_at', 'created_at', 'token')
            ->with(['workspace:id,name', 'board:id,title', 'inviter:id,name'])
            ->whereIn('role', array_keys($assignableRoles))
            ->latest()
            ->take(30)
            ->get();

        $workspaces = Workspace::select('id', 'name')->orderBy('name')->get();
        $boards = KanbanBoard::select('id', 'title', 'workspace_id')->orderBy('title')->get();

        return Inertia::render('users/index', [
            'users' => $users,
            'invitations' => $invitations,
            'workspaces' => $workspaces,
            'boards' => $boards,
            'systemRoles' => $systemRoles,
            'assignableRoles' => $assignableRoles,
            'filters' => [
                'search' => $search,
                'role' => $roleFilter,
                'status' => $statusFilter,
            ],
        ]);
    }

    /**
     * Store a newly created user (Admin direct creation).
     */
    public function store(Request $request)
    {
        Gate::authorize('create', User::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'role' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'department' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'password' => 'required|string|min:8',
            'workspace_ids' => 'nullable|array',
            'workspace_ids.*' => 'exists:workspaces,id',
        ]);

        Gate::authorize('assignRole', [User::class, $validated['role']]);

        if (!empty($validated['workspace_ids'])) {
            foreach ($validated['workspace_ids'] as $wsId) {
                $ws = Workspace::findOrFail($wsId);
                Gate::authorize('manageMembers', $ws);
            }
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'department' => $validated['department'] ?? 'Operations',
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $user->assignRole($validated['role']);

        if (!empty($validated['workspace_ids'])) {
            foreach ($validated['workspace_ids'] as $wsId) {
                WorkspaceMember::firstOrCreate([
                    'workspace_id' => $wsId,
                    'user_id' => $user->id,
                ], [
                    'role' => $user->hasAnyRole('super_admin', 'admin') ? 'admin' : 'member',
                ]);
            }
        }

        AuditLog::log(
            action: 'USER_CREATED',
            department: $user->department,
            entityType: 'User',
            entityId: $user->id,
            description: "Created user {$user->name} ({$user->email}) with role {$validated['role']}"
        );

        return back()->with('success', "User '{$user->name}' created successfully.");
    }

    /**
     * Invite a new user by email with a secure token.
     */
    public function invite(Request $request)
    {
        Gate::authorize('create', User::class);

        $validated = $request->validate([
            'email' => 'required|string|email|max:255|unique:users,email',
            'role' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'workspace_id' => 'nullable|exists:workspaces,id',
            'board_id' => 'nullable|exists:kanban_boards,id',
        ]);

        Gate::authorize('assignRole', [User::class, $validated['role']]);

        // Authorization check: If target workspace specified, inviter must have manageMembers rights
        if (!empty($validated['workspace_id'])) {
            $targetWs = Workspace::findOrFail($validated['workspace_id']);
            Gate::authorize('manageMembers', $targetWs);
        }

        // Authorization check: If target board specified, inviter must have manageMembers rights
        if (!empty($validated['board_id'])) {
            $targetBoard = KanbanBoard::findOrFail($validated['board_id']);
            Gate::authorize('manageMembers', $targetBoard);
        }

        // Invalidate any existing pending invitation for this email
        UserInvitation::where('email', strtolower($validated['email']))
            ->whereNull('accepted_at')
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        $invitation = UserInvitation::createInvitation([
            'email' => $validated['email'],
            'role' => $validated['role'],
            'workspace_id' => $validated['workspace_id'] ?? null,
            'board_id' => $validated['board_id'] ?? null,
            'invited_by' => auth()->id(),
            'expires_at' => now()->addDays(7),
        ]);

        AuditLog::log(
            action: 'USER_INVITATION_SENT',
            department: auth()->user()->department ?? 'Operations',
            entityType: 'UserInvitation',
            entityId: $invitation->id,
            description: "Sent invitation to {$invitation->email} for role {$invitation->role}"
        );

        return back()->with('success', "Invitation sent to {$invitation->email}.");
    }

    /**
     * Resend an existing invitation.
     */
    public function resendInvitation(UserInvitation $invitation)
    {
        Gate::authorize('create', User::class);
        Gate::authorize('assignRole', [User::class, $invitation->role]);

        if ($invitation->accepted_at) {
            return back()->with('error', 'Invitation has already been accepted.');
        }

        $rawToken = \Illuminate\Support\Str::random(48);
        $invitation->update([
            'token' => $rawToken,
            'token_hash' => UserInvitation::hashToken($rawToken),
            'expires_at' => now()->addDays(7),
            'revoked_at' => null,
        ]);
        $invitation->rawToken = $rawToken;

        AuditLog::log(
            action: 'USER_INVITATION_RESENT',
            department: auth()->user()->department ?? 'Operations',
            entityType: 'UserInvitation',
            entityId: $invitation->id,
            description: "Resent invitation to {$invitation->email}"
        );

        return back()->with('success', "Invitation resent to {$invitation->email}.");
    }

    /**
     * Revoke a pending invitation.
     */
    public function revokeInvitation(UserInvitation $invitation)
    {
        Gate::authorize('create', User::class);
        Gate::authorize('assignRole', [User::class, $invitation->role]);

        $invitation->update(['revoked_at' => now()]);

        AuditLog::log(
            action: 'USER_INVITATION_REVOKED',
            department: auth()->user()->department ?? 'Operations',
            entityType: 'UserInvitation',
            entityId: $invitation->id,
            description: "Revoked invitation for {$invitation->email}"
        );

        return back()->with('success', 'Invitation revoked.');
    }

    /**
     * Update an existing user's profile and role.
     */
    public function update(Request $request, User $user)
    {
        Gate::authorize('update', $user);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'department' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'role' => ['sometimes', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'status' => 'sometimes|in:active,inactive,suspended',
        ]);

        if (isset($validated['role']) && $validated['role'] !== $user->primaryRoleName()) {
            Gate::authorize('assignRole', [User::class, $validated['role'], $user]);
        }

        if (isset($validated['status']) && $validated['status'] !== $user->status) {
            Gate::authorize('suspend', $user);
        }

        DB::transaction(function () use ($user, $validated) {
            app(RbacGovernanceService::class)->assertLastActiveSuperAdminSafe(
                $user,
                $validated['role'] ?? null,
                $validated['status'] ?? null,
            );
            $role = $validated['role'] ?? null;
            unset($validated['role']);
            $user->update($validated);
            if ($role !== null && $role !== $user->primaryRoleName()) {
                $user->syncRoles([$role]);
            }
        });

        AuditLog::log(
            action: 'USER_UPDATED',
            department: $user->department,
            entityType: 'User',
            entityId: $user->id,
            description: "Updated profile/role for {$user->name} ({$user->email})"
        );

        return back()->with('success', "User '{$user->name}' updated.");
    }

    /**
     * Toggle or set status (active / suspended).
     */
    public function toggleStatus(Request $request, User $user)
    {
        Gate::authorize('suspend', $user);

        $validated = $request->validate([
            'status' => 'required|in:active,inactive,suspended',
        ]);

        DB::transaction(function () use ($user, $validated) {
            app(RbacGovernanceService::class)->assertLastActiveSuperAdminSafe($user, null, $validated['status']);
            $user->update(['status' => $validated['status']]);
        });

        AuditLog::log(
            action: 'USER_STATUS_CHANGED',
            department: $user->department,
            entityType: 'User',
            entityId: $user->id,
            description: "Changed user status to {$validated['status']} for {$user->name}"
        );

        return back()->with('success', "User status updated to {$validated['status']}.");
    }

    /**
     * Delete user account.
     */
    public function destroy(User $user)
    {
        Gate::authorize('delete', $user);

        $name = $user->name;
        $user->delete();

        AuditLog::log(
            action: 'USER_DELETED',
            department: 'Operations',
            entityType: 'User',
            entityId: $user->id,
            description: "Deleted user account {$name}"
        );

        return back()->with('success', "User '{$name}' deleted.");
    }
}
