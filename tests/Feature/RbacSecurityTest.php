<?php

namespace Tests\Feature;

use App\Models\RbacPermission;
use App\Models\RbacRole;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RbacSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_employee_is_forbidden_from_hr_and_production_modules(): void
    {
        $employee = User::factory()->create(['role' => 'employee', 'status' => 'active']);
        $this->actingAs($employee);

        // HR is restricted
        $hrResponse = $this->get('/hr');
        $hrResponse->assertStatus(403);

        // Production is restricted
        $prodResponse = $this->get('/production');
        $prodResponse->assertStatus(403);

        // Finance is restricted
        $finResponse = $this->get('/finance');
        $finResponse->assertStatus(403);

        // Sales is allowed or restricted according to policy
        $salesResponse = $this->get('/sales');
        $this->assertTrue(in_array($salesResponse->status(), [200, 403], true));
    }

    public function test_employee_cannot_access_rbac_matrix_manager(): void
    {
        $employee = User::factory()->create(['role' => 'employee', 'status' => 'active']);
        $this->actingAs($employee);

        $response = $this->get('/rbac');
        $response->assertStatus(403);
        $this->get('/users')->assertForbidden();
    }

    public function test_project_manager_cannot_open_global_user_administration(): void
    {
        $projectManager = User::factory()->create(['role' => 'project_manager', 'status' => 'active']);

        $this->actingAs($projectManager)->get('/users')->assertForbidden();
        $this->get('/rbac')->assertForbidden();
    }

    public function test_suspended_user_cannot_use_a_registered_module_permission(): void
    {
        $user = User::factory()->create(['role' => 'sales_staff', 'status' => 'suspended']);

        $this->actingAs($user)->get('/sales')->assertRedirect(route('login'));
        $this->actingAs($user)->getJson('/sales')->assertForbidden();
    }

    public function test_admin_users_page_hides_protected_account_actions_and_roles(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $superAdmin = User::role('super_admin')->first();

        $this->actingAs($admin)->get('/users')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
            ->missing('assignableRoles.super_admin')
            ->missing('assignableRoles.admin')
            ->where('users.data', fn ($users) => collect($users)->contains(fn ($user) =>
                $user['id'] === $superAdmin->id && ! $user['can_edit'] && ! $user['can_suspend'] && ! $user['can_delete']))
            ->etc());
    }

    public function test_super_admin_can_access_and_manage_rbac(): void
    {
        $superAdmin = User::role('super_admin')->first();
        $this->actingAs($superAdmin);

        $response = $this->get('/rbac');
        $response->assertStatus(200);

        // Can update permissions
        $permId = RbacPermission::where('is_delegable', true)->first()->id;
        $updateResponse = $this->post('/rbac/roles/designer/permissions', [
            'permission_ids' => [$permId],
        ]);
        $updateResponse->assertStatus(302);
    }

    public function test_admin_can_create_a_custom_role_and_assign_only_registered_delegable_permissions(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $target = User::factory()->create(['role' => 'employee', 'status' => 'active']);
        $this->actingAs($admin);

        $this->post('/rbac/roles', ['name' => 'production_reviewer'])->assertRedirect();
        $role = RbacRole::findByName('production_reviewer', 'web');
        $permission = RbacPermission::where('is_delegable', true)->first();

        $this->post("/rbac/roles/{$role->name}/permissions", [
            'permission_ids' => [$permission->id],
        ])->assertRedirect();
        $this->assertTrue($role->fresh()->hasPermissionTo($permission->name));

        $this->post("/rbac/users/{$target->id}/role", ['role' => $role->name])->assertRedirect();
        $this->assertTrue($target->fresh()->hasRole($role->name));
    }

    public function test_admin_cannot_grant_protected_permissions_or_assign_super_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $target = User::factory()->create(['role' => 'employee', 'status' => 'active']);
        $role = RbacRole::findByName('employee', 'web');
        $protected = RbacPermission::findByName('permissions.manage', 'web');
        $this->actingAs($admin);

        $this->post("/rbac/roles/{$role->name}/permissions", [
            'permission_ids' => [$protected->id],
        ])->assertForbidden();
        $this->assertFalse($role->fresh()->hasPermissionTo('permissions.manage'));

        $this->post("/rbac/users/{$target->id}/role", ['role' => 'super_admin'])->assertForbidden();
        $this->post("/rbac/users/{$admin->id}/role", ['role' => 'project_manager'])->assertForbidden();
        $this->assertFalse($target->fresh()->isSuperAdmin());
        $this->assertTrue($admin->fresh()->hasRole('admin'));
    }

    public function test_admin_cannot_assign_or_edit_custom_role_with_a_protected_grant(): void
    {
        $superAdmin = User::role('super_admin')->first();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $target = User::factory()->create(['role' => 'employee', 'status' => 'active']);
        $role = RbacRole::create(['name' => 'protected_custom', 'guard_name' => 'web']);
        $role->givePermissionTo('permissions.manage');

        $this->actingAs($admin)
            ->post("/rbac/users/{$target->id}/role", ['role' => $role->name])
            ->assertForbidden();
        $this->post("/rbac/roles/{$role->name}/permissions", ['permission_ids' => []])
            ->assertForbidden();
        $this->assertFalse($target->fresh()->hasRole($role->name));
        $this->assertTrue($superAdmin->isSuperAdmin());
    }

    public function test_last_active_super_admin_cannot_be_demoted_or_suspended(): void
    {
        $superAdmin = User::role('super_admin')->first();
        $this->actingAs($superAdmin);

        $this->post("/rbac/users/{$superAdmin->id}/role", ['role' => 'admin'])->assertForbidden();
        $this->patch("/users/{$superAdmin->id}", ['status' => 'suspended'])->assertForbidden();
        $this->assertTrue($superAdmin->fresh()->isSuperAdmin());
        $this->assertSame('active', $superAdmin->fresh()->status);
    }

    public function test_rbac_and_user_management_capabilities_are_shared_only_with_authorized_roles(): void
    {
        $superAdmin = User::role('super_admin')->first();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $designer = User::factory()->create(['role' => 'designer', 'status' => 'active']);
        $projectManager = User::factory()->create(['role' => 'project_manager', 'status' => 'active']);

        $this->actingAs($superAdmin)->get('/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('auth.capabilities.canManageRbac', true)
            ->where('auth.capabilities.canManageUsers', true)
        );

        $this->actingAs($admin)->get('/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('auth.capabilities.canManageRbac', true)
            ->where('auth.capabilities.canManageUsers', true)
        );

        $this->actingAs($projectManager)->get('/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('auth.capabilities.canManageRbac', false)
            ->where('auth.capabilities.canManageUsers', false)
        );

        $this->actingAs($designer)->get('/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('auth.capabilities.canManageRbac', false)
            ->where('auth.capabilities.canManageUsers', false)
        );

        $this->actingAs($superAdmin)->get('/rbac')->assertOk();
        $this->actingAs($superAdmin)->get('/users')->assertOk();
    }
}
