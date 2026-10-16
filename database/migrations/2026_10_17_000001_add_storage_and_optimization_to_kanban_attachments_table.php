<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kanban_attachments', function (Blueprint $table) {
            if (!Schema::hasColumn('kanban_attachments', 'disk')) {
                $table->string('disk', 50)->default('public')->after('mime_type');
            }
            if (!Schema::hasColumn('kanban_attachments', 'dimensions')) {
                $table->json('dimensions')->nullable()->after('disk');
            }
            if (!Schema::hasColumn('kanban_attachments', 'optimized_variants')) {
                $table->json('optimized_variants')->nullable()->after('dimensions');
            }
            if (!Schema::hasColumn('kanban_attachments', 'processing_status')) {
                $table->string('processing_status', 30)->default('ready')->after('optimized_variants');
            }
        });
    }

    public function down(): void
    {
        Schema::table('kanban_attachments', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('kanban_attachments', 'processing_status')) $cols[] = 'processing_status';
            if (Schema::hasColumn('kanban_attachments', 'optimized_variants')) $cols[] = 'optimized_variants';
            if (Schema::hasColumn('kanban_attachments', 'dimensions')) $cols[] = 'dimensions';
            if (Schema::hasColumn('kanban_attachments', 'disk')) $cols[] = 'disk';
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
