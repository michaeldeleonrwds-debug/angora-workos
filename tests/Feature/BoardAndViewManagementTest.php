<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\BoardView;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskActivity;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardAndViewManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $projectManager;
    protected User $employee;
    protected User $client;
    protected KanbanBoard $board;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin = User::where('role', 'super_admin')->first()
            ?? User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $this->projectManager = User::where('role', 'project_manager')->first()
            ?? User::factory()->create(['role' => 'project_manager', 'status' => 'active']);
        $this->employee = User::where('role', 'employee')->first()
            ?? User::factory()->create(['role' => 'employee', 'status' => 'active']);
        $this->client = User::where('role', 'client')->first()
            ?? User::factory()->create(['role' => 'client', 'status' => 'active']);

        $this->board = KanbanBoard::first();
    }

    public function test_super_admin_can_rename_and_update_board_settings(): void
    {
        $this->actingAs($this->superAdmin);

        $response = $this->patch(route('kanban.boards.update', $this->board), [
            'title' => 'Redesigned Production Board',
            'description' => 'Updated production description with new workflow standards.',
            'visibility' => 'private',
            'settings' => [
                'color' => '#A25DDC',
                'icon' => 'Workflow',
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $this->board->refresh();

        $this->assertEquals('Redesigned Production Board', $this->board->title);
        $this->assertEquals('Updated production description with new workflow standards.', $this->board->description);
        $this->assertEquals('private', $this->board->visibility);
        $this->assertEquals('#A25DDC', $this->board->settings['color'] ?? null);
    }

    public function test_authorized_user_can_archive_and_restore_board(): void
    {
        $this->actingAs($this->superAdmin);

        // Archive board
        $archiveResponse = $this->post(route('kanban.boards.archive', $this->board));
        $archiveResponse->assertSessionHasNoErrors();

        $this->board->refresh();
        $this->assertTrue($this->board->is_archived);
        $this->assertNotNull($this->board->archived_at);

        // Restore board
        $restoreResponse = $this->post(route('kanban.boards.restore', $this->board));
        $restoreResponse->assertSessionHasNoErrors();

        $this->board->refresh();
        $this->assertFalse($this->board->is_archived);
        $this->assertNull($this->board->archived_at);
    }

    public function test_super_admin_can_soft_delete_board(): void
    {
        $this->actingAs($this->superAdmin);

        $boardId = $this->board->id;
        $response = $this->delete(route('kanban.boards.delete', $this->board));
        $response->assertSessionHasNoErrors();

        $deletedBoard = KanbanBoard::withTrashed()->find($boardId);
        $this->assertNotNull($deletedBoard);
        $this->assertTrue($deletedBoard->trashed());
        $this->assertNotNull($deletedBoard->deleted_at);
    }

    public function test_non_super_admin_cannot_delete_board(): void
    {
        // Project Manager attempt
        $this->actingAs($this->projectManager);
        $this->delete(route('kanban.boards.delete', $this->board))
            ->assertForbidden();

        // Employee attempt
        $this->actingAs($this->employee);
        $this->delete(route('kanban.boards.delete', $this->board))
            ->assertForbidden();

        // Client attempt
        $this->actingAs($this->client);
        $this->delete(route('kanban.boards.delete', $this->board))
            ->assertForbidden();

        // Verify board was not deleted
        $this->assertFalse($this->board->fresh()->trashed());
    }

    public function test_duplicate_board_structure_only(): void
    {
        $this->actingAs($this->superAdmin);

        $initialTaskCount = KanbanTask::where('board_id', $this->board->id)->count();
        $this->assertGreaterThan(0, $initialTaskCount, 'Original board must have tasks for test');

        $response = $this->post(route('kanban.boards.duplicate', $this->board), [
            'title' => 'Duplicated Structure Only Board',
            'copy_mode' => 'structure_only',
        ]);

        $response->assertSessionHasNoErrors();

        $newBoard = KanbanBoard::where('title', 'Duplicated Structure Only Board')->first();
        $this->assertNotNull($newBoard);
        $this->assertNotEquals($this->board->id, $newBoard->id);

        // Check stages and views were copied
        $this->assertGreaterThan(0, $newBoard->columns()->count());
        $this->assertGreaterThan(0, $newBoard->views()->count());

        // Check tasks were NOT copied
        $this->assertEquals(0, KanbanTask::where('board_id', $newBoard->id)->count());
    }

    public function test_duplicate_board_with_tasks(): void
    {
        $this->actingAs($this->superAdmin);

        $response = $this->post(route('kanban.boards.duplicate', $this->board), [
            'title' => 'Duplicated With Tasks Board',
            'copy_mode' => 'with_tasks',
        ]);

        $response->assertSessionHasNoErrors();

        $newBoard = KanbanBoard::where('title', 'Duplicated With Tasks Board')->first();
        $this->assertNotNull($newBoard);

        // Tasks must have been copied
        $newTasksCount = KanbanTask::where('board_id', $newBoard->id)->count();
        $this->assertGreaterThan(0, $newTasksCount);
    }

    public function test_board_activities_log_endpoint_returns_recent_activities(): void
    {
        $this->actingAs($this->superAdmin);

        TaskActivity::create([
            'board_id' => $this->board->id,
            'task_id' => $this->board->tasks()->first()?->id ?? 1,
            'user_id' => $this->superAdmin->id,
            'event_type' => 'board_settings_updated',
            'description' => 'Updated board general settings and display color',
            'created_at' => now(),
        ]);

        $response = $this->get(route('kanban.boards.activities', $this->board));
        $response->assertOk();
        $response->assertJsonStructure([
            'activities' => [
                '*' => ['id', 'event_type', 'description', 'created_at'],
            ],
        ]);
    }

    public function test_duplicate_view_clones_view_with_copied_settings(): void
    {
        $this->actingAs($this->superAdmin);

        $originalView = $this->board->views()->first();
        $this->assertNotNull($originalView);

        $response = $this->post(route('kanban.views.duplicate', $originalView));
        $response->assertSessionHasNoErrors();

        $clonedView = BoardView::where('board_id', $this->board->id)
            ->where('name', $originalView->name . ' (Copy)')
            ->first();

        $this->assertNotNull($clonedView);
        $this->assertFalse($clonedView->is_system, 'Cloned views should be custom/editable');
        $this->assertFalse($clonedView->is_default);
        $this->assertEquals($originalView->type, $clonedView->type);
    }

    public function test_hide_view_toggles_visibility_and_prevents_hiding_last_visible_view(): void
    {
        $this->actingAs($this->superAdmin);

        // Ensure we have at least 2 views
        $views = $this->board->views()->get();
        $view1 = $views->get(0);
        $view2 = $views->get(1);

        // Hide view 1
        $hideResponse = $this->patch(route('kanban.views.hide', $view1));
        $hideResponse->assertSessionHasNoErrors();
        $this->assertTrue($view1->fresh()->is_hidden);

        // Unhide view 1
        $unhideResponse = $this->patch(route('kanban.views.hide', $view1));
        $unhideResponse->assertSessionHasNoErrors();
        $this->assertFalse($view1->fresh()->is_hidden);

        // Hide all views except view 2
        BoardView::where('board_id', $this->board->id)
            ->where('id', '!=', $view2->id)
            ->update(['is_hidden' => true]);

        // Attempting to hide view 2 (the only visible view) must be rejected
        $rejectResponse = $this->patch(route('kanban.views.hide', $view2));
        $rejectResponse->assertSessionHas('error');
        $this->assertFalse($view2->fresh()->is_hidden);
    }

    public function test_deleting_custom_view_never_deletes_board_or_tasks(): void
    {
        $this->actingAs($this->superAdmin);

        $initialTasksCount = KanbanTask::where('board_id', $this->board->id)->count();

        // Create a custom view
        $customView = BoardView::create([
            'board_id' => $this->board->id,
            'name' => 'Temporary Filter View',
            'type' => 'table',
            'is_default' => false,
            'is_system' => false,
            'position' => 10,
        ]);

        $deleteResponse = $this->delete(route('kanban.views.delete', $customView));
        $deleteResponse->assertSessionHasNoErrors();

        // View is deleted
        $this->assertNull(BoardView::find($customView->id));

        // Board and tasks are 100% intact
        $this->assertNotNull(KanbanBoard::find($this->board->id));
        $this->assertEquals($initialTasksCount, KanbanTask::where('board_id', $this->board->id)->count());
    }
}
