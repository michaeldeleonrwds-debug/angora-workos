<?php

namespace Tests\Feature;

use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\RbacPermission;
use App\Models\RbacRole;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use App\Support\RbacCapabilityCatalog;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WorkOsRoleSimplificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_exactly_seven_canonical_system_roles_are_defined_in_catalog(): void
    {
        $roles = RbacCapabilityCatalog::roles();
        $expected = [
            'super_admin',
            'admin',
            'account_manager',
            'project_manager',
            'employee',
            'designer',
            'developer',
        ];

        $this->assertCount(7, $roles);
        $this->assertSame($expected, array_keys($roles));
    }

    public function test_legacy_dept_user_alias_maps_transparently_to_employee(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole('dept_user');

        $this->assertTrue($user->hasRole('employee'));
        $this->assertTrue($user->hasRole('dept_user'));
        $this->assertSame('employee', $user->primaryRoleName());
    }

    public function test_existing_task_assignments_remain_intact_for_employees_and_specializations(): void
    {
        $admin = User::role('super_admin')->first();
        $workspace = Workspace::firstOrCreate(
            ['name' => 'Design Studio Workspace'],
            ['owner_id' => $admin->id]
        );
        $board = KanbanBoard::firstOrCreate(
            ['title' => 'Product Design Sprint'],
            ['workspace_id' => $workspace->id, 'created_by' => $admin->id]
        );
        $column = KanbanColumn::firstOrCreate(
            ['board_id' => $board->id, 'title' => 'In Progress'],
            ['position' => 1]
        );

        $designer = User::factory()->create(['role' => 'designer', 'status' => 'active']);
        $developer = User::factory()->create(['role' => 'developer', 'status' => 'active']);

        $task1 = KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $column->id,
            'title' => 'Design System Tokens',
            'assigned_to' => $designer->id,
            'created_by' => $admin->id,
            'priority' => 'Medium',
        ]);

        $task2 = KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $column->id,
            'title' => 'Implement Token Pipeline',
            'assigned_to' => $developer->id,
            'created_by' => $admin->id,
            'priority' => 'High',
        ]);

        $this->assertSame($designer->id, $task1->fresh()->assigned_to);
        $this->assertSame($developer->id, $task2->fresh()->assigned_to);
    }

    public function test_super_admin_sees_only_the_seven_supported_roles_in_rbac_matrix(): void
    {
        $superAdmin = User::role('super_admin')->first();

        $response = $this->actingAs($superAdmin)->get('/rbac');
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('rbac/index')
            ->has('roles', 7)
            ->has('roles.super_admin')
            ->has('roles.admin')
            ->has('roles.account_manager')
            ->has('roles.project_manager')
            ->has('roles.employee')
            ->has('roles.designer')
            ->has('roles.developer')
            ->missing('roles.dept_user')
            ->missing('roles.client')
            ->missing('roles.sales')
            ->missing('roles.finance')
            ->missing('roles.hr')
            ->missing('roles.operations')
        );
    }

    public function test_users_page_exposes_only_the_seven_supported_roles_to_administrators(): void
    {
        $admin = User::role('admin')->first() ?? User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/users');
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
            ->has('systemRoles', 7)
            ->missing('systemRoles.dept_user')
            ->missing('systemRoles.client')
            ->missing('systemRoles.sales')
            ->missing('systemRoles.finance')
        );
    }

    public function test_admin_cannot_assign_retired_system_roles(): void
    {
        $admin = User::role('admin')->first() ?? User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'employee']);

        // Attempting to assign an obsolete role through rbac controller
        $this->actingAs($admin)
            ->post("/rbac/users/{$target->id}/role", ['role' => 'dept_user'])
            ->assertSessionHasErrors(['role']);
    }

    public function test_baseline_contributor_permissions_match_across_employee_designer_developer(): void
    {
        $employeeRole = RbacRole::findByName('employee', 'web');
        $designerRole = RbacRole::findByName('designer', 'web');
        $developerRole = RbacRole::findByName('developer', 'web');

        $empPerms = $employeeRole->permissions->pluck('name')->sort()->values()->all();
        $desPerms = $designerRole->permissions->pluck('name')->sort()->values()->all();
        $devPerms = $developerRole->permissions->pluck('name')->sort()->values()->all();

        $this->assertSame($empPerms, $desPerms);
        $this->assertSame($empPerms, $devPerms);
        $this->assertContains('workos.tasks.update.assigned', $empPerms);
        $this->assertContains('workos.tasks.move.assigned', $empPerms);
        $this->assertContains('workos.tasks.review.submit', $empPerms);
        $this->assertContains('tasks.comments.create', $empPerms);
        $this->assertContains('tasks.attachments.upload', $empPerms);
        $this->assertNotContains('rbac.manage', $empPerms);
        $this->assertNotContains('system.settings.manage', $empPerms);
    }
}
