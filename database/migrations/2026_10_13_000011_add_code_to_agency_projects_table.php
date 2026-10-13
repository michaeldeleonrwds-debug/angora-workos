<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('agency_projects') && !Schema::hasColumn('agency_projects', 'code')) {
            Schema::table('agency_projects', function (Blueprint $table) {
                $table->string('code')->nullable()->after('name');
            });

            // Backfill existing records
            $projects = DB::table('agency_projects')->get();
            foreach ($projects as $project) {
                $code = 'PRJ-' . str_pad((string) $project->id, 3, '0', STR_PAD_LEFT);
                DB::table('agency_projects')->where('id', $project->id)->update(['code' => $code]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('agency_projects') && Schema::hasColumn('agency_projects', 'code')) {
            Schema::table('agency_projects', function (Blueprint $table) {
                $table->dropColumn('code');
            });
        }
    }
};
