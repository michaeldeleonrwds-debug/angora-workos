<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Extend sales_customers with portal integration fields
        Schema::table('sales_customers', function (Blueprint $table) {
            $table->foreignId('account_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // Associated client user account
            $table->boolean('portal_access_enabled')->default(true);
        });

        // 2. Agency Projects table
        Schema::create('agency_projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('client_id')->constrained('sales_customers')->cascadeOnDelete();
            $table->foreignId('project_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('project_leader_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('board_id')->nullable()->constrained('kanban_boards')->nullOnDelete();
            $table->string('status')->default('Planning'); // Planning, In Progress, Internal Review, Client Review, Completed, On Hold
            $table->string('priority')->default('Medium'); // Low, Medium, High, Urgent
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->decimal('budget', 12, 2)->default(0.00);
            $table->boolean('client_visible')->default(true);
            $table->json('client_access_settings')->nullable(); // toggles: can_see_milestones, can_see_tasks, can_upload_assets, can_request_revisions
            $table->timestamps();
        });

        // 3. Project Members & Multi-Role Assignments (Designer, Developer, PL, PM)
        Schema::create('project_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('agency_projects')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('agency_role')->default('developer'); // project_manager, project_leader, designer, developer, qa_engineer
            $table->timestamps();

            $table->unique(['project_id', 'user_id', 'agency_role']);
        });

        // 4. Project Deliverables & Multi-Stage Review/Approval Workflow
        Schema::create('project_deliverables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('agency_projects')->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('kanban_tasks')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('file_path')->nullable();
            $table->string('file_url')->nullable();
            $table->string('external_url')->nullable(); // Figma, Canva, Staging URL
            $table->integer('version')->default(1);
            $table->string('status')->default('submitted'); // draft, submitted, internal_review, revision_required, approved_for_client, client_review, client_approved
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('internal_notes')->nullable(); // Hidden from client
            $table->boolean('is_client_visible')->default(false);
            $table->timestamp('approved_for_client_at')->nullable();
            $table->string('client_status')->default('pending'); // pending, approved, revision_requested
            $table->text('client_feedback')->nullable();
            $table->timestamp('client_reviewed_at')->nullable();
            $table->timestamps();
        });

        // 5. Client Portal Invitations
        Schema::create('client_portal_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('sales_customers')->cascadeOnDelete();
            $table->string('email');
            $table->string('token', 64)->unique();
            $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_portal_invitations');
        Schema::dropIfExists('project_deliverables');
        Schema::dropIfExists('project_members');
        Schema::dropIfExists('agency_projects');

        Schema::table('sales_customers', function (Blueprint $table) {
            $table->dropForeign(['account_manager_id']);
            $table->dropForeign(['user_id']);
            $table->dropColumn(['account_manager_id', 'user_id', 'portal_access_enabled']);
        });
    }
};
