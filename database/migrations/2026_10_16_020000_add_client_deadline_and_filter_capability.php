<?php

use App\Support\RbacCapabilityCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission as RbacPermission;
use Spatie\Permission\Models\Role as RbacRole;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Client-facing deadline column. Never serialized to Employee,
        //    Designer or Developer (enforced in KanbanTask serialization).
        if (! Schema::hasColumn('kanban_tasks', 'client_deadline')) {
            Schema::table('kanban_tasks', function (Blueprint $table) {
                $table->date('client_deadline')->nullable()->index()->after('due_date');
            });
        }

        // 2. Register the new cross-assignee filter capability and grant it to
        //    the catalog's management roles. Contributors are deliberately
        //    excluded so their default view stays scoped to assigned work.
        $definition = RbacCapabilityCatalog::capabilities()['workos.tasks.filter.any'];
        $permission = RbacPermission::firstOrCreate(
            ['name' => 'workos.tasks.filter.any', 'guard_name' => 'web'],
            [
                'label' => $definition['label'],
                'department' => $definition['department'],
                'is_protected' => false,
                'is_delegable' => true,
            ]
        );

        foreach ($definition['roles'] as $roleName) {
            $role = RbacRole::where('name', $roleName)->where('guard_name', 'web')->first();
            if ($role && ! $role->hasPermissionTo('workos.tasks.filter.any')) {
                $role->givePermissionTo($permission);
            }
        }
    }

    public function down(): void
    {
        Schema::table('kanban_tasks', function (Blueprint $table) {
            $table->dropIndex(['client_deadline']);
            $table->dropColumn('client_deadline');
        });

        $permission = RbacPermission::where('name', 'workos.tasks.filter.any')
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
