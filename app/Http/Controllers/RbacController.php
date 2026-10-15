<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\RbacPermission;
use App\Models\RbacRole;
use App\Models\User;
use App\Services\Authorization\RbacGovernanceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RbacController extends Controller
{
    public function index(Request $request, RbacGovernanceService $governance)
    {
        abort_unless($governance->canManage($request->user()), 403);

        $roles = RbacRole::query()->with('permissions')->orderBy('name')->get();
        $permissions = RbacPermission::query()->orderBy('department')->orderBy('name')->get();
        $actor = $request->user();
        $allPermissions = $permissions->map(fn ($permission) => [
            'id' => $permission->id,
            'name' => $permission->name,
            'label' => $permission->label ?: $permission->name,
            'department' => $permission->department ?: 'Other',
            'description' => $permission->description,
            'canDelegate' => $governance->canDelegate($actor, $permission),
        ]);

        return Inertia::render('rbac/index', [
            'roles' => $roles->mapWithKeys(fn ($role) => [
                $role->name => str($role->name)->replace('_', ' ')->title()->toString(),
            ])->all(),
            'roleControls' => $roles->mapWithKeys(fn ($role) => [
                $role->name => [
                    'canEdit' => $governance->canManageRole($actor, $role),
                    'canAssign' => $governance->canAssignRole($actor, $role),
                ],
            ])->all(),
            'canCreateRole' => $governance->canManage($actor),
            'permissionsGrouped' => $allPermissions->groupBy('department'),
            'allPermissions' => $allPermissions,
            'matrix' => $roles->mapWithKeys(fn ($role) => [
                $role->name => $role->permissions->pluck('name')->all(),
            ])->all(),
            'users' => User::select('id', 'name', 'email', 'department', 'status')
                ->with('roles:id,name')->orderBy('id')->get()
                ->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'department' => $user->department,
                    'status' => $user->status,
                    'role' => $user->primaryRoleName(),
                    'canAssignRole' => $user->id !== $actor->id
                        && (! $user->hasAnyRole('super_admin', 'admin') || $actor->isSuperAdmin()),
                ]),
        ]);
    }

    public function storeRole(Request $request, RbacGovernanceService $governance)
    {
        abort_unless($governance->canManage($request->user()), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80', 'regex:/^[a-z][a-z0-9_]*$/', Rule::unique('roles', 'name')],
        ]);

        RbacRole::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
            'is_system' => false,
            'is_protected' => false,
        ]);

        AuditLog::log(
            action: 'RBAC_ROLE_CREATED',
            department: 'System',
            entityType: 'Role',
            entityId: null,
            description: "Created custom role {$validated['name']}"
        );

        return back()->with('success', 'Role created.');
    }

    public function updateRolePermissions(Request $request, RbacRole $role, RbacGovernanceService $governance)
    {
        abort_unless($governance->canManageRole($request->user(), $role), 403);

        $validated = $request->validate([
            'permission_ids' => ['present', 'array'],
            'permission_ids.*' => ['integer', 'distinct', Rule::exists('spatie_permissions', 'id')],
        ]);

        $existingProtectedIds = $role->permissions()->where('is_protected', true)->pluck('spatie_permissions.id')->all();
        $requested = RbacPermission::whereIn('id', $validated['permission_ids'])->get();
        foreach ($requested as $permission) {
            abort_unless(in_array($permission->id, $existingProtectedIds, true)
                || $governance->canDelegate($request->user(), $permission), 403);
        }

        $role->syncPermissions(RbacPermission::whereIn('id', array_unique(array_merge(
            $validated['permission_ids'],
            $existingProtectedIds,
        )))->get());

        AuditLog::log(
            action: 'RBAC_PERMISSIONS_UPDATED',
            department: 'System',
            entityType: 'Role',
            entityId: $role->id,
            description: "Updated permissions for role {$role->name}"
        );

        return back()->with('success', 'Role permissions updated.');
    }

    public function updateUserRole(Request $request, User $user, RbacGovernanceService $governance)
    {
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
        ]);

        Gate::authorize('assignRole', [User::class, $validated['role'], $user]);
        $previous = $user->primaryRoleName();

        DB::transaction(function () use ($user, $validated, $governance) {
            $governance->assertLastActiveSuperAdminSafe($user, $validated['role']);
            $user->syncRoles([$validated['role']]);
        });

        AuditLog::log(
            action: 'USER_ROLE_CHANGED',
            department: $user->department,
            entityType: 'User',
            entityId: $user->id,
            description: "Changed role of {$user->name} from {$previous} to {$validated['role']}"
        );

        return back()->with('success', 'User role updated.');
    }
}
