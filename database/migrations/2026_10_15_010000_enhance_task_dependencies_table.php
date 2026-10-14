<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('task_dependencies', function (Blueprint $table) {
            if (!Schema::hasColumn('task_dependencies', 'relationship_type')) {
                $table->string('relationship_type')->default('blocked_by')->after('dependency_type');
            }
            if (!Schema::hasColumn('task_dependencies', 'workspace_id')) {
                $table->foreignId('workspace_id')->nullable()->after('id')->constrained('workspaces')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('task_dependencies', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('lag_days')->constrained('users')->nullOnDelete();
            }

            $table->index(['workspace_id', 'relationship_type'], 'idx_task_deps_ws_rel');
            $table->index(['task_id', 'relationship_type'], 'idx_task_deps_task_rel');
            $table->index(['depends_on_task_id', 'relationship_type'], 'idx_task_deps_dep_rel');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_dependencies', function (Blueprint $table) {
            if (Schema::hasColumn('task_dependencies', 'workspace_id')) {
                $table->dropForeign(['workspace_id']);
                $table->dropColumn('workspace_id');
            }
            if (Schema::hasColumn('task_dependencies', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
            if (Schema::hasColumn('task_dependencies', 'relationship_type')) {
                $table->dropColumn('relationship_type');
            }
        });
    }
};
