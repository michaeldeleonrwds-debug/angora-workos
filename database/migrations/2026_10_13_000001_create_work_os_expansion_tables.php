<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Workspaces
        Schema::create('workspaces', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('icon')->default('layout');
            $table->string('color')->default('#C8AEF5');
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_favorite')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->timestamps();
        });

        // 2. Workspace Members
        Schema::create('workspace_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role')->default('member'); // owner, admin, member, viewer
            $table->timestamps();
            $table->unique(['workspace_id', 'user_id']);
        });

        // 3. Additive columns to kanban_boards
        Schema::table('kanban_boards', function (Blueprint $table) {
            $table->foreignId('workspace_id')->nullable()->after('id')->constrained('workspaces')->nullOnDelete();
            $table->string('folder_name')->nullable()->after('department');
            $table->string('visibility')->default('public')->after('folder_name'); // public, private, shareable
            $table->boolean('is_favorite')->default(false)->after('visibility');
            $table->boolean('is_template')->default(false)->after('is_favorite');
            $table->json('settings')->nullable()->after('is_template');
        });

        // 4. Board Groups (Monday.com Groups)
        Schema::create('board_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained('kanban_boards')->cascadeOnDelete();
            $table->string('title');
            $table->string('color')->default('#579BFC');
            $table->integer('position')->default(0);
            $table->timestamps();
        });

        // 5. Board Columns (Dynamic Column Registry)
        Schema::create('board_columns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained('kanban_boards')->cascadeOnDelete();
            $table->string('key');
            $table->string('title');
            $table->string('type')->default('text'); // text, status, priority, people, date, timeline, number, checkbox, dropdown, tags, rating, progress, link, formula
            $table->json('config')->nullable();
            $table->integer('position')->default(0);
            $table->boolean('is_visible')->default(true);
            $table->integer('width')->default(160);
            $table->timestamps();
        });

        // 6. Board Views
        Schema::create('board_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained('kanban_boards')->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->default('table'); // table, kanban, timeline, calendar
            $table->boolean('is_default')->default(false);
            $table->json('settings')->nullable();
            $table->integer('position')->default(0);
            $table->timestamps();
        });

        // 7. Additive columns to kanban_tasks
        Schema::table('kanban_tasks', function (Blueprint $table) {
            $table->foreignId('group_id')->nullable()->after('column_id')->constrained('board_groups')->nullOnDelete();
            $table->foreignId('parent_id')->nullable()->after('group_id')->constrained('kanban_tasks')->cascadeOnDelete();
            $table->json('custom_values')->nullable()->after('labels');
            $table->date('start_date')->nullable()->after('due_date');
            $table->decimal('estimated_hours', 8, 2)->nullable()->after('start_date');
            $table->decimal('actual_hours', 8, 2)->nullable()->after('estimated_hours');
            $table->integer('progress')->default(0)->after('actual_hours');
        });
    }

    public function down(): void
    {
        Schema::table('kanban_tasks', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropForeign(['group_id']);
            $table->dropColumn(['group_id', 'parent_id', 'custom_values', 'start_date', 'estimated_hours', 'actual_hours', 'progress']);
        });

        Schema::dropIfExists('board_views');
        Schema::dropIfExists('board_columns');
        Schema::dropIfExists('board_groups');

        Schema::table('kanban_boards', function (Blueprint $table) {
            $table->dropForeign(['workspace_id']);
            $table->dropColumn(['workspace_id', 'folder_name', 'visibility', 'is_favorite', 'is_template', 'settings']);
        });

        Schema::dropIfExists('workspace_members');
        Schema::dropIfExists('workspaces');
    }
};
