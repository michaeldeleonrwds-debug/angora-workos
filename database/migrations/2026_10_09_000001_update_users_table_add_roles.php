<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('team_member')->after('email');
            $table->string('department')->default('General')->after('role');
            $table->string('phone')->nullable()->after('department');
            $table->string('avatar_url')->nullable()->after('phone');
            $table->string('status')->default('active')->after('avatar_url');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'department', 'phone', 'avatar_url', 'status']);
        });
    }
};
