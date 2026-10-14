<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('task_review_cycles')) {
            Schema::create('task_review_cycles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('kanban_tasks')->cascadeOnDelete();
                $table->unsignedInteger('round_number')->default(1);
                $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
                $table->string('state')->default('pending'); // pending, approved, revision_requested
                $table->text('notes')->nullable();
                $table->timestamp('submitted_at')->nullable();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();

                $table->index(['task_id', 'state']);
                $table->index(['task_id', 'round_number']);
            });
        }

        if (!Schema::hasTable('task_review_decisions')) {
            Schema::create('task_review_decisions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('review_cycle_id')->constrained('task_review_cycles')->cascadeOnDelete();
                $table->foreignId('reviewer_id')->constrained('users')->cascadeOnDelete();
                $table->string('decision'); // approved, revision_requested
                $table->text('feedback')->nullable();
                $table->json('attachments')->nullable();
                $table->timestamp('decided_at')->nullable();
                $table->timestamps();

                $table->index(['review_cycle_id', 'decision']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_review_decisions');
        Schema::dropIfExists('task_review_cycles');
    }
};
