<?php

namespace Tests\Feature;

use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Services\WorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Step 1B workflow settings endpoints: board-scoped authorization,
 * transition validation, review-gate protection, and ID stability.
 */
class WorkOsWorkflowSettingsTest extends TestCase
{
    use RefreshDatabase;

    private User $pm;
    private User $designer;
    private Workspace $workspace;
    private KanbanBoard $board;

    protected function setUp(): void
    {
        parent::setUp();

        $owner = User::factory()->create(['role' => 'admin', 'email' => 'wf-settings-owner@angora.test']);
        $this->pm = User::factory()->create(['role' => 'project_manager', 'email' => 'wf-settings-pm@angora.test']);
        $this->designer = User::factory()->create(['role' => 'dept_user', 'email' => 'wf-settings-designer@angora.test']);

        $this->workspace = Workspace::create([
            'name' => 'Workflow Settings Workspace',
            'slug' => 'workflow-settings-workspace',
            'owner_id' => $owner->id,
            'status' => 'active',
        ]);
        // Board management requires workspace owner/admin (or board editor).
        $this->workspace->members()->create(['user_id' => $this->pm->id, 'role' => 'admin']);
        $this->workspace->members()->create(['user_id' => $this->designer->id, 'role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Workflow Settings Board',
            'created_by' => $owner->id,
        ]);
        foreach (['New Task', 'To Do', 'Processing', 'For Review', 'Done'] as $position => $title) {
            KanbanColumn::create([
                'board_id' => $this->board->id,
                'title' => $title,
                'position' => $position,
                'color' => '#888888',
            ]);
        }
    }

    private function columnByTitle(string $title): KanbanColumn
    {
        return KanbanColumn::where('board_id', $this->board->id)->where('title', $title)->firstOrFail();
    }

    // ------------------------------------------------------------------
    // Read endpoint
    // ------------------------------------------------------------------

    public function test_pm_can_fetch_workflow_settings(): void
    {
        $res = $this->actingAs($this->pm)->getJson(route('kanban.boards.workflow.get', $this->board));

        $res->assertOk()
            ->assertJsonPath('configured', false)
            ->assertJsonCount(5, 'stages');
    }

    public function test_contributor_cannot_fetch_workflow_settings(): void
    {
        $this->actingAs($this->designer)
            ->getJson(route('kanban.boards.workflow.get', $this->board))
            ->assertForbidden();
    }

    public function test_guest_is_redirected_from_workflow_settings(): void
    {
        $this->get(route('kanban.boards.workflow.get', $this->board))->assertRedirect('/login');
    }

    // ------------------------------------------------------------------
    // Transitions sync
    // ------------------------------------------------------------------

    public function test_pm_can_save_transitions(): void
    {
        $toDo = $this->columnByTitle('To Do');
        $processing = $this->columnByTitle('Processing');

        $res = $this->actingAs($this->pm)->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
            'transitions' => [
                ['from_column_id' => $toDo->id, 'to_column_id' => $processing->id, 'contributor_allowed' => true],
            ],
        ]);

        $res->assertOk()->assertJsonPath('configured', true);
        $this->assertDatabaseHas('board_workflow_transitions', [
            'board_id' => $this->board->id,
            'from_column_id' => $toDo->id,
            'to_column_id' => $processing->id,
            'contributor_allowed' => true,
        ]);

        // Service reflects the saved edge for contributors.
        $this->assertTrue(
            app(WorkflowService::class)->contributorMayTransition($this->board, $toDo, $processing)
        );
    }

    public function test_contributor_cannot_save_transitions(): void
    {
        $this->actingAs($this->designer)->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
            'transitions' => [],
        ])->assertForbidden();
    }

    public function test_contributor_edge_into_completed_stage_rejected(): void
    {
        $processing = $this->columnByTitle('Processing');
        $done = $this->columnByTitle('Done');

        $this->actingAs($this->pm)->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
            'transitions' => [
                ['from_column_id' => $processing->id, 'to_column_id' => $done->id, 'contributor_allowed' => true],
            ],
        ])->assertStatus(422);

        // Manager-only edges into completion stages remain configurable.
        $this->actingAs($this->pm)->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
            'transitions' => [
                ['from_column_id' => $processing->id, 'to_column_id' => $done->id, 'contributor_allowed' => false],
            ],
        ])->assertOk();
    }

    public function test_cross_board_transition_rejected(): void
    {
        $otherBoard = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Other Board',
            'created_by' => $this->pm->id,
        ]);
        $otherColumn = KanbanColumn::create([
            'board_id' => $otherBoard->id,
            'title' => 'Elsewhere',
            'position' => 0,
            'color' => '#000000',
        ]);
        $toDo = $this->columnByTitle('To Do');

        $this->actingAs($this->pm)->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
            'transitions' => [
                ['from_column_id' => $toDo->id, 'to_column_id' => $otherColumn->id, 'contributor_allowed' => true],
            ],
        ])->assertStatus(422);
    }

    public function test_self_loop_transition_rejected(): void
    {
        $toDo = $this->columnByTitle('To Do');

        $this->actingAs($this->pm)->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
            'transitions' => [
                ['from_column_id' => $toDo->id, 'to_column_id' => $toDo->id, 'contributor_allowed' => false],
            ],
        ])->assertStatus(422);
    }

    public function test_saving_empty_transitions_reverts_board_to_legacy(): void
    {
        $toDo = $this->columnByTitle('To Do');
        $processing = $this->columnByTitle('Processing');
        $this->actingAs($this->pm)->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
            'transitions' => [
                ['from_column_id' => $toDo->id, 'to_column_id' => $processing->id, 'contributor_allowed' => true],
            ],
        ])->assertOk();

        $this->actingAs($this->pm)->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
            'transitions' => [],
        ])->assertOk()->assertJsonPath('configured', false);
        $this->assertDatabaseMissing('board_workflow_transitions', ['board_id' => $this->board->id]);
    }

    // ------------------------------------------------------------------
    // Stage guards & ID stability
    // ------------------------------------------------------------------

    public function test_stage_with_tasks_cannot_be_archived(): void
    {
        $processing = $this->columnByTitle('Processing');
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $processing->id,
            'title' => 'Task holding the stage open',
            'created_by' => $this->pm->id,
        ]);

        $this->actingAs($this->pm)
            ->delete(route('kanban.stages.delete', $processing))
            ->assertStatus(422);

        $this->assertDatabaseHas('kanban_columns', ['id' => $processing->id, 'is_archived' => false]);
    }

    public function test_empty_stage_can_be_archived_and_loses_its_transitions(): void
    {
        $toDo = $this->columnByTitle('To Do');
        $hold = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Parked',
            'position' => 9,
            'color' => '#aaaaaa',
        ]);
        $this->actingAs($this->pm)->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
            'transitions' => [
                ['from_column_id' => $toDo->id, 'to_column_id' => $hold->id, 'contributor_allowed' => true],
            ],
        ])->assertOk();

        $this->actingAs($this->pm)->delete(route('kanban.stages.delete', $hold))->assertSessionHas('success');

        $this->assertDatabaseHas('kanban_columns', ['id' => $hold->id, 'is_archived' => true]);
        $this->assertDatabaseMissing('board_workflow_transitions', [
            'board_id' => $this->board->id,
            'to_column_id' => $hold->id,
        ]);
    }

    public function test_stage_updates_keep_column_ids_stable(): void
    {
        $processing = $this->columnByTitle('Processing');

        $this->actingAs($this->pm)->patch(route('kanban.stages.update', $processing), [
            'title' => 'In Production',
            'color' => '#ff6600',
            'semantic_category' => 'in_progress',
        ])->assertSessionHas('success');

        $this->assertDatabaseHas('kanban_columns', [
            'id' => $processing->id,
            'board_id' => $this->board->id,
            'title' => 'In Production',
            'color' => '#ff6600',
        ]);
    }

    public function test_new_stage_receives_a_board_unique_stage_key(): void
    {
        $this->actingAs($this->pm)->post(route('kanban.stages.store', $this->board), [
            'title' => 'Client Feedback',
            'color' => '#336699',
            'semantic_category' => 'in_review',
        ])->assertSessionHas('success');

        $stage = KanbanColumn::where('board_id', $this->board->id)->where('title', 'Client Feedback')->firstOrFail();
        $this->assertSame('client_feedback', $stage->stage_key);

        // A second stage with the same title gets a unique key.
        $this->actingAs($this->pm)->post(route('kanban.stages.store', $this->board), [
            'title' => 'Client Feedback',
            'semantic_category' => 'in_review',
        ]);
        $second = KanbanColumn::where('board_id', $this->board->id)
            ->where('title', 'Client Feedback')
            ->orderByDesc('id')
            ->first();
        $this->assertSame('client_feedback_2', $second->stage_key);
    }
}
