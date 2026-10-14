<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Enhance system_notifications
        Schema::table('system_notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('system_notifications', 'category')) {
                $table->string('category')->default('system')->after('type'); // mentions, assignments, reviews, automations, deadlines, system
            }
            if (!Schema::hasColumn('system_notifications', 'actor_id')) {
                $table->foreignId('actor_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('system_notifications', 'metadata')) {
                $table->json('metadata')->nullable()->after('link');
            }
        });

        // 2. Notification Preferences
        if (!Schema::hasTable('notification_preferences')) {
            Schema::create('notification_preferences', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('category'); // mentions, assignments, reviews, deadlines, automations, system
                $table->boolean('in_app_enabled')->default(true);
                $table->boolean('email_enabled')->default(true);
                $table->timestamps();

                $table->unique(['user_id', 'category']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');

        Schema::table('system_notifications', function (Blueprint $table) {
            if (Schema::hasColumn('system_notifications', 'actor_id')) {
                $table->dropForeign(['actor_id']);
                $table->dropColumn('actor_id');
            }
            if (Schema::hasColumn('system_notifications', 'category')) {
                $table->dropColumn('category');
            }
            if (Schema::hasColumn('system_notifications', 'metadata')) {
                $table->dropColumn('metadata');
            }
        });
    }
};
