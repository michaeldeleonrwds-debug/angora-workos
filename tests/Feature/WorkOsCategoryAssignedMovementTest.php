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

class WorkOsCategoryAssignedMovementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $pm;
    protected User $designerAlice;
    protected User $developerBob;
    protected User $unassignedEve;
    protected User $crossWorkspaceUser;

    protected Workspace $workspaceA;
    protected Workspace $workspaceB;

    protected KanbanBoard $boardA;
    protected KanbanBoard $boardB;
    protected BoardGroup $groupA;

    protected KanbanColumn $colNotStarted;
    protected KanbanColumn $colInProgress;
    protected KanbanColumn $colInReview;
    protected KanbanColumn $colDone;

    protected KanbanTask $parentTask;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->pm = User::factory()->create(['role' => 'project_manager']);
        $this->designerAlice = User::factory()->create(['role' => 'designer']);
        $this->developerBob = User::factory()->create(['role' => 'developer']);
        $this->unassignedEve = User::factory()->create(['role' => 'designer']);
        $this->crossWorkspaceUser = User::factory()->create(['role' => 'designer']);

        $this->workspaceA = Workspace::create([
            'name' => 'Agency Main Workspace',
            'owner_id' => $this->admin->id,
        ]);

        $this->workspaceB = Workspace::create([
            'name' => 'External Workspace',
            'owner_id' => $this->admin->id,
        ]);

        foreach ([$this->admin, $this->pm, $this->designerAlice, $this->developerBob, $this->unassignedEve] as $user) {
            WorkspaceMember::create([
                'workspace_id' => $this->workspaceA->id,
                'user_id' => $user->id,
                'role' => $user->role === 'admin' ? 'admin' : 'member',
            ]);
        }

        WorkspaceMember::create([
            'workspace_id' => $this->workspaceB->id,
            'user_id' => $this->crossWorkspaceUser->id,
            'role' => 'member',
        ]);

        $this->boardA = KanbanBoard::create([
            'workspace_id' => $this->workspaceA->id,
            'title' => 'Client Production Board',
            'created_by' => $this->admin->id,
        ]);

        $this->boardB = KanbanBoard::create([
            'workspace_id' => $this->workspaceB->id,
            'title' => 'External Board',
            'created_by' => $this->admin->id,
        ]);

        $this->groupA = BoardGroup::create([
            'board_id' => $this->boardA->id,
            'title' => 'Active Production',
            'color' => '#579BFC',
            'position' => 0,
        ]);

        $this->colNotStarted = KanbanColumn::create([
            'board_id' => $this->boardA->id,
            'title' => 'New Task',
            'color' => '#64748B',
            'position' => 0,
            'semantic_category' => 'not_started',
        ]);

        $this->colInProgress = KanbanColumn::create([
            'board_id' => $this->boardA->id,
            'title' => 'In Progress',
            'color' => '#FDAB3D',
            'position' => 1,
            'semantic_category' => 'in_progress',
        ]);

        $this->colInReview = KanbanColumn::create([
            'board_id' => $this->boardA->id,
            'title' => 'For Review',
            'color' => '#A25DDC',
            'position' => 2,
            'semantic_category' => 'in_review',
        ]);

        $this->colDone = KanbanColumn::create([
            'board_id' => $this->boardA->id,
            'title' => 'Done',
            'color' => '#00C875',
            'position' => 3,
            'semantic_category' => 'completed',
        ]);

        // Parent task representing a client project
        $this->parentTask = KanbanTask::create([
            'board_id' => $this->boardA->id,
            'group_id' => $this->groupA->id,
            'column_id' => $this->colNotStarted->id,
            'title' => 'BOBO1 — Promo Kit',
            'created_by' => $this->pm->id,
            'priority' => 'High',
            'position' => 0,
            'assigned_to' => null, // Parent has no direct assignee
        ]);
    }

    public function test_directly_assigned_designer_can_move_parent_task(): void
    {
        $this->parentTask->update(['assigned_to' => $this->designerAlice->id]);

        $response = $this->actingAs($this->designerAlice)
            ->patch("/kanban/tasks/{$this->parentTask->id}/column", [
                'column_id' => $this->colInProgress->id,
                'position' => 0,
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
        $this->assertEquals($this->colInProgress->id, $this->parentTask->fresh()->column_id);
    }

    public function test_designer_assigned_only_to_child_category_can_move_parent_task(): void
    {
        // Parent task has NO direct assigned_to, but has a child work category assigned to Alice
        KanbanTask::create([
            'board_id' => $this->boardA->id,
            'group_id' => $this->groupA->id,
            'column_id' => $this->colNotStarted->id,
            'parent_id' => $this->parentTask->id,
            'title' => 'Design',
            'created_by' => $this->pm->id,
            'priority' => 'Medium',
            'position' => 0,
            'assigned_to' => $this->designerAlice->id,
        ]);

        $this->assertNull($this->parentTask->assigned_to);

        $response = $this->actingAs($this->designerAlice)
            ->patch("/kanban/tasks/{$this->parentTask->id}/column", [
                'column_id' => $this->colInProgress->id,
                'position' => 0,
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
        $this->assertEquals($this->colInProgress->id, $this->parentTask->fresh()->column_id);
    }

    public function test_developer_assigned_to_child_category_can_move_parent_task(): void
    {
        // Child work category: Build / Development assigned to developer Bob
        KanbanTask::create([
            'board_id' => $this->boardA->id,
            'group_id' => $this->groupA->id,
            'column_id' => $this->colNotStarted->id,
            'parent_id' => $this->parentTask->id,
            'title' => 'Build / Development',
            'created_by' => $this->pm->id,
            'priority' => 'Medium',
            'position' => 0,
            'assigned_to' => $this->developerBob->id,
        ]);

        $response = $this->actingAs($this->developerBob)
            ->patch("/kanban/tasks/{$this->parentTask->id}/column", [
                'column_id' => $this->colInProgress->id,
                'position' => 0,
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
        $this->assertEquals($this->colInProgress->id, $this->parentTask->fresh()->column_id);
    }

    public function test_child_category_with_custom_values_assignment_authorizes_parent_movement(): void
    {
        // Child work category assigned via custom_values ['designer_ids' => [$alice->id]]
        KanbanTask::create([
            'board_id' => $this->boardA->id,
            'group_id' => $this->groupA->id,
            'column_id' => $this->colNotStarted->id,
            'parent_id' => $this->parentTask->id,
            'title' => 'Motion Graphics',
            'created_by' => $this->pm->id,
            'priority' => 'Medium',
            'position' => 0,
            'custom_values' => ['designer_ids' => [$this->designerAlice->id]],
        ]);

        $response = $this->actingAs($this->designerAlice)
            ->patch("/kanban/tasks/{$this->parentTask->id}/column", [
                'column_id' => $this->colInProgress->id,
                'position' => 0,
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
        $this->assertEquals($this->colInProgress->id, $this->parentTask->fresh()->column_id);
    }

    public function test_unassigned_user_cannot_move_parent_task(): void
    {
        // Child category assigned to Alice, Eve is completely unassigned
        KanbanTask::create([
            'board_id' => $this->boardA->id,
            'group_id' => $this->groupA->id,
            'column_id' => $this->colNotStarted->id,
            'parent_id' => $this->parentTask->id,
            'title' => 'Design',
            'created_by' => $this->pm->id,
            'priority' => 'Medium',
            'position' => 0,
            'assigned_to' => $this->designerAlice->id,
        ]);

        $response = $this->actingAs($this->unassignedEve)
            ->patch("/kanban/tasks/{$this->parentTask->id}/column", [
                'column_id' => $this->colInProgress->id,
                'position' => 0,
            ]);

        $response->assertStatus(403);
        $this->assertEquals($this->colNotStarted->id, $this->parentTask->fresh()->column_id);
    }

    public function test_category_assigned_contributor_cannot_move_task_directly_to_done_when_review_required(): void
    {
        KanbanTask::create([
            'board_id' => $this->boardA->id,
            'group_id' => $this->groupA->id,
            'column_id' => $this->colNotStarted->id,
            'parent_id' => $this->parentTask->id,
            'title' => 'Design',
            'created_by' => $this->pm->id,
            'priority' => 'Medium',
            'position' => 0,
            'assigned_to' => $this->designerAlice->id,
        ]);

        // Alice cannot approve/complete task directly into Done
        $response = $this->actingAs($this->designerAlice)
            ->patch("/kanban/tasks/{$this->parentTask->id}/column", [
                'column_id' => $this->colDone->id,
                'position' => 0,
            ]);

        $response->assertStatus(403);
    }

    public function test_category_assigned_contributor_cannot_move_task_when_blocked_by_dependency(): void
    {
        KanbanTask::create([
            'board_id' => $this->boardA->id,
            'group_id' => $this->groupA->id,
            'column_id' => $this->colNotStarted->id,
            'parent_id' => $this->parentTask->id,
            'title' => 'Design',
            'created_by' => $this->pm->id,
            'priority' => 'Medium',
            'position' => 0,
            'assigned_to' => $this->designerAlice->id,
        ]);

        // Create an unfinished blocker task
        $blockerTask = KanbanTask::create([
            'board_id' => $this->boardA->id,
            'group_id' => $this->groupA->id,
            'column_id' => $this->colNotStarted->id,
            'title' => 'Brand Guidelines Approval',
            'created_by' => $this->pm->id,
            'priority' => 'Urgent',
            'position' => 1,
            'completed_at' => null,
            'progress' => 0,
        ]);

        TaskDependency::create([
            'task_id' => $this->parentTask->id,
            'depends_on_task_id' => $blockerTask->id,
            'relationship_type' => 'blocked_by',
        ]);

        $this->parentTask->update(['is_blocked' => true]);

        $response = $this->actingAs($this->designerAlice)
            ->patch("/kanban/tasks/{$this->parentTask->id}/column", [
                'column_id' => $this->colInProgress->id,
                'position' => 0,
            ]);

        $response->assertStatus(403);
    }

    public function test_cross_workspace_contributor_cannot_move_task(): void
    {
        KanbanTask::create([
            'board_id' => $this->boardA->id,
            'group_id' => $this->groupA->id,
            'column_id' => $this->colNotStarted->id,
            'parent_id' => $this->parentTask->id,
            'title' => 'Design',
            'created_by' => $this->pm->id,
            'priority' => 'Medium',
            'position' => 0,
            'assigned_to' => $this->crossWorkspaceUser->id,
        ]);

        $response = $this->actingAs($this->crossWorkspaceUser)
            ->patch("/kanban/tasks/{$this->parentTask->id}/column", [
                'column_id' => $this->colInProgress->id,
                'position' => 0,
            ]);

        $response->assertStatus(403);
    }

    public function test_category_assigned_contributor_cannot_change_privileged_fields(): void
    {
        KanbanTask::create([
            'board_id' => $this->boardA->id,
            'group_id' => $this->groupA->id,
            'column_id' => $this->colNotStarted->id,
            'parent_id' => $this->parentTask->id,
            'title' => 'Design',
            'created_by' => $this->pm->id,
            'priority' => 'Medium',
            'position' => 0,
            'assigned_to' => $this->designerAlice->id,
        ]);

        // Attempt to reassign task
        $response = $this->actingAs($this->designerAlice)
            ->patchJson("/kanban/tasks/{$this->parentTask->id}", [
                'assigned_to' => $this->developerBob->id,
            ]);

        $response->assertStatus(403);

        // Attempt to change due date
        $response = $this->actingAs($this->designerAlice)
            ->patchJson("/kanban/tasks/{$this->parentTask->id}", [
                'due_date' => now()->addDays(7)->toDateString(),
            ]);

        $response->assertStatus(403);

        // Attempt to delete task
        $response = $this->actingAs($this->designerAlice)
            ->deleteJson("/kanban/tasks/{$this->parentTask->id}");

        $response->assertStatus(403);
    }
}
