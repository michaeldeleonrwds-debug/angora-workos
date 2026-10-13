<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskActivity;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Database\Seeders\AngoraWorkOsDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorkOsPhase36ActivityAndMultiAssigneesTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $designerLeo;
    protected User $designerMaya;
    protected User $amMaria;
    protected User $amChris;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $columnNotStarted;
    protected KanbanColumn $columnInProgress;
    protected KanbanColumn $columnDone;
    protected BoardGroup $group;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::firstOrCreate(
            ['email' => 'admin_phase36@angora.test'],
            [
                'name' => 'Admin Phase 3.6',
                'password' => bcrypt('password'),
                'role' => 'super_admin',
                'department' => 'Executive',
            ]
        );

        $this->designerLeo = User::firstOrCreate(
            ['email' => 'leo_phase36@angora.test'],
            [
                'name' => 'Leo Rivera',
                'password' => bcrypt('password'),
                'role' => 'dept_user',
                'department' => 'Design',
            ]
        );

        $this->designerMaya = User::firstOrCreate(
            ['email' => 'maya_phase36@angora.test'],
            [
                'name' => 'Maya Lin',
                'password' => bcrypt('password'),
                'role' => 'dept_user',
                'department' => 'Video & Motion',
            ]
        );

        $this->amMaria = User::firstOrCreate(
            ['email' => 'maria_phase36@angora.test'],
            [
                'name' => 'Maria Santos',
                'password' => bcrypt('password'),
                'role' => 'project_manager',
                'department' => 'Account Management',
            ]
        );

        $this->amChris = User::firstOrCreate(
            ['email' => 'chris_phase36@angora.test'],
            [
                'name' => 'Chris Vance',
                'password' => bcrypt('password'),
                'role' => 'project_manager',
                'department' => 'Account Management',
            ]
        );

        $this->workspace = Workspace::create([
            'name' => 'Production Workspace Phase 3.6',
            'owner_id' => $this->superAdmin->id,
        ]);

        foreach ([$this->superAdmin, $this->designerLeo, $this->designerMaya, $this->amMaria, $this->amChris] as $u) {
            WorkspaceMember::create([
                'workspace_id' => $this->workspace->id,
                'user_id' => $u->id,
                'role' => $u->role === 'super_admin' ? 'owner' : 'member',
            ]);
        }

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Production Master Board',
            'created_by' => $this->superAdmin->id,
            'visibility' => 'main',
        ]);

        $this->columnNotStarted = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Not Started',
            'color' => '#64748b',
            'position' => 0,
        ]);

        $this->columnInProgress = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Working on it',
            'color' => '#fdab3d',
            'position' => 1,
        ]);

        $this->columnDone = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Done',
            'color' => '#00c875',
            'position' => 2,
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Creative Deliverables',
            'color' => '#579BFC',
            'position' => 0,
        ]);

        // Add dynamic Designer and AM columns
        BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'person',
            'title' => 'Designer',
            'type' => 'people',
            'position' => 0,
            'width' => 140,
        ]);

        BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'account_manager',
            'title' => 'AM',
            'type' => 'people',
            'position' => 1,
            'width' => 140,
        ]);
    }

    public function test_can_record_task_creation_activity(): void
    {
        $this->actingAs($this->superAdmin);

        $response = $this->post(route('kanban.tasks.store'), [
            'board_id' => $this->board->id,
            'column_id' => $this->columnNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Hero Banner Campaign 2026',
            'priority' => 'High',
        ]);

        $response->assertSessionHasNoErrors();

        $task = KanbanTask::where('title', 'Hero Banner Campaign 2026')->first();
        $this->assertNotNull($task);

        $activity = TaskActivity::where('task_id', $task->id)->where('event_type', 'task_created')->first();
        $this->assertNotNull($activity);
        $this->assertEquals($this->superAdmin->id, $activity->user_id);
        $this->assertStringContainsString('created this task', $activity->description);
    }

    public function test_can_assign_multiple_people_to_designer_and_am(): void
    {
        $this->actingAs($this->superAdmin);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->columnNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Motion Graphics Reel',
            'priority' => 'Medium',
            'created_by' => $this->superAdmin->id,
        ]);

        // Assign multiple designers: Leo and Maya, and multiple AMs: Maria and Chris
        $response = $this->patch(route('kanban.tasks.update', $task), [
            'assigned_to' => $this->designerLeo->id,
            'custom_values' => [
                'designer_ids' => [$this->designerLeo->id, $this->designerMaya->id],
                'person' => [$this->designerLeo->id, $this->designerMaya->id],
                'account_manager' => [$this->amMaria->id, $this->amChris->id],
            ],
        ]);

        $response->assertSessionHasNoErrors();

        $task->refresh();

        $this->assertEquals($this->designerLeo->id, $task->assigned_to);
        $this->assertEquals([$this->designerLeo->id, $this->designerMaya->id], $task->custom_values['designer_ids']);
        $this->assertEquals([$this->amMaria->id, $this->amChris->id], $task->custom_values['account_manager']);

        // Check activity logs recorded
        $amActivity = TaskActivity::where('task_id', $task->id)
            ->where('event_type', 'people_assignment_changed')
            ->where('field_name', 'account_manager')
            ->first();

        $this->assertNotNull($amActivity);
        $this->assertStringContainsString('Maria Santos, Chris Vance', $amActivity->description);
    }

    public function test_can_record_task_mutation_activities(): void
    {
        $this->actingAs($this->superAdmin);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->columnNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Initial Scope Document',
            'priority' => 'Low',
            'due_date' => '2026-10-20',
            'progress' => 10,
            'created_by' => $this->superAdmin->id,
        ]);

        // 1. Rename task
        $this->patch(route('kanban.tasks.update', $task), [
            'title' => 'Updated Final Scope Document',
        ]);
        $renameAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'task_renamed')->first();
        $this->assertNotNull($renameAct);
        $this->assertEquals('Initial Scope Document', $renameAct->old_value['value'] ?? $renameAct->old_value);
        $this->assertEquals('Updated Final Scope Document', $renameAct->new_value['value'] ?? $renameAct->new_value);

        // 2. Change priority
        $this->patch(route('kanban.tasks.update', $task), [
            'priority' => 'Urgent',
        ]);
        $priorityAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'priority_changed')->first();
        $this->assertNotNull($priorityAct);

        // 3. Change due date
        $this->patch(route('kanban.tasks.update', $task), [
            'due_date' => '2026-11-01',
        ]);
        $dateAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'due_date_changed')->first();
        $this->assertNotNull($dateAct);

        // 4. Update progress
        $this->patch(route('kanban.tasks.update', $task), [
            'progress' => 75,
        ]);
        $progAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'progress_updated')->first();
        $this->assertNotNull($progAct);
    }

    public function test_can_record_status_and_group_change_activity(): void
    {
        $this->actingAs($this->superAdmin);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->columnNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Landing Page Wireframes',
            'created_by' => $this->superAdmin->id,
        ]);

        // Move status
        $this->patch(route('kanban.tasks.update-column', $task), [
            'column_id' => $this->columnInProgress->id,
        ]);

        $statusAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'status_changed')->first();
        $this->assertNotNull($statusAct);
        $this->assertStringContainsString('Working on it', $statusAct->description);

        // Move group
        $newGroup = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Completed Sprints',
            'position' => 1,
        ]);

        $this->patch(route('kanban.tasks.update-group', $task), [
            'group_id' => $newGroup->id,
        ]);

        $groupAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'group_changed')->first();
        $this->assertNotNull($groupAct);
        $this->assertStringContainsString('Completed Sprints', $groupAct->description);
    }

    public function test_can_record_subitem_lifecycle_activity(): void
    {
        $this->actingAs($this->superAdmin);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->columnNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Parent Task For Subitems',
            'created_by' => $this->superAdmin->id,
        ]);

        // Add subitem
        $this->post(route('kanban.tasks.subitems.store', $task), [
            'title' => 'Nested Child Subitem 1',
        ]);

        $subitem = KanbanTask::where('parent_id', $task->id)->first();
        $this->assertNotNull($subitem);

        $createAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'subitem_created')->first();
        $this->assertNotNull($createAct);
        $this->assertStringContainsString('Nested Child Subitem 1', $createAct->description);

        // Delete subitem
        $this->delete(route('kanban.tasks.delete', $subitem));

        $deleteAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'subitem_deleted')->first();
        $this->assertNotNull($deleteAct);
        $this->assertStringContainsString('Nested Child Subitem 1', $deleteAct->description);
    }

    public function test_can_record_comment_and_reply_activity(): void
    {
        $this->actingAs($this->superAdmin);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->columnNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Task for Comments',
            'created_by' => $this->superAdmin->id,
        ]);

        // Add comment
        $this->post(route('kanban.tasks.comments.store', $task), [
            'message' => 'Please verify brand color swatches before publishing.',
        ]);

        $commentAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'comment_added')->first();
        $this->assertNotNull($commentAct);

        // Add reply
        $parentComment = $task->comments()->first();
        $this->post(route('kanban.tasks.comments.store', $task), [
            'parent_id' => $parentComment->id,
            'message' => 'Colors checked and confirmed by Lead Designer.',
        ]);

        $replyAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'reply_added')->first();
        $this->assertNotNull($replyAct);
    }

    public function test_can_record_attachment_activity(): void
    {
        Storage::fake('public');
        $this->actingAs($this->superAdmin);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->columnNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Task for Attachments',
            'created_by' => $this->superAdmin->id,
        ]);

        $file = UploadedFile::fake()->create('brand-guidelines.pdf', 500, 'application/pdf');

        $this->post(route('kanban.tasks.attachments.store', $task), [
            'file' => $file,
        ]);

        $uploadAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'attachment_uploaded')->first();
        $this->assertNotNull($uploadAct);
        $this->assertStringContainsString('brand-guidelines.pdf', $uploadAct->description);

        $attachment = $task->attachments()->first();
        $this->delete(route('kanban.attachments.delete', $attachment));

        $deleteAct = TaskActivity::where('task_id', $task->id)->where('event_type', 'attachment_deleted')->first();
        $this->assertNotNull($deleteAct);
        $this->assertStringContainsString('brand-guidelines.pdf', $deleteAct->description);
    }

    public function test_kanban_index_eager_loads_activities(): void
    {
        $this->actingAs($this->superAdmin);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->columnNotStarted->id,
            'group_id' => $this->group->id,
            'title' => 'Task for Activity Feed Loading',
            'created_by' => $this->superAdmin->id,
        ]);

        TaskActivity::create([
            'task_id' => $task->id,
            'board_id' => $this->board->id,
            'user_id' => $this->superAdmin->id,
            'event_type' => 'task_created',
            'description' => 'Created task in test environment',
        ]);

        $response = $this->get(route('kanban.index', ['workspace' => $this->workspace->id, 'board' => $this->board->id]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('activeBoard.columns.0.tasks.0.activities')
        );
    }

    public function test_seeder_creates_realistic_activities_and_multi_assignees(): void
    {
        $this->seed(AngoraWorkOsDemoSeeder::class);

        $productionBoard = KanbanBoard::where('title', 'Angora Production — Demo')->first();
        $this->assertNotNull($productionBoard);

        // Verify task with multiple designers and multiple AMs
        $multiTask = KanbanTask::where('board_id', $productionBoard->id)
            ->where('title', 'MENICO1 — Kings of Kings | Static & Video')
            ->first();

        $this->assertNotNull($multiTask);
        $this->assertIsArray($multiTask->custom_values['designer_ids'] ?? null);
        $this->assertCount(2, $multiTask->custom_values['designer_ids']);
        $this->assertIsArray($multiTask->custom_values['account_manager'] ?? null);
        $this->assertCount(2, $multiTask->custom_values['account_manager']);

        // Verify activities exist for this board
        $activitiesCount = TaskActivity::where('board_id', $productionBoard->id)->count();
        $this->assertGreaterThan(10, $activitiesCount);
    }
}
