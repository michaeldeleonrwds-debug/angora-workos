<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'weekly_capacity_hours')) {
                $table->decimal('weekly_capacity_hours', 5, 2)->default(40.00)->after('timezone');
            }
            if (!Schema::hasColumn('users', 'daily_capacity_hours')) {
                $table->decimal('daily_capacity_hours', 4, 2)->default(8.00)->after('weekly_capacity_hours');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'daily_capacity_hours')) {
                $table->dropColumn('daily_capacity_hours');
            }
            if (Schema::hasColumn('users', 'weekly_capacity_hours')) {
                $table->dropColumn('weekly_capacity_hours');
            }
        });
    }
};
