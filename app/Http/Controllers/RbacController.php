<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RbacController extends Controller
{
    public function index(Request $request)
    {
        $roles = [
            'super_admin' => 'Super Admin',
            'admin_manager' => 'Admin / Manager',
            'dept_user' => 'Department User',
            'hr_staff' => 'HR Staff',
            'production_staff' => 'Production Staff',
            'sales_staff' => 'Sales Staff',
            'marketing_staff' => 'Marketing Staff',
            'finance_staff' => 'Finance Staff',
            'team_member' => 'Team Member',
            'external_user' => 'External User',
        ];

        $permissions = Permission::all()->groupBy('department');
        $allPermissions = Permission::all();

        $rolePermissions = RolePermission::with('permission')->get();

        $matrix = [];
        foreach ($roles as $roleKey => $roleLabel) {
            if ($roleKey === 'super_admin') {
                $matrix[$roleKey] = $allPermissions->pluck('name')->toArray();
            } else {
                $matrix[$roleKey] = $rolePermissions->where('role', $roleKey)->pluck('permission.name')->values()->toArray();
            }
        }

        $users = User::with('permissions')
            ->select('id', 'name', 'email', 'role', 'department', 'status')
            ->orderBy('id')
            ->get();

        return Inertia::render('rbac/index', [
            'roles' => $roles,
            'permissionsGrouped' => $permissions,
            'allPermissions' => $allPermissions,
            'matrix' => $matrix,
            'users' => $users,
        ]);
    }

    public function updateRolePermissions(Request $request, string $role)
    {
        $validated = $request->validate([
            'permission_ids' => 'present|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        if ($role === 'super_admin') {
            return back()->with('error', 'Super Admin permissions are global and cannot be restricted.');
        }

        RolePermission::where('role', $role)->delete();

        foreach ($validated['permission_ids'] as $permId) {
            RolePermission::create([
                'role' => $role,
                'permission_id' => $permId,
            ]);
        }

        AuditLog::log(
            action: 'RBAC_PERMISSIONS_UPDATED',
            department: 'System',
            entityType: 'Role',
            entityId: null,
            description: "Updated permissions matrix for role '{$role}' (" . count($validated['permission_ids']) . " permissions granted)"
        );

        return back()->with('success', "Updated permissions for role {$role}");
    }

    public function updateUserRole(Request $request, User $user)
    {
        $validated = $request->validate([
            'role' => 'required|string',
        ]);

        $prevRole = $user->role;
        $user->role = $validated['role'];
        $user->save();

        AuditLog::log(
            action: 'USER_ROLE_CHANGED',
            department: $user->department,
            entityType: 'User',
            entityId: $user->id,
            description: "Changed role of {$user->name} from {$prevRole} to {$user->role}"
        );

        return back()->with('success', "Updated role for {$user->name}");
    }
}
