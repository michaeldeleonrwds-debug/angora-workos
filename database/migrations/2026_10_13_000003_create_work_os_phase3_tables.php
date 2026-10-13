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
        // 1. Task Dependencies Table for Gantt and Schedule Sequencing
        if (!Schema::hasTable('task_dependencies')) {
            Schema::create('task_dependencies', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('kanban_tasks')->cascadeOnDelete();
                $table->foreignId('depends_on_task_id')->constrained('kanban_tasks')->cascadeOnDelete();
                $table->string('dependency_type')->default('finish_to_start'); // finish_to_start, start_to_start, finish_to_finish, start_to_finish
                $table->integer('lag_days')->default(0);
                $table->timestamps();

                $table->unique(['task_id', 'depends_on_task_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_dependencies');
    }
};
