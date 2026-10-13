<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 8: Advanced Forms, Collaborative Workdocs, and Templates.
     */
    public function up(): void
    {
        // 1. FORMS & SUBMISSIONS
        Schema::create('forms', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique(); // unguessable public token
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category')->default('general'); // design, web_dev, revision, onboarding, general
            $table->foreignId('board_id')->nullable()->constrained('kanban_boards')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('agency_projects')->nullOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('visibility')->default('internal'); // internal, project_members, client_portal, public
            $table->boolean('is_published')->default(true);
            $table->boolean('is_archived')->default(false);
            $table->string('success_message')->nullable();
            $table->json('settings')->nullable(); // submit_btn_text, notify_emails, rate_limit, redirect_url
            $table->timestamps();
        });

        Schema::create('form_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained('forms')->cascadeOnDelete();
            $table->string('field_key'); // unique within form, maps to task column or custom_value
            $table->string('label');
            $table->string('type'); // short_text, long_text, email, phone, number, date, time, dropdown, multi_select, radio, checkbox, file_upload, url, rating, consent, heading, divider
            $table->text('help_text')->nullable();
            $table->text('placeholder')->nullable();
            $table->text('default_value')->nullable();
            $table->boolean('is_required')->default(false);
            $table->json('options')->nullable(); // for dropdown, multi_select, radio
            $table->json('conditional_logic')->nullable(); // { field_key: 'project_type', operator: 'equals', value: 'Website' }
            $table->string('maps_to_column')->nullable(); // board_column key or standard task field (title, description, priority, due_date)
            $table->integer('position')->default(0);
            $table->timestamps();
        });

        Schema::create('form_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained('forms')->cascadeOnDelete();
            $table->string('submission_token')->unique(); // idempotency safeguard against duplicate submissions
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('sales_customers')->nullOnDelete();
            $table->foreignId('created_task_id')->nullable()->constrained('kanban_tasks')->nullOnDelete();
            $table->string('submitter_name')->nullable();
            $table->string('submitter_email')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('status')->default('processed'); // received, processed, failed
            $table->timestamps();
        });

        Schema::create('form_submission_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('form_submissions')->cascadeOnDelete();
            $table->string('field_key');
            $table->string('field_label');
            $table->text('value')->nullable();
            $table->json('meta')->nullable(); // for file attachments: size, mime, original_name, stored_path
            $table->timestamps();
        });

        // 2. COLLABORATIVE WORKDOCS
        Schema::create('workdocs', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->longText('content')->nullable(); // structured rich text HTML or JSON blocks
            $table->string('folder_name')->nullable();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('agency_projects')->nullOnDelete();
            $table->foreignId('board_id')->nullable()->constrained('kanban_boards')->nullOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('kanban_tasks')->nullOnDelete();
            $table->string('visibility')->default('team'); // private, team, client_shared
            $table->boolean('is_template')->default(false);
            $table->string('template_category')->nullable();
            $table->boolean('is_archived')->default(false);
            $table->boolean('is_favorite')->default(false);
            $table->timestamps();
        });

        Schema::create('workdoc_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workdoc_id')->constrained('workdocs')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('version_number');
            $table->string('summary')->nullable(); // "Auto-saved snapshot", "Manual milestone"
            $table->longText('content');
            $table->timestamps();
        });

        Schema::create('workdoc_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workdoc_id')->constrained('workdocs')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('workdoc_comments')->cascadeOnDelete();
            $table->text('comment');
            $table->boolean('is_resolved')->default(false);
            $table->timestamps();
        });

        // 3. REUSABLE TEMPLATES ENGINE
        Schema::create('work_os_templates', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type'); // board, project, task, workdoc
            $table->string('category'); // website_development, graphic_design, marketing_campaign, client_onboarding, general
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_system_template')->default(false);
            $table->string('icon')->default('LayoutTemplate');
            $table->string('color')->default('#C8AEF5');
            $table->json('content_schema'); // Full blueprint: groups, columns, sample tasks, subtasks, deliverables, automations
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_os_templates');
        Schema::dropIfExists('workdoc_comments');
        Schema::dropIfExists('workdoc_versions');
        Schema::dropIfExists('workdocs');
        Schema::dropIfExists('form_submission_values');
        Schema::dropIfExists('form_submissions');
        Schema::dropIfExists('form_fields');
        Schema::dropIfExists('forms');
    }
};
