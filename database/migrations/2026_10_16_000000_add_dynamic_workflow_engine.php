<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Step 1B — Dynamic workflow engine.
 *
 * Non-destructive: adds stage semantics + board-scoped transitions, and
 * backfills ONLY the approved "Angora Production — Demo" board. Existing
 * column IDs, task placements, subitems and history are never modified;
 * columns are renamed in place and missing stages are appended.
 */
return new class extends Migration
{
    private const BOARD_TITLE = 'Angora Production — Demo';

    public function up(): void
    {
        Schema::table('kanban_columns', function (Blueprint $table) {
            $table->string('stage_key', 64)->nullable()->after('semantic_category');
            $table->string('stage_role', 24)->default('workflow')->after('stage_key');
            $table->boolean('exclude_from_metrics')->default(false)->after('stage_role');
        });

        Schema::create('board_workflow_transitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained('kanban_boards')->cascadeOnDelete();
            $table->foreignId('from_column_id')->constrained('kanban_columns')->cascadeOnDelete();
            $table->foreignId('to_column_id')->constrained('kanban_columns')->cascadeOnDelete();
            $table->boolean('contributor_allowed')->default(false);
            $table->timestamps();
            $table->unique(['board_id', 'from_column_id', 'to_column_id'], 'bwt_unique');
        });

        Schema::create('workflow_backfill_backups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('board_id');
            $table->json('columns_before');
            $table->json('inserted_column_ids');
            $table->timestamps();
        });

        $this->backfillProductionDemoBoard();
    }

    private function backfillProductionDemoBoard(): void
    {
        $boards = DB::table('kanban_boards')->where('title', self::BOARD_TITLE)->get();
        if ($boards->count() !== 1) {
            return; // Absent or ambiguous: never guess.
        }
        $board = $boards->first();
        $columns = DB::table('kanban_columns')->where('board_id', $board->id)->get();

        // Existing column title => [stage_key, new title or null]
        $inPlace = [
            'Resources' => ['resources', null],
            'Hold' => ['hold', null],
            'New Task' => ['new_task', null],
            'Working on it' => ['processing', 'Processing'],
            'Processing' => ['processing', null],
            'For Review' => ['for_review', null],
            'Needs Revision' => ['for_revision', 'For Revision'],
            'For Revision' => ['for_revision', null],
            'Done' => ['complete', 'Complete'],
            'Complete' => ['complete', null],
            // Stages this migration inserts on first run: re-adopted by title when a
            // rollback kept them because tasks already lived on them.
            'To Do' => ['to_do', null],
            'Progress Report' => ['progress_report', null],
            'Ready to Report' => ['ready_to_report', null],
            'Client Under Review' => ['client_under_review', null],
        ];

        $template = collect(config('angora_workflows.templates.production.stages'))->keyBy('key');
        $order = ['resources', 'hold', 'new_task', 'to_do', 'processing', 'progress_report',
            'for_review', 'ready_to_report', 'client_under_review', 'complete', 'for_revision'];

        DB::transaction(function () use ($board, $columns, $inPlace, $template, $order) {
            $byKey = [];
            foreach ($columns as $col) {
                $map = $inPlace[$col->title] ?? null;
                if (! $map || isset($byKey[$map[0]])) {
                    continue; // Unknown or duplicate title: leave untouched.
                }
                $byKey[$map[0]] = $col->id;
                $tpl = $template->get($map[0]);
                DB::table('kanban_columns')->where('id', $col->id)->update(array_filter([
                    'stage_key' => $map[0],
                    'title' => $map[1],
                    'semantic_category' => $tpl['semantic'] ?? null,
                    'stage_role' => $tpl['role'] ?? 'workflow',
                    'exclude_from_metrics' => ! empty($tpl['exclude_from_metrics']),
                    'updated_at' => now(),
                ], fn ($v) => $v !== null));
            }

            $inserted = [];
            foreach (['to_do', 'progress_report', 'ready_to_report', 'client_under_review'] as $key) {
                if (isset($byKey[$key])) {
                    continue;
                }
                $tpl = $template->get($key);
                $byKey[$key] = $inserted[] = DB::table('kanban_columns')->insertGetId([
                    'board_id' => $board->id,
                    'title' => $tpl['title'],
                    'color' => $tpl['color'],
                    'position' => 999,
                    'semantic_category' => $tpl['semantic'],
                    'stage_key' => $key,
                    'stage_role' => 'workflow',
                    'exclude_from_metrics' => false,
                    'is_default' => false,
                    'is_archived' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('workflow_backfill_backups')->insert([
                'board_id' => $board->id,
                'columns_before' => json_encode($columns->map(fn ($c) => (array) $c)->values()),
                'inserted_column_ids' => json_encode($inserted),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Re-sequence positions to the approved order; unmapped columns trail behind.
            $pos = 0;
            foreach ($order as $key) {
                if (isset($byKey[$key])) {
                    DB::table('kanban_columns')->where('id', $byKey[$key])->update(['position' => $pos++]);
                }
            }
            foreach ($columns as $col) {
                if (! in_array($col->id, $byKey, true)) {
                    DB::table('kanban_columns')->where('id', $col->id)->update(['position' => $pos++]);
                }
            }

            foreach (config('angora_workflows.templates.production.transitions') as [$from, $to, $contrib]) {
                if (isset($byKey[$from], $byKey[$to])) {
                    DB::table('board_workflow_transitions')->insertOrIgnore([
                        'board_id' => $board->id,
                        'from_column_id' => $byKey[$from],
                        'to_column_id' => $byKey[$to],
                        'contributor_allowed' => $contrib,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('workflow_backfill_backups')) {
            foreach (DB::table('workflow_backfill_backups')->orderByDesc('id')->get() as $backup) {
                foreach (json_decode($backup->columns_before, true) as $col) {
                    DB::table('kanban_columns')->where('id', $col['id'])->update([
                        'title' => $col['title'],
                        'position' => $col['position'],
                    ]);
                }
                foreach (json_decode($backup->inserted_column_ids, true) as $id) {
                    // Only remove inserted stages that never received work.
                    if (! DB::table('kanban_tasks')->where('column_id', $id)->exists()) {
                        DB::table('board_workflow_transitions')->where('from_column_id', $id)->orWhere('to_column_id', $id)->delete();
                        DB::table('kanban_columns')->where('id', $id)->delete();
                    }
                }
            }
        }

        Schema::dropIfExists('board_workflow_transitions');
        Schema::dropIfExists('workflow_backfill_backups');
        Schema::table('kanban_columns', function (Blueprint $table) {
            $table->dropColumn(['stage_key', 'stage_role', 'exclude_from_metrics']);
        });
    }
};
