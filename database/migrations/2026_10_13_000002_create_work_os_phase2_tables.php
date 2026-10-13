<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Task Attachments
        Schema::create('kanban_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('kanban_tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->unsignedBigInteger('file_size_bytes')->default(0);
            $table->string('mime_type')->default('application/octet-stream');
            $table->timestamps();
        });

        // 2. Threaded Replies & Reactions on Comments
        Schema::table('kanban_comments', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('task_id')->constrained('kanban_comments')->cascadeOnDelete();
            $table->json('reactions')->nullable()->after('message');
        });

        // 3. Due Time on Tasks
        Schema::table('kanban_tasks', function (Blueprint $table) {
            $table->string('due_time', 10)->nullable()->after('due_date');
        });
    }

    public function down(): void
    {
        Schema::table('kanban_tasks', function (Blueprint $table) {
            $table->dropColumn('due_time');
        });

        Schema::table('kanban_comments', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropColumn(['parent_id', 'reactions']);
        });

        Schema::dropIfExists('kanban_attachments');
    }
};
