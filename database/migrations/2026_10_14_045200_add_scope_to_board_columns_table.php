<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('board_columns', function (Blueprint $table) {
            if (!Schema::hasColumn('board_columns', 'scope')) {
                $table->string('scope')->default('task')->after('type')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('board_columns', function (Blueprint $table) {
            if (Schema::hasColumn('board_columns', 'scope')) {
                $table->dropColumn('scope');
            }
        });
    }
};
