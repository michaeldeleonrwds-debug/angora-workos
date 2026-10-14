<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'avatar')) {
                $table->string('avatar')->nullable()->after('avatar_url');
            }
        });

        // Sync existing avatar_url values to avatar column
        try {
            DB::table('users')->whereNotNull('avatar_url')->whereNull('avatar')->update([
                'avatar' => DB::raw('avatar_url'),
            ]);
        } catch (\Throwable $e) {
            // Ignore if empty
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'avatar')) {
                $table->dropColumn('avatar');
            }
        });
    }
};
