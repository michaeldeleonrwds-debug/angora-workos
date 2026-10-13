<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compliance_policies', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('policy_code')->unique();
            $table->string('category'); // Information Security, HR & Ethics, Health & Safety, Financial Standards
            $table->string('version')->default('1.0');
            $table->date('effective_date');
            $table->string('status')->default('Active'); // Active, Under Review, Archived
            $table->text('description');
            $table->timestamps();
        });

        Schema::create('compliance_risks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('category'); // Operational, Financial, Cyber Security, Regulatory
            $table->integer('likelihood')->default(3); // 1-5
            $table->integer('impact')->default(3); // 1-5
            $table->integer('risk_score')->default(9); // likelihood * impact
            $table->text('mitigation_strategy');
            $table->string('status')->default('Mitigating'); // Identified, Mitigating, Closed
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('compliance_incidents', function (Blueprint $table) {
            $table->id();
            $table->string('incident_code')->unique();
            $table->string('type'); // Data Breach, Safety Hazard, Policy Violation, Fraud Alert
            $table->string('severity')->default('Moderate'); // Low, Moderate, High, Critical
            $table->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            $table->date('incident_date');
            $table->string('status')->default('Open'); // Open, Investigating, Remediated, Closed
            $table->text('summary');
            $table->text('resolution_action')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compliance_incidents');
        Schema::dropIfExists('compliance_risks');
        Schema::dropIfExists('compliance_policies');
    }
};
