<?php

namespace Tests\Feature;

use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskReviewCycle;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Step 1B migration/template safety.
 *
 * Runs entirely against the in-memory SQLite test database by rolling the
 * Step 1B migration back and forward around fixtures. Never touches the
 * development or production database.
 */
class WorkOsStep1bWorkflowMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const DEMO_TITLE = 'Angora Production — Demo';
    private const MIGRATION = '2026_10_16_000000_add_dynamic_workflow_engine';

    /** Legacy 7-column demo board layout, as seeded before Step 1B. */
    private const LEGACY_TITLES = ['Resources', 'Hold', 'New Task', 'Working on it', 'For Review', 'Needs Revision', 'Done'];

    private const EXPECTED_RENAMES = [
        'Working on it' => 'Processing',
        'Needs Revision' => 'For Revision',
        'Done' => 'Complete',
    ];

    /** Approved production sequence: ten stages + optional For Revision trailing. */
    private const FULL_ORDER = [
        'resources', 'hold', 'new_task', 'to_do', 'processing', 'progress_report',
        'for_review', 'ready_to_report', 'client_under_review', 'complete', 'for_revision',
    ];

    private const TEN_ORDER = [
        'resources', 'hold', 'new_task', 'to_do', 'processing', 'progress_report',
        'for_review', 'ready_to_report', 'client_under_review', 'complete',
    ];

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function templateStages(): \Illuminate\Support\Collection
    {
        return collect(config('angora_workflows.templates.production.stages'))->keyBy('key');
    }

    private function makeOwner(): User
    {
        return User::factory()->create(['role' => 'admin', 'email' => 'step1b-owner@angora.test']);
    }

    private function makeWorkspace(User $owner): Workspace
    {
        return Workspace::create([
            'name' => 'Step 1B Workspace',
            'slug' => 'step1b-workspace',
            'owner_id' => $owner->id,
            'status' => 'active',
        ]);
    }

    /**
     * @param  list<string>  $columnTitles
     * @return array<string, KanbanColumn>
     */
    private function makeBoardWithColumns(Workspace $workspace, User $owner, string $title, array $columnTitles): array
    {
        $board = KanbanBoard::create([
            'workspace_id' => $workspace->id,
            'title' => $title,
            'created_by' => $owner->id,
        ]);

        $columns = [];
        foreach ($columnTitles as $position => $columnTitle) {
            $columns[$columnTitle] = KanbanColumn::create([
                'board_id' => $board->id,
                'title' => $columnTitle,
                'position' => $position,
                'semantic_category' => KanbanColumn::categoryForLegacyLabel($columnTitle),
                'color' => '#888888',
            ]);
        }

        return $columns;
    }

    private function rollbackStep1B(): void
    {
        $this->artisan('migrate:rollback', ['--step' => 1])->assertExitCode(0);
    }

    private function migrateForward(): void
    {
        $this->artisan('migrate')->assertExitCode(0);
    }

    /**
     * Board columns ordered by position as plain rows.
     *
     * @return \Illuminate\Support\Collection<int, object>
     */
    private function orderedColumns(int $boardId)
    {
        return DB::table('kanban_columns')->where('board_id', $boardId)->orderBy('position')->get();
    }

    private function columnByStageKey(int $boardId, string $stageKey): object
    {
        $column = DB::table('kanban_columns')
            ->where('board_id', $boardId)
            ->where('stage_key', $stageKey)
            ->first();
        $this->assertNotNull($column, "Expected a column with stage_key '{$stageKey}'.");

        return $column;
    }

    private function assertStageSequence(int $boardId, array $expectedOrder): void
    {
        $columns = $this->orderedColumns($boardId);

        $this->assertSame(
            $expectedOrder,
            $columns->pluck('stage_key')->all(),
            'Board stage sequence does not match the approved production order.'
        );
        $this->assertSame(
            range(0, count($expectedOrder) - 1),
            $columns->pluck('position')->map(fn ($p) => (int) $p)->all(),
            'Board stage positions must be resequenced from zero.'
        );
    }

    private function assertSemanticsMatchTemplate(int $boardId): void
    {
        $stages = $this->templateStages();
        foreach ($this->orderedColumns($boardId) as $column) {
            $template = $stages->get($column->stage_key);
            $this->assertNotNull($template, "stage_key '{$column->stage_key}' missing from workflow template.");
            $this->assertSame(
                $template['semantic'],
                $column->semantic_category,
                "semantic_category mismatch for stage '{$column->stage_key}'."
            );
        }
    }

    private function assertTransitionsMatchTemplate(int $boardId): void
    {
        $keyById = $this->orderedColumns($boardId)->keyBy('id')->map(fn ($c) => $c->stage_key);

        $expected = collect(config('angora_workflows.templates.production.transitions'))
            ->filter(function ($t) use ($keyById) {
                return $keyById->search($t[0]) !== false && $keyById->search($t[1]) !== false;
            });

        $rows = DB::table('board_workflow_transitions')->where('board_id', $boardId)->get();

        $this->assertCount($expected->count(), $rows, 'Transition row count does not match resolvable template transitions.');

        $columnIds = $this->orderedColumns($boardId)->pluck('id')->all();
        foreach ($rows as $row) {
            $this->assertContains((int) $row->from_column_id, $columnIds, 'Transition references a foreign from_column.');
            $this->assertContains((int) $row->to_column_id, $columnIds, 'Transition references a foreign to_column.');
        }

        foreach ($expected as [$from, $to, $contributorAllowed]) {
            $fromId = $keyById->search($from);
            $toId = $keyById->search($to);
            $match = $rows->first(
                fn ($r) => (int) $r->from_column_id === (int) $fromId && (int) $r->to_column_id === (int) $toId
            );
            $this->assertNotNull($match, "Missing transition {$from} -> {$to}.");
            $this->assertSame(
                (bool) $contributorAllowed,
                (bool) $match->contributor_allowed,
                "contributor_allowed flag mismatch for {$from} -> {$to}."
            );
        }
    }

    // ------------------------------------------------------------------
    // Items 1, 2, 3, 6: backfill correctness on the demo board
    // ------------------------------------------------------------------

    public function test_backfill_preserves_ids_and_builds_approved_workflow(): void
    {
        $owner = $this->makeOwner();
        $workspace = $this->makeWorkspace($owner);

        $boardOne = $this->makeBoardWithColumns($workspace, $owner, 'Legacy Board One', ['Backlog', 'Shipped']);
        $boardTwo = $this->makeBoardWithColumns($workspace, $owner, 'Legacy Board Two', ['Inbox', 'Archive']);
        $demoColumns = $this->makeBoardWithColumns($workspace, $owner, self::DEMO_TITLE, self::LEGACY_TITLES);
        $demoBoardId = reset($demoColumns)->board_id;

        $taskOnProcessing = KanbanTask::create([
            'board_id' => $demoBoardId,
            'column_id' => $demoColumns['Working on it']->id,
            'title' => 'Cut the launch teaser',
            'created_by' => $owner->id,
            'assigned_to' => $owner->id,
        ]);
        $taskOnDone = KanbanTask::create([
            'board_id' => $demoBoardId,
            'column_id' => $demoColumns['Done']->id,
            'title' => 'Ship the press kit',
            'created_by' => $owner->id,
            'assigned_to' => $owner->id,
        ]);
        $untouchedTask = KanbanTask::create([
            'board_id' => $boardOne['Backlog']->board_id,
            'column_id' => $boardOne['Backlog']->id,
            'title' => 'Other board task',
            'created_by' => $owner->id,
            'assigned_to' => $owner->id,
        ]);

        $otherBoardsSnapshot = [];
        foreach ([$boardOne, $boardTwo] as $index => $legacyBoard) {
            foreach ($legacyBoard as $title => $column) {
                $otherBoardsSnapshot[] = [
                    'board' => $index,
                    'id' => $column->id,
                    'title' => $title,
                    'position' => $column->position,
                ];
            }
        }

        // --- Rollback (schema must drop cleanly), then migrate forward so the
        // backfill runs against the fixtures through normal migration handling.
        $this->rollbackStep1B();
        $this->migrateForward();

        // Item 1: existing column IDs and task assignments are preserved.
        foreach ($demoColumns as $legacyTitle => $column) {
            $row = DB::table('kanban_columns')->where('id', $column->id)->first();
            $this->assertNotNull($row, "Legacy column '{$legacyTitle}' was deleted by the backfill.");
            $this->assertSame(
                self::EXPECTED_RENAMES[$legacyTitle] ?? $legacyTitle,
                $row->title,
                "Legacy column '{$legacyTitle}' was not renamed in place."
            );
            $this->assertDatabaseHas('kanban_tasks', [
                'id' => $taskOnProcessing->id,
                'column_id' => $demoColumns['Working on it']->id,
                'assigned_to' => $owner->id,
            ]);
        }
        $this->assertDatabaseHas('kanban_tasks', [
            'id' => $taskOnDone->id,
            'column_id' => $demoColumns['Done']->id,
            'assigned_to' => $owner->id,
        ]);
        $this->assertDatabaseHas('kanban_tasks', [
            'id' => $untouchedTask->id,
            'column_id' => $boardOne['Backlog']->id,
        ]);

        // Item 2: demo board gets the ten-stage sequence plus trailing For Revision.
        $this->assertStageSequence($demoBoardId, self::FULL_ORDER);
        $this->assertSemanticsMatchTemplate($demoBoardId);

        $resources = $this->columnByStageKey($demoBoardId, 'resources');
        $this->assertSame('reference', $resources->stage_role);
        $this->assertTrue((bool) $resources->exclude_from_metrics);
        $this->assertSame('Resources', $resources->title);

        $processing = $this->columnByStageKey($demoBoardId, 'processing');
        $this->assertSame('Working on it', $demoColumns['Working on it']->title); // id stable, title renamed
        $this->assertSame('Processing', $processing->title);

        $complete = $this->columnByStageKey($demoBoardId, 'complete');
        $this->assertSame('Complete', $complete->title);

        // Item 3: boards one and two remain untouched.
        foreach ($otherBoardsSnapshot as $snapshot) {
            $row = DB::table('kanban_columns')->where('id', $snapshot['id'])->first();
            $this->assertNotNull($row, 'An untouched board lost a column.');
            $this->assertSame($snapshot['title'], $row->title, 'An untouched board had a column renamed.');
            $this->assertSame((int) $snapshot['position'], (int) $row->position, 'An untouched board had positions resequenced.');
            $this->assertNull($row->stage_key, 'An untouched board received stage keys.');
        }
        $this->assertSame(0, DB::table('board_workflow_transitions')->where('board_id', $boardOne['Backlog']->board_id)->count());
        $this->assertSame(0, DB::table('board_workflow_transitions')->where('board_id', $boardTwo['Inbox']->board_id)->count());

        // Item 6: transitions reference valid stages and mirror the template.
        $this->assertCount(
            count(config('angora_workflows.templates.production.transitions')),
            DB::table('board_workflow_transitions')->where('board_id', $demoBoardId)->get()
        );
        $this->assertTransitionsMatchTemplate($demoBoardId);

        // Item 4: rerunning through normal migration handling is a no-op.
        $columnsBefore = json_encode($this->orderedColumns($demoBoardId));
        $transitionsBefore = DB::table('board_workflow_transitions')->where('board_id', $demoBoardId)->count();
        $this->migrateForward();
        $this->assertSame($columnsBefore, json_encode($this->orderedColumns($demoBoardId)), 'Second migrate run altered columns.');
        $this->assertSame(
            $transitionsBefore,
            DB::table('board_workflow_transitions')->where('board_id', $demoBoardId)->count(),
            'Second migrate run duplicated transitions.'
        );
    }

    // ------------------------------------------------------------------
    // Items 4, 5: rollback safety and rerun with work on inserted stages
    // ------------------------------------------------------------------

    public function test_rollback_keeps_tasks_and_columns_across_rerun_cycles(): void
    {
        $owner = $this->makeOwner();
        $workspace = $this->makeWorkspace($owner);
        $demoColumns = $this->makeBoardWithColumns($workspace, $owner, self::DEMO_TITLE, self::LEGACY_TITLES);
        $demoBoardId = reset($demoColumns)->board_id;

        $task = KanbanTask::create([
            'board_id' => $demoBoardId,
            'column_id' => $demoColumns['Working on it']->id,
            'title' => 'Retouch the hero image',
            'created_by' => $owner->id,
            'assigned_to' => $owner->id,
        ]);

        // Cycle 1: rollback (clean schema) + forward migrate.
        $this->rollbackStep1B();
        $this->migrateForward();
        $this->assertStageSequence($demoBoardId, self::FULL_ORDER);

        $legacyIds = array_map(fn ($c) => $c->id, $demoColumns);
        $toDo = $this->columnByStageKey($demoBoardId, 'to_do');
        $toDoId = (int) $toDo->id;

        // Work lands on an inserted stage before the next rollback.
        KanbanTask::create([
            'board_id' => $demoBoardId,
            'column_id' => $toDoId,
            'title' => 'Groom the backlog',
            'created_by' => $owner->id,
            'assigned_to' => $owner->id,
        ]);

        // Rollback #2 with backups present and a task-bearing inserted stage.
        $this->rollbackStep1B();

        $this->assertNotNull(KanbanTask::find($task->id), 'Rollback deleted an existing task.');
        $this->assertSame(2, KanbanTask::where('board_id', $demoBoardId)->count(), 'Rollback deleted tasks.');
        foreach ($legacyIds as $id) {
            $this->assertNotNull(DB::table('kanban_columns')->where('id', $id)->first(), 'Rollback deleted a legacy column.');
        }
        foreach ($demoColumns as $legacyTitle => $column) {
            $this->assertNotNull(
                DB::table('kanban_columns')->where('id', $column->id)->where('title', $legacyTitle)->first(),
                'Rollback did not restore the legacy column title.'
            );
        }
        $this->assertNotNull(DB::table('kanban_columns')->where('id', $toDoId)->first(), 'Rollback deleted an inserted stage that holds tasks.');

        // Rerun forward: the task-bearing inserted stage must be re-adopted, not duplicated.
        $this->migrateForward();

        $this->assertStageSequence($demoBoardId, self::FULL_ORDER);
        $this->assertSame(
            1,
            DB::table('kanban_columns')->where('board_id', $demoBoardId)->where('title', 'To Do')->count(),
            'Rerun duplicated the To Do stage.'
        );
        $reAdoptedToDo = DB::table('kanban_columns')->where('id', $toDoId)->first();
        $this->assertNotNull($reAdoptedToDo, 'Rerun lost the task-bearing To Do stage.');
        $this->assertSame('to_do', $reAdoptedToDo->stage_key, 'Rerun did not re-key the task-bearing To Do stage.');
        foreach ($legacyIds as $id) {
            $this->assertNotNull(DB::table('kanban_columns')->where('id', $id)->first(), 'Rerun changed a legacy column ID.');
        }
        $this->assertDatabaseHas('kanban_tasks', ['column_id' => $toDoId]);
        $this->assertTransitionsMatchTemplate($demoBoardId);

        // Item 5: final rollback preserves tasks and original columns.
        $this->rollbackStep1B();

        $this->assertSame(2, KanbanTask::where('board_id', $demoBoardId)->count(), 'Final rollback deleted tasks.');
        $this->assertDatabaseHas('kanban_tasks', ['id' => $task->id, 'column_id' => $demoColumns['Working on it']->id]);
        foreach ($legacyIds as $id) {
            $this->assertNotNull(DB::table('kanban_columns')->where('id', $id)->first(), 'Final rollback deleted a legacy column.');
        }
        $this->assertNotNull(DB::table('kanban_columns')->where('id', $toDoId)->first(), 'Final rollback deleted a stage that still holds tasks.');
    }

    // ------------------------------------------------------------------
    // Item 2 (optional stage): For Revision is only present when the legacy board had it
    // ------------------------------------------------------------------

    public function test_for_revision_stage_is_optional_when_legacy_column_is_absent(): void
    {
        $owner = $this->makeOwner();
        $workspace = $this->makeWorkspace($owner);
        $titlesWithoutRevision = array_values(array_diff(self::LEGACY_TITLES, ['Needs Revision']));
        $demoColumns = $this->makeBoardWithColumns($workspace, $owner, self::DEMO_TITLE, $titlesWithoutRevision);
        $demoBoardId = reset($demoColumns)->board_id;

        $task = KanbanTask::create([
            'board_id' => $demoBoardId,
            'column_id' => $demoColumns['Done']->id,
            'title' => 'Archive the old site',
            'created_by' => $owner->id,
            'assigned_to' => $owner->id,
        ]);

        $this->rollbackStep1B();
        $this->migrateForward();

        $this->assertStageSequence($demoBoardId, self::TEN_ORDER);
        $this->assertSemanticsMatchTemplate($demoBoardId);

        $this->assertSame(
            0,
            DB::table('kanban_columns')->where('board_id', $demoBoardId)->where('stage_key', 'for_revision')->count(),
            'For Revision must not be fabricated when the legacy board never had a revision stage.'
        );
        $this->assertTransitionsMatchTemplate($demoBoardId);

        $expectedTransitions = count(config('angora_workflows.templates.production.transitions'))
            - count(array_filter(
                config('angora_workflows.templates.production.transitions'),
                fn ($t) => in_array('for_revision', [$t[0], $t[1]], true)
            ));
        $this->assertSame(
            $expectedTransitions,
            DB::table('board_workflow_transitions')->where('board_id', $demoBoardId)->count()
        );

        $this->assertDatabaseHas('kanban_tasks', ['id' => $task->id, 'column_id' => $demoColumns['Done']->id]);
    }

    // ------------------------------------------------------------------
    // Item 7: review behaviour stays intact on the migrated board
    // ------------------------------------------------------------------

    public function test_review_flow_on_migrated_board_preserves_routing_and_semantics(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'email' => 'step1b-admin@angora.test']);
        $pm = User::factory()->create(['role' => 'project_manager', 'email' => 'step1b-pm@angora.test']);
        $designer = User::factory()->create(['role' => 'dept_user', 'email' => 'step1b-designer@angora.test']);

        $workspace = $this->makeWorkspace($admin);
        foreach ([$pm, $designer] as $member) {
            $workspace->members()->create(['user_id' => $member->id, 'role' => 'member']);
        }

        $demoColumns = $this->makeBoardWithColumns($workspace, $admin, self::DEMO_TITLE, self::LEGACY_TITLES);
        $demoBoardId = reset($demoColumns)->board_id;

        $task = KanbanTask::create([
            'board_id' => $demoBoardId,
            'column_id' => $demoColumns['Working on it']->id,
            'title' => 'Animate the product tour',
            'created_by' => $designer->id,
            'assigned_to' => $designer->id,
        ]);

        $this->rollbackStep1B();
        $this->migrateForward();

        $forRevision = $this->columnByStageKey($demoBoardId, 'for_revision');
        $forReview = $this->columnByStageKey($demoBoardId, 'for_review');
        $complete = $this->columnByStageKey($demoBoardId, 'complete');

        // Legacy "Needs Revision" semantics must be normalized to the template
        // so dragging into the revision stage does not fabricate a review cycle
        // (which would later block resubmission with a 422).
        $this->assertSame(
            $this->templateStages()->get('for_revision')['semantic'],
            $forRevision->semantic_category
        );

        // Drag into For Revision: no phantom review cycle may be created.
        $this->actingAs($designer)->patch(route('kanban.tasks.update-column', $task), [
            'column_id' => $forRevision->id,
        ])->assertSessionHas('success');

        $this->assertSame(
            0,
            TaskReviewCycle::where('task_id', $task->id)->count(),
            'Dragging into For Revision must not create a review cycle.'
        );
        $this->assertSame((int) $forRevision->id, (int) $task->fresh()->column_id);

        // Submit: task must route to For Review, never to Client Under Review.
        $this->actingAs($designer)->postJson(route('kanban.tasks.review.submit', $task), [
            'stages' => [['name' => 'Internal Review', 'required_role' => null]],
        ])->assertOk();
        $this->assertSame((int) $forReview->id, (int) $task->fresh()->column_id, 'Submit must route to the For Review stage.');

        // Revision decision: must route to the renamed For Revision stage.
        $this->actingAs($pm)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'revision_requested',
            'feedback' => 'Tighten the easing on the final transition.',
        ])->assertOk();
        $this->assertSame((int) $forRevision->id, (int) $task->fresh()->column_id, 'Revision decision must route to For Revision.');
        $cycle = TaskReviewCycle::where('task_id', $task->id)->latest('round_number')->first();
        $this->assertSame('revision_requested', $cycle->state);

        // Resubmission after revision must not be blocked by a stale pending cycle.
        $this->actingAs($designer)->postJson(route('kanban.tasks.review.submit', $task), [
            'stages' => [['name' => 'Internal Review', 'required_role' => null]],
        ])->assertOk();
        $this->assertSame((int) $forReview->id, (int) $task->fresh()->column_id);

        // Final approval: must land on the renamed Complete stage with completion flags.
        $this->actingAs($pm)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'approved',
            'feedback' => 'Approved for delivery.',
        ])->assertOk();

        $freshTask = $task->fresh();
        $this->assertSame((int) $complete->id, (int) $freshTask->column_id, 'Final approval must move the task to Complete.');
        $this->assertNotNull($freshTask->completed_at, 'Final approval must set completed_at.');
        $this->assertSame(100, (int) $freshTask->progress, 'Final approval must set progress to 100.');

        $finalCycle = TaskReviewCycle::where('task_id', $task->id)->latest('round_number')->first();
        $this->assertSame('approved', $finalCycle->state);
    }
}
