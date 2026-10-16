<?php

namespace Tests\Feature;

use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Authorization\WorkOsPermissionService;
use App\Support\RbacCapabilityCatalog;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Role-based Kanban UX fixes:
 *  1. Stage-aware deadline badges + role-gated Client Deadline serialization.
 *  3. Permission-backed default person filter scope (All vs My Tasks).
 *  4. Workflow stage creation stays gated behind manageStatuses.
 *
 * Fix 2 (sidebar entry) and the vertical Add Workflow Stage control are
 * React-only and are covered by `npm run types` / `npm run build`.
 */
class KanbanRoleBasedUxTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $pm;
    private User $employee;
    private Workspace $workspace;
    private KanbanBoard $board;
    private KanbanColumn $production;
    private KanbanColumn $review;
    private KanbanColumn $completed;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->manager = User::factory()->create([
            'role' => 'account_manager',
            'email' => 'role-ux-manager@angora.test',
        ]);
        $this->pm = User::factory()->create([
            'role' => 'project_manager',
            'email' => 'role-ux-pm@angora.test',
        ]);
        $this->employee = User::factory()->create([
            'role' => 'employee',
            'email' => 'role-ux-employee@angora.test',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Role Based UX Workspace',
            'slug' => 'role-based-ux-workspace',
            'owner_id' => $this->manager->id,
            'status' => 'active',
        ]);
        $this->workspace->members()->create(['user_id' => $this->manager->id, 'role' => 'owner']);
        $this->workspace->members()->create(['user_id' => $this->pm->id, 'role' => 'admin']);
        $this->workspace->members()->create(['user_id' => $this->employee->id, 'role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Role Based UX Board',
            'created_by' => $this->manager->id,
        ]);

        $this->production = $this->createColumn('In Progress', 'in_progress');
        $this->review = $this->createColumn('For Review', 'in_review');
        $this->completed = $this->createColumn('Complete', 'completed');
    }

    private function createColumn(string $title, string $semanticCategory): KanbanColumn
    {
        return KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => $title,
            'color' => '#64748b',
            'position' => KanbanColumn::where('board_id', $this->board->id)->count(),
            'semantic_category' => $semanticCategory,
            'stage_key' => str_replace(' ', '_', strtolower($title)),
            'stage_role' => 'workflow',
        ]);
    }

    private function makeTask(KanbanColumn $column, array $overrides = []): KanbanTask
    {
        return KanbanTask::create(array_merge([
            'board_id' => $this->board->id,
            'column_id' => $column->id,
            'title' => 'Deadline Probe Task',
            'priority' => 'High',
            'due_date' => now()->subDay()->toDateString(),
            'created_by' => $this->manager->id,
            'position' => 0,
        ], $overrides));
    }

    // ------------------------------------------------------------------
    // 1. Stage-aware deadline badges
    // ------------------------------------------------------------------

    public function test_overdue_badge_shows_during_active_production_stage(): void
    {
        $task = $this->makeTask($this->production);

        $this->actingAs($this->manager);

        $this->assertEquals('overdue', $task->deadline_status);
        $this->assertStringStartsWith('Overdue by', (string) $task->time_remaining);
    }

    public function test_overdue_badge_is_suppressed_in_review_stage(): void
    {
        $task = $this->makeTask($this->review);

        $this->actingAs($this->manager);

        $this->assertEquals('no_deadline', $task->deadline_status);
        $this->assertNull($task->time_remaining);
        // The stored deadline itself is untouched — only warnings are hidden.
        $this->assertEquals(now()->subDay()->toDateString(), $task->due_date);
    }

    public function test_due_today_badge_only_shows_in_active_production_stage(): void
    {
        $inProduction = $this->makeTask($this->production, ['due_date' => now()->toDateString()]);
        $inReview = $this->makeTask($this->review, ['due_date' => now()->toDateString()]);

        $this->actingAs($this->manager);

        $this->assertEquals('due_today', $inProduction->deadline_status);
        $this->assertEquals('no_deadline', $inReview->deadline_status);
    }

    public function test_completed_tasks_keep_completion_status_and_never_overdue(): void
    {
        $task = $this->makeTask($this->completed, ['completed_at' => now()]);

        $this->actingAs($this->manager);

        $this->assertEquals('completed_late', $task->deadline_status);
        $this->assertNotEquals('overdue', $task->deadline_status);
    }

    // ------------------------------------------------------------------
    // 1b. Client Deadline role gating
    // ------------------------------------------------------------------

    public function test_client_deadline_never_serializes_to_contributors(): void
    {
        $task = $this->makeTask($this->production, [
            'client_deadline' => '2026-11-15',
            'custom_values' => ['client_deadline' => '2026-11-15'],
        ]);

        $this->actingAs($this->employee);
        $payload = $task->toArray();

        $this->assertArrayNotHasKey('client_deadline', $payload);
        $this->assertArrayNotHasKey('client_deadline', $payload['custom_values'] ?? []);

        // Deny-by-default serialization never mutates what is stored.
        $fresh = $task->fresh();
        $rawCustomValues = json_decode($fresh->getRawOriginal('custom_values'), true);
        $this->assertEquals('2026-11-15', $fresh->getRawOriginal('client_deadline'));
        $this->assertEquals('2026-11-15', $rawCustomValues['client_deadline']);
    }

    public function test_client_deadline_visible_to_account_manager(): void
    {
        $task = $this->makeTask($this->production, [
            'client_deadline' => '2026-11-15',
            'custom_values' => ['client_deadline' => '2026-11-15'],
        ]);

        $this->actingAs($this->manager);
        $payload = $task->toArray();

        $this->assertEquals('2026-11-15', $payload['client_deadline']);
        $this->assertEquals('2026-11-15', $payload['custom_values']['client_deadline']);
    }

    // ------------------------------------------------------------------
    // 3. Permission-backed default person filter scope
    // ------------------------------------------------------------------

    public function test_management_role_receives_all_tasks_filter_capability(): void
    {
        $permissions = app(WorkOsPermissionService::class)->getBoardPermissions($this->manager, $this->board);

        $this->assertTrue($permissions['canView']);
        $this->assertTrue($permissions['canViewAllTasks']);
        $this->assertTrue($permissions['canFilterPersonalTasks']);
    }

    public function test_contributor_default_scope_is_personal_and_still_filterable(): void
    {
        $permissions = app(WorkOsPermissionService::class)->getBoardPermissions($this->employee, $this->board);

        $this->assertTrue($permissions['canView']);
        $this->assertFalse($permissions['canViewAllTasks']);
        $this->assertTrue($permissions['canFilterPersonalTasks']);
    }

    public function test_filter_capabilities_are_registered_and_granted_as_expected(): void
    {
        $capabilities = RbacCapabilityCatalog::capabilities();

        $this->assertArrayHasKey('workos.tasks.filter.any', $capabilities);
        $this->assertArrayHasKey('workos.tasks.filter.personal', $capabilities);
        $this->assertSame(
            ['super_admin', 'admin', 'project_manager', 'account_manager'],
            $capabilities['workos.tasks.filter.any']['roles']
        );
        $this->assertCount(7, $capabilities['workos.tasks.filter.personal']['roles']);

        $this->assertTrue($this->employee->hasPermission('workos.tasks.filter.personal'));
        $this->assertFalse($this->employee->hasPermission('workos.tasks.filter.any'));
        $this->assertTrue($this->manager->hasPermission('workos.tasks.filter.any'));
    }

    public function test_kanban_page_shares_filter_permissions_with_contributor(): void
    {
        $this->actingAs($this->employee)
            ->get(route('kanban.index', ['board' => $this->board->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('kanban/index')
                ->where('permissions.canViewAllTasks', false)
                ->where('permissions.canFilterPersonalTasks', true)
            );
    }

    // ------------------------------------------------------------------
    // 4. Workflow stage creation authorization
    // ------------------------------------------------------------------

    public function test_contributor_cannot_create_workflow_stage(): void
    {
        $before = KanbanColumn::where('board_id', $this->board->id)->count();

        $this->actingAs($this->employee)
            ->post(route('kanban.stages.store', $this->board), ['title' => 'Unauthorized Stage'])
            ->assertForbidden();

        $this->assertEquals($before, KanbanColumn::where('board_id', $this->board->id)->count());
    }

    public function test_project_manager_can_create_workflow_stage_without_disturbing_existing_ones(): void
    {
        $existingIds = KanbanColumn::where('board_id', $this->board->id)->pluck('id')->all();

        $this->actingAs($this->pm)
            ->post(route('kanban.stages.store', $this->board), [
                'title' => 'Client QA',
                'semantic_category' => 'in_review',
            ])
            ->assertSessionHas('success');

        $created = KanbanColumn::where('board_id', $this->board->id)->where('title', 'Client QA')->first();
        $this->assertNotNull($created);
        $this->assertEquals('in_review', $created->semantic_category);
        $this->assertNotEmpty($created->stage_key);

        $afterIds = KanbanColumn::where('board_id', $this->board->id)->pluck('id')->all();
        foreach ($existingIds as $id) {
            $this->assertContains($id, $afterIds);
        }
    }
}
