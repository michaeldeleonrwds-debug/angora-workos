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
        // 1. Board Automations definitions table
        if (!Schema::hasTable('board_automations')) {
            Schema::create('board_automations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('board_id')->constrained('kanban_boards')->cascadeOnDelete();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('trigger_type'); // e.g. status_changed, item_created, priority_changed, etc.
                $table->json('trigger_config')->nullable(); // trigger specific values, e.g. {'from_status': '...', 'to_status': '...'}
                $table->json('conditions')->nullable(); // array of condition rules / condition groups
                $table->json('actions'); // array of action definitions
                $table->boolean('is_active')->default(true);
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->unsignedInteger('execution_count')->default(0);
                $table->timestamp('last_executed_at')->nullable();
                $table->timestamps();

                $table->index(['board_id', 'is_active']);
                $table->index('trigger_type');
            });
        }

        // 2. Automation Execution Logs
        if (!Schema::hasTable('automation_executions')) {
            Schema::create('automation_executions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('automation_id')->constrained('board_automations')->cascadeOnDelete();
                $table->foreignId('board_id')->constrained('kanban_boards')->cascadeOnDelete();
                $table->foreignId('task_id')->nullable()->constrained('kanban_tasks')->nullOnDelete();
                $table->foreignId('triggered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('trigger_event');
                $table->string('status')->default('success'); // pending, running, success, failed, skipped
                $table->json('actions_attempted')->nullable();
                $table->json('actions_succeeded')->nullable();
                $table->json('actions_failed')->nullable();
                $table->text('error_message')->nullable();
                $table->unsignedInteger('execution_duration_ms')->default(0);
                $table->timestamps();

                $table->index(['automation_id', 'status']);
                $table->index('board_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('automation_executions');
        Schema::dropIfExists('board_automations');
    }
};
