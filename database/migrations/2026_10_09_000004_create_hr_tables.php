<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('emp_code')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('department');
            $table->string('designation');
            $table->string('employment_type')->default('Full-Time'); // Full-Time, Part-Time, Contract, Intern
            $table->date('join_date');
            $table->decimal('basic_salary', 12, 2)->default(0.00);
            $table->string('status')->default('Active'); // Active, On Leave, Terminated
            $table->timestamps();
        });

        Schema::create('hr_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hr_employees')->cascadeOnDelete();
            $table->date('date');
            $table->time('clock_in')->nullable();
            $table->time('clock_out')->nullable();
            $table->decimal('working_hours', 5, 2)->default(0.00);
            $table->string('status')->default('Present'); // Present, Late, Absent, Half Day, Leave
            $table->timestamps();
        });

        Schema::create('hr_leave_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hr_employees')->cascadeOnDelete();
            $table->string('leave_type'); // Annual, Sick, Casual, Maternity, Unpaid
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('total_days')->default(1);
            $table->text('reason');
            $table->string('status')->default('Pending'); // Pending, Approved, Rejected
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('approver_comment')->nullable();
            $table->timestamps();
        });

        Schema::create('hr_performance_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('hr_employees')->cascadeOnDelete();
            $table->foreignId('reviewer_id')->constrained('users')->cascadeOnDelete();
            $table->string('review_period'); // Q1 2026, Annual 2026, etc.
            $table->integer('rating')->default(5); // 1-10
            $table->text('feedback')->nullable();
            $table->text('goals')->nullable();
            $table->string('status')->default('Draft'); // Draft, Finalized
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_performance_reviews');
        Schema::dropIfExists('hr_leave_requests');
        Schema::dropIfExists('hr_attendances');
        Schema::dropIfExists('hr_employees');
    }
};
