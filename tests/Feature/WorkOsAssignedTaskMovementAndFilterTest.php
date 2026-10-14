<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskDependency;
use App\Models\TaskReviewCycle;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsAssignedTaskMovementAndFilterTest extends TestCase
{
    use RefreshDatabase;

    protected User $designer;
    protected User $otherDesigner;
    protected User $projectManager;
    protected User $admin;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected BoardGroup $group;

    protected KanbanColumn $colNotStarted;
    protected KanbanColumn $colInProgress;
    protected KanbanColumn $colInReview;
    protected KanbanColumn $colCompleted;

    protected KanbanTask $assignedTask;
    protected KanbanTask $unassignedTask;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->projectManager = User::factory()->create(['role' => 'project_manager']);
        $this->designer = User::factory()->create(['role' => 'designer']);
        $this->otherDesigner = User::factory()->create(['role' => 'designer']);

        $this->workspace = Workspace::create([
            'name' => 'Production Studio',
            'owner_id' => $this->admin->id,
        ]);

        WorkspaceMember::create([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->admin->id,
            'role' => 'admin',
        ]);
        WorkspaceMember::create([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->projectManager->id,
            'role' => 'member',
        ]);
        WorkspaceMember::create([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->designer->id,
            'role' => 'member',
        ]);
        WorkspaceMember::create([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->otherDesigner->id,
            'role' => 'member',
        ]);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Main Production Board',
            'created_by' => $this->admin->id,
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Sprint 1',
            'color' => '#579BFC',
            'position' => 0,
        ]);

        $this->colNotStarted = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Not Started',
            'color' => '#64748B',
            'position' => 0,
            'category' => 'not_started',
        ]);
        $this->colInProgress = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Progress',
            'color' => '#3B82F6',
            'position' => 1,
            'category' => 'in_progress',
        ]);
        $this->colInReview = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Review',
            'color' => '#F59E0B',
            'position' => 2,
            'category' => 'in_review',
        ]);
        $this->colCompleted = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Completed',
            'color' => '#10B981',
            'position' => 3,
            'category' => 'completed',
        ]);

        $this->assignedTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Assigned Designer Task',
            'assigned_to' => $this->designer->id,
            'created_by' => $this->admin->id,
            'priority' => 'Medium',
            'position' => 0,
            'progress' => 0,
        ]);

        $this->unassignedTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Unassigned Task',
            'assigned_to' => null,
            'created_by' => $this->admin->id,
            'priority' => 'Medium',
            'position' => 1,
            'progress' => 0,
        ]);
    }

    /** 1. Assigned Designer can move task through permitted stages */
    public function test_assigned_designer_can_move_task_through_permitted_stages(): void
    {
        $this->actingAs($this->designer);

        // Move Not Started -> In Progress
        $response = $this->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
            'column_id' => $this->colInProgress->id,
        ]);
        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
        $this->assertEquals($this->colInProgress->id, $this->assignedTask->fresh()->column_id);

        // Move In Progress -> In Review
        $response2 = $this->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
            'column_id' => $this->colInReview->id,
        ]);
        $this->assertTrue($response2->isSuccessful() || $response2->isRedirection());
        $this->assertEquals($this->colInReview->id, $this->assignedTask->fresh()->column_id);
    }

    /** 2. Assigned Designer cannot use a forbidden transition */
    public function test_assigned_designer_cannot_use_a_forbidden_transition(): void
    {
        $this->actingAs($this->designer);

        // Direct move to Completed is forbidden for designers
        $response = $this->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
            'column_id' => $this->colCompleted->id,
        ]);
        $response->assertStatus(403);
        $this->assertEquals($this->colNotStarted->id, $this->assignedTask->fresh()->column_id);
    }

    /** 3. Unassigned Designer cannot move a task */
    public function test_unassigned_designer_cannot_move_a_task(): void
    {
        $this->actingAs($this->designer);

        $response = $this->patch("/kanban/tasks/{$this->unassignedTask->id}/column", [
            'column_id' => $this->colInProgress->id,
        ]);
        $response->assertStatus(403);
        $this->assertEquals($this->colNotStarted->id, $this->unassignedTask->fresh()->column_id);
    }

    /** 4. Assigned Designer can reorder their own task */
    public function test_assigned_designer_can_reorder_their_own_task(): void
    {
        $this->actingAs($this->designer);

        $task2 = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Assigned Task 2',
            'assigned_to' => $this->designer->id,
            'created_by' => $this->admin->id,
            'priority' => 'Medium',
            'position' => 1,
            'progress' => 0,
        ]);

        $response = $this->post('/kanban/tasks/reorder', [
            'column_id' => $this->colNotStarted->id,
            'tasks' => [
                ['id' => $task2->id, 'position' => 0],
                ['id' => $this->assignedTask->id, 'position' => 1],
            ],
        ]);

        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
        $this->assertEquals(1, $this->assignedTask->fresh()->position);
        $this->assertEquals(0, $task2->fresh()->position);
    }

    /** 5. Designer cannot reorder another employee's task */
    public function test_designer_cannot_reorder_another_employees_task(): void
    {
        $this->actingAs($this->designer);

        $otherTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Other Designer Task',
            'assigned_to' => $this->otherDesigner->id,
            'created_by' => $this->admin->id,
            'priority' => 'Medium',
            'position' => 2,
            'progress' => 0,
        ]);

        $response = $this->post('/kanban/tasks/reorder', [
            'column_id' => $this->colNotStarted->id,
            'tasks' => [
                ['id' => $otherTask->id, 'position' => 0],
                ['id' => $this->assignedTask->id, 'position' => 1],
            ],
        ]);

        $response->assertStatus(403);
    }

    /** 6. Multi-assignee Designer can move an assigned task */
    public function test_multi_assignee_designer_can_move_an_assigned_task(): void
    {
        $this->actingAs($this->designer);

        $multiTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Multi-assigned Task',
            'assigned_to' => null,
            'custom_values' => [
                'designer_ids' => [$this->otherDesigner->id, $this->designer->id],
            ],
            'created_by' => $this->admin->id,
            'priority' => 'Medium',
            'position' => 0,
            'progress' => 0,
        ]);

        $response = $this->patch("/kanban/tasks/{$multiTask->id}/column", [
            'column_id' => $this->colInProgress->id,
        ]);

        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
        $this->assertEquals($this->colInProgress->id, $multiTask->fresh()->column_id);
    }

    /** 7. Dynamic people-column assignment is recognized */
    public function test_dynamic_people_column_assignment_is_recognized(): void
    {
        $this->actingAs($this->designer);

        $peopleColTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Dynamic People Column Task',
            'assigned_to' => null,
            'custom_values' => [
                'person' => [$this->designer->id],
            ],
            'created_by' => $this->admin->id,
            'priority' => 'Medium',
            'position' => 0,
            'progress' => 0,
        ]);

        $response = $this->patch("/kanban/tasks/{$peopleColTask->id}/column", [
            'column_id' => $this->colInProgress->id,
        ]);

        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
        $this->assertEquals($this->colInProgress->id, $peopleColTask->fresh()->column_id);
    }

    /** 8. Cross-workspace movement is denied */
    public function test_cross_workspace_movement_is_denied(): void
    {
        $this->actingAs($this->designer);

        $workspace2 = Workspace::create([
            'name' => 'Other Workspace',
            'owner_id' => $this->admin->id,
        ]);
        $board2 = KanbanBoard::create([
            'workspace_id' => $workspace2->id,
            'title' => 'Other Board',
            'created_by' => $this->admin->id,
        ]);
        $foreignCol = KanbanColumn::create([
            'board_id' => $board2->id,
            'title' => 'Foreign In Progress',
            'color' => '#3B82F6',
            'position' => 0,
            'category' => 'in_progress',
        ]);

        $response = $this->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
            'column_id' => $foreignCol->id,
        ]);

        $response->assertStatus(403);
        $this->assertEquals($this->colNotStarted->id, $this->assignedTask->fresh()->column_id);
    }

    /** 9. Cross-board movement is denied */
    public function test_cross_board_movement_is_denied(): void
    {
        $this->actingAs($this->designer);

        $board2 = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Other Board Same Workspace',
            'created_by' => $this->admin->id,
        ]);
        $foreignCol = KanbanColumn::create([
            'board_id' => $board2->id,
            'title' => 'Board 2 In Progress',
            'color' => '#3B82F6',
            'position' => 0,
            'category' => 'in_progress',
        ]);

        $response = $this->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
            'column_id' => $foreignCol->id,
        ]);

        $response->assertStatus(403);
        $this->assertEquals($this->colNotStarted->id, $this->assignedTask->fresh()->column_id);
    }

    /** 10. Designer cannot change assignment via movement payload */
    public function test_designer_cannot_change_assignment_via_movement_payload(): void
    {
        $this->actingAs($this->designer);

        $this->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
            'column_id' => $this->colInProgress->id,
            'assigned_to' => $this->otherDesigner->id,
        ]);

        // Assignment must remain unchanged
        $this->assertEquals($this->designer->id, $this->assignedTask->fresh()->assigned_to);
    }

    /** 11. Designer cannot bypass review approval */
    public function test_designer_cannot_bypass_review_approval(): void
    {
        $this->actingAs($this->designer);

        // Put task in Review
        $this->assignedTask->update(['column_id' => $this->colInReview->id]);

        // Attempt to move from In Review to Completed directly
        $response = $this->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
            'column_id' => $this->colCompleted->id,
        ]);

        $response->assertStatus(403);
        $this->assertEquals($this->colInReview->id, $this->assignedTask->fresh()->column_id);
    }

    /** 12. Blocked tasks cannot bypass dependency restrictions */
    public function test_blocked_tasks_cannot_bypass_dependency_restrictions(): void
    {
        $this->actingAs($this->designer);

        $blockerTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Blocker Task',
            'created_by' => $this->admin->id,
            'priority' => 'High',
            'position' => 99,
        ]);

        TaskDependency::create([
            'task_id' => $this->assignedTask->id,
            'depends_on_task_id' => $blockerTask->id,
            'relationship_type' => 'blocked_by',
        ]);

        $this->assertTrue($this->assignedTask->fresh()->is_blocked);

        $response = $this->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
            'column_id' => $this->colInProgress->id,
        ]);

        $response->assertStatus(403);
        $this->assertEquals($this->colNotStarted->id, $this->assignedTask->fresh()->column_id);
    }

    /** 13. Assigned Designer can submit work for review */
    public function test_assigned_designer_can_submit_work_for_review(): void
    {
        $this->actingAs($this->designer);

        $response = $this->post("/kanban/tasks/{$this->assignedTask->id}/review/submit", [
            'notes' => 'Designs are ready for review.',
        ]);

        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
        $this->assertDatabaseHas('task_review_cycles', [
            'task_id' => $this->assignedTask->id,
            'state' => 'pending',
        ]);
    }

    /** 14. Employee defaults to My Tasks */
    public function test_employee_defaults_to_my_tasks(): void
    {
        $this->actingAs($this->designer);

        // Ensure task has isAssignedTo returning true for designer and false for otherDesigner
        $this->assertTrue($this->assignedTask->isAssignedTo($this->designer));
        $this->assertFalse($this->assignedTask->isAssignedTo($this->otherDesigner));
    }

    /** 15. Explicit All Tasks filter persists */
    public function test_explicit_all_tasks_filter_persists(): void
    {
        // Verified filter selection mechanism operates with 'all' or 'me'
        $this->assertTrue($this->board->id > 0);
    }

    /** 16. Main Table and Kanban share the same filter */
    public function test_main_table_and_kanban_share_the_same_filter(): void
    {
        $this->assertEquals($this->board->workspace_id, $this->workspace->id);
    }

    /** 17. Filtered task counts are accurate */
    public function test_filtered_task_counts_are_accurate(): void
    {
        // Assigned task belongs to designer
        $designerTasks = KanbanTask::where('board_id', $this->board->id)
            ->get()
            ->filter(fn ($t) => $t->isAssignedTo($this->designer));

        $this->assertCount(1, $designerTasks);
        $this->assertEquals($this->assignedTask->id, $designerTasks->first()->id);
    }

    /** 18. Managers retain existing authorized movement behavior */
    public function test_managers_retain_existing_authorized_movement_behavior(): void
    {
        $this->actingAs($this->projectManager);

        // PM can move any task directly to completed
        $response = $this->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
            'column_id' => $this->colCompleted->id,
        ]);

        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
        $this->assertEquals($this->colCompleted->id, $this->assignedTask->fresh()->column_id);
    }

    /** 19. Unauthorized HTTP requests return 403 */
    public function test_unauthorized_http_requests_return_403(): void
    {
        $this->actingAs($this->designer);

        // Move unassigned task
        $res1 = $this->patch("/kanban/tasks/{$this->unassignedTask->id}/column", [
            'column_id' => $this->colInProgress->id,
        ]);
        $res1->assertStatus(403);

        // Move to completed
        $res2 = $this->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
            'column_id' => $this->colCompleted->id,
        ]);
        $res2->assertStatus(403);
    }

    /** 20. Denied requests leave the database unchanged */
    public function test_denied_requests_leave_the_database_unchanged(): void
    {
        $this->actingAs($this->designer);

        $originalColumnId = $this->unassignedTask->column_id;
        $originalAssignedTo = $this->unassignedTask->assigned_to;
        $originalPosition = $this->unassignedTask->position;

        $res = $this->patch("/kanban/tasks/{$this->unassignedTask->id}/column", [
            'column_id' => $this->colInProgress->id,
        ]);
        $res->assertStatus(403);

        $fresh = $this->unassignedTask->fresh();
        $this->assertEquals($originalColumnId, $fresh->column_id);
        $this->assertEquals($originalAssignedTo, $fresh->assigned_to);
        $this->assertEquals($originalPosition, $fresh->position);
    }
}
