<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'legacy_role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->renameColumn('role', 'legacy_role');
            });
        }

        $now = now();
        $registered = DB::table('permissions')->get();
        foreach ($registered as $permission) {
            DB::table('spatie_permissions')->updateOrInsert(
                ['name' => $permission->name, 'guard_name' => 'web'],
                [
                    'label' => $permission->label,
                    'department' => $permission->department,
                    'description' => $permission->description,
                    'is_protected' => $permission->name === 'rbac.manage',
                    'is_delegable' => $permission->name !== 'rbac.manage',
                    'updated_at' => $now,
                ]
            );
        }

        foreach ([
            'rbac.manage' => ['Manage RBAC', 'System', true],
            'system.settings.manage' => ['Manage System Settings', 'System', true],
            'permissions.manage' => ['Manage Protected Permissions', 'System', true],
        ] as $name => [$label, $department, $protected]) {
            DB::table('spatie_permissions')->updateOrInsert(
                ['name' => $name, 'guard_name' => 'web'],
                [
                    'label' => $label,
                    'department' => $department,
                    'description' => null,
                    'is_protected' => $protected,
                    'is_delegable' => false,
                    'updated_at' => $now,
                ]
            );
        }

        foreach (\App\Support\RbacCapabilityCatalog::workOs() as $name => $capability) {
            DB::table('spatie_permissions')->updateOrInsert(
                ['name' => $name, 'guard_name' => 'web'],
                [
                    'label' => $capability['label'],
                    'department' => 'Work OS',
                    'description' => null,
                    'is_protected' => false,
                    'is_delegable' => true,
                    'updated_at' => $now,
                ]
            );
        }

        $knownRoles = [
            'super_admin', 'admin', 'admin_manager', 'project_manager',
            'account_manager', 'employee', 'designer', 'developer', 'dept_user',
            'client', 'external_user', 'guest', 'hr_staff', 'production_staff',
            'sales_staff', 'marketing_staff', 'finance_staff', 'team_member',
        ];
        $historicalRoles = DB::table('users')->whereNotNull('legacy_role')->distinct()->pluck('legacy_role')
            ->merge(DB::table('role_permissions')->distinct()->pluck('role'))
            ->merge(DB::table('user_invitations')->distinct()->pluck('role'));

        foreach (collect($knownRoles)->merge($historicalRoles)->filter()->unique() as $name) {
            DB::table('roles')->updateOrInsert(
                ['name' => $name, 'guard_name' => 'web'],
                [
                    'is_system' => in_array($name, $knownRoles, true),
                    'is_protected' => in_array($name, ['super_admin', 'admin'], true),
                    'updated_at' => $now,
                ]
            );
        }

        $roles = DB::table('roles')->pluck('id', 'name');
        $permissions = DB::table('spatie_permissions')->pluck('id', 'name');

        // The legacy matrix was reviewed. Its sole governance grant (rbac.manage)
        // is intentionally excluded from admin_manager and all other legacy roles.
        foreach (DB::table('role_permissions')->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')
            ->select('role_permissions.role', 'permissions.name')->get() as $grant) {
            if ($grant->name === 'rbac.manage' || ! isset($roles[$grant->role], $permissions[$grant->name])) {
                continue;
            }
            DB::table('role_has_permissions')->updateOrInsert([
                'role_id' => $roles[$grant->role],
                'permission_id' => $permissions[$grant->name],
            ]);
        }

        // Governance grants are explicit and never inherited from the legacy matrix.
        foreach ($permissions as $name => $permissionId) {
            DB::table('role_has_permissions')->updateOrInsert([
                'role_id' => $roles['super_admin'],
                'permission_id' => $permissionId,
            ]);
        }
        DB::table('role_has_permissions')->updateOrInsert([
            'role_id' => $roles['admin'],
            'permission_id' => $permissions['rbac.manage'],
        ]);

        foreach (\App\Support\RbacCapabilityCatalog::workOs() as $name => $capability) {
            foreach ($capability['roles'] as $roleName) {
                DB::table('role_has_permissions')->updateOrInsert([
                    'role_id' => $roles[$roleName],
                    'permission_id' => $permissions[$name],
                ]);
            }
        }

        foreach (DB::table('users')->select('id', 'legacy_role')->get() as $user) {
            if (isset($roles[$user->legacy_role])) {
                DB::table('model_has_roles')->updateOrInsert([
                    'role_id' => $roles[$user->legacy_role],
                    'model_type' => \App\Models\User::class,
                    'model_id' => $user->id,
                ]);
            }
        }

        foreach (DB::table('user_permissions')->join('permissions', 'permissions.id', '=', 'user_permissions.permission_id')
            ->select('user_permissions.user_id', 'permissions.name')->get() as $grant) {
            if (isset($permissions[$grant->name]) && ! in_array($grant->name, ['rbac.manage', 'permissions.manage', 'system.settings.manage'], true)) {
                DB::table('model_has_permissions')->updateOrInsert([
                    'permission_id' => $permissions[$grant->name],
                    'model_type' => \App\Models\User::class,
                    'model_id' => $grant->user_id,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Keep Spatie tables and assignments so rollback cannot erase new grants.
        // The original values remain in legacy_role throughout this release.
        if (Schema::hasColumn('users', 'legacy_role') && ! Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->renameColumn('legacy_role', 'role');
            });
        }
    }
};
