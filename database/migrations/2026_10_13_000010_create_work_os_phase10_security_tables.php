<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Multi-contact client management
        Schema::create('client_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('sales_customers')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role')->default('member'); // primary_contact, reviewer, stakeholder, billing
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['client_id', 'user_id']);
        });

        // 2. Explicit client project grants
        Schema::create('client_project_grants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('agency_projects')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('can_view_tasks')->default(true);
            $table->boolean('can_approve')->default(true);
            $table->timestamps();

            $table->unique(['project_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_project_grants');
        Schema::dropIfExists('client_contacts');
    }
};
