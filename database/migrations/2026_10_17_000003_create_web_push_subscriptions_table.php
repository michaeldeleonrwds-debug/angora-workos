<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Web Push Subscriptions table
        if (!Schema::hasTable('web_push_subscriptions')) {
            Schema::create('web_push_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->text('endpoint');
                $table->string('endpoint_hash', 64)->index();
                $table->string('public_key', 255);
                $table->string('auth_token', 255);
                $table->string('content_encoding', 32)->default('aes128gcm');
                $table->string('device_name', 255)->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'endpoint_hash']);
            });
        }

        // 2. Enhance notification_preferences with desktop_enabled & push_enabled
        Schema::table('notification_preferences', function (Blueprint $table) {
            if (!Schema::hasColumn('notification_preferences', 'desktop_enabled')) {
                $table->boolean('desktop_enabled')->default(true)->after('in_app_enabled');
            }
            if (!Schema::hasColumn('notification_preferences', 'push_enabled')) {
                $table->boolean('push_enabled')->default(true)->after('desktop_enabled');
            }
        });

        // 3. User-level notification settings in users table
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'desktop_notifications_enabled')) {
                $table->boolean('desktop_notifications_enabled')->default(false)->after('remember_token');
            }
            if (!Schema::hasColumn('users', 'push_notifications_enabled')) {
                $table->boolean('push_notifications_enabled')->default(false)->after('desktop_notifications_enabled');
            }
            if (!Schema::hasColumn('users', 'sound_notifications_enabled')) {
                $table->boolean('sound_notifications_enabled')->default(false)->after('push_notifications_enabled');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('web_push_subscriptions');

        Schema::table('notification_preferences', function (Blueprint $table) {
            if (Schema::hasColumn('notification_preferences', 'push_enabled')) {
                $table->dropColumn('push_enabled');
            }
            if (Schema::hasColumn('notification_preferences', 'desktop_enabled')) {
                $table->dropColumn('desktop_enabled');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'sound_notifications_enabled')) {
                $table->dropColumn('sound_notifications_enabled');
            }
            if (Schema::hasColumn('users', 'push_notifications_enabled')) {
                $table->dropColumn('push_notifications_enabled');
            }
            if (Schema::hasColumn('users', 'desktop_notifications_enabled')) {
                $table->dropColumn('desktop_notifications_enabled');
            }
        });
    }
};
