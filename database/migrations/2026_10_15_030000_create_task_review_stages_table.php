<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add multi-stage tracking columns to task_review_cycles
        Schema::table('task_review_cycles', function (Blueprint $table) {
            if (!Schema::hasColumn('task_review_cycles', 'total_stages')) {
                $table->unsignedInteger('total_stages')->default(1)->after('state');
            }
            if (!Schema::hasColumn('task_review_cycles', 'current_stage_index')) {
                $table->unsignedInteger('current_stage_index')->default(1)->after('total_stages');
            }
        });

        // 2. Create task_review_stages table
        if (!Schema::hasTable('task_review_stages')) {
            Schema::create('task_review_stages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('review_cycle_id')->constrained('task_review_cycles')->cascadeOnDelete();
                $table->unsignedInteger('stage_index')->default(1);
                $table->string('name')->default('Review');
                $table->string('required_role')->nullable(); // dept_user, admin, client, any
                $table->string('status', 30)->default('pending'); // pending, in_progress, approved, revision_requested, skipped
                $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
                $table->text('feedback')->nullable();
                $table->timestamp('decided_at')->nullable();
                $table->timestamps();

                $table->index(['review_cycle_id', 'stage_index']);
                $table->index(['review_cycle_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_review_stages');
        Schema::table('task_review_cycles', function (Blueprint $table) {
            if (Schema::hasColumn('task_review_cycles', 'current_stage_index')) {
                $table->dropColumn('current_stage_index');
            }
            if (Schema::hasColumn('task_review_cycles', 'total_stages')) {
                $table->dropColumn('total_stages');
            }
        });
    }
};
