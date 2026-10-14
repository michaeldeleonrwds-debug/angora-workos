<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskReviewCycle;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsRbacSecurityAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $adminUser;
    protected User $pmUser;
    protected User $designerUser;
    protected User $secondDesignerUser;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $todoCol;
    protected KanbanColumn $doneCol;
    protected BoardGroup $group;
    protected KanbanTask $unassignedTask;
    protected KanbanTask $assignedTask;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin = User::where('role', 'super_admin')->first();

        // Create Admin, PM, and Designer users
        $this->adminUser = User::factory()->create([
            'name' => 'Admin Alex',
            'email' => 'admin_alex@angora.internal',
            'role' => 'admin',
        ]);

        $this->pmUser = User::factory()->create([
            'name' => 'PM Paula',
            'email' => 'pm_paula@angora.internal',
            'role' => 'project_manager',
        ]);

        $this->designerUser = User::factory()->create([
            'name' => 'Designer Dave',
            'email' => 'designer_dave@angora.internal',
            'role' => 'designer',
        ]);

        $this->secondDesignerUser = User::factory()->create([
            'name' => 'Designer Diana',
            'email' => 'designer_diana@angora.internal',
            'role' => 'designer',
        ]);

        // Create Workspace and add members
        $this->workspace = Workspace::create([
            'name' => 'Creative Studio',
            'owner_id' => $this->adminUser->id,
        ]);

        WorkspaceMember::create([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->adminUser->id,
            'role' => 'admin',
        ]);

        WorkspaceMember::create([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->pmUser->id,
            'role' => 'member',
        ]);

        WorkspaceMember::create([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->designerUser->id,
            'role' => 'member',
        ]);

        WorkspaceMember::create([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->secondDesignerUser->id,
            'role' => 'member',
        ]);

        // Create Kanban Board
        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'created_by' => $this->pmUser->id,
            'title' => 'Brand Campaign Q4',
            'status' => 'active',
            'color' => '#579BFC',
        ]);

        $this->todoCol = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'To Do',
            'order' => 0,
            'color' => '#64748B',
        ]);

        $this->doneCol = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Done',
            'order' => 1,
            'color' => '#00C875',
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Phase 1 - Concepts',
            'order' => 0,
            'color' => '#579BFC',
        ]);

        // Task 1: Unassigned to Dave
        $this->unassignedTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->todoCol->id,
            'group_id' => $this->group->id,
            'created_by' => $this->pmUser->id,
            'title' => 'Master Concept Strategy',
            'priority' => 'High',
            'progress' => 0,
            'due_date' => '2026-11-01',
        ]);

        // Task 2: Assigned to Dave
        $this->assignedTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->todoCol->id,
            'group_id' => $this->group->id,
            'created_by' => $this->pmUser->id,
            'assigned_to' => $this->designerUser->id,
            'title' => 'Logo Variations Deliverable',
            'priority' => 'Medium',
            'progress' => 10,
            'due_date' => '2026-10-30',
        ]);
    }

    /**
     * 1. Designer cannot create task -> 403 Forbidden
     */
    public function test_designer_cannot_create_task(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post('/kanban/tasks', [
                'board_id' => $this->board->id,
                'title' => 'Unauthorized Task Creation',
                'column_id' => $this->todoCol->id,
                'group_id' => $this->group->id,
            ]);

        $response->assertStatus(403);
    }

    /**
     * 2. Designer cannot delete task -> 403 Forbidden
     */
    public function test_designer_cannot_delete_task(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->delete("/kanban/tasks/{$this->assignedTask->id}");

        $response->assertStatus(403);
    }

    /**
     * 3. Designer cannot change status/column of task -> 403 Forbidden
     */
    public function test_designer_cannot_change_status_column(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
                'column_id' => $this->doneCol->id,
            ]);

        $response->assertStatus(403);
    }

    /**
     * 4. Designer cannot reorder tasks -> 403 Forbidden
     */
    public function test_designer_cannot_reorder_tasks(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post('/kanban/tasks/reorder', [
                'tasks' => [
                    ['id' => $this->assignedTask->id, 'order' => 1, 'column_id' => $this->todoCol->id],
                ],
            ]);

        $response->assertStatus(403);
    }

    /**
     * 5. Designer cannot move task group -> 403 Forbidden
     */
    public function test_designer_cannot_change_task_group(): void
    {
        $newGroup = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Phase 2 - Execution',
            'order' => 1,
            'color' => '#A25DDC',
        ]);

        $response = $this->actingAs($this->designerUser)
            ->patch("/kanban/tasks/{$this->assignedTask->id}/group", [
                'group_id' => $newGroup->id,
            ]);

        $response->assertStatus(403);
    }

    /**
     * 6. Designer cannot edit title or deadline on task -> 403 Forbidden
     */
    public function test_designer_cannot_edit_privileged_fields(): void
    {
        // Title mutation attempt
        $resTitle = $this->actingAs($this->designerUser)
            ->patch("/kanban/tasks/{$this->assignedTask->id}", [
                'title' => 'Hacked Task Title',
            ]);
        $resTitle->assertStatus(403);

        // Deadline mutation attempt
        $resDeadline = $this->actingAs($this->designerUser)
            ->patch("/kanban/tasks/{$this->assignedTask->id}", [
                'due_date' => '2026-12-31',
            ]);
        $resDeadline->assertStatus(403);

        // Priority mutation attempt
        $resPriority = $this->actingAs($this->designerUser)
            ->patch("/kanban/tasks/{$this->assignedTask->id}", [
                'priority' => 'Urgent',
            ]);
        $resPriority->assertStatus(403);

        // Assignee mutation attempt
        $resAssignee = $this->actingAs($this->designerUser)
            ->patch("/kanban/tasks/{$this->assignedTask->id}", [
                'assigned_to' => $this->secondDesignerUser->id,
            ]);
        $resAssignee->assertStatus(403);
    }

    /**
     * 7. Designer cannot update task schedule -> 403 Forbidden
     */
    public function test_designer_cannot_update_schedule(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->patch("/kanban/tasks/{$this->assignedTask->id}/schedule", [
                'start_date' => '2026-10-15',
                'due_date' => '2026-10-25',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 8. Designer cannot create dynamic columns -> 403 Forbidden
     */
    public function test_designer_cannot_create_dynamic_column(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post("/kanban/boards/{$this->board->id}/columns", [
                'title' => 'Client Sign-off',
                'type' => 'status',
                'width' => 140,
            ]);

        $response->assertStatus(403);
    }

    /**
     * 9. Designer cannot create board groups -> 403 Forbidden
     */
    public function test_designer_cannot_create_board_group(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post("/kanban/boards/{$this->board->id}/groups", [
                'title' => 'Phase 3 - Client Review',
                'color' => '#E2445C',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 10. Designer cannot create automations -> 403 Forbidden
     */
    public function test_designer_cannot_create_automations(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post("/kanban/boards/{$this->board->id}/automations", [
                'trigger_type' => 'status_change',
                'trigger_config' => ['to_column_id' => $this->doneCol->id],
                'action_type' => 'notify_assignee',
                'action_config' => ['message' => 'Completed!'],
            ]);

        $response->assertStatus(403);
    }

    /**
     * 11. Designer cannot save blueprints/templates -> 403 Forbidden
     */
    public function test_designer_cannot_save_blueprints(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post("/kanban/groups/{$this->group->id}/save-as-blueprint", [
                'blueprint_name' => 'Agency Production Template',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 12. Designer cannot establish dependencies -> 403 Forbidden
     */
    public function test_designer_cannot_manage_dependencies(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post("/kanban/tasks/{$this->assignedTask->id}/dependencies", [
                'depends_on_task_id' => $this->unassignedTask->id,
                'relationship_type' => 'blocked_by',
                'lag_days' => 0,
            ]);

        $response->assertStatus(403);
    }

    /**
     * 13. Designer cannot configure recurrence -> 403 Forbidden
     */
    public function test_designer_cannot_manage_recurrence(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post("/kanban/tasks/{$this->assignedTask->id}/recurrence", [
                'frequency' => 'weekly',
                'interval' => 1,
                'days_of_week' => [1],
                'end_type' => 'never',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 14. Designer cannot export board data -> 403 Forbidden
     */
    public function test_designer_cannot_export_board_data(): void
    {
        $resCsv = $this->actingAs($this->designerUser)
            ->get("/kanban/boards/{$this->board->id}/export?format=csv");
        $resCsv->assertStatus(403);

        $resWorkload = $this->actingAs($this->designerUser)
            ->get("/kanban/boards/{$this->board->id}/workload-analytics/export?format=csv");
        $resWorkload->assertStatus(403);

        $resMetrics = $this->actingAs($this->designerUser)
            ->get("/kanban/boards/{$this->board->id}/delivery-metrics/export?format=csv");
        $resMetrics->assertStatus(403);
    }

    /**
     * 15. Designer cannot modify other users' capacity -> 403 Forbidden
     */
    public function test_designer_cannot_modify_other_user_capacity(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->patch("/users/{$this->pmUser->id}/capacity", [
                'workspace_id' => $this->workspace->id,
                'weekly_capacity_hours' => 20,
            ]);

        $response->assertStatus(403);
    }

    /**
     * 16. Designer cannot approve review -> 403 Forbidden
     */
    public function test_designer_cannot_approve_review(): void
    {
        $cycle = TaskReviewCycle::create([
            'task_id' => $this->assignedTask->id,
            'round_number' => 1,
            'state' => 'pending',
            'submitted_by' => $this->designerUser->id,
            'notes' => 'Deliverables ready',
            'total_stages' => 1,
            'current_stage_index' => 1,
        ]);

        $response = $this->actingAs($this->secondDesignerUser)
            ->post("/kanban/tasks/{$this->assignedTask->id}/review/decide", [
                'decision' => 'approved',
                'feedback' => 'Looks fine to me',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 17. Assigned Designer CAN update progress on assigned task
     */
    public function test_assigned_designer_can_update_progress(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->patch("/kanban/tasks/{$this->assignedTask->id}", [
                'progress' => 75,
                'actual_hours' => 4.5,
            ]);

        $response->assertStatus(302);
        $this->assignedTask->refresh();
        $this->assertEquals(75, $this->assignedTask->progress);
        $this->assertEquals(4.5, $this->assignedTask->actual_hours);
    }

    /**
     * 18. Assigned Designer CAN add subitem to assigned task
     */
    public function test_assigned_designer_can_add_subitem(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post("/kanban/tasks/{$this->assignedTask->id}/subitems", [
                'title' => 'Export SVG assets',
            ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('kanban_tasks', [
            'parent_id' => $this->assignedTask->id,
            'title' => 'Export SVG assets',
        ]);
    }

    /**
     * 19. Assigned Designer CAN update subitem progress on assigned task
     */
    public function test_assigned_designer_can_update_subitem_progress(): void
    {
        $subitem = KanbanTask::create([
            'board_id' => $this->board->id,
            'parent_id' => $this->assignedTask->id,
            'column_id' => $this->todoCol->id,
            'group_id' => $this->group->id,
            'created_by' => $this->designerUser->id,
            'title' => 'Generate color variations',
            'progress' => 0,
        ]);

        $response = $this->actingAs($this->designerUser)
            ->patch("/kanban/tasks/{$subitem->id}", [
                'progress' => 100,
            ]);

        $response->assertStatus(302);
        $subitem->refresh();
        $this->assertEquals(100, $subitem->progress);
    }

    /**
     * 20. Assigned Designer CAN post comment on assigned task
     */
    public function test_assigned_designer_can_post_comment(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post("/kanban/tasks/{$this->assignedTask->id}/comments", [
                'message' => 'Completed initial draft iterations for review.',
            ]);

        $this->assertDatabaseHas('kanban_comments', [
            'task_id' => $this->assignedTask->id,
            'user_id' => $this->designerUser->id,
            'message' => 'Completed initial draft iterations for review.',
        ]);
    }

    /**
     * 21. Assigned Designer CAN submit assigned task for review
     */
    public function test_assigned_designer_can_submit_review(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post("/kanban/tasks/{$this->assignedTask->id}/review/submit", [
                'notes' => 'Ready for team review',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('task_review_cycles', [
            'task_id' => $this->assignedTask->id,
            'submitted_by' => $this->designerUser->id,
            'state' => 'pending',
        ]);
    }

    /**
     * 22. Unassigned Designer CANNOT submit review on unassigned task -> 403 Forbidden
     */
    public function test_unassigned_designer_cannot_submit_review(): void
    {
        $response = $this->actingAs($this->designerUser)
            ->post("/kanban/tasks/{$this->unassignedTask->id}/review/submit", [
                'notes' => 'Attempting unauthorized submission',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 23. Project Manager CAN manage tasks, columns, and review approvals
     */
    public function test_project_manager_can_manage_tasks_and_approvals(): void
    {
        // PM can change status
        $resCol = $this->actingAs($this->pmUser)
            ->patch("/kanban/tasks/{$this->assignedTask->id}/column", [
                'column_id' => $this->doneCol->id,
            ]);
        $resCol->assertStatus(302);

        // PM can edit deadline and priority
        $resEdit = $this->actingAs($this->pmUser)
            ->patch("/kanban/tasks/{$this->assignedTask->id}", [
                'priority' => 'Urgent',
                'due_date' => '2026-11-15',
            ]);
        $resEdit->assertStatus(302);

        // PM can approve review
        $cycle = TaskReviewCycle::create([
            'task_id' => $this->assignedTask->id,
            'round_number' => 1,
            'state' => 'pending',
            'submitted_by' => $this->designerUser->id,
            'total_stages' => 1,
            'current_stage_index' => 1,
        ]);

        $resApprove = $this->actingAs($this->pmUser)
            ->post("/kanban/tasks/{$this->assignedTask->id}/review/decide", [
                'decision' => 'approved',
                'feedback' => 'Approved by PM',
            ]);
        $resApprove->assertStatus(200);
    }

    /**
     * 24. Admin CAN manage board columns and groups
     */
    public function test_admin_can_manage_board_structure(): void
    {
        $resCol = $this->actingAs($this->adminUser)
            ->post("/kanban/boards/{$this->board->id}/columns", [
                'title' => 'Client Feedback',
                'type' => 'status',
                'width' => 140,
            ]);
        $resCol->assertStatus(302);

        $resGroup = $this->actingAs($this->adminUser)
            ->post("/kanban/boards/{$this->board->id}/groups", [
                'title' => 'Production Sprint 2',
                'color' => '#00C875',
            ]);
        $resGroup->assertStatus(302);
    }

    /**
     * 25. Super Admin bypasses all checks with full authority
     */
    public function test_super_admin_has_full_bypass_authority(): void
    {
        $resCreate = $this->actingAs($this->superAdmin)
            ->post('/kanban/tasks', [
                'board_id' => $this->board->id,
                'title' => 'Super Admin Created Task',
                'column_id' => $this->todoCol->id,
                'group_id' => $this->group->id,
            ]);
        $resCreate->assertStatus(302);

        $resDelete = $this->actingAs($this->superAdmin)
            ->delete("/kanban/tasks/{$this->unassignedTask->id}");
        $resDelete->assertStatus(302);
    }
}
