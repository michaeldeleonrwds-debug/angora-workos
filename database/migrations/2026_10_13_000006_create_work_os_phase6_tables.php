<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cross-Board Item Relationships (Core join table for Connect Boards)
        Schema::create('board_item_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_board_id')->constrained('kanban_boards')->cascadeOnDelete();
            $table->foreignId('source_task_id')->constrained('kanban_tasks')->cascadeOnDelete();
            $table->foreignId('target_board_id')->constrained('kanban_boards')->cascadeOnDelete();
            $table->foreignId('target_task_id')->constrained('kanban_tasks')->cascadeOnDelete();
            $table->string('column_key')->nullable(); // Column key on source board representing the connection
            $table->string('relation_type')->default('one_way'); // one_way, two_way
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Unique composite index to prevent duplicate connections between the same pair and column
            $table->unique(
                ['source_task_id', 'target_task_id', 'column_key'],
                'board_item_rel_unique_pair'
            );

            // Fast lookup indexes
            $table->index(['source_task_id', 'column_key'], 'source_task_col_idx');
            $table->index(['target_task_id'], 'target_task_idx');
            $table->index(['source_board_id', 'target_board_id'], 'source_target_board_idx');
        });

        // 2. Cross-Department Entity Links (Sales Deal -> Agency Project / Task, Marketing Campaign -> Task, Production Order -> Task, etc.)
        Schema::create('cross_department_links', function (Blueprint $table) {
            $table->id();
            $table->string('source_entity_type'); // e.g. SalesLead, SalesCustomer, MarketingCampaign, ProductionWorkOrder, ComplianceRisk, ServiceTicket, AgencyProject
            $table->unsignedBigInteger('source_entity_id');
            $table->string('target_entity_type'); // e.g. KanbanTask, AgencyProject, KanbanBoard, ProjectDeliverable
            $table->unsignedBigInteger('target_entity_id');
            $table->string('relationship_name')->default('related_work'); // milestone, deliverable, mitigation, asset
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['source_entity_type', 'source_entity_id', 'target_entity_type', 'target_entity_id', 'relationship_name'],
                'dept_links_unique_pair'
            );

            $table->index(['source_entity_type', 'source_entity_id'], 'dept_links_source_idx');
            $table->index(['target_entity_type', 'target_entity_id'], 'dept_links_target_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cross_department_links');
        Schema::dropIfExists('board_item_relationships');
    }
};
