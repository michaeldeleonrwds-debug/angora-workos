<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskDependency;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsPhase5TaskDependenciesTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $member;
    protected Workspace $workspaceA;
    protected Workspace $workspaceB;
    protected KanbanBoard $boardA;
    protected KanbanBoard $boardB;
    protected KanbanColumn $colTodo;
    protected KanbanColumn $colDone;
    protected BoardGroup $group;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
            'name' => 'Admin User',
        ]);

        $this->member = User::factory()->create([
            'role' => 'dept_user',
            'status' => 'active',
            'name' => 'Team Member',
        ]);

        $this->workspaceA = Workspace::create([
            'name' => 'Workspace A',
            'slug' => 'workspace-a',
            'owner_id' => $this->admin->id,
        ]);
        $this->workspaceA->users()->attach($this->admin->id, ['role' => 'admin']);
        $this->workspaceA->users()->attach($this->member->id, ['role' => 'member']);

        $this->workspaceB = Workspace::create([
            'name' => 'Workspace B',
            'slug' => 'workspace-b',
            'owner_id' => $this->admin->id,
        ]);
        $this->workspaceB->users()->attach($this->admin->id, ['role' => 'admin']);

        $this->boardA = KanbanBoard::create([
            'workspace_id' => $this->workspaceA->id,
            'title' => 'Board A',
            'created_by' => $this->admin->id,
        ]);

        $this->boardB = KanbanBoard::create([
            'workspace_id' => $this->workspaceB->id,
            'title' => 'Board B',
            'created_by' => $this->admin->id,
        ]);

        $this->colTodo = KanbanColumn::create([
            'board_id' => $this->boardA->id,
            'title' => 'To Do',
            'position' => 0,
        ]);

        $this->colDone = KanbanColumn::create([
            'board_id' => $this->boardA->id,
            'title' => 'Done',
            'position' => 1,
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->boardA->id,
            'title' => 'Default Group',
            'color' => '#579BFC',
            'position' => 0,
        ]);
    }

    private function createTask(KanbanBoard $board, KanbanColumn $column, string $title, array $attrs = []): KanbanTask
    {
        return KanbanTask::create(array_merge([
            'board_id' => $board->id,
            'column_id' => $column->id,
            'board_group_id' => $this->group->id,
            'title' => $title,
            'created_by' => $this->admin->id,
            'position' => 0,
        ], $attrs));
    }

    public function test_can_create_blocked_by_dependency(): void
    {
        $task1 = $this->createTask($this->boardA, $this->colTodo, 'Prerequisite Task');
        $task2 = $this->createTask($this->boardA, $this->colTodo, 'Dependent Task');

        $response = $this->actingAs($this->admin)->postJson("/kanban/tasks/{$task2->id}/dependencies", [
            'depends_on_task_id' => $task1->id,
            'relationship_type' => 'blocked_by',
            'lag_days' => 2,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('task_dependencies', [
            'task_id' => $task2->id,
            'depends_on_task_id' => $task1->id,
            'relationship_type' => 'blocked_by',
            'lag_days' => 2,
            'workspace_id' => $this->workspaceA->id,
        ]);

        // Task 2 should now report as blocked because Task 1 is incomplete
        $this->assertTrue($task2->fresh()->is_blocked);
    }

    public function test_can_create_blocks_dependency_which_maps_to_canonical_blocked_by(): void
    {
        $task1 = $this->createTask($this->boardA, $this->colTodo, 'Blocker Task');
        $task2 = $this->createTask($this->boardA, $this->colTodo, 'Blocked Task');

        // Task 1 blocks Task 2 => canonically Task 2 is blocked_by Task 1
        $response = $this->actingAs($this->admin)->postJson("/kanban/tasks/{$task1->id}/dependencies", [
            'depends_on_task_id' => $task2->id,
            'relationship_type' => 'blocks',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('task_dependencies', [
            'task_id' => $task2->id,
            'depends_on_task_id' => $task1->id,
            'relationship_type' => 'blocked_by',
        ]);

        $this->assertTrue($task2->fresh()->is_blocked);
        $this->assertFalse($task1->fresh()->is_blocked);
    }

    public function test_can_create_symmetric_related_to_dependency(): void
    {
        $task1 = $this->createTask($this->boardA, $this->colTodo, 'Task 1');
        $task2 = $this->createTask($this->boardA, $this->colTodo, 'Task 2');

        $response = $this->actingAs($this->admin)->postJson("/kanban/tasks/{$task1->id}/dependencies", [
            'depends_on_task_id' => $task2->id,
            'relationship_type' => 'related_to',
        ]);

        $response->assertStatus(200);
        $minId = min($task1->id, $task2->id);
        $maxId = max($task1->id, $task2->id);

        $this->assertDatabaseHas('task_dependencies', [
            'task_id' => $minId,
            'depends_on_task_id' => $maxId,
            'relationship_type' => 'related_to',
        ]);

        // Related dependencies should NOT cause either task to be blocked
        $this->assertFalse($task1->fresh()->is_blocked);
        $this->assertFalse($task2->fresh()->is_blocked);
    }

    public function test_self_dependency_is_rejected(): void
    {
        $task = $this->createTask($this->boardA, $this->colTodo, 'Self Task');

        $response = $this->actingAs($this->admin)->postJson("/kanban/tasks/{$task->id}/dependencies", [
            'depends_on_task_id' => $task->id,
            'relationship_type' => 'blocked_by',
        ]);

        $response->assertStatus(422);
    }

    public function test_cycle_detection_prevents_circular_dependencies(): void
    {
        $taskA = $this->createTask($this->boardA, $this->colTodo, 'Task A');
        $taskB = $this->createTask($this->boardA, $this->colTodo, 'Task B');
        $taskC = $this->createTask($this->boardA, $this->colTodo, 'Task C');

        // A is blocked by B (B -> A)
        $this->actingAs($this->admin)->postJson("/kanban/tasks/{$taskA->id}/dependencies", [
            'depends_on_task_id' => $taskB->id,
            'relationship_type' => 'blocked_by',
        ])->assertStatus(200);

        // B is blocked by C (C -> B)
        $this->actingAs($this->admin)->postJson("/kanban/tasks/{$taskB->id}/dependencies", [
            'depends_on_task_id' => $taskC->id,
            'relationship_type' => 'blocked_by',
        ])->assertStatus(200);

        // Now attempt: C is blocked by A (A -> C) which forms a cycle: C -> B -> A -> C
        $response = $this->actingAs($this->admin)->postJson("/kanban/tasks/{$taskC->id}/dependencies", [
            'depends_on_task_id' => $taskA->id,
            'relationship_type' => 'blocked_by',
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('circular dependency', strtolower($response->json('message')));
    }

    public function test_cross_workspace_dependency_is_rejected(): void
    {
        $colB = KanbanColumn::create([
            'board_id' => $this->boardB->id,
            'title' => 'To Do',
            'position' => 0,
        ]);
        $taskInA = $this->createTask($this->boardA, $this->colTodo, 'Task In Workspace A');
        $taskInB = KanbanTask::create([
            'board_id' => $this->boardB->id,
            'column_id' => $colB->id,
            'title' => 'Task In Workspace B',
            'created_by' => $this->admin->id,
            'position' => 0,
        ]);

        $response = $this->actingAs($this->admin)->postJson("/kanban/tasks/{$taskInA->id}/dependencies", [
            'depends_on_task_id' => $taskInB->id,
            'relationship_type' => 'blocked_by',
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('cross-workspace', strtolower($response->json('message')));
    }

    public function test_task_is_unblocked_when_blocker_is_completed(): void
    {
        $task1 = $this->createTask($this->boardA, $this->colTodo, 'Prerequisite Task');
        $task2 = $this->createTask($this->boardA, $this->colTodo, 'Dependent Task');

        $this->actingAs($this->admin)->postJson("/kanban/tasks/{$task2->id}/dependencies", [
            'depends_on_task_id' => $task1->id,
            'relationship_type' => 'blocked_by',
        ])->assertStatus(200);

        $this->assertTrue($task2->fresh()->is_blocked);

        // Mark task1 as completed
        $task1->update([
            'completed_at' => now(),
            'progress' => 100,
            'column_id' => $this->colDone->id,
        ]);

        // Task 2 should now automatically be unblocked
        $this->assertFalse($task2->fresh()->is_blocked);
    }

    public function test_can_remove_dependency(): void
    {
        $task1 = $this->createTask($this->boardA, $this->colTodo, 'Prerequisite Task');
        $task2 = $this->createTask($this->boardA, $this->colTodo, 'Dependent Task');

        $this->actingAs($this->admin)->postJson("/kanban/tasks/{$task2->id}/dependencies", [
            'depends_on_task_id' => $task1->id,
            'relationship_type' => 'blocked_by',
        ])->assertStatus(200);

        $dep = TaskDependency::where('task_id', $task2->id)
            ->where('depends_on_task_id', $task1->id)
            ->firstOrFail();

        $response = $this->actingAs($this->admin)->deleteJson("/kanban/dependencies/{$dep->id}");
        $response->assertStatus(200);

        $this->assertDatabaseMissing('task_dependencies', ['id' => $dep->id]);
        $this->assertFalse($task2->fresh()->is_blocked);
    }

    public function test_linkable_tasks_search_filters_within_workspace_and_excludes_self(): void
    {
        $task1 = $this->createTask($this->boardA, $this->colTodo, 'Alpha Target Task');
        $task2 = $this->createTask($this->boardA, $this->colTodo, 'Beta Subject Task');

        $response = $this->actingAs($this->admin)->getJson("/kanban/tasks/{$task2->id}/linkable-tasks?query=Alpha");
        $response->assertStatus(200);

        $results = $response->json();
        $this->assertCount(1, $results);
        $this->assertEquals($task1->id, $results[0]['id']);

        // Querying for self should return empty
        $responseSelf = $this->actingAs($this->admin)->getJson("/kanban/tasks/{$task2->id}/linkable-tasks?query=Beta");
        $responseSelf->assertStatus(200);
        $this->assertCount(0, $responseSelf->json());
    }
}
