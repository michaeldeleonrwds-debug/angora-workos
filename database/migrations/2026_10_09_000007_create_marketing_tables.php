<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('channel'); // Social Media, Search Ads, Email, Influencer, Events
            $table->decimal('budget', 12, 2)->default(0.00);
            $table->decimal('spend', 12, 2)->default(0.00);
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);
            $table->integer('leads_generated')->default(0);
            $table->integer('conversions')->default(0);
            $table->string('status')->default('Planning'); // Planning, Active, Paused, Completed
            $table->date('start_date');
            $table->date('end_date');
            $table->string('target_audience')->nullable();
            $table->timestamps();
        });

        Schema::create('marketing_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->nullable()->constrained('marketing_campaigns')->nullOnDelete();
            $table->string('title');
            $table->string('format'); // Blog Post, Video, Social Post, Newsletter, Case Study
            $table->string('platform'); // LinkedIn, YouTube, X, Blog, Instagram
            $table->string('status')->default('Idea'); // Idea, In Progress, Review, Scheduled, Published
            $table->date('scheduled_date')->nullable();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->text('copy_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_contents');
        Schema::dropIfExists('marketing_campaigns');
    }
};
