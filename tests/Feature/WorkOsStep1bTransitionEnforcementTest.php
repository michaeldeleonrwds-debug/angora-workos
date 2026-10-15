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
 * Step 1B dynamic workflow transition enforcement.
 *
 * Boards with a configured transition graph must constrain contributors to
 * contributor-allowed edges (403 on violations), keep managers free via
 * move.any, reject invalid targets with 422, and leave legacy boards
 * (no configured transitions) on the existing semantic rules.
 */
class WorkOsStep1bTransitionEnforcementTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private User $pm;
    private User $designer;
    private User $accountManager;
    private Workspace $workspace;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create(['role' => 'admin', 'email' => 'enf-owner@angora.test']);
        $this->pm = User::factory()->create(['role' => 'project_manager', 'email' => 'enf-pm@angora.test']);
        $this->designer = User::factory()->create(['role' => 'dept_user', 'email' => 'enf-designer@angora.test']);
        $this->accountManager = User::factory()->create(['role' => 'account_manager', 'email' => 'enf-am@angora.test']);

        $this->workspace = Workspace::create([
            'name' => 'Enforcement Workspace',
            'slug' => 'enforcement-workspace',
            'owner_id' => $this->owner->id,
            'status' => 'active',
        ]);
        foreach ([$this->pm, $this->designer, $this->accountManager] as $member) {
            $this->workspace->members()->create(['user_id' => $member->id, 'role' => 'member']);
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /** Board with the production template applied (configured transition graph). */
    private function makeConfiguredBoard(): array
    {
        $board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Configured Board',
            'created_by' => $this->owner->id,
        ]);
        app(WorkflowService::class)->applyTemplate($board, 'production');

        return [$board->fresh(), $board->columns()->get()->keyBy('stage_key')];
    }

    /** Board with plain columns and no transitions (legacy behaviour). */
    private function makeLegacyBoard(): array
    {
        $board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Legacy Board',
            'created_by' => $this->owner->id,
        ]);
        $titles = [
            'Backlog' => 'not_started',
            'Doing' => 'in_progress',
            'Review' => 'in_review',
            'Blocked' => 'blocked',
            'Done' => 'completed',
        ];
        $columns = [];
        foreach (array_values($titles) as $position => $semantic) {
            $columns[$semantic] = KanbanColumn::create([
                'board_id' => $board->id,
                'title' => array_search($semantic, $titles, true),
                'position' => $position,
                'semantic_category' => $semantic,
                'color' => '#888888',
            ]);
        }

        return [$board, collect($columns)];
    }

    private function makeTask(KanbanBoard $board, KanbanColumn $column, ?User $assignee = null): KanbanTask
    {
        return KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $column->id,
            'title' => 'Enforcement task',
            'created_by' => $this->owner->id,
            'assigned_to' => $assignee?->id,
        ]);
    }

    private function drag(User $actor, KanbanTask $task, KanbanColumn $target)
    {
        return $this->actingAs($actor)->patch(route('kanban.tasks.update-column', $task), [
            'column_id' => $target->id,
        ]);
    }

    // ------------------------------------------------------------------
    // Contributor transitions
    // ------------------------------------------------------------------

    public function test_contributor_allowed_transition_succeeds(): void
    {
        [$board, $cols] = $this->makeConfiguredBoard();
        $task = $this->makeTask($board, $cols['new_task'], $this->designer);

        $this->drag($this->designer, $task, $cols['to_do'])
            ->assertSessionHas('success');
        $this->assertSame((int) $cols['to_do']->id, (int) $task->fresh()->column_id);
    }

    public function test_contributor_forbidden_transition_rejected_403(): void
    {
        [$board, $cols] = $this->makeConfiguredBoard();

        // No edge at all: to_do -> client_under_review.
        $task = $this->makeTask($board, $cols['to_do'], $this->designer);
        $this->drag($this->designer, $task, $cols['client_under_review'])->assertForbidden();

        // Edge exists but is manager-only: to_do -> hold.
        $task->update(['column_id' => $cols['to_do']->id]);
        $this->drag($this->designer, $task, $cols['hold'])->assertForbidden();
        $this->assertSame((int) $cols['to_do']->id, (int) $task->fresh()->column_id);
    }

    public function test_contributor_cannot_leave_review_stage_403(): void
    {
        [$board, $cols] = $this->makeConfiguredBoard();
        $task = $this->makeTask($board, $cols['for_review'], $this->designer);

        $this->drag($this->designer, $task, $cols['processing'])->assertForbidden();
        $this->assertSame((int) $cols['for_review']->id, (int) $task->fresh()->column_id);
    }

    public function test_unassigned_contributor_rejected_403(): void
    {
        [$board, $cols] = $this->makeConfiguredBoard();
        $task = $this->makeTask($board, $cols['new_task'], null);

        // The edge is contributor-allowed, but the drag actor owns no assignment.
        $this->drag($this->designer, $task, $cols['to_do'])->assertForbidden();
    }

    // ------------------------------------------------------------------
    // Manager movement
    // ------------------------------------------------------------------

    public function test_pm_may_move_between_any_workflow_stages(): void
    {
        [$board, $cols] = $this->makeConfiguredBoard();
        $task = $this->makeTask($board, $cols['processing'], $this->designer);

        // No edge exists between processing and for_revision for anyone.
        $this->drag($this->pm, $task, $cols['for_revision'])
            ->assertSessionHas('success');
        $this->assertSame((int) $cols['for_revision']->id, (int) $task->fresh()->column_id);
    }

    // ------------------------------------------------------------------
    // Structural boundaries
    // ------------------------------------------------------------------

    public function test_cross_board_movement_rejected_403(): void
    {
        [$board, $cols] = $this->makeConfiguredBoard();
        [, $otherCols] = $this->makeConfiguredBoard();
        $task = $this->makeTask($board, $cols['new_task'], $this->designer);

        $this->drag($this->pm, $task, $otherCols['to_do'])->assertForbidden();
    }

    public function test_stageless_target_rejected_422(): void
    {
        [$board, $cols] = $this->makeConfiguredBoard();
        $extra = KanbanColumn::create([
            'board_id' => $board->id,
            'title' => 'Emergency Lane',
            'position' => 99,
            'semantic_category' => 'in_progress',
            'color' => '#ff0000',
        ]);
        $task = $this->makeTask($board, $cols['processing'], $this->designer);

        $this->drag($this->pm, $task, $extra)->assertStatus(422);
    }

    public function test_subitem_column_must_belong_to_parent_board(): void
    {
        [$board, $cols] = $this->makeConfiguredBoard();
        [, $otherCols] = $this->makeConfiguredBoard();
        $task = $this->makeTask($board, $cols['processing'], $this->designer);

        $this->actingAs($this->pm)->post(route('kanban.tasks.subitems.store', $task), [
            'title' => 'Cross-board subitem',
            'column_id' => $otherCols['to_do']->id,
        ])->assertStatus(422);
    }

    // ------------------------------------------------------------------
    // Bypass attempts
    // ------------------------------------------------------------------

    public function test_update_task_endpoint_cannot_bypass_transitions(): void
    {
        [$board, $cols] = $this->makeConfiguredBoard();
        $task = $this->makeTask($board, $cols['to_do'], $this->designer);

        // account_manager holds workos.tasks.update but not move.any; the
        // general update endpoint must apply the same contributor rules.
        $this->actingAs($this->accountManager)->patch(route('kanban.tasks.update', $task), [
            'column_id' => $cols['client_under_review']->id,
        ])->assertForbidden();
        $this->assertSame((int) $cols['to_do']->id, (int) $task->fresh()->column_id);

        // A PM may still move via the general endpoint (move.any).
        $this->actingAs($this->pm)->patch(route('kanban.tasks.update', $task), [
            'column_id' => $cols['for_revision']->id,
        ])->assertSessionHas('success');
        $this->assertSame((int) $cols['for_revision']->id, (int) $task->fresh()->column_id);
    }

    public function test_reorder_with_column_enforces_transitions(): void
    {
        [$board, $cols] = $this->makeConfiguredBoard();
        $task = $this->makeTask($board, $cols['processing'], $this->designer);

        // processing -> for_review is a contributor-allowed edge.
        $this->actingAs($this->designer)->post(route('kanban.tasks.reorder'), [
            'task_ids' => [$task->id],
            'column_id' => $cols['for_review']->id,
        ])->assertSessionHas('success');
        $this->assertSame((int) $cols['for_review']->id, (int) $task->fresh()->column_id);

        // processing -> hold is manager-only.
        $task->update(['column_id' => $cols['processing']->id]);
        $this->actingAs($this->designer)->post(route('kanban.tasks.reorder'), [
            'task_ids' => [$task->id],
            'column_id' => $cols['hold']->id,
        ])->assertForbidden();
    }

    // ------------------------------------------------------------------
    // Legacy compatibility
    // ------------------------------------------------------------------

    public function test_legacy_board_keeps_semantic_rules_only(): void
    {
        [$board, $cols] = $this->makeLegacyBoard();
        $task = $this->makeTask($board, $cols['not_started'], $this->designer);

        // No configured graph: the legacy not_started -> in_review rule still passes.
        $this->drag($this->designer, $task, $cols['in_review'])
            ->assertSessionHas('success');
        $this->assertSame((int) $cols['in_review']->id, (int) $task->fresh()->column_id);

        // Legacy role rules still apply: contributors may not complete tasks.
        $this->drag($this->designer, $task, $cols['completed'])->assertForbidden();
    }
}
