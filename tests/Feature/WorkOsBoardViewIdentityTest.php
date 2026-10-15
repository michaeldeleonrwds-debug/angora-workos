<?php

namespace Tests\Feature;

use App\Models\BoardGroup;
use App\Models\BoardView;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsBoardViewIdentityTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->user = User::role('super_admin')->first();
        $this->actingAs($this->user);
    }

    public function test_seeded_views_are_marked_as_system_views(): void
    {
        $views = BoardView::where('is_system', true)->get();
        $this->assertGreaterThan(0, $views->count(), 'Seeded views must be marked is_system');
        $this->assertTrue($views->contains(fn ($v) => $v->name === 'Main Table' && $v->is_default));
    }

    public function test_system_view_cannot_be_deleted(): void
    {
        $systemView = BoardView::where('is_system', true)->first();
        $this->assertNotNull($systemView);

        $before = BoardView::count();
        $this->delete(route('kanban.views.delete', $systemView))->assertSessionHas('error');
        $this->assertEquals($before, BoardView::count());
        $this->assertNotNull(BoardView::find($systemView->id));
    }

    public function test_custom_view_can_be_deleted(): void
    {
        $board = KanbanBoard::first();
        $custom = BoardView::create([
            'board_id' => $board->id,
            'name' => 'Temp View',
            'type' => 'table',
            'is_default' => false,
            'is_system' => false,
            'settings' => [],
            'position' => 99,
        ]);

        $this->delete(route('kanban.views.delete', $custom))->assertSessionHas('success');
        $this->assertNull(BoardView::find($custom->id));
    }

    public function test_multiple_views_of_same_type_with_independent_settings(): void
    {
        $board = KanbanBoard::first();

        $this->post(route('kanban.views.store', $board), [
            'name' => 'Table A',
            'type' => 'table',
            'settings' => ['group_by' => 'group'],
        ])->assertSessionHas('success');

        $this->post(route('kanban.views.store', $board), [
            'name' => 'Table B',
            'type' => 'table',
            'settings' => ['group_by' => 'stage'],
        ])->assertSessionHas('success');

        $viewA = BoardView::where('board_id', $board->id)->where('name', 'Table A')->first();
        $viewB = BoardView::where('board_id', $board->id)->where('name', 'Table B')->first();

        $this->assertNotNull($viewA);
        $this->assertNotNull($viewB);
        $this->assertNotEquals($viewA->id, $viewB->id, 'Two views of the same type must have distinct IDs');
        $this->assertEquals('table', $viewA->type);
        $this->assertEquals('table', $viewB->type);
        $this->assertEquals('group', $viewA->settings['group_by']);
        $this->assertEquals('stage', $viewB->settings['group_by']);
    }

    public function test_rename_view_persists_new_name(): void
    {
        $board = KanbanBoard::first();
        $view = BoardView::create([
            'board_id' => $board->id,
            'name' => 'Old Name',
            'type' => 'table',
            'is_default' => false,
            'is_system' => false,
            'settings' => [],
            'position' => 99,
        ]);

        $this->patch(route('kanban.views.update', $view), ['name' => 'Renamed View'])
            ->assertSessionHas('success');

        $this->assertEquals('Renamed View', $view->fresh()->name);
    }

    public function test_deleting_active_custom_view_reassigns_default_to_survivor(): void
    {
        $board = KanbanBoard::first();
        $custom = BoardView::create([
            'board_id' => $board->id,
            'name' => 'Active Custom',
            'type' => 'calendar',
            'is_default' => true,
            'is_system' => false,
            'settings' => [],
            'position' => 99,
        ]);

        $this->delete(route('kanban.views.delete', $custom))->assertSessionHas('success');

        $this->assertNull(BoardView::find($custom->id));
        $replacement = BoardView::where('board_id', $board->id)->orderBy('position')->first();
        $this->assertTrue($replacement->is_default, 'Default must be reassigned to the nearest surviving view by position');
    }

    public function test_deleting_custom_view_never_touches_tasks_columns_groups_or_comments(): void
    {
        $board = KanbanBoard::first();
        $task = KanbanTask::where('board_id', $board->id)->first();
        $group = BoardGroup::where('board_id', $board->id)->first();
        $column = KanbanColumn::where('board_id', $board->id)->first();
        $comment = $task ? KanbanComment::where('task_id', $task->id)->first() : null;

        $tasksBefore = KanbanTask::where('board_id', $board->id)->count();
        $groupsBefore = BoardGroup::where('board_id', $board->id)->count();
        $columnsBefore = KanbanColumn::where('board_id', $board->id)->count();

        $custom = BoardView::create([
            'board_id' => $board->id,
            'name' => 'Disposable',
            'type' => 'table',
            'is_default' => false,
            'is_system' => false,
            'settings' => [],
            'position' => 99,
        ]);

        $this->delete(route('kanban.views.delete', $custom))->assertSessionHas('success');

        $this->assertNull(BoardView::find($custom->id));
        $this->assertEquals($tasksBefore, KanbanTask::where('board_id', $board->id)->count());
        $this->assertEquals($groupsBefore, BoardGroup::where('board_id', $board->id)->count());
        $this->assertEquals($columnsBefore, KanbanColumn::where('board_id', $board->id)->count());
        if ($comment) {
            $this->assertNotNull(KanbanComment::find($comment->id));
        }
    }

    public function test_reorder_rejects_duplicate_ids(): void
    {
        $board = KanbanBoard::first();
        $ids = BoardView::where('board_id', $board->id)->pluck('id')->all();
        $before = BoardView::where('board_id', $board->id)->pluck('id', 'position')->toArray();

        $duplicate = $ids;
        $duplicate[1] = $duplicate[0];

        $this->post(route('kanban.views.reorder', $board), ['view_ids' => $duplicate])
            ->assertSessionHasErrors('view_ids.1');

        $after = BoardView::where('board_id', $board->id)->pluck('id', 'position')->toArray();
        $this->assertEquals($before, $after, 'Reorder must not mutate positions when validation fails');
    }

    public function test_reorder_rejects_incomplete_set(): void
    {
        $board = KanbanBoard::first();
        $ids = BoardView::where('board_id', $board->id)->pluck('id')->all();
        $partial = [$ids[0]];

        $this->post(route('kanban.views.reorder', $board), ['view_ids' => $partial])
            ->assertSessionHas('error');

        $this->assertEquals(0, BoardView::find($ids[0])->position, 'Partial reorder must not change positions');
    }

    public function test_reorder_rejects_foreign_board_ids(): void
    {
        $workspace = Workspace::first();
        $board = KanbanBoard::first();
        $otherBoard = KanbanBoard::create([
            'workspace_id' => $workspace->id,
            'title' => 'Other Board for View Reorder',
            'department' => 'Operations',
            'created_by' => $this->user->id,
        ]);

        $foreign = BoardView::create([
            'board_id' => $otherBoard->id,
            'name' => 'Foreign View',
            'type' => 'table',
            'is_default' => false,
            'is_system' => false,
            'settings' => [],
            'position' => 0,
        ]);

        $ids = BoardView::where('board_id', $board->id)->pluck('id')->all();
        $ids[0] = $foreign->id;

        $before = BoardView::where('board_id', $board->id)->orderBy('id')->pluck('position')->all();
        $this->post(route('kanban.views.reorder', $board), ['view_ids' => $ids])
            ->assertSessionHas('error');

        $after = BoardView::where('board_id', $board->id)->orderBy('id')->pluck('position')->all();
        $this->assertEquals($before, $after, 'Foreign-board IDs must not mutate any positions');
    }

    public function test_reorder_rejects_empty_array(): void
    {
        $board = KanbanBoard::first();
        $this->post(route('kanban.views.reorder', $board), ['view_ids' => []])
            ->assertSessionHasErrors('view_ids');
    }

    public function test_reorder_persists_requested_order(): void
    {
        $board = KanbanBoard::first();
        $ids = BoardView::where('board_id', $board->id)->orderBy('position')->pluck('id')->all();
        $reversed = array_reverse($ids);

        $this->post(route('kanban.views.reorder', $board), ['view_ids' => $reversed])
            ->assertSessionHas('success');

        $ordered = BoardView::where('board_id', $board->id)->orderBy('position')->pluck('id')->all();
        $this->assertEquals($reversed, $ordered, 'Rendered position order must match the submitted order');
    }

    public function test_update_view_accepts_position_change(): void
    {
        $board = KanbanBoard::first();
        $view = BoardView::create([
            'board_id' => $board->id,
            'name' => 'Moveable',
            'type' => 'table',
            'is_default' => false,
            'is_system' => false,
            'settings' => [],
            'position' => 50,
        ]);

        $this->patch(route('kanban.views.update', $view), ['position' => 0])
            ->assertSessionHas('success');

        $this->assertEquals(0, $view->fresh()->position);
    }

    public function test_contributor_cannot_reorder_or_delete_views(): void
    {
        $contributor = User::role('employee')->first();
        $this->assertNotNull($contributor);
        $this->actingAs($contributor);

        $board = KanbanBoard::first();
        $custom = BoardView::create([
            'board_id' => $board->id,
            'name' => 'Protected',
            'type' => 'table',
            'is_default' => false,
            'is_system' => false,
            'settings' => [],
            'position' => 99,
        ]);

        $ids = BoardView::where('board_id', $board->id)->orderBy('position')->pluck('id')->all();

        $this->post(route('kanban.views.reorder', $board), ['view_ids' => $ids])->assertForbidden();
        $this->delete(route('kanban.views.delete', $custom))->assertForbidden();
        $this->assertNotNull(BoardView::find($custom->id));
    }
}
