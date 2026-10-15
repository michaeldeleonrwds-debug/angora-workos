<?php

namespace Tests\Feature;

use App\Models\BoardGroup;
use App\Models\BoardView;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Services\WorkflowService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsTableViewGroupingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected KanbanBoard $board;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->user = User::role('super_admin')->first();
        $this->actingAs($this->user);

        // The seeded demo board only has legacy statuses. Apply the production
        // workflow template to a dedicated board so tests never mutate demo data.
        $workspace = Workspace::first();
        $this->assertNotNull($workspace);

        $this->board = KanbanBoard::create([
            'workspace_id' => $workspace->id,
            'title' => 'Grouping Test Board',
            'description' => 'Board used by WorkOsTableViewGroupingTest',
            'department' => 'Operations',
            'visibility' => 'public',
            'created_by' => $this->user->id,
        ]);

        // Mirror the production custom-group layout (six groups).
        $groupTitles = [
            ['Resources', '#579BFC'],
            ['Hold', '#E2445C'],
            ['New Task', '#0086C0'],
            ['In Progress', '#FDAB3D'],
            ['For Review', '#A25DDC'],
            ['Completed', '#00C875'],
        ];
        foreach ($groupTitles as $i => [$title, $color]) {
            BoardGroup::create([
                'board_id' => $this->board->id,
                'title' => $title,
                'color' => $color,
                'position' => $i,
            ]);
        }

        // Mirror the production Main Table + Kanban views.
        BoardView::create([
            'board_id' => $this->board->id,
            'name' => 'Main Table',
            'type' => 'table',
            'is_default' => true,
            'is_system' => true,
            'settings' => [],
            'position' => 0,
        ]);
        BoardView::create([
            'board_id' => $this->board->id,
            'name' => 'Production Kanban',
            'type' => 'kanban',
            'is_default' => false,
            'is_system' => true,
            'settings' => [],
            'position' => 1,
        ]);

        // Production workflow: ten main stages + one trailing branch stage.
        app(WorkflowService::class)->applyTemplate($this->board, 'production');
    }

    protected function activeWorkflowStages(KanbanBoard $board)
    {
        return $board->columns()
            ->whereNotNull('stage_key')
            ->where('is_archived', false)
            ->orderBy('position')
            ->get();
    }

    public function test_workflow_stage_mode_exposes_all_active_production_stages(): void
    {
        $stages = $this->activeWorkflowStages($this->board);

        $this->assertGreaterThanOrEqual(10, $stages->count(), 'Production board must expose at least 10 active workflow stages');

        $titles = $stages->pluck('title')->all();
        $this->assertContains('To Do', $titles, 'Main Table workflow grouping must include the To Do stage');
        $this->assertContains('Processing', $titles);
        $this->assertContains('Progress Report', $titles);
        $this->assertContains('Ready to Report', $titles);
        $this->assertContains('Client Under Review', $titles);
    }

    public function test_workflow_stage_order_follows_configured_position(): void
    {
        $stages = $this->activeWorkflowStages($this->board);
        $positions = $stages->pluck('position')->sort()->values()->all();

        $this->assertEquals($positions, $stages->pluck('position')->values()->all(), 'Stages must be ordered by configured position');
    }

    public function test_empty_stages_remain_available_for_workflow_grouping(): void
    {
        $stages = $this->activeWorkflowStages($this->board);
        $this->assertGreaterThanOrEqual(10, $stages->count());

        // This board has no tasks yet, so every stage must still be listable
        // (Main Table must not hide empty workflow stages).
        foreach ($stages as $stage) {
            $taskCount = KanbanTask::where('board_id', $this->board->id)
                ->where('column_id', $stage->id)
                ->whereNull('parent_id')
                ->count();
            $this->assertSame(0, $taskCount);
            $this->assertNotNull($stage->title);
            $this->assertFalse((bool) $stage->is_archived);
        }

        $todo = $stages->firstWhere('stage_key', 'to_do');
        $this->assertNotNull($todo, 'Empty To Do stage must remain visible');
        $this->assertSame(0, KanbanTask::where('column_id', $todo->id)->count());
    }

    public function test_tasks_are_addressable_by_column_id_for_stage_grouping(): void
    {
        $todo = $this->activeWorkflowStages($this->board)->firstWhere('stage_key', 'to_do');
        $this->assertNotNull($todo);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $todo->id,
            'group_id' => BoardGroup::where('board_id', $this->board->id)->first()->id,
            'title' => 'Stage grouping fixture task',
            'priority' => 'Medium',
            'position' => 0,
            'created_by' => $this->user->id,
        ]);

        $this->assertEquals($todo->id, $task->column_id);
        $column = KanbanColumn::find($task->column_id);
        $this->assertNotNull($column);
        $this->assertEquals($this->board->id, $column->board_id);
        $this->assertTrue($this->activeWorkflowStages($this->board)->contains('id', $column->id));
    }

    public function test_custom_group_mode_preserves_existing_board_groups(): void
    {
        $groups = BoardGroup::where('board_id', $this->board->id)->orderBy('position')->get();

        $this->assertGreaterThanOrEqual(6, $groups->count(), 'Custom Group mode must preserve the six production groups');
        $titles = $groups->pluck('title')->all();
        $this->assertContains('Resources', $titles);
        $this->assertContains('Hold', $titles);
        $this->assertContains('New Task', $titles);
        $this->assertContains('In Progress', $titles);
        $this->assertContains('For Review', $titles);
        $this->assertContains('Completed', $titles);
    }

    public function test_switching_group_by_settings_does_not_alter_tasks_or_relationships(): void
    {
        $view = BoardView::where('board_id', $this->board->id)->where('type', 'table')->firstOrFail();

        $tasksBefore = KanbanTask::where('board_id', $this->board->id)
            ->orderBy('id')
            ->get(['id', 'column_id', 'group_id', 'title'])
            ->toArray();
        $groupsBefore = BoardGroup::where('board_id', $this->board->id)->count();
        $columnsBefore = KanbanColumn::where('board_id', $this->board->id)->count();

        $this->patch(route('kanban.views.update', $view), ['settings' => ['group_by' => 'workflow_stage']])
            ->assertSessionHas('success');
        $this->assertEquals('workflow_stage', $view->fresh()->settings['group_by'] ?? null);

        $this->patch(route('kanban.views.update', $view), ['settings' => ['group_by' => 'custom_group']])
            ->assertSessionHas('success');
        $this->assertEquals('custom_group', $view->fresh()->settings['group_by'] ?? null);

        $tasksAfter = KanbanTask::where('board_id', $this->board->id)
            ->orderBy('id')
            ->get(['id', 'column_id', 'group_id', 'title'])
            ->toArray();

        $this->assertEquals($tasksBefore, $tasksAfter, 'Group By switching must not change task IDs or column_id/group_id');
        $this->assertEquals($groupsBefore, BoardGroup::where('board_id', $this->board->id)->count());
        $this->assertEquals($columnsBefore, KanbanColumn::where('board_id', $this->board->id)->count());
    }

    public function test_stage_rename_does_not_change_completion_semantic_category(): void
    {
        $completedStage = KanbanColumn::where('board_id', $this->board->id)
            ->where('semantic_category', 'completed')
            ->first();
        $this->assertNotNull($completedStage, 'Production board must have a completed stage');
        $this->assertTrue($completedStage->isCompletionStatus());

        $newTitle = 'Finished Work ' . uniqid();
        $this->patch(route('kanban.stages.update', $completedStage), ['title' => $newTitle])
            ->assertSessionHas('success');

        $fresh = $completedStage->fresh();
        $this->assertEquals($newTitle, $fresh->title);
        $this->assertEquals('completed', $fresh->semantic_category);
        $this->assertTrue($fresh->isCompletionStatus(), 'Renaming a stage must not change completion calculations');

        // Restore original title to keep other tests stable.
        $this->patch(route('kanban.stages.update', $fresh), ['title' => 'Complete']);
    }

    public function test_stage_reorder_preserves_stage_identity(): void
    {
        $stages = $this->activeWorkflowStages($this->board);
        $ids = $stages->pluck('id')->all();
        $this->assertGreaterThanOrEqual(2, count($ids));

        $reversed = array_reverse($ids);
        $this->post(route('kanban.stages.reorder', $this->board), ['column_ids' => $reversed])
            ->assertSessionHas('success');

        $freshIds = $this->activeWorkflowStages($this->board)->pluck('id')->all();
        $this->assertEqualsCanonicalizing($ids, $freshIds, 'Reorder must not add or remove stages');

        // Restore original order.
        $this->post(route('kanban.stages.reorder', $this->board), ['column_ids' => $ids]);
    }

    public function test_different_table_views_persist_independent_group_by_settings(): void
    {
        $viewA = BoardView::where('board_id', $this->board->id)->where('type', 'table')->firstOrFail();
        $viewB = BoardView::create([
            'board_id' => $this->board->id,
            'name' => 'Secondary Table ' . uniqid(),
            'type' => 'table',
            'is_default' => false,
            'is_system' => false,
            'settings' => [],
            'position' => 50,
        ]);

        $this->patch(route('kanban.views.update', $viewA), ['settings' => ['group_by' => 'workflow_stage']])
            ->assertSessionHas('success');
        $this->patch(route('kanban.views.update', $viewB), ['settings' => ['group_by' => 'custom_group']])
            ->assertSessionHas('success');

        $this->assertEquals('workflow_stage', $viewA->fresh()->settings['group_by'] ?? null);
        $this->assertEquals('custom_group', $viewB->fresh()->settings['group_by'] ?? null);

        $viewB->delete();
    }

    public function test_update_view_merges_group_by_settings_without_clobbering_others(): void
    {
        $view = BoardView::where('board_id', $this->board->id)->where('type', 'table')->firstOrFail();
        $view->update(['settings' => array_merge($view->settings ?? [], ['calendarMode' => 'week'])]);

        $this->patch(route('kanban.views.update', $view), ['settings' => ['group_by' => 'workflow_stage']])
            ->assertSessionHas('success');

        $fresh = $view->fresh();
        $this->assertEquals('workflow_stage', $fresh->settings['group_by'] ?? null);
        $this->assertEquals('week', $fresh->settings['calendarMode'] ?? null, 'Existing settings keys must be preserved');
    }

    public function test_contributor_cannot_change_group_by_settings(): void
    {
        $contributor = User::role('employee')->first() ?? User::where('role', 'employee')->first();
        $this->assertNotNull($contributor);

        $view = BoardView::where('board_id', $this->board->id)->where('type', 'table')->firstOrFail();
        $settingsBefore = $view->settings;

        $this->actingAs($contributor);
        $this->patch(route('kanban.views.update', $view), ['settings' => ['group_by' => 'custom_group']])
            ->assertStatus(403);

        $this->assertEquals($settingsBefore, $view->fresh()->settings, 'Contributors must not persist Group By settings');
    }

    public function test_column_move_endpoint_enforces_board_ownership(): void
    {
        $otherBoard = KanbanBoard::where('id', '!=', $this->board->id)->first();
        $this->assertNotNull($otherBoard, 'Seed data must provide another board');

        $foreignColumn = KanbanColumn::firstOrCreate(
            ['board_id' => $otherBoard->id, 'title' => 'Foreign Stage'],
            ['color' => '#123456', 'position' => 99, 'semantic_category' => 'not_started', 'stage_key' => 'foreign_stage']
        );

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->activeWorkflowStages($this->board)->firstWhere('stage_key', 'to_do')->id,
            'title' => 'Ownership guard task',
            'priority' => 'Medium',
            'position' => 0,
            'created_by' => $this->user->id,
        ]);

        $this->patch(route('kanban.tasks.update-column', $task), ['column_id' => $foreignColumn->id])
            ->assertStatus(403);
        $this->assertEquals($task->fresh()->column_id, $task->column_id);
    }

    public function test_status_change_endpoint_rejects_unknown_stage(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->activeWorkflowStages($this->board)->firstWhere('stage_key', 'to_do')->id,
            'title' => 'Unknown stage guard task',
            'priority' => 'Medium',
            'position' => 0,
            'created_by' => $this->user->id,
        ]);

        // Validation rejects a non-existent column id before any workflow logic.
        $this->patch(route('kanban.tasks.update-column', $task), ['column_id' => 999999])
            ->assertStatus(302)
            ->assertSessionHasErrors('column_id');
        $this->assertEquals($task->fresh()->column_id, $task->column_id);
    }

    public function test_status_change_endpoint_rejects_non_workflow_stage_on_configured_board(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->activeWorkflowStages($this->board)->firstWhere('stage_key', 'to_do')->id,
            'title' => 'Non-workflow stage guard task',
            'priority' => 'Medium',
            'position' => 0,
            'created_by' => $this->user->id,
        ]);

        $legacyStage = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Legacy Bucket',
            'color' => '#999999',
            'position' => 50,
        ]);

        $this->patch(route('kanban.tasks.update-column', $task), ['column_id' => $legacyStage->id])
            ->assertStatus(422);
        $this->assertEquals($task->fresh()->column_id, $task->column_id);
    }

    public function test_seeded_demo_board_views_start_without_group_by_override(): void
    {
        $mainTable = BoardView::where('is_system', true)
            ->where('type', 'table')
            ->where('is_default', true)
            ->first();
        $this->assertNotNull($mainTable);

        $groupBy = $mainTable->settings['group_by'] ?? null;
        $this->assertNotEquals('custom_group', $groupBy, 'Seeded default must fall back to Workflow Stage when group_by is unset');
    }
}
