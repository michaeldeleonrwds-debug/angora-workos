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
        Schema::create('media_assets', function (Blueprint $table) {
            $table->id();
            $table->string('media_uuid', 64)->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('workspace_id')->nullable()->constrained('workspaces')->nullOnDelete();
            $table->string('disk', 32)->default('public');
            $table->string('file_path', 500);
            $table->string('original_filename', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size_bytes');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('title', 255)->nullable();
            $table->string('alt_text', 255)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('media_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('media_asset_id')->constrained('media_assets')->cascadeOnDelete();
            $table->string('attachable_type', 120);
            $table->unsignedBigInteger('attachable_id');
            $table->string('field_name', 64)->default('default');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['attachable_type', 'attachable_id']);
            $table->unique(['media_asset_id', 'attachable_type', 'attachable_id', 'field_name'], 'media_usage_unique_ref');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media_usages');
        Schema::dropIfExists('media_assets');
    }
};
