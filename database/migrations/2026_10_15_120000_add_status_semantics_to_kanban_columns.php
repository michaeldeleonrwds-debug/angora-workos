<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kanban_columns', function (Blueprint $table) {
            $table->string('semantic_category', 24)->default('not_started');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_archived')->default(false);
        });

        $seenBoards = [];
        DB::table('kanban_columns')->orderBy('board_id')->orderBy('position')->orderBy('id')
            ->select('id', 'board_id', 'title')->chunk(200, function ($columns) use (&$seenBoards) {
                foreach ($columns as $column) {
                    $label = strtolower(trim($column->title));
                    $category = match (true) {
                        in_array($label, ['done', 'completed', 'complete', 'delivered'], true) => 'completed',
                        in_array($label, ['for review', 'review', 'in review', 'needs revision'], true) => 'in_review',
                        in_array($label, ['hold', 'blocked', 'on hold'], true) => 'blocked',
                        in_array($label, ['working on it', 'in progress', 'progress'], true) => 'in_progress',
                        in_array($label, ['cancelled', 'canceled'], true) => 'cancelled',
                        default => 'not_started',
                    };
                    DB::table('kanban_columns')->where('id', $column->id)->update([
                        'semantic_category' => $category,
                        'is_default' => !isset($seenBoards[$column->board_id]),
                    ]);
                    $seenBoards[$column->board_id] = true;
                }
            });
    }

    public function down(): void
    {
        Schema::table('kanban_columns', function (Blueprint $table) {
            $table->dropColumn(['semantic_category', 'is_default', 'is_archived']);
        });
    }
};
