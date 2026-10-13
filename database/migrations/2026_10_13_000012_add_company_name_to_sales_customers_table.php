<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sales_customers') && !Schema::hasColumn('sales_customers', 'company_name')) {
            Schema::table('sales_customers', function (Blueprint $table) {
                $table->string('company_name')->nullable()->after('company');
            });

            // Backfill existing records from company column
            $customers = DB::table('sales_customers')->get();
            foreach ($customers as $customer) {
                $comp = $customer->company ?? $customer->name;
                DB::table('sales_customers')->where('id', $customer->id)->update([
                    'company_name' => $comp,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('sales_customers') && Schema::hasColumn('sales_customers', 'company_name')) {
            Schema::table('sales_customers', function (Blueprint $table) {
                $table->dropColumn('company_name');
            });
        }
    }
};
