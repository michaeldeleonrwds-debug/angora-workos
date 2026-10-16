<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kanban_boards', function (Blueprint $table) {
            if (!Schema::hasColumn('kanban_boards', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('settings');
            }
            if (!Schema::hasColumn('kanban_boards', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('board_views', function (Blueprint $table) {
            if (!Schema::hasColumn('board_views', 'is_hidden')) {
                $table->boolean('is_hidden')->default(false)->after('is_system');
            }
        });
    }

    public function down(): void
    {
        Schema::table('board_views', function (Blueprint $table) {
            if (Schema::hasColumn('board_views', 'is_hidden')) {
                $table->dropColumn('is_hidden');
            }
        });

        Schema::table('kanban_boards', function (Blueprint $table) {
            if (Schema::hasColumn('kanban_boards', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
            if (Schema::hasColumn('kanban_boards', 'archived_at')) {
                $table->dropColumn('archived_at');
            }
        });
    }
};
