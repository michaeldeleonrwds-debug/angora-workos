<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 7 Enterprise Dashboards, Reporting & Analytics.
     */
    public function up(): void
    {
        Schema::create('dashboards', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('icon')->default('LayoutDashboard');
            $table->string('type')->default('custom'); // executive, agency, project, department, personal, custom
            $table->string('department')->nullable();
            $table->foreignId('project_id')->nullable()->constrained('agency_projects')->nullOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('visibility')->default('team'); // private, team, public
            $table->boolean('is_favorite')->default(false);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->json('filters')->nullable(); // global dashboard filters (date range, board_ids, workspace_id, etc.)
            $table->timestamps();
        });

        Schema::create('dashboard_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dashboard_id')->constrained('dashboards')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('permission')->default('view'); // view, edit
            $table->timestamps();

            $table->unique(['dashboard_id', 'user_id']);
        });

        Schema::create('dashboard_widgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dashboard_id')->constrained('dashboards')->cascadeOnDelete();
            $table->string('title');
            $table->string('type'); // numbers, battery, chart, workload, timeline, calendar, task_list, activity
            $table->json('config')->nullable(); // source_boards, metric, chart_type, x_axis, y_axis, filters, aggregation, etc.
            $table->json('layout')->nullable(); // {x: 0, y: 0, w: 6, h: 4}
            $table->integer('position')->default(0);
            $table->timestamps();
        });

        Schema::create('analytics_reports', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('report_type'); // project_status, task_completion, overdue_tasks, team_workload, department_performance, portfolio, deliverables, client_approvals
            $table->json('config')->nullable(); // boards, date_range, group_by, columns, filters
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('scheduled_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('analytics_reports')->cascadeOnDelete();
            $table->string('title');
            $table->string('frequency'); // daily, weekly, monthly
            $table->json('recipients')->nullable(); // list of user ids or emails
            $table->string('format')->default('csv'); // csv, pdf, xlsx
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scheduled_reports');
        Schema::dropIfExists('analytics_reports');
        Schema::dropIfExists('dashboard_widgets');
        Schema::dropIfExists('dashboard_members');
        Schema::dropIfExists('dashboards');
    }
};
