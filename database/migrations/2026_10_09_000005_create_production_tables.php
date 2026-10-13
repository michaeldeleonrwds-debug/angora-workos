<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_work_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_no')->unique();
            $table->string('product_title');
            $table->string('batch_number');
            $table->integer('quantity');
            $table->integer('completed_quantity')->default(0);
            $table->string('status')->default('Pending'); // Pending, In Production, QA Review, Completed, On Hold
            $table->string('priority')->default('Normal'); // Normal, High, Urgent
            $table->date('start_date');
            $table->date('target_date');
            $table->string('assigned_unit'); // Line A, Assembly 2, Packaging, etc.
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('production_quality_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained('production_work_orders')->cascadeOnDelete();
            $table->foreignId('inspector_id')->constrained('users')->cascadeOnDelete();
            $table->integer('sample_size');
            $table->integer('defect_count')->default(0);
            $table->string('status')->default('Passed'); // Passed, Failed, Re-work
            $table->json('checklist_data')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('inspected_at');
            $table->timestamps();
        });

        Schema::create('production_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->nullable()->constrained('production_work_orders')->nullOnDelete();
            $table->string('title');
            $table->string('machine_line')->nullable();
            $table->string('severity')->default('Medium'); // Low, Medium, Critical
            $table->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('Open'); // Open, Investigating, Resolved
            $table->text('description');
            $table->text('corrective_action')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_incidents');
        Schema::dropIfExists('production_quality_checks');
        Schema::dropIfExists('production_work_orders');
    }
};
