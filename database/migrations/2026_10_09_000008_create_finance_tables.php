<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_budgets', function (Blueprint $table) {
            $table->id();
            $table->string('department');
            $table->string('fiscal_year'); // FY2026
            $table->decimal('allocated_amount', 14, 2)->default(0.00);
            $table->decimal('spent_amount', 14, 2)->default(0.00);
            $table->timestamps();
        });

        Schema::create('finance_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('department');
            $table->string('category'); // Software, Travel, Office Supplies, Equipment, Consulting, Marketing
            $table->string('title');
            $table->decimal('amount', 12, 2);
            $table->string('receipt_url')->nullable();
            $table->string('status')->default('Pending'); // Pending, Approved, Rejected, Paid
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('approver_comment')->nullable();
            $table->timestamps();
        });

        Schema::create('finance_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // Payable (AP), Receivable (AR)
            $table->string('party_name');
            $table->string('invoice_ref');
            $table->decimal('amount', 12, 2);
            $table->date('due_date');
            $table->string('status')->default('Pending'); // Pending, Settled, Overdue
            $table->date('paid_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_transactions');
        Schema::dropIfExists('finance_expenses');
        Schema::dropIfExists('finance_budgets');
    }
};
