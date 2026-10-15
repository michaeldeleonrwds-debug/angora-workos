<?php

use App\Models\AuditLog;
use App\Models\RbacPermission;
use App\Models\RbacRole;
use App\Models\User;
use App\Support\RbacCapabilityCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Obsolete roles to retire from active configuration.
     */
    protected array $obsoleteRoles = [
        'dept_user',
        'client',
        'external_user',
        'guest',
        'hr_staff',
        'production_staff',
        'sales_staff',
        'marketing_staff',
        'finance_staff',
        'team_member',
        'admin_manager',
        'sales',
        'sales_manager',
        'finance',
        'finance_manager',
        'operations',
        'operations_manager',
    ];

    public function up(): void
    {
        // 1. Create backup table to record user role migrations for rollback
        if (! Schema::hasTable('retired_roles_backup')) {
            Schema::create('retired_roles_backup', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('original_role');
                $table->string('migrated_role');
                $table->timestamps();
            });
        }

        // 2. Snapshot existing obsolete roles and their permissions for safe rollback
        if (! Schema::hasTable('retired_roles_snapshot')) {
            Schema::create('retired_roles_snapshot', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('role_id');
                $table->string('name');
                $table->string('guard_name');
                $table->boolean('is_system')->default(true);
                $table->boolean('is_protected')->default(false);
                $table->json('permission_ids')->nullable();
                $table->timestamps();
            });
        }

        // 3. Ensure the seven supported roles exist
        foreach (RbacCapabilityCatalog::roles() as $roleName => $label) {
            RbacRole::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'is_protected' => in_array($roleName, ['super_admin', 'admin'], true),
                ]
            );
        }

        // 4. Ensure all capabilities from catalog exist
        foreach (RbacCapabilityCatalog::capabilities() as $permName => $def) {
            $perm = RbacPermission::firstOrCreate(
                ['name' => $permName, 'guard_name' => 'web'],
                [
                    'label' => $def['label'],
                    'department' => $def['department'],
                    'is_protected' => $def['is_protected'] ?? false,
                    'is_delegable' => $def['is_delegable'] ?? ! ($def['is_protected'] ?? false),
                ]
            );

            foreach ($def['roles'] as $targetRoleName) {
                $role = RbacRole::where('name', $targetRoleName)->where('guard_name', 'web')->first();
                if ($role && ! $role->hasPermissionTo($permName)) {
                    $role->givePermissionTo($perm);
                }
            }
        }

        // Ensure Super Admin has all registered permissions
        $superAdmin = RbacRole::where('name', 'super_admin')->where('guard_name', 'web')->first();
        if ($superAdmin) {
            foreach (RbacPermission::all() as $permission) {
                if (! $superAdmin->hasPermissionTo($permission->name)) {
                    $superAdmin->givePermissionTo($permission);
                }
            }
        }

        // 5. Migrate users currently assigned to obsolete roles
        $employeeRole = RbacRole::where('name', 'employee')->where('guard_name', 'web')->firstOrFail();
        $adminRole = RbacRole::where('name', 'admin')->where('guard_name', 'web')->firstOrFail();

        $obsoleteRoleModels = RbacRole::whereIn('name', $this->obsoleteRoles)->where('guard_name', 'web')->get();

        foreach ($obsoleteRoleModels as $obsoleteRole) {
            // Snapshot role and permissions
            $permissionIds = DB::table('role_has_permissions')
                ->where('role_id', $obsoleteRole->id)
                ->pluck('permission_id')
                ->all();

            DB::table('retired_roles_snapshot')->updateOrInsert(
                ['role_id' => $obsoleteRole->id],
                [
                    'name' => $obsoleteRole->name,
                    'guard_name' => $obsoleteRole->guard_name,
                    'is_system' => $obsoleteRole->is_system,
                    'is_protected' => $obsoleteRole->is_protected,
                    'permission_ids' => json_encode($permissionIds),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Reassign users
            $userIds = DB::table('model_has_roles')
                ->where('role_id', $obsoleteRole->id)
                ->where('model_type', User::class)
                ->pluck('model_id');

            foreach ($userIds as $userId) {
                $user = User::find($userId);
                if (! $user) {
                    continue;
                }

                // Map admin_manager to admin; all other obsolete roles to employee
                $newRoleId = $obsoleteRole->name === 'admin_manager' ? $adminRole->id : $employeeRole->id;
                $newRoleName = $obsoleteRole->name === 'admin_manager' ? 'admin' : 'employee';

                DB::table('retired_roles_backup')->insert([
                    'user_id' => $userId,
                    'original_role' => $obsoleteRole->name,
                    'migrated_role' => $newRoleName,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('model_has_roles')
                    ->where('role_id', $obsoleteRole->id)
                    ->where('model_id', $userId)
                    ->where('model_type', User::class)
                    ->update(['role_id' => $newRoleId]);

                // Update legacy_role column for audit preservation
                DB::table('users')
                    ->where('id', $userId)
                    ->update(['legacy_role' => $newRoleName]);

                AuditLog::create([
                    'user_id' => $userId,
                    'department' => 'System',
                    'action' => 'USER_ROLE_MIGRATED',
                    'entity_type' => 'User',
                    'entity_id' => $userId,
                    'description' => "Migrated user {$user->name} from obsolete role {$obsoleteRole->name} to {$newRoleName}",
                    'ip_address' => '127.0.0.1',
                ]);
            }

            // Detach permissions and retire obsolete role from active roles table
            DB::table('role_has_permissions')->where('role_id', $obsoleteRole->id)->delete();
            $obsoleteRole->delete();
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // 1. Restore retired roles from snapshot
        if (Schema::hasTable('retired_roles_snapshot')) {
            $snapshots = DB::table('retired_roles_snapshot')->get();
            foreach ($snapshots as $snap) {
                $role = RbacRole::firstOrCreate(
                    ['id' => $snap->role_id],
                    [
                        'name' => $snap->name,
                        'guard_name' => $snap->guard_name,
                        'is_system' => (bool) $snap->is_system,
                        'is_protected' => (bool) $snap->is_protected,
                    ]
                );

                $permissionIds = json_decode($snap->permission_ids ?? '[]', true);
                if (! empty($permissionIds)) {
                    foreach ($permissionIds as $permId) {
                        DB::table('role_has_permissions')->insertOrIgnore([
                            'permission_id' => $permId,
                            'role_id' => $role->id,
                        ]);
                    }
                }
            }
        }

        // 2. Revert user role assignments from backup
        if (Schema::hasTable('retired_roles_backup')) {
            $backups = DB::table('retired_roles_backup')->get();
            foreach ($backups as $backup) {
                $origRole = RbacRole::where('name', $backup->original_role)->where('guard_name', 'web')->first();
                $migRole = RbacRole::where('name', $backup->migrated_role)->where('guard_name', 'web')->first();

                if ($origRole && $migRole) {
                    DB::table('model_has_roles')
                        ->where('role_id', $migRole->id)
                        ->where('model_id', $backup->user_id)
                        ->where('model_type', User::class)
                        ->update(['role_id' => $origRole->id]);

                    DB::table('users')
                        ->where('id', $backup->user_id)
                        ->update(['legacy_role' => $backup->original_role]);
                }
            }
        }

        Schema::dropIfExists('retired_roles_backup');
        Schema::dropIfExists('retired_roles_snapshot');

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
