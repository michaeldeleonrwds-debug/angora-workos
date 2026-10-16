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
        if (!Schema::hasTable('kanban_comment_mentions')) {
            Schema::create('kanban_comment_mentions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('comment_id')->constrained('kanban_comments')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('task_id')->constrained('kanban_tasks')->onDelete('cascade');
                $table->timestamps();

                $table->unique(['comment_id', 'user_id']);
                $table->index(['task_id', 'user_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kanban_comment_mentions');
    }
};
