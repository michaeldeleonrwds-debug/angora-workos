<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('users', 'desktop_notifications_enabled')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('desktop_notifications_enabled')->default(true)->change();
            });

            // Set default desktop notifications active for all existing accounts
            DB::table('users')->update([
                'desktop_notifications_enabled' => true,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'desktop_notifications_enabled')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('desktop_notifications_enabled')->default(false)->change();
            });
        }
    }
};
