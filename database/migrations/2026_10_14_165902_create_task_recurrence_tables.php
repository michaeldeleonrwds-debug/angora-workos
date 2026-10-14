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
        if (!Schema::hasTable('task_recurrence_rules')) {
            Schema::create('task_recurrence_rules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('kanban_tasks')->cascadeOnDelete();
                $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
                $table->string('frequency', 30); // daily, weekly, monthly, custom, on_completion
                $table->unsignedInteger('interval')->default(1);
                $table->json('days_of_week')->nullable(); // e.g. [1, 2, 3, 4, 5]
                $table->string('time_of_day', 10)->nullable(); // e.g. 09:00
                $table->string('end_type', 30)->default('never'); // never, after_occurrences, on_date
                $table->unsignedInteger('max_occurrences')->nullable();
                $table->unsignedInteger('occurrences_count')->default(0);
                $table->date('end_date')->nullable();
                $table->dateTime('next_run_at')->nullable()->index();
                $table->dateTime('last_run_at')->nullable();
                $table->boolean('is_active')->default(true)->index();
                $table->boolean('copy_subtasks')->default(true);
                $table->boolean('copy_assignees')->default(true);
                $table->boolean('copy_custom_values')->default(true);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['workspace_id', 'is_active']);
                $table->index(['is_active', 'next_run_at']);
            });
        }

        if (!Schema::hasTable('task_recurrence_logs')) {
            Schema::create('task_recurrence_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('recurrence_rule_id')->constrained('task_recurrence_rules')->cascadeOnDelete();
                $table->foreignId('source_task_id')->constrained('kanban_tasks')->cascadeOnDelete();
                $table->foreignId('generated_task_id')->nullable()->constrained('kanban_tasks')->nullOnDelete();
                $table->dateTime('executed_at');
                $table->string('status', 20)->default('success'); // success, skipped, failed
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['recurrence_rule_id', 'executed_at']);
            });
        }

        if (Schema::hasTable('kanban_tasks') && !Schema::hasColumn('kanban_tasks', 'recurrence_rule_id')) {
            Schema::table('kanban_tasks', function (Blueprint $table) {
                $table->foreignId('recurrence_rule_id')->nullable()->constrained('task_recurrence_rules')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('kanban_tasks') && Schema::hasColumn('kanban_tasks', 'recurrence_rule_id')) {
            Schema::table('kanban_tasks', function (Blueprint $table) {
                $table->dropForeign(['recurrence_rule_id']);
                $table->dropColumn('recurrence_rule_id');
            });
        }

        Schema::dropIfExists('task_recurrence_logs');
        Schema::dropIfExists('task_recurrence_rules');
    }
};
