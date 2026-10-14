<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\BoardMember;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorkOsEmployeeTaskModalTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $projectManager;
    protected User $accountManager;
    protected User $assignedDesigner;
    protected User $unassignedDesigner;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected BoardGroup $group;
    protected KanbanColumn $colNotStarted;
    protected KanbanColumn $colInProgress;
    protected KanbanColumn $colInReview;
    protected KanbanColumn $colDone;
    protected KanbanTask $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::factory()->create(['name' => 'Alexander Vance', 'role' => 'super_admin']);
        $this->projectManager = User::factory()->create(['name' => 'Maria Santos', 'role' => 'project_manager']);
        $this->accountManager = User::factory()->create(['name' => 'Chris Vance', 'role' => 'account_manager']);
        $this->assignedDesigner = User::factory()->create(['name' => 'Leo De Guzman', 'role' => 'designer']);
        $this->unassignedDesigner = User::factory()->create(['name' => 'Chloe Bennett', 'role' => 'designer']);

        $this->workspace = Workspace::create([
            'name' => 'Agency Production Operations',
            'owner_id' => $this->superAdmin->id,
            'is_favorite' => true,
        ]);

        foreach ([$this->superAdmin, $this->projectManager, $this->accountManager, $this->assignedDesigner, $this->unassignedDesigner] as $u) {
            WorkspaceMember::create([
                'workspace_id' => $this->workspace->id,
                'user_id' => $u->id,
                'role' => $u->role === 'super_admin' ? 'owner' : 'member',
            ]);
        }

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Angora Production — Demo',
            'created_by' => $this->superAdmin->id,
        ]);

        foreach ([$this->superAdmin, $this->projectManager, $this->accountManager, $this->assignedDesigner, $this->unassignedDesigner] as $u) {
            BoardMember::create([
                'board_id' => $this->board->id,
                'user_id' => $u->id,
                'role' => in_array($u->role, ['super_admin', 'admin'], true) ? 'admin' : (in_array($u->role, ['project_manager', 'account_manager'], true) ? 'editor' : 'viewer'),
            ]);
        }

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Production Tasks',
            'position' => 0,
            'color' => '#579BFC',
        ]);

        $this->colNotStarted = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Not Started',
            'category' => 'not_started',
            'semantic_category' => 'not_started',
            'color' => '#64748b',
            'position' => 0,
        ]);

        $this->colInProgress = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Working on it',
            'category' => 'in_progress',
            'semantic_category' => 'in_progress',
            'color' => '#fdab3d',
            'position' => 1,
        ]);

        $this->colInReview = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'For Review',
            'category' => 'in_review',
            'semantic_category' => 'in_review',
            'color' => '#a25ddc',
            'position' => 2,
        ]);

        $this->colDone = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Done',
            'category' => 'completed',
            'semantic_category' => 'completed',
            'color' => '#00c875',
            'position' => 3,
        ]);

        // Setup board columns
        BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'person',
            'title' => 'Designer',
            'type' => 'people',
            'position' => 1,
            'is_visible' => true,
            'width' => 150,
        ]);

        BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'account_manager',
            'title' => 'AM',
            'type' => 'people',
            'position' => 2,
            'is_visible' => true,
            'width' => 140,
        ]);

        BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'service_type',
            'title' => 'Service Type',
            'type' => 'dropdown',
            'position' => 3,
            'is_visible' => true,
            'width' => 170,
            'config' => ['options' => ['Logo', 'Landing Page', 'Video']],
        ]);

        $this->task = KanbanTask::create([
            'board_id' => $this->board->id,
            'group_id' => $this->group->id,
            'column_id' => $this->colNotStarted->id,
            'title' => 'Brand Identity & Guidelines Redesign',
            'description' => 'Comprehensive branding guidelines, typography scale, and vector logo pack.',
            'assigned_to' => $this->assignedDesigner->id,
            'priority' => 'High',
            'due_date' => '2026-10-20',
            'due_time' => '17:00:00',
            'progress' => 15,
            'created_by' => $this->superAdmin->id,
            'custom_values' => [
                'designer_ids' => [$this->assignedDesigner->id],
                'account_manager' => [$this->accountManager->id],
                'project_manager' => [$this->projectManager->id],
                'service_type' => 'Logo',
            ],
        ]);
    }

    /**
     * 1. Super Admin and Project Manager have privileged editing permissions.
     */
    public function test_super_admin_and_pm_have_full_management_capabilities(): void
    {
        $this->actingAs($this->superAdmin);
        $resAdmin = $this->get(route('kanban.index', ['workspace' => $this->workspace->id, 'board' => $this->board->id]));
        $resAdmin->assertOk();
        $permissionsAdmin = $resAdmin->viewData('page')['props']['permissions'];
        $this->assertTrue($permissionsAdmin['canEditTask']);
        $this->assertTrue($permissionsAdmin['canAssignUsers']);
        $this->assertTrue($permissionsAdmin['canChangeDeadlines']);

        $this->actingAs($this->projectManager);
        $resPm = $this->get(route('kanban.index', ['workspace' => $this->workspace->id, 'board' => $this->board->id]));
        $resPm->assertOk();
        $permissionsPm = $resPm->viewData('page')['props']['permissions'];
        $this->assertTrue($permissionsPm['canEditTask']);
        $this->assertTrue($permissionsPm['canAssignUsers']);
        $this->assertTrue($permissionsPm['canChangeDeadlines']);
    }

    /**
     * 2. Designer permissions indicate employee production view with deny-by-default restrictions.
     */
    public function test_designer_has_employee_view_permissions(): void
    {
        $this->actingAs($this->assignedDesigner);
        $res = $this->get(route('kanban.index', ['workspace' => $this->workspace->id, 'board' => $this->board->id]));
        $res->assertOk();

        $permissions = $res->viewData('page')['props']['permissions'];
        $this->assertFalse($permissions['canEditTask']);
        $this->assertFalse($permissions['canAssignUsers']);
        $this->assertFalse($permissions['canChangeDeadlines']);
        $this->assertFalse($permissions['canDeleteTask']);
        $this->assertTrue($permissions['canMoveAssignedTask']);
    }

    /**
     * 3. Assigned designer can update progress on their assigned task.
     */
    public function test_assigned_designer_can_update_task_progress(): void
    {
        $this->actingAs($this->assignedDesigner);

        $res = $this->patch(route('kanban.tasks.update', $this->task), [
            'progress' => 50,
        ]);

        $res->assertSessionHasNoErrors();
        $this->assertEquals(50, $this->task->fresh()->progress);
    }

    /**
     * 4. Assigned designer cannot modify privileged fields (title, deadline, priority, assignees).
     */
    public function test_assigned_designer_cannot_modify_privileged_fields(): void
    {
        $this->actingAs($this->assignedDesigner);

        // Attempt to rename task
        $resTitle = $this->patch(route('kanban.tasks.update', $this->task), [
            'title' => 'Illegally Renamed Task',
        ]);
        $resTitle->assertForbidden();
        $this->assertEquals('Brand Identity & Guidelines Redesign', $this->task->fresh()->title);

        // Attempt to change deadline
        $resDeadline = $this->patch(route('kanban.tasks.update', $this->task), [
            'due_date' => '2026-12-31',
        ]);
        $resDeadline->assertForbidden();
        $this->assertEquals('2026-10-20', $this->task->fresh()->due_date);

        // Attempt to reassign
        $resAssignee = $this->patch(route('kanban.tasks.update', $this->task), [
            'assigned_to' => $this->unassignedDesigner->id,
        ]);
        $resAssignee->assertForbidden();
        $this->assertEquals($this->assignedDesigner->id, $this->task->fresh()->assigned_to);

        // Attempt to delete
        $resDelete = $this->delete(route('kanban.tasks.delete', $this->task));
        $resDelete->assertForbidden();
        $this->assertDatabaseHas('kanban_tasks', ['id' => $this->task->id]);
    }

    /**
     * 5. Unassigned designer cannot modify progress on tasks assigned to others.
     */
    public function test_unassigned_designer_cannot_modify_progress(): void
    {
        $this->actingAs($this->unassignedDesigner);

        $res = $this->patch(route('kanban.tasks.update', $this->task), [
            'progress' => 75,
        ]);

        $res->assertForbidden();
        $this->assertEquals(15, $this->task->fresh()->progress);
    }

    /**
     * 6. Assigned designer can advance task through authorized workflow stages (e.g. to in_progress and in_review).
     */
    public function test_assigned_designer_can_move_task_through_authorized_stages(): void
    {
        $this->actingAs($this->assignedDesigner);

        $resProgress = $this->patch(route('kanban.tasks.update-column', $this->task), [
            'column_id' => $this->colInProgress->id,
        ]);
        $resProgress->assertSessionHasNoErrors();
        $this->assertEquals($this->colInProgress->id, $this->task->fresh()->column_id);

        $resReview = $this->patch(route('kanban.tasks.update-column', $this->task), [
            'column_id' => $this->colInReview->id,
        ]);
        $resReview->assertSessionHasNoErrors();
        $this->assertEquals($this->colInReview->id, $this->task->fresh()->column_id);
    }

    /**
     * 7. Assigned designer cannot directly complete task (must go through review).
     */
    public function test_assigned_designer_cannot_directly_complete_task(): void
    {
        $this->actingAs($this->assignedDesigner);

        $res = $this->patch(route('kanban.tasks.update-column', $this->task), [
            'column_id' => $this->colDone->id,
        ]);

        $res->assertForbidden();
        $this->assertNotEquals($this->colDone->id, $this->task->fresh()->column_id);
    }

    /**
     * 8. Assigned designer can create and toggle subtasks.
     */
    public function test_assigned_designer_can_manage_subtasks(): void
    {
        $this->actingAs($this->assignedDesigner);

        // Add subtask
        $resAdd = $this->post(route('kanban.tasks.subitems.store', $this->task), [
            'title' => 'Export SVG Logo Variants',
        ]);
        $resAdd->assertSessionHasNoErrors();

        $subtask = KanbanTask::where('parent_id', $this->task->id)->first();
        $this->assertNotNull($subtask);
        $this->assertEquals('Export SVG Logo Variants', $subtask->title);

        // Toggle subtask completion
        $resToggle = $this->patch(route('kanban.tasks.update', $subtask), [
            'progress' => 100,
        ]);
        $resToggle->assertSessionHasNoErrors();
        $this->assertEquals(100, $subtask->fresh()->progress);
    }

    /**
     * 9. Users can post comments with mentions and threaded replies.
     */
    public function test_user_can_post_comment_and_reply(): void
    {
        $this->actingAs($this->assignedDesigner);

        // Post update
        $resComment = $this->post(route('kanban.tasks.comments.store', $this->task), [
            'message' => 'Completed initial vector art @Maria Santos for QA inspection.',
        ]);
        $resComment->assertSessionHasNoErrors();

        $comment = KanbanComment::where('task_id', $this->task->id)->first();
        $this->assertNotNull($comment);
        $this->assertEquals('Completed initial vector art @Maria Santos for QA inspection.', $comment->message);

        // Reply to comment
        $this->actingAs($this->projectManager);
        $resReply = $this->post(route('kanban.tasks.comments.store', $this->task), [
            'parent_id' => $comment->id,
            'message' => 'Looks great! Proceeding with review.',
        ]);
        $resReply->assertSessionHasNoErrors();

        $this->assertEquals(1, $comment->fresh()->replies()->count());
    }

    /**
     * 10. Assigned designer can submit deliverables for review.
     */
    public function test_assigned_designer_can_submit_deliverables_for_review(): void
    {
        $this->actingAs($this->assignedDesigner);

        $res = $this->post(route('kanban.tasks.review.submit', $this->task), [
            'notes' => 'Figma link: figma.com/file/angora-brand-v2 with vector exports.',
        ]);

        $res->assertSessionHasNoErrors();
        $this->assertDatabaseHas('task_review_cycles', [
            'task_id' => $this->task->id,
            'round_number' => 1,
            'state' => 'pending',
            'submitted_by' => $this->assignedDesigner->id,
        ]);
    }
}
