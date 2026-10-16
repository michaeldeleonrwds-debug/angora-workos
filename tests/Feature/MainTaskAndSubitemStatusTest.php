<?php

namespace Tests\Feature;

use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MainTaskAndSubitemStatusTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $pm;
    private User $employee;
    private Workspace $workspace;
    private KanbanBoard $board;
    private KanbanColumn $resources;
    private KanbanColumn $newTask;
    private KanbanColumn $inProgress;
    private KanbanColumn $review;
    private KanbanColumn $complete;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin-status-test@angora.test',
        ]);
        $this->pm = User::factory()->create([
            'role' => 'project_manager',
            'email' => 'pm-status-test@angora.test',
        ]);
        $this->employee = User::factory()->create([
            'role' => 'employee',
            'email' => 'employee-status-test@angora.test',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Status Test Workspace',
            'slug' => 'status-test-workspace',
            'owner_id' => $this->admin->id,
            'status' => 'active',
        ]);
        $this->workspace->members()->create(['user_id' => $this->admin->id, 'role' => 'owner']);
        $this->workspace->members()->create(['user_id' => $this->pm->id, 'role' => 'admin']);
        $this->workspace->members()->create(['user_id' => $this->employee->id, 'role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Status Test Board',
            'created_by' => $this->admin->id,
        ]);

        $this->resources = $this->createColumn('Resources', 'backlog', '#0086C0');
        $this->newTask = $this->createColumn('New Task', 'to_do', '#579BFC');
        $this->inProgress = $this->createColumn('In Progress', 'in_progress', '#FDAB3D');
        $this->review = $this->createColumn('For Review', 'in_review', '#A25DDC');
        $this->complete = $this->createColumn('Complete', 'completed', '#00C875');
    }

    private function createColumn(string $title, string $category, string $color = '#64748b'): KanbanColumn
    {
        return KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => $title,
            'color' => $color,
            'position' => $this->board->columns()->count(),
            'semantic_category' => $category,
            'stage_key' => strtolower(str_replace(' ', '_', $title)),
        ]);
    }

    public function test_main_task_status_reflects_kanban_column_stage(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->resources->id,
            'title' => 'Main Task 1',
            'created_by' => $this->pm->id,
        ]);

        $task->load('column');
        $this->assertEquals($this->resources->id, $task->column_id);
        $this->assertEquals('Resources', $task->column->title);
        $this->assertEquals('#0086C0', $task->column->color);
    }

    public function test_moving_card_updates_main_task_column_id(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->resources->id,
            'title' => 'Main Task Move Test',
            'created_by' => $this->pm->id,
        ]);

        $response = $this->actingAs($this->pm)
            ->patch("/kanban/tasks/{$task->id}/column", [
                'column_id' => $this->inProgress->id,
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertEquals($this->inProgress->id, $task->fresh()->column_id);
        $this->assertEquals('In Progress', $task->fresh()->column->title);
    }

    public function test_main_task_cannot_have_null_column_id(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->resources->id,
            'title' => 'Main Task No Null Column',
            'created_by' => $this->pm->id,
        ]);

        $response = $this->actingAs($this->pm)
            ->patch("/kanban/tasks/{$task->id}/column", [
                'column_id' => null,
            ]);

        $response->assertSessionHasErrors(['column_id']);
        $this->assertEquals($this->resources->id, $task->fresh()->column_id);
    }

    public function test_new_subitem_has_null_status_by_default(): void
    {
        $parentTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->inProgress->id,
            'title' => 'Parent Task For Subitems',
            'created_by' => $this->pm->id,
        ]);

        $response = $this->actingAs($this->pm)
            ->post("/kanban/tasks/{$parentTask->id}/subitems", [
                'title' => 'Subitem Without Default Status',
            ]);

        $response->assertSessionHasNoErrors();

        $subitem = KanbanTask::where('parent_id', $parentTask->id)->first();
        $this->assertNotNull($subitem);
        $this->assertEquals('Subitem Without Default Status', $subitem->title);
        // Subitem must NOT inherit parent's column_id
        $this->assertNull($subitem->column_id);
        $this->assertNull($subitem->column);
    }

    public function test_subitem_status_can_be_assigned_and_cleared(): void
    {
        $parentTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->inProgress->id,
            'title' => 'Parent Task For Subitem Status Assign',
            'created_by' => $this->pm->id,
        ]);

        $subitem = KanbanTask::create([
            'board_id' => $this->board->id,
            'parent_id' => $parentTask->id,
            'column_id' => null,
            'title' => 'Subitem 1',
            'created_by' => $this->pm->id,
        ]);

        $this->assertNull($subitem->column_id);

        // Assign status
        $response = $this->actingAs($this->pm)
            ->patch("/kanban/tasks/{$subitem->id}/column", [
                'column_id' => $this->review->id,
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertEquals($this->review->id, $subitem->fresh()->column_id);

        // Clear status back to null
        $clearResponse = $this->actingAs($this->pm)
            ->patch("/kanban/tasks/{$subitem->id}/column", [
                'column_id' => null,
            ]);

        $clearResponse->assertSessionHasNoErrors();
        $this->assertNull($subitem->fresh()->column_id);
    }

    public function test_subitem_status_can_be_cleared_via_general_update_endpoint(): void
    {
        $parentTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->inProgress->id,
            'title' => 'Parent Task',
            'created_by' => $this->pm->id,
        ]);

        $subitem = KanbanTask::create([
            'board_id' => $this->board->id,
            'parent_id' => $parentTask->id,
            'column_id' => $this->newTask->id,
            'title' => 'Subitem With Status',
            'created_by' => $this->pm->id,
        ]);

        $this->assertEquals($this->newTask->id, $subitem->column_id);

        // Clear via updateTask
        $response = $this->actingAs($this->pm)
            ->patch("/kanban/tasks/{$subitem->id}", [
                'column_id' => null,
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertNull($subitem->fresh()->column_id);
    }

    public function test_moving_parent_task_does_not_alter_subitem_statuses(): void
    {
        $parentTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->newTask->id,
            'title' => 'Parent Task Independent Movement',
            'created_by' => $this->pm->id,
        ]);

        // Subitem 1 has null status
        $sub1 = KanbanTask::create([
            'board_id' => $this->board->id,
            'parent_id' => $parentTask->id,
            'column_id' => null,
            'title' => 'Subitem With Null Status',
            'created_by' => $this->pm->id,
        ]);

        // Subitem 2 has explicitly assigned review status
        $sub2 = KanbanTask::create([
            'board_id' => $this->board->id,
            'parent_id' => $parentTask->id,
            'column_id' => $this->review->id,
            'title' => 'Subitem With Review Status',
            'created_by' => $this->pm->id,
        ]);

        // Move parent to Complete
        $response = $this->actingAs($this->pm)
            ->patch("/kanban/tasks/{$parentTask->id}/column", [
                'column_id' => $this->complete->id,
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertEquals($this->complete->id, $parentTask->fresh()->column_id);

        // Subitems must remain unchanged: sub1 still null, sub2 still review
        $this->assertNull($sub1->fresh()->column_id);
        $this->assertEquals($this->review->id, $sub2->fresh()->column_id);
        // And subitems must NOT be automatically marked complete
        $this->assertNull($sub1->fresh()->completed_at);
        $this->assertNull($sub2->fresh()->completed_at);
    }

    public function test_changing_subitem_status_does_not_move_parent_task(): void
    {
        $parentTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->inProgress->id,
            'title' => 'Parent Task Fixed Stage',
            'created_by' => $this->pm->id,
        ]);

        $subitem = KanbanTask::create([
            'board_id' => $this->board->id,
            'parent_id' => $parentTask->id,
            'column_id' => null,
            'title' => 'Subitem Changing Status',
            'created_by' => $this->pm->id,
        ]);

        // Update subitem to complete
        $response = $this->actingAs($this->pm)
            ->patch("/kanban/tasks/{$subitem->id}/column", [
                'column_id' => $this->complete->id,
            ]);

        $response->assertSessionHasNoErrors();

        // Subitem is complete
        $this->assertEquals($this->complete->id, $subitem->fresh()->column_id);

        // Parent task must still be in In Progress, NOT moved to Complete
        $this->assertEquals($this->inProgress->id, $parentTask->fresh()->column_id);
    }
}
