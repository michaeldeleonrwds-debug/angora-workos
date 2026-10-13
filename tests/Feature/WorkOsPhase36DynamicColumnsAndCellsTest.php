<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\BoardMember;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Database\Seeders\AngoraWorkOsDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsPhase36DynamicColumnsAndCellsTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $memberUser;
    protected User $outsiderUser;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $column;
    protected BoardGroup $group;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::firstOrCreate(
            ['email' => 'superadmin_phase36@angora.test'],
            [
                'name' => 'Super Admin Phase 3.6',
                'password' => bcrypt('password'),
                'role' => 'super_admin',
                'department' => 'Executive',
            ]
        );

        $this->memberUser = User::firstOrCreate(
            ['email' => 'member_phase36@angora.test'],
            [
                'name' => 'Member Phase 3.6',
                'password' => bcrypt('password'),
                'role' => 'project_manager',
                'department' => 'Engineering',
            ]
        );

        $this->outsiderUser = User::firstOrCreate(
            ['email' => 'outsider_phase36@angora.test'],
            [
                'name' => 'Outsider Phase 3.6',
                'password' => bcrypt('password'),
                'role' => 'freelancer',
                'department' => 'External',
            ]
        );

        $this->workspace = Workspace::create([
            'name' => 'Phase 3.6 Workspace',
            'description' => 'Test workspace for dynamic columns and interactive cells',
            'owner_id' => $this->memberUser->id,
        ]);

        WorkspaceMember::create([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->memberUser->id,
            'role' => 'admin',
        ]);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Dynamic Table Board',
            'department' => 'Engineering',
            'created_by' => $this->memberUser->id,
            'visibility' => 'workspace',
        ]);

        BoardMember::create([
            'board_id' => $this->board->id,
            'user_id' => $this->memberUser->id,
            'role' => 'editor',
        ]);

        $this->column = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Progress',
            'color' => '#FDAB3D',
            'position' => 0,
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Core Sprint',
            'color' => '#579BFC',
            'position' => 0,
        ]);
    }

    public function test_can_create_long_text_and_status_board_columns(): void
    {
        $this->actingAs($this->memberUser);

        // 1. Create long_text column
        $response = $this->post("/kanban/boards/{$this->board->id}/columns", [
            'title' => 'Detailed Architecture Notes',
            'type' => 'long_text',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('board_columns', [
            'board_id' => $this->board->id,
            'title' => 'Detailed Architecture Notes',
            'type' => 'long_text',
        ]);

        // 2. Create custom status column with configured status_options
        $response = $this->post("/kanban/boards/{$this->board->id}/columns", [
            'title' => 'QA Readiness',
            'type' => 'status',
            'config' => [
                'status_options' => [
                    ['label' => 'Pending Review', 'color' => '#FDAB3D'],
                    ['label' => 'Certified', 'color' => '#00C875'],
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('board_columns', [
            'board_id' => $this->board->id,
            'title' => 'QA Readiness',
            'type' => 'status',
        ]);
    }

    public function test_can_duplicate_board_column_and_copies_custom_values_across_tasks(): void
    {
        $this->actingAs($this->memberUser);

        $originalColumn = BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'col_original_notes',
            'title' => 'Original Notes',
            'type' => 'long_text',
            'position' => 1,
            'is_visible' => true,
            'width' => 180,
            'config' => ['placeholder' => 'Notes here'],
        ]);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'group_id' => $this->group->id,
            'column_id' => $this->column->id,
            'title' => 'Task with Custom Value',
            'custom_values' => [
                'col_original_notes' => 'Critical production bug context',
            ],
            'created_by' => $this->memberUser->id,
        ]);

        $response = $this->post("/kanban/board-columns/{$originalColumn->id}/duplicate");
        $response->assertSessionHasNoErrors();

        $duplicatedColumn = BoardColumn::where('board_id', $this->board->id)
            ->where('id', '!=', $originalColumn->id)
            ->first();

        $this->assertNotNull($duplicatedColumn);
        $this->assertEquals('Original Notes (Copy)', $duplicatedColumn->title);
        $this->assertEquals('long_text', $duplicatedColumn->type);
        $this->assertEquals(180, $duplicatedColumn->width);

        // Verify task received copied custom values
        $task->refresh();
        $this->assertArrayHasKey($duplicatedColumn->key, $task->custom_values);
        $this->assertEquals('Critical production bug context', $task->custom_values[$duplicatedColumn->key]);
    }

    public function test_unauthorized_user_cannot_create_or_duplicate_column(): void
    {
        $this->actingAs($this->outsiderUser);

        $column = BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'col_secret',
            'title' => 'Secret Column',
            'type' => 'text',
            'position' => 1,
            'is_visible' => true,
        ]);

        // Attempt duplicate
        $response = $this->post("/kanban/board-columns/{$column->id}/duplicate");
        $response->assertForbidden();

        // Attempt create
        $response = $this->post("/kanban/boards/{$this->board->id}/columns", [
            'title' => 'Hacker Column',
            'type' => 'text',
        ]);
        $response->assertForbidden();
    }

    public function test_poll_sync_returns_board_columns_and_status_columns(): void
    {
        $this->actingAs($this->memberUser);

        $boardCol = BoardColumn::create([
            'board_id' => $this->board->id,
            'key' => 'col_priority_level',
            'title' => 'Priority Level',
            'type' => 'priority',
            'position' => 1,
            'is_visible' => true,
        ]);

        $response = $this->getJson("/kanban/sync?board_id={$this->board->id}&last_sync=" . urlencode(now()->subMinute()->toISOString()));

        $response->assertOk();
        $response->assertJsonStructure([
            'tasks',
            'board_columns',
            'status_columns',
            'unread_notifications_count',
            'recent_notifications',
            'cursor',
        ]);

        $data = $response->json();
        $this->assertTrue(collect($data['board_columns'])->contains('id', $boardCol->id));
        $this->assertTrue(collect($data['status_columns'])->contains('id', $this->column->id));
    }

    public function test_angora_work_os_demo_seeder_runs_idempotently(): void
    {
        $seeder = new AngoraWorkOsDemoSeeder();

        // First run
        $seeder->run();

        $this->assertDatabaseHas('workspaces', [
            'name' => 'Engineering & Product Operations',
        ]);

        $board = KanbanBoard::where('title', 'Sprint 42: Next-Gen Architecture & Scale')->first();
        $this->assertNotNull($board);

        $this->assertDatabaseHas('board_groups', [
            'board_id' => $board->id,
            'title' => 'Active Deliverables',
        ]);

        $this->assertDatabaseHas('board_columns', [
            'board_id' => $board->id,
            'key' => 'spec_notes',
            'type' => 'long_text',
        ]);

        $countTasks = KanbanTask::where('board_id', $board->id)->count();
        $this->assertGreaterThan(0, $countTasks);

        // Verify Realistic Production Board Seeding
        $this->assertDatabaseHas('workspaces', [
            'name' => 'Agency Production Operations',
        ]);

        $prodBoard = KanbanBoard::where('title', 'Angora Production — Demo')->first();
        $this->assertNotNull($prodBoard);

        // Verify 6 Groups
        $expectedGroups = ['Resources', 'Hold', 'New Task', 'In Progress', 'For Review', 'Completed'];
        foreach ($expectedGroups as $gTitle) {
            $this->assertDatabaseHas('board_groups', [
                'board_id' => $prodBoard->id,
                'title' => $gTitle,
            ]);
        }

        // Verify 7 Dynamic Columns
        $this->assertDatabaseHas('board_columns', [
            'board_id' => $prodBoard->id,
            'title' => 'Designer',
            'type' => 'people',
        ]);
        $this->assertDatabaseHas('board_columns', [
            'board_id' => $prodBoard->id,
            'title' => 'AM',
            'type' => 'people',
        ]);
        $this->assertDatabaseHas('board_columns', [
            'board_id' => $prodBoard->id,
            'title' => 'Status',
            'type' => 'status',
        ]);
        $this->assertDatabaseHas('board_columns', [
            'board_id' => $prodBoard->id,
            'title' => 'Deadline',
            'type' => 'date',
        ]);
        $this->assertDatabaseHas('board_columns', [
            'board_id' => $prodBoard->id,
            'title' => 'Client Deadline',
            'type' => 'date',
        ]);
        $this->assertDatabaseHas('board_columns', [
            'board_id' => $prodBoard->id,
            'title' => 'Service Type',
            'type' => 'dropdown',
        ]);
        $this->assertDatabaseHas('board_columns', [
            'board_id' => $prodBoard->id,
            'title' => 'No. of Task Simul',
            'type' => 'number',
        ]);

        // Verify Tasks & Subitems counts
        $parentTasksCount = KanbanTask::where('board_id', $prodBoard->id)->whereNull('parent_id')->count();
        $subitemsCount = KanbanTask::where('board_id', $prodBoard->id)->whereNotNull('parent_id')->count();
        $this->assertGreaterThanOrEqual(25, $parentTasksCount);
        $this->assertGreaterThanOrEqual(10, $subitemsCount);

        // Second run to confirm complete idempotency across both boards
        $seeder->run();
        $this->assertEquals($countTasks, KanbanTask::where('board_id', $board->id)->count());
        $this->assertEquals($parentTasksCount, KanbanTask::where('board_id', $prodBoard->id)->whereNull('parent_id')->count());
        $this->assertEquals($subitemsCount, KanbanTask::where('board_id', $prodBoard->id)->whereNotNull('parent_id')->count());
    }
}
