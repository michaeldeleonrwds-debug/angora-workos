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
use Tests\TestCase;

class WorkOsPhase36NestedSubtaskTableTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $designerLeo;
    protected User $designerMaya;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $statusColumn;
    protected BoardGroup $group;
    protected KanbanTask $parentTask;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['email' => 'admin_subtable@angora.test'],
            [
                'name' => 'Admin Subtable',
                'password' => bcrypt('password'),
                'department' => 'Operations',
            ]
        );
        $this->admin->syncRoles(['super_admin']);

        $this->designerLeo = User::firstOrCreate(
            ['email' => 'leo_subtable@angora.test'],
            [
                'name' => 'Leo De Guzman',
                'password' => bcrypt('password'),
                'department' => 'Creative & Design',
            ]
        );
        $this->designerLeo->syncRoles(['dept_user']);

        $this->designerMaya = User::firstOrCreate(
            ['email' => 'maya_subtable@angora.test'],
            [
                'name' => 'Maya Lin',
                'password' => bcrypt('password'),
                'department' => 'Video & Motion',
            ]
        );
        $this->designerMaya->syncRoles(['dept_user']);

        $this->workspace = Workspace::create([
            'name' => 'Subtask Test Workspace',
            'owner_id' => $this->admin->id,
        ]);

        WorkspaceMember::create([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->admin->id,
            'role' => 'owner',
        ]);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Client Production Deliverables',
            'department' => 'Creative',
            'visibility' => 'public',
            'created_by' => $this->admin->id,
        ]);

        $this->statusColumn = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'New Task',
            'color' => '#0086C0',
            'position' => 0,
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Sprint Deliverables',
            'color' => '#579BFC',
            'position' => 0,
        ]);

        $this->parentTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'group_id' => $this->group->id,
            'column_id' => $this->statusColumn->id,
            'title' => 'Parent Creative Campaign Asset Set',
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_can_create_subtask_scoped_dynamic_column(): void
    {
        $this->actingAs($this->admin);

        $response = $this->post(route('kanban.columns.store', $this->board), [
            'title' => 'Task Type',
            'type' => 'dropdown',
            'scope' => 'subtask',
            'config' => [
                'options' => ['Design Phase', 'Build / Asset Export', 'QA & Review'],
            ],
            'width' => 160,
        ]);

        $response->assertSessionHas('success', 'Column added');

        $this->assertDatabaseHas('board_columns', [
            'board_id' => $this->board->id,
            'title' => 'Task Type',
            'type' => 'dropdown',
            'scope' => 'subtask',
            'width' => 160,
        ]);
    }

    public function test_board_column_relationships_isolate_task_and_subtask_scopes(): void
    {
        BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'col_client_budget',
            'title' => 'Client Budget',
            'type' => 'number',
            'scope' => 'task',
            'position' => 0,
            'width' => 140,
        ]);

        BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'sub_internal_revision',
            'title' => 'Internal Revision',
            'type' => 'text',
            'scope' => 'subtask',
            'position' => 0,
            'width' => 140,
        ]);

        $taskCols = $this->board->boardColumns()->get();
        $subCols = $this->board->subitemColumns()->get();
        $allCols = $this->board->allBoardColumns()->get();

        $this->assertTrue($taskCols->contains('key', 'col_client_budget'));
        $this->assertFalse($taskCols->contains('key', 'sub_internal_revision'));

        $this->assertTrue($subCols->contains('key', 'sub_internal_revision'));
        $this->assertFalse($subCols->contains('key', 'col_client_budget'));

        $this->assertCount(2, $allCols);
    }

    public function test_ensure_board_integrity_seeds_default_subtask_columns(): void
    {
        $this->actingAs($this->admin);

        $this->assertEquals(0, $this->board->subitemColumns()->count());

        $response = $this->get(route('kanban.index', ['board' => $this->board->id]));
        $response->assertOk();

        $this->board->refresh();
        $subCols = $this->board->subitemColumns()->get();

        $this->assertGreaterThanOrEqual(7, $subCols->count());
        $keys = $subCols->pluck('key')->all();
        $this->assertContains('sub_designer', $keys);
        $this->assertContains('sub_deadline', $keys);
        $this->assertContains('sub_status', $keys);
        $this->assertContains('sub_task_type', $keys);
        $this->assertContains('sub_internal_revision', $keys);
        $this->assertContains('sub_client_revision', $keys);
        $this->assertContains('sub_client_requests', $keys);
    }

    public function test_inline_subitem_creation_links_parent_and_logs_activity(): void
    {
        $this->actingAs($this->admin);

        $response = $this->post(route('kanban.tasks.subitems.store', $this->parentTask), [
            'title' => 'Facebook & Instagram Story Creative Sizes',
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        $response->assertSessionHas('success', 'Subitem added');

        $this->assertDatabaseHas('kanban_tasks', [
            'board_id' => $this->board->id,
            'parent_id' => $this->parentTask->id,
            'title' => 'Facebook & Instagram Story Creative Sizes',
        ]);

        $sub = KanbanTask::where('parent_id', $this->parentTask->id)->first();
        $this->assertNotNull($sub);

        $this->assertDatabaseHas('task_activities', [
            'task_id' => $this->parentTask->id,
            'event_type' => 'subitem_created',
        ]);
    }

    public function test_subtask_updates_sync_custom_values_and_multi_assignees(): void
    {
        $this->actingAs($this->admin);

        $subitem = KanbanTask::create([
            'board_id' => $this->board->id,
            'parent_id' => $this->parentTask->id,
            'group_id' => $this->group->id,
            'column_id' => $this->statusColumn->id,
            'title' => '3D Render Masking',
            'created_by' => $this->admin->id,
        ]);

        // Create subtask column on board to test activity logging resolution
        BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'sub_internal_revision',
            'title' => 'Internal Revision',
            'type' => 'text',
            'scope' => 'subtask',
            'position' => 0,
            'width' => 140,
        ]);

        $response = $this->patch(route('kanban.tasks.update', $subitem), [
            'assigned_to' => $this->designerLeo->id,
            'custom_values' => [
                'sub_designer' => [$this->designerLeo->id, $this->designerMaya->id],
                'designer_ids' => [$this->designerLeo->id, $this->designerMaya->id],
                'sub_task_type' => 'Build / Asset Export',
                'sub_internal_revision' => 'Round 2 Changes Implemented',
                'sub_client_requests' => 'Export at 4K resolution with alpha channel.',
            ],
        ]);

        $response->assertSessionHas('success');

        $subitem->refresh();
        $this->assertEquals($this->designerLeo->id, $subitem->assigned_to);
        $this->assertEquals([$this->designerLeo->id, $this->designerMaya->id], $subitem->custom_values['sub_designer']);
        $this->assertEquals('Build / Asset Export', $subitem->custom_values['sub_task_type']);
        $this->assertEquals('Round 2 Changes Implemented', $subitem->custom_values['sub_internal_revision']);
        $this->assertEquals('Export at 4K resolution with alpha channel.', $subitem->custom_values['sub_client_requests']);

        // Verify activity was logged for the subtask
        $this->assertDatabaseHas('task_activities', [
            'task_id' => $subitem->id,
            'field_name' => 'sub_internal_revision',
        ]);
    }

    public function test_board_duplication_preserves_subtask_column_scope(): void
    {
        $this->actingAs($this->admin);

        BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'col_lead_designer',
            'title' => 'Lead Designer',
            'type' => 'people',
            'scope' => 'task',
            'position' => 0,
            'width' => 140,
        ]);

        BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'sub_qa_status',
            'title' => 'QA Status',
            'type' => 'status',
            'scope' => 'subtask',
            'position' => 0,
            'width' => 140,
        ]);

        $response = $this->post(route('kanban.boards.duplicate', $this->board));
        $response->assertSessionHas('success');

        $duplicatedBoard = KanbanBoard::where('title', $this->board->title . ' (Copy)')->first();
        $this->assertNotNull($duplicatedBoard);

        $this->assertDatabaseHas('board_columns', [
            'board_id' => $duplicatedBoard->id,
            'key' => 'col_lead_designer',
            'scope' => 'task',
        ]);

        $this->assertDatabaseHas('board_columns', [
            'board_id' => $duplicatedBoard->id,
            'key' => 'sub_qa_status',
            'scope' => 'subtask',
        ]);
    }

    public function test_demo_seeder_configures_production_board_with_subtask_columns_and_data(): void
    {
        $this->seed(AngoraWorkOsDemoSeeder::class);

        $demoBoard = KanbanBoard::where('title', 'Angora Production — Demo')->first();
        $this->assertNotNull($demoBoard);

        // Assert 7 independent subtask columns
        $subCols = $demoBoard->subitemColumns()->get();
        $this->assertGreaterThanOrEqual(7, $subCols->count());

        $colKeys = $subCols->pluck('key')->all();
        $this->assertContains('sub_designer', $colKeys);
        $this->assertContains('sub_deadline', $colKeys);
        $this->assertContains('sub_status', $colKeys);
        $this->assertContains('sub_task_type', $colKeys);
        $this->assertContains('sub_internal_revision', $colKeys);
        $this->assertContains('sub_client_revision', $colKeys);
        $this->assertContains('sub_client_requests', $colKeys);

        // Assert seeded subitems have custom values populated
        $subtasks = KanbanTask::where('board_id', $demoBoard->id)
            ->whereNotNull('parent_id')
            ->get();

        $this->assertGreaterThan(0, $subtasks->count());

        $firstSub = $subtasks->first();
        $this->assertNotNull($firstSub->custom_values);
        $this->assertArrayHasKey('sub_task_type', $firstSub->custom_values);
        $this->assertArrayHasKey('sub_internal_revision', $firstSub->custom_values);
        $this->assertArrayHasKey('sub_client_requests', $firstSub->custom_values);
    }
}
