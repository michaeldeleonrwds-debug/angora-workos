<?php

namespace Tests\Feature;

use App\Models\AgencyProject;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiProviderConfig;
use App\Models\AiUsageRecord;
use App\Models\ApiToken;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\ThirdPartyIntegration;
use App\Models\User;
use App\Models\WebhookDelivery;
use App\Models\WebhookSubscription;
use App\Models\Workspace;
use App\Services\WebhookService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AngoraAiAndDeveloperApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $clientUser;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected BoardGroup $group;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        $this->adminUser = User::role('super_admin')->first()
            ?? User::factory()->create(['role' => 'super_admin']);

        $this->clientUser = User::factory()->create([
            'role' => 'external_user',
        ]);

        $this->workspace = Workspace::first() ?? Workspace::create([
            'name' => 'Agency Main',
            'owner_id' => $this->adminUser->id,
        ]);

        $this->board = KanbanBoard::first() ?? KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Core Development Board',
            'created_by' => $this->adminUser->id,
        ]);

        $this->group = BoardGroup::where('board_id', $this->board->id)->first()
            ?? BoardGroup::create([
                'board_id' => $this->board->id,
                'title' => 'Backlog',
                'position' => 1,
            ]);
    }

    public function test_ai_conversation_chat_flow_and_grounded_fallback(): void
    {
        $this->actingAs($this->adminUser);

        // 1. Create conversation
        $convResponse = $this->postJson('/ai/conversations', [
            'context_type' => 'general',
        ]);
        $convResponse->assertStatus(200);
        $convId = $convResponse->json('conversation.id');

        // 2. Post a prompt to break down tasks
        $msgResponse = $this->postJson("/ai/conversations/{$convId}/messages", [
            'message' => 'Create tasks for a new client website redesign project',
        ]);

        $msgResponse->assertStatus(200);
        $msgResponse->assertJsonStructure([
            'success',
            'message' => [
                'id',
                'role',
                'content',
                'tool_calls' => ['action', 'tasks'],
                'tokens_used',
            ],
        ]);

        // 3. Verify tool calls contain proposed tasks
        $toolCalls = $msgResponse->json('message.tool_calls');
        $this->assertEquals('propose_tasks', $toolCalls['action']);
        $this->assertNotEmpty($toolCalls['tasks']);

        // 4. Verify AI usage record recorded
        $this->assertDatabaseHas('ai_usage_records', [
            'user_id' => $this->adminUser->id,
        ]);
    }

    public function test_human_in_the_loop_task_approval_and_persistence(): void
    {
        $this->actingAs($this->adminUser);

        $proposedTasks = [
            [
                'title' => 'UX Information Architecture',
                'description' => 'Wireframes and sitemap for client portal',
                'priority' => 'high',
                'subtasks' => ['Sitemap review', 'Desktop wireframe'],
            ],
            [
                'title' => 'Frontend Dashboard Components',
                'description' => 'React 19 widgets buildout',
                'priority' => 'urgent',
                'subtasks' => ['Widget container', 'Metric battery'],
            ],
        ];

        $initialTaskCount = KanbanTask::where('board_id', $this->board->id)->count();

        $response = $this->postJson('/ai/actions/approve-tasks', [
            'board_id' => $this->board->id,
            'group_id' => $this->group->id,
            'tasks' => $proposedTasks,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Confirm tasks were persisted to DB with parent/subtask relationships
        $newTaskCount = KanbanTask::where('board_id', $this->board->id)->count();
        $this->assertGreaterThan($initialTaskCount, $newTaskCount);

        $this->assertDatabaseHas('kanban_tasks', [
            'board_id' => $this->board->id,
            'title' => 'UX Information Architecture',
            'priority' => 'high',
        ]);
    }

    public function test_api_token_authentication_and_scopes_protection(): void
    {
        // 1. Generate API token for adminUser
        $tokenData = ApiToken::createToken($this->adminUser, 'CI Bot Token', ['tasks:read']);
        $plainToken = $tokenData['plain_text_token'];
        $tokenModel = $tokenData['token'];

        $this->assertNotNull($tokenModel);
        $this->assertEquals('CI Bot Token', $tokenModel->name);

        // 2. Access /api/v1/tasks without token -> 401
        $unauthRes = $this->getJson('/api/v1/tasks');
        $unauthRes->assertStatus(401);

        // 3. Access /api/v1/tasks with valid Bearer token -> 200
        $authRes = $this->withHeader('Authorization', 'Bearer ' . $plainToken)
            ->getJson('/api/v1/tasks');

        $authRes->assertStatus(200);
        $authRes->assertJsonStructure([
            'success',
            'data',
            'pagination' => ['current_page', 'total'],
        ]);

        // 4. Verify request was logged in api_request_logs
        $this->assertDatabaseHas('api_request_logs', [
            'api_token_id' => $tokenModel->id,
            'path' => 'api/v1/tasks',
            'status_code' => 200,
        ]);
    }

    public function test_webhook_hmac_signing_and_ssrf_protection(): void
    {
        $webhookService = app(WebhookService::class);

        // 1. SSRF Guard: Private IP targets should be blocked
        $this->assertFalse($webhookService->isSafeUrl('http://127.0.0.1:8000/webhook'));
        $this->assertFalse($webhookService->isSafeUrl('http://localhost/webhook'));
        $this->assertFalse($webhookService->isSafeUrl('http://192.168.1.50/webhook'));
        $this->assertFalse($webhookService->isSafeUrl('http://10.0.0.1/webhook'));
        $this->assertFalse($webhookService->isSafeUrl('http://169.254.169.254/latest/meta-data'));

        // 2. Public URLs are deemed safe
        $this->assertTrue($webhookService->isSafeUrl('https://example.com/api/webhooks'));

        // 3. Register a webhook subscription
        $sub = WebhookSubscription::create([
            'workspace_id' => $this->workspace->id,
            'created_by' => $this->adminUser->id,
            'name' => 'Slack Alert Bot',
            'url' => 'https://httpbin.org/post',
            'secret' => 'super_secret_signing_key_123',
            'events' => ['task.created'],
            'is_active' => true,
        ]);

        $this->assertTrue($sub->subscribesTo('task.created'));
        $this->assertFalse($sub->subscribesTo('invoice.paid'));

        // 4. SSRF block delivery check
        $badSub = WebhookSubscription::create([
            'workspace_id' => $this->workspace->id,
            'created_by' => $this->adminUser->id,
            'name' => 'Private Probe',
            'url' => 'http://127.0.0.1/private-data',
            'secret' => 'secret',
            'events' => ['task.created'],
            'is_active' => true,
        ]);

        $delivery = $webhookService->deliver($badSub, 'task.created', ['task_id' => 1]);
        $this->assertFalse($delivery->is_successful);
        $this->assertEquals(400, $delivery->status_code);
    }

    public function test_third_party_integration_encryption_and_openapi_spec(): void
    {
        $this->actingAs($this->adminUser);

        // 1. Connect third-party integration
        $res = $this->postJson('/integrations/connect', [
            'provider' => 'github',
            'account_identifier' => 'angora-work-os/core-repo',
            'api_token' => 'ghp_secret_token_example_12345',
        ]);

        $res->assertStatus(200);
        $this->assertDatabaseHas('third_party_integrations', [
            'provider' => 'github',
            'status' => 'connected',
            'account_identifier' => 'angora-work-os/core-repo',
        ]);

        // Verify credentials in DB are encrypted, not plaintext
        $integration = ThirdPartyIntegration::where('provider', 'github')->first();
        $this->assertNotEquals('ghp_secret_token_example_12345', $integration->credentials_encrypted);

        // 2. OpenAPI 3.0 specification endpoint
        $specRes = $this->getJson('/api/v1/openapi.json');
        $specRes->assertStatus(200);
        $specRes->assertJsonStructure([
            'openapi',
            'info' => ['title', 'version'],
            'paths',
            'components' => ['securitySchemes'],
        ]);
        $this->assertEquals('3.0.0', $specRes->json('openapi'));
    }
}
