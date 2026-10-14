<?php

namespace Tests\Feature;

use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Services\WorkloadCapacityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsPhase5WorkloadCapacityTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $developer;
    protected User $designer;
    protected User $externalUser;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $colTodo;
    protected KanbanColumn $colDone;
    protected BoardGroup $group;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
            'name' => 'Admin Boss',
            'weekly_capacity_hours' => 40.0,
            'daily_capacity_hours' => 8.0,
        ]);

        $this->developer = User::factory()->create([
            'role' => 'dept_user',
            'status' => 'active',
            'name' => 'Alex Developer',
            'weekly_capacity_hours' => 40.0,
            'daily_capacity_hours' => 8.0,
        ]);

        $this->designer = User::factory()->create([
            'role' => 'dept_user',
            'status' => 'active',
            'name' => 'Dana Designer',
            'weekly_capacity_hours' => 30.0, // Part-time 30h
            'daily_capacity_hours' => 6.0,
        ]);

        $this->externalUser = User::factory()->create([
            'role' => 'external_user',
            'status' => 'active',
            'name' => 'External Client',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Agency Workspace',
            'slug' => 'agency-workspace',
            'owner_id' => $this->admin->id,
        ]);
        $this->workspace->users()->attach($this->admin->id, ['role' => 'admin']);
        $this->workspace->users()->attach($this->developer->id, ['role' => 'member']);
        $this->workspace->users()->attach($this->designer->id, ['role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Core Engineering Board',
            'created_by' => $this->admin->id,
        ]);

        $this->colTodo = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Progress',
            'position' => 0,
            'color' => '#3b82f6',
        ]);

        $this->colDone = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Done',
            'position' => 1,
            'color' => '#10b981',
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Sprint Alpha',
            'color' => '#579BFC',
            'position' => 0,
        ]);
    }

    public function test_user_can_retrieve_board_workload_analytics()
    {
        // Create task assigned to developer
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Build Authentication API',
            'priority' => 'High',
            'estimated_hours' => 16.0,
            'assigned_to' => $this->developer->id,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->developer)
            ->getJson("/kanban/boards/{$this->board->id}/workload-analytics");

        $response->assertOk();
        $response->assertJsonStructure([
            'timeframe',
            'effort_split_mode',
            'date_range',
            'summary' => [
                'total_capacity_hours',
                'total_allocated_hours',
                'team_utilization_rate',
                'overallocated_count',
                'optimal_count',
                'underutilized_count',
                'unassigned_tasks_count',
            ],
            'members',
            'unassigned_tasks',
        ]);

        $members = collect($response->json('members'));
        $alex = $members->firstWhere('user.id', $this->developer->id);

        $this->assertNotNull($alex);
        $this->assertEquals(16.0, $alex['allocated_hours']);
        $this->assertEquals(40.0, $alex['capacity_hours']);
        $this->assertEquals(40.0, $alex['utilization_rate']);
        $this->assertEquals('underutilized', $alex['status']);
    }

    public function test_multi_assignee_task_splits_effort_equally_when_requested()
    {
        // 20 hours task with 2 assignees (developer + designer)
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Design System Implementation',
            'priority' => 'High',
            'estimated_hours' => 20.0,
            'assigned_to' => $this->developer->id,
            'custom_values' => [
                'multi_assignees' => [$this->designer->id],
            ],
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/kanban/boards/{$this->board->id}/workload-analytics?effort_split_mode=equal");

        $response->assertOk();
        $members = collect($response->json('members'));

        $alex = $members->firstWhere('user.id', $this->developer->id);
        $dana = $members->firstWhere('user.id', $this->designer->id);

        // 20h divided by 2 = 10h each
        $this->assertEquals(10.0, $alex['allocated_hours']);
        $this->assertEquals(10.0, $dana['allocated_hours']);
    }

    public function test_multi_assignee_task_full_effort_mode()
    {
        // 20 hours task with 2 assignees under full effort mode
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Full Effort Joint Workshop',
            'priority' => 'High',
            'estimated_hours' => 20.0,
            'assigned_to' => $this->developer->id,
            'custom_values' => [
                'multi_assignees' => [$this->designer->id],
            ],
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/kanban/boards/{$this->board->id}/workload-analytics?effort_split_mode=full");

        $response->assertOk();
        $members = collect($response->json('members'));

        $alex = $members->firstWhere('user.id', $this->developer->id);
        $dana = $members->firstWhere('user.id', $this->designer->id);

        // In full mode, each assignee is charged the full 20h
        $this->assertEquals(20.0, $alex['allocated_hours']);
        $this->assertEquals(20.0, $dana['allocated_hours']);
    }

    public function test_overallocated_status_flagged_when_exceeding_capacity()
    {
        // Dana has 30h capacity. Assign 45h of tasks.
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Massive Overloaded Campaign',
            'priority' => 'High',
            'estimated_hours' => 45.0,
            'assigned_to' => $this->designer->id,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/kanban/boards/{$this->board->id}/workload-analytics");

        $response->assertOk();
        $members = collect($response->json('members'));
        $dana = $members->firstWhere('user.id', $this->designer->id);

        $this->assertEquals(45.0, $dana['allocated_hours']);
        $this->assertEquals(30.0, $dana['capacity_hours']);
        $this->assertEquals(150.0, $dana['utilization_rate']);
        $this->assertEquals('overallocated', $dana['status']);
        $this->assertEquals(1, $response->json('summary.overallocated_count'));
    }

    public function test_optimal_utilization_status()
    {
        // Dana has 30h capacity. Assign 24h => 80% utilization (between 70% and 100%)
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Optimal Scope UI Design',
            'priority' => 'High',
            'estimated_hours' => 24.0,
            'assigned_to' => $this->designer->id,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/kanban/boards/{$this->board->id}/workload-analytics");

        $response->assertOk();
        $members = collect($response->json('members'));
        $dana = $members->firstWhere('user.id', $this->designer->id);

        $this->assertEquals(24.0, $dana['allocated_hours']);
        $this->assertEquals(80.0, $dana['utilization_rate']);
        $this->assertEquals('optimal', $dana['status']);
    }

    public function test_daily_timeframe_uses_daily_capacity_baseline()
    {
        // Alex has 8.0h daily capacity. Assign 10h task.
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Daily Push Task',
            'priority' => 'High',
            'estimated_hours' => 10.0,
            'assigned_to' => $this->developer->id,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/kanban/boards/{$this->board->id}/workload-analytics?timeframe=daily");

        $response->assertOk();
        $members = collect($response->json('members'));
        $alex = $members->firstWhere('user.id', $this->developer->id);

        $this->assertEquals(8.0, $alex['capacity_hours']);
        $this->assertEquals(10.0, $alex['allocated_hours']);
        $this->assertEquals(125.0, $alex['utilization_rate']);
        $this->assertEquals('overallocated', $alex['status']);
    }

    public function test_admin_or_self_can_update_member_capacity()
    {
        $response = $this->actingAs($this->admin)
            ->patchJson("/users/{$this->designer->id}/capacity", [
                'weekly_capacity_hours' => 35.0,
                'daily_capacity_hours' => 7.0,
            ]);

        $response->assertOk();
        $this->designer->refresh();
        $this->assertEquals(35.0, $this->designer->weekly_capacity_hours);
        $this->assertEquals(7.0, $this->designer->daily_capacity_hours);

        // Self-update
        $response2 = $this->actingAs($this->designer)
            ->patchJson("/users/{$this->designer->id}/capacity", [
                'weekly_capacity_hours' => 32.5,
            ]);

        $response2->assertOk();
        $this->designer->refresh();
        $this->assertEquals(32.5, $this->designer->weekly_capacity_hours);
    }

    public function test_unauthorized_user_cannot_update_other_member_capacity()
    {
        $response = $this->actingAs($this->developer)
            ->patchJson("/users/{$this->designer->id}/capacity", [
                'weekly_capacity_hours' => 20.0,
            ]);

        $response->assertForbidden();
    }

    public function test_external_user_cannot_view_workload_analytics()
    {
        $response = $this->actingAs($this->externalUser)
            ->getJson("/kanban/boards/{$this->board->id}/workload-analytics");

        $response->assertForbidden();
    }
}
