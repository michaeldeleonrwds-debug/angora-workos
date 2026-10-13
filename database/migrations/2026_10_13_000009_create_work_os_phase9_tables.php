<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. AI Provider Configurations
        Schema::create('ai_provider_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->nullable()->constrained('workspaces')->nullOnDelete();
            $table->string('provider'); // openai, anthropic, gemini, local
            $table->string('model'); // gpt-4o, claude-3-5-sonnet, gemini-1.5-pro, llama-3, etc.
            $table->text('api_key_encrypted')->nullable();
            $table->string('base_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('settings')->nullable(); // temperature, max_tokens, system_prompt
            $table->unsignedInteger('monthly_token_cap')->default(1000000);
            $table->decimal('monthly_spend_cap', 10, 4)->default(50.0000);
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        // 2. AI Usage Records & Cost Tracking
        Schema::create('ai_usage_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->nullable()->constrained('workspaces')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('provider');
            $table->string('model');
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('total_tokens')->default(0);
            $table->decimal('estimated_cost', 10, 6)->default(0.000000);
            $table->string('context_type')->nullable(); // chat, task, project, workdoc, form, automation, dashboard
            $table->timestamps();
            
            $table->index(['workspace_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });

        // 3. AI Conversations
        Schema::create('ai_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->nullable()->constrained('workspaces')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title')->default('New Conversation');
            $table->string('context_type')->default('general'); // general, task, project, workdoc, automation, dashboard
            $table->unsignedBigInteger('context_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
        });

        // 4. AI Messages
        Schema::create('ai_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('ai_conversations')->cascadeOnDelete();
            $table->string('role'); // user, assistant, system
            $table->longText('content');
            $table->json('tool_calls')->nullable(); // proposed actions needing user approval
            $table->json('tool_results')->nullable(); // approval status & execution results
            $table->json('citations')->nullable(); // links to source tasks, projects, etc.
            $table->unsignedInteger('tokens_used')->default(0);
            $table->timestamps();

            $table->index('conversation_id');
        });

        // 5. Developer API Tokens (Personal Access Tokens)
        Schema::create('api_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('workspace_id')->nullable()->constrained('workspaces')->nullOnDelete();
            $table->string('name');
            $table->string('token_hash', 64)->unique();
            $table->string('token_prefix', 16);
            $table->json('scopes')->nullable(); // ['*'] or ['boards:read', 'tasks:write', ...]
            $table->timestamp('last_used_at')->nullable();
            $table->string('last_used_ip', 45)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_revoked')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_revoked']);
        });

        // 6. Developer API Request Logs
        Schema::create('api_request_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('api_token_id')->nullable()->constrained('api_tokens')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('method', 10);
            $table->string('path');
            $table->string('ip', 45)->nullable();
            $table->unsignedSmallInteger('status_code');
            $table->unsignedInteger('response_time_ms')->default(0);
            $table->timestamps();

            $table->index(['api_token_id', 'created_at']);
        });

        // 7. Webhook Subscriptions (Outbound)
        Schema::create('webhook_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->nullable()->constrained('workspaces')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('url');
            $table->string('secret', 64);
            $table->json('events'); // array of event keys
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('failure_count')->default(0);
            $table->timestamps();

            $table->index(['workspace_id', 'is_active']);
        });

        // 8. Webhook Deliveries (Outbound Delivery History & Logs)
        Schema::create('webhook_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('webhook_subscriptions')->cascadeOnDelete();
            $table->string('event');
            $table->json('payload');
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->text('response_body')->nullable();
            $table->unsignedTinyInteger('attempts')->default(1);
            $table->boolean('is_successful')->default(false);
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['subscription_id', 'created_at']);
        });

        // 9. Incoming Webhook Logs (Inbound Webhook Audit)
        Schema::create('incoming_webhook_logs', function (Blueprint $table) {
            $table->id();
            $table->string('source'); // github, slack, generic
            $table->string('event')->nullable();
            $table->string('idempotency_key')->nullable()->index();
            $table->json('payload');
            $table->string('status')->default('processed'); // processed, failed, ignored
            $table->timestamps();
        });

        // 10. Third-Party Integrations
        Schema::create('third_party_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->nullable()->constrained('workspaces')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('provider'); // google_drive, slack, github, figma, canva
            $table->string('name');
            $table->string('status')->default('disconnected'); // connected, disconnected, error
            $table->text('credentials_encrypted')->nullable();
            $table->string('account_identifier')->nullable();
            $table->json('sync_settings')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->text('error_log')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'provider']);
        });

        // 11. External Resource Links
        Schema::create('external_resource_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('integration_id')->constrained('third_party_integrations')->cascadeOnDelete();
            $table->string('attachable_type'); // kanban_tasks, agency_projects, project_deliverables, workdocs
            $table->unsignedBigInteger('attachable_id');
            $table->string('resource_type'); // drive_file, github_issue, github_pr, figma_design, canva_asset
            $table->string('external_id')->nullable();
            $table->string('external_title');
            $table->text('external_url');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['attachable_type', 'attachable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_resource_links');
        Schema::dropIfExists('third_party_integrations');
        Schema::dropIfExists('incoming_webhook_logs');
        Schema::dropIfExists('webhook_deliveries');
        Schema::dropIfExists('webhook_subscriptions');
        Schema::dropIfExists('api_request_logs');
        Schema::dropIfExists('api_tokens');
        Schema::dropIfExists('ai_messages');
        Schema::dropIfExists('ai_conversations');
        Schema::dropIfExists('ai_usage_records');
        Schema::dropIfExists('ai_provider_configs');
    }
};
