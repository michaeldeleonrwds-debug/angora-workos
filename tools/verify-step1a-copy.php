<?php

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$database = $argv[1] ?? null;
if (! in_array($database, ['angora', 'angora_step1a_restore_20261015'], true)) {
    throw new RuntimeException('Expected a named Angora database.');
}

config(['database.connections.mysql.database' => $database]);
DB::purge('mysql');
$db = DB::connection('mysql');
$legacyColumn = Schema::connection('mysql')->hasColumn('users', 'legacy_role') ? 'legacy_role' : 'role';
$counts = [];
foreach (['users', 'permissions', 'role_permissions', 'user_permissions', 'workspace_members', 'board_members', 'kanban_tasks'] as $table) {
    $counts[$table] = $db->table($table)->count();
}
$roles = $db->table('users')->select($legacyColumn)->selectRaw('count(*) as total')->groupBy($legacyColumn)->pluck('total', $legacyColumn);
$result = ['database' => $database, 'counts' => $counts, 'legacy_roles' => $roles];

if ($legacyColumn === 'legacy_role') {
    foreach (['roles', 'spatie_permissions', 'model_has_roles', 'role_has_permissions', 'model_has_permissions'] as $table) {
        $result['spatie_counts'][$table] = $db->table($table)->count();
    }
    $mismatchedRoles = [];
    foreach ($db->table('users')->select('id', 'legacy_role')->get() as $user) {
        $assigned = $db->table('model_has_roles')->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_type', App\Models\User::class)
            ->where('model_has_roles.model_id', $user->id)->pluck('roles.name')->all();
        if ($assigned !== [$user->legacy_role]) {
            $mismatchedRoles[] = $user->id;
        }
    }
    $result['mismatched_user_role_ids'] = $mismatchedRoles;
    $grantDiffs = [];
    foreach ($roles->keys() as $roleName) {
        $legacyGrants = $db->table('role_permissions')->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')
            ->where('role_permissions.role', $roleName)->pluck('permissions.name')->sort()->values()->all();
        $spatieGrants = $db->table('role_has_permissions')
            ->join('roles', 'roles.id', '=', 'role_has_permissions.role_id')
            ->join('spatie_permissions', 'spatie_permissions.id', '=', 'role_has_permissions.permission_id')
            ->where('roles.name', $roleName)->pluck('spatie_permissions.name')->sort()->values()->all();
        $grantDiffs[$roleName] = [
            'legacy_count' => count($legacyGrants),
            'spatie_count' => count($spatieGrants),
            'missing_legacy' => array_values(array_diff($legacyGrants, $spatieGrants)),
            'new_grants' => array_values(array_diff($spatieGrants, $legacyGrants)),
        ];
    }
    $result['role_grant_diffs'] = $grantDiffs;
    $result['admin_manager_has_rbac_manage'] = $db->table('role_has_permissions')
        ->join('roles', 'roles.id', '=', 'role_has_permissions.role_id')
        ->join('spatie_permissions', 'spatie_permissions.id', '=', 'role_has_permissions.permission_id')
        ->where('roles.name', 'admin_manager')->where('spatie_permissions.name', 'rbac.manage')->exists();
    $result['super_admin_has_protected'] = $db->table('role_has_permissions')
        ->join('roles', 'roles.id', '=', 'role_has_permissions.role_id')
        ->join('spatie_permissions', 'spatie_permissions.id', '=', 'role_has_permissions.permission_id')
        ->where('roles.name', 'super_admin')->whereIn('spatie_permissions.name', ['rbac.manage', 'permissions.manage', 'system.settings.manage'])->count();
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
