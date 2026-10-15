<?php

namespace App\Services;

use App\Models\BoardWorkflowTransition;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use Illuminate\Support\Facades\DB;

class WorkflowService
{
    /**
     * Create template stages and transitions on a board that has no stages yet.
     */
    public function applyTemplate(KanbanBoard $board, string $templateKey): void
    {
        $template = config("angora_workflows.templates.{$templateKey}");
        abort_unless($template, 422, 'Unknown workflow template.');
        abort_if($board->columns()->exists(), 422, 'Templates can only seed boards without stages.');

        DB::transaction(function () use ($board, $template) {
            $byKey = [];
            foreach ($template['stages'] as $i => $stage) {
                $byKey[$stage['key']] = KanbanColumn::create([
                    'board_id' => $board->id,
                    'title' => $stage['title'],
                    'color' => $stage['color'],
                    'position' => $i,
                    'semantic_category' => $stage['semantic'],
                    'stage_key' => $stage['key'],
                    'stage_role' => $stage['role'] ?? 'workflow',
                    'exclude_from_metrics' => $stage['exclude_from_metrics'] ?? false,
                    'is_default' => $stage['default'] ?? false,
                ])->id;
            }
            foreach ($template['transitions'] as [$from, $to, $contrib]) {
                if (isset($byKey[$from], $byKey[$to])) {
                    BoardWorkflowTransition::create([
                        'board_id' => $board->id,
                        'from_column_id' => $byKey[$from],
                        'to_column_id' => $byKey[$to],
                        'contributor_allowed' => $contrib,
                    ]);
                }
            }
        });
    }

    public function boardIsConfigured(KanbanBoard $board): bool
    {
        return BoardWorkflowTransition::where('board_id', $board->id)->exists();
    }

    /**
     * Whether a contributor (assigned-only mover) may move between two stages.
     * Returns null when the board has no configured transitions (legacy rules apply).
     */
    public function contributorMayTransition(KanbanBoard $board, ?KanbanColumn $from, KanbanColumn $to): ?bool
    {
        if (! $this->boardIsConfigured($board)) {
            return null;
        }
        if ($from && $from->id === $to->id) {
            return true;
        }
        if (in_array($to->semantic_category, ['completed', 'cancelled'], true)
            || in_array($to->stage_key, config('angora_workflows.contributor_forbidden_targets', []), true)) {
            return false;
        }
        if ($from && in_array($from->stage_key, config('angora_workflows.contributor_locked_sources', []), true)) {
            return false;
        }
        if (! $from) {
            return false;
        }

        return BoardWorkflowTransition::where('board_id', $board->id)
            ->where('from_column_id', $from->id)
            ->where('to_column_id', $to->id)
            ->where('contributor_allowed', true)
            ->exists();
    }

    /**
     * Replace a board's transitions. Every column must belong to the board.
     *
     * @param  array<int, array{from_column_id:int, to_column_id:int, contributor_allowed?:bool}>  $transitions
     */
    public function syncTransitions(KanbanBoard $board, array $transitions): void
    {
        $columnIds = $board->columns()->pluck('id')->all();
        foreach ($transitions as $t) {
            abort_unless(in_array((int) $t['from_column_id'], $columnIds, true)
                && in_array((int) $t['to_column_id'], $columnIds, true), 422, 'Transitions must reference this board\'s stages.');
            abort_if((int) $t['from_column_id'] === (int) $t['to_column_id'], 422, 'A stage cannot transition to itself.');
        }

        DB::transaction(function () use ($board, $transitions) {
            BoardWorkflowTransition::where('board_id', $board->id)->delete();
            foreach ($transitions as $t) {
                BoardWorkflowTransition::firstOrCreate([
                    'board_id' => $board->id,
                    'from_column_id' => (int) $t['from_column_id'],
                    'to_column_id' => (int) $t['to_column_id'],
                ], ['contributor_allowed' => (bool) ($t['contributor_allowed'] ?? false)]);
            }
        });
    }
}
