<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operations_workflows', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('department'); // Operations, Facility, Logistics, IT
            $table->string('priority')->default('Medium'); // Low, Medium, High, Critical
            $table->string('status')->default('Pending'); // Pending, In Progress, Department Review, Completed, Cancelled
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->text('description');
            $table->text('resolution_details')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamps();
        });

        Schema::create('operations_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->string('service_type'); // Facility Request, Hardware/IT, Logistics, Equipment Maintenance
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->string('department');
            $table->string('priority')->default('Medium');
            $table->string('status')->default('Open'); // Open, In Review, In Progress, Resolved
            $table->timestamp('sla_due_at')->nullable();
            $table->text('details');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operations_tickets');
        Schema::dropIfExists('operations_workflows');
    }
};
