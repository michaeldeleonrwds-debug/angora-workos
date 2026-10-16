<?php

use App\Support\RbacCapabilityCatalog;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission as RbacPermission;
use Spatie\Permission\Models\Role as RbacRole;

return new class extends Migration
{
    private const CAPABILITY = 'workos.tasks.filter.personal';

    public function up(): void
    {
        // Explicit permission backing the "My Tasks / Assigned to Me" Kanban
        // filter, so the option is capability-driven rather than hardcoded by
        // role name in React. Registered for every internal role by default;
        // custom roles may be granted or revoked it through RBAC.
        $definition = RbacCapabilityCatalog::capabilities()[self::CAPABILITY];

        $permission = RbacPermission::firstOrCreate(
            ['name' => self::CAPABILITY, 'guard_name' => 'web'],
            [
                'label' => $definition['label'],
                'department' => $definition['department'],
                'is_protected' => false,
                'is_delegable' => true,
            ]
        );

        foreach ($definition['roles'] as $roleName) {
            $role = RbacRole::where('name', $roleName)->where('guard_name', 'web')->first();
            if ($role && ! $role->hasPermissionTo(self::CAPABILITY)) {
                $role->givePermissionTo($permission);
            }
        }

        $superAdmin = RbacRole::where('name', 'super_admin')->where('guard_name', 'web')->first();
        if ($superAdmin && ! $superAdmin->hasPermissionTo(self::CAPABILITY)) {
            $superAdmin->givePermissionTo($permission);
        }
    }

    public function down(): void
    {
        $permission = RbacPermission::where('name', self::CAPABILITY)
            ->where('guard_name', 'web')
            ->first();

        if ($permission) {
            foreach ($permission->roles as $role) {
                $role->revokePermissionTo($permission);
            }
            $permission->delete();
        }
    }
};
