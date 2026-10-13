<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('company')->nullable();
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('city')->nullable();
            $table->string('status')->default('Lead'); // Lead, Prospect, Customer
            $table->decimal('total_spend', 12, 2)->default(0.00);
            $table->timestamps();
        });

        Schema::create('sales_leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('sales_customers')->cascadeOnDelete();
            $table->string('title');
            $table->decimal('deal_value', 12, 2)->default(0.00);
            $table->string('stage')->default('New'); // New, Contacted, Proposal, Negotiation, Closed Won, Closed Lost
            $table->integer('probability')->default(10); // 0 - 100%
            $table->date('expected_close_date')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('sales_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_code')->unique();
            $table->foreignId('customer_id')->constrained('sales_customers')->cascadeOnDelete();
            $table->string('type')->default('Invoice'); // Quotation, Invoice
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->string('status')->default('Draft'); // Draft, Sent, Paid, Overdue, Cancelled
            $table->date('issue_date');
            $table->date('due_date');
            $table->text('items_json')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('sales_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('period'); // Q1 2026, Q2 2026, etc.
            $table->decimal('target_amount', 12, 2)->default(0.00);
            $table->decimal('achieved_amount', 12, 2)->default(0.00);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_targets');
        Schema::dropIfExists('sales_invoices');
        Schema::dropIfExists('sales_leads');
        Schema::dropIfExists('sales_customers');
    }
};
