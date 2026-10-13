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
        Schema::table('user_invitations', function (Blueprint $table) {
            $table->string('token_hash', 64)->nullable()->after('token')->index();
        });

        // Migrate existing tokens to token_hash if any exist
        $invitations = DB::table('user_invitations')->get();
        foreach ($invitations as $invitation) {
            if (!empty($invitation->token) && empty($invitation->token_hash)) {
                DB::table('user_invitations')
                    ->where('id', $invitation->id)
                    ->update([
                        'token_hash' => hash('sha256', $invitation->token),
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_invitations', function (Blueprint $table) {
            $table->dropColumn('token_hash');
        });
    }
};
