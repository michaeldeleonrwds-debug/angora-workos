<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add client tracking columns to kanban_tasks
        Schema::table('kanban_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('kanban_tasks', 'client_id')) {
                $table->foreignId('client_id')->nullable()->after('board_id')->constrained('sales_customers')->nullOnDelete();
            }
            if (!Schema::hasColumn('kanban_tasks', 'is_client_visible')) {
                $table->boolean('is_client_visible')->default(false)->after('is_milestone')->index();
            }
            if (!Schema::hasColumn('kanban_tasks', 'internal_revision_count')) {
                $table->unsignedInteger('internal_revision_count')->default(0)->after('is_client_visible');
            }
            if (!Schema::hasColumn('kanban_tasks', 'client_revision_count')) {
                $table->unsignedInteger('client_revision_count')->default(0)->after('internal_revision_count');
            }
            if (!Schema::hasColumn('kanban_tasks', 'client_review_status')) {
                $table->string('client_review_status', 30)->default('none')->after('client_revision_count')->index(); // none, submitted, revision_requested, approved
            }
        });

        // 2. Add client visibility flag to comments
        Schema::table('kanban_comments', function (Blueprint $table) {
            if (!Schema::hasColumn('kanban_comments', 'is_client_visible')) {
                $table->boolean('is_client_visible')->default(false)->after('message')->index();
            }
        });

        // 3. Add client visibility flag to attachments
        Schema::table('kanban_attachments', function (Blueprint $table) {
            if (!Schema::hasColumn('kanban_attachments', 'is_client_visible')) {
                $table->boolean('is_client_visible')->default(false)->after('mime_type')->index();
            }
        });

        // 4. Enhance task_review_cycles for dual-loop review tracking
        Schema::table('task_review_cycles', function (Blueprint $table) {
            if (!Schema::hasColumn('task_review_cycles', 'review_type')) {
                $table->string('review_type', 30)->default('internal')->after('task_id')->index(); // internal, client
            }
            if (!Schema::hasColumn('task_review_cycles', 'client_id')) {
                $table->foreignId('client_id')->nullable()->after('review_type')->constrained('sales_customers')->nullOnDelete();
            }
            if (!Schema::hasColumn('task_review_cycles', 'client_feedback')) {
                $table->text('client_feedback')->nullable()->after('notes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('task_review_cycles', function (Blueprint $table) {
            if (Schema::hasColumn('task_review_cycles', 'client_feedback')) {
                $table->dropColumn('client_feedback');
            }
            if (Schema::hasColumn('task_review_cycles', 'client_id')) {
                $table->dropForeign(['client_id']);
                $table->dropColumn('client_id');
            }
            if (Schema::hasColumn('task_review_cycles', 'review_type')) {
                $table->dropIndex(['review_type']);
                $table->dropColumn('review_type');
            }
        });

        Schema::table('kanban_attachments', function (Blueprint $table) {
            if (Schema::hasColumn('kanban_attachments', 'is_client_visible')) {
                $table->dropIndex(['is_client_visible']);
                $table->dropColumn('is_client_visible');
            }
        });

        Schema::table('kanban_comments', function (Blueprint $table) {
            if (Schema::hasColumn('kanban_comments', 'is_client_visible')) {
                $table->dropIndex(['is_client_visible']);
                $table->dropColumn('is_client_visible');
            }
        });

        Schema::table('kanban_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('kanban_tasks', 'client_review_status')) {
                $table->dropIndex(['client_review_status']);
                $table->dropColumn('client_review_status');
            }
            if (Schema::hasColumn('kanban_tasks', 'client_revision_count')) {
                $table->dropColumn('client_revision_count');
            }
            if (Schema::hasColumn('kanban_tasks', 'internal_revision_count')) {
                $table->dropColumn('internal_revision_count');
            }
            if (Schema::hasColumn('kanban_tasks', 'is_client_visible')) {
                $table->dropIndex(['is_client_visible']);
                $table->dropColumn('is_client_visible');
            }
            if (Schema::hasColumn('kanban_tasks', 'client_id')) {
                $table->dropForeign(['client_id']);
                $table->dropColumn('client_id');
            }
        });
    }
};
