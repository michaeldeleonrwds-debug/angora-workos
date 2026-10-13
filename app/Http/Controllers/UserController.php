<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\KanbanBoard;
use App\Models\User;
use App\Models\UserInvitation;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use App\Models\BoardMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of the users, invitations, and assigned resources.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', User::class);

        $search = $request->query('search', '');
        $roleFilter = $request->query('role', '');
        $statusFilter = $request->query('status', '');

        $query = User::query()->with([
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
            $query->where('role', $roleFilter);
        }

        if ($statusFilter) {
            $query->where('status', $statusFilter);
        }

        $users = $query->orderBy('name')->paginate(20)->withQueryString();

        $invitations = UserInvitation::with(['workspace:id,name', 'board:id,title', 'inviter:id,name'])
            ->latest()
            ->take(30)
            ->get();

        $workspaces = Workspace::select('id', 'name')->orderBy('name')->get();
        $boards = KanbanBoard::select('id', 'title', 'workspace_id')->orderBy('title')->get();

        $systemRoles = [
            'super_admin' => 'Super Admin',
            'admin' => 'Admin',
            'project_manager' => 'Project Manager',
            'account_manager' => 'Account Manager',
            'designer' => 'Designer',
            'developer' => 'Developer',
            'employee' => 'Employee',
            'guest' => 'Guest / Freelancer',
            'client' => 'Client',
        ];

        return Inertia::render('users/index', [
            'users' => $users,
            'invitations' => $invitations,
            'workspaces' => $workspaces,
            'boards' => $boards,
            'systemRoles' => $systemRoles,
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
            'role' => ['required', 'string', Rule::in([
                'super_admin', 'admin', 'project_manager', 'account_manager',
                'designer', 'developer', 'employee', 'guest', 'client'
            ])],
            'department' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'password' => 'required|string|min:8',
            'workspace_ids' => 'nullable|array',
            'workspace_ids.*' => 'exists:workspaces,id',
        ]);

        Gate::authorize('assignRole', [User::class, $validated['role']]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'role' => $validated['role'],
            'department' => $validated['department'] ?? 'Operations',
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        if (!empty($validated['workspace_ids'])) {
            foreach ($validated['workspace_ids'] as $wsId) {
                WorkspaceMember::firstOrCreate([
                    'workspace_id' => $wsId,
                    'user_id' => $user->id,
                ], [
                    'role' => in_array($user->role, ['super_admin', 'admin']) ? 'admin' : 'member',
                ]);
            }
        }

        AuditLog::log(
            action: 'USER_CREATED',
            department: $user->department,
            entityType: 'User',
            entityId: $user->id,
            description: "Created user {$user->name} ({$user->email}) with role {$user->role}"
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
            'role' => ['required', 'string', Rule::in([
                'super_admin', 'admin', 'project_manager', 'account_manager',
                'designer', 'developer', 'employee', 'guest', 'client'
            ])],
            'workspace_id' => 'nullable|exists:workspaces,id',
            'board_id' => 'nullable|exists:kanban_boards,id',
        ]);

        Gate::authorize('assignRole', [User::class, $validated['role']]);

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

        if ($invitation->accepted_at) {
            return back()->with('error', 'Invitation has already been accepted.');
        }

        $invitation->update([
            'token' => \Illuminate\Support\Str::random(48),
            'expires_at' => now()->addDays(7),
            'revoked_at' => null,
        ]);

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
            'role' => ['sometimes', 'string', Rule::in([
                'super_admin', 'admin', 'project_manager', 'account_manager',
                'designer', 'developer', 'employee', 'guest', 'client'
            ])],
            'status' => 'sometimes|in:active,inactive,suspended',
        ]);

        if (isset($validated['role']) && $validated['role'] !== $user->role) {
            Gate::authorize('assignRole', [User::class, $validated['role']]);
        }

        if (isset($validated['status']) && $validated['status'] !== $user->status) {
            Gate::authorize('suspend', $user);
        }

        $user->update($validated);

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

        $user->update(['status' => $validated['status']]);

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
