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
        // 1. Add timezone to users table if not exists
        if (!Schema::hasColumn('users', 'timezone')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('timezone', 64)->default('UTC')->after('department');
            });
        }

        // 2. Add Phase 3 scheduling, deadline, milestone & reminder fields to kanban_tasks table
        Schema::table('kanban_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('kanban_tasks', 'start_time')) {
                $table->string('start_time', 10)->nullable()->after('start_date');
            }
            if (!Schema::hasColumn('kanban_tasks', 'is_milestone')) {
                $table->boolean('is_milestone')->default(false)->after('is_personal');
            }
            if (!Schema::hasColumn('kanban_tasks', 'reminder_lead_minutes')) {
                // e.g. 0 (at deadline), 5, 15, 30, 60 (1 hr), 1440 (1 day), or custom
                $table->integer('reminder_lead_minutes')->nullable()->after('is_milestone');
            }
            if (!Schema::hasColumn('kanban_tasks', 'reminder_sent_at')) {
                $table->timestamp('reminder_sent_at')->nullable()->after('reminder_lead_minutes');
            }
        });

        // 3. Create task_reminders table for fine-grained multi-reminder scheduling & idempotency
        if (!Schema::hasTable('task_reminders')) {
            Schema::create('task_reminders', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('kanban_tasks')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->integer('lead_minutes')->default(0); // minutes before deadline (e.g. 0, 15, 60, 1440)
                $table->timestamp('scheduled_for')->index();
                $table->timestamp('sent_at')->nullable()->index();
                $table->string('status', 20)->default('pending')->index(); // pending, sent, cancelled, skipped
                $table->timestamps();

                $table->unique(['task_id', 'user_id', 'lead_minutes'], 'uniq_task_user_lead');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_reminders');

        Schema::table('kanban_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('kanban_tasks', 'reminder_sent_at')) {
                $table->dropColumn('reminder_sent_at');
            }
            if (Schema::hasColumn('kanban_tasks', 'reminder_lead_minutes')) {
                $table->dropColumn('reminder_lead_minutes');
            }
            if (Schema::hasColumn('kanban_tasks', 'is_milestone')) {
                $table->dropColumn('is_milestone');
            }
            if (Schema::hasColumn('kanban_tasks', 'start_time')) {
                $table->dropColumn('start_time');
            }
        });

        if (Schema::hasColumn('users', 'timezone')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('timezone');
            });
        }
    }
};
