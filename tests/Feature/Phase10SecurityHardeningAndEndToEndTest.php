<?php

namespace Tests\Feature;

use App\Events\CommentAddedEvent;
use App\Events\DeliverableStatusChangedEvent;
use App\Events\TaskUpdatedEvent;
use App\Models\AgencyProject;
use App\Models\AnalyticsReport;
use App\Models\ClientContact;
use App\Models\ClientProjectGrant;
use App\Models\KanbanAttachment;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\ProjectDeliverable;
use App\Models\SalesCustomer;
use App\Models\User;
use App\Services\WebhookService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class Phase10SecurityHardeningAndEndToEndTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Storage::fake('public');
    }

    public function test_role_switching_is_strictly_forbidden_in_production(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        $member = User::where('role', 'team_member')->first() ?? User::factory()->create(['role' => 'team_member']);

        // Under testing environment, switch works
        $response = $this->actingAs($admin)->post('/switch-role', [
            'user_id' => $member->id,
        ]);
        $response->assertRedirect();

        // Simulate production environment with CSRF disabled for test inspection
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
        $this->app->detectEnvironment(fn() => 'production');

        $responseProd = $this->actingAs($admin)->post('/switch-role', [
            'user_id' => $member->id,
        ]);
        $responseProd->assertStatus(403);
    }

    public function test_deliverable_download_authorization_and_client_isolation(): void
    {
        $pm = User::factory()->create([
            'role' => 'project_manager',
            'department' => 'Production',
        ]);

        $customerA = SalesCustomer::create([
            'name' => 'Acme Corp',
            'company' => 'Acme Corporation',
            'email' => 'contact@acme.com',
            'status' => 'active',
            'portal_access_enabled' => true,
        ]);

        $customerB = SalesCustomer::create([
            'name' => 'Beta Corp',
            'company' => 'Beta Corporation',
            'email' => 'contact@beta.com',
            'status' => 'active',
            'portal_access_enabled' => true,
        ]);

        $projectA = AgencyProject::create([
            'name' => 'Acme Platform Redesign',
            'client_id' => $customerA->id,
            'project_manager_id' => $pm->id,
            'status' => 'in_progress',
            'client_visible' => true,
        ]);

        // Upload fake deliverable file to public disk
        $file = UploadedFile::fake()->create('brand-guidelines.pdf', 500, 'application/pdf');
        $storedPath = $file->store('deliverables', 'public');

        $deliverable = ProjectDeliverable::create([
            'project_id' => $projectA->id,
            'title' => 'Brand Guidelines V1',
            'file_path' => $storedPath,
            'file_url' => Storage::url($storedPath),
            'version' => 1,
            'status' => 'approved_for_client',
            'is_client_visible' => true,
            'submitted_by' => $pm->id,
            'client_status' => 'pending',
        ]);

        // Client User for Company A
        $clientUserA = User::factory()->create([
            'role' => 'external_user',
            'email' => 'client.a@acme.com',
        ]);
        $customerA->update(['user_id' => $clientUserA->id]);

        // Client User for Company B
        $clientUserB = User::factory()->create([
            'role' => 'external_user',
            'email' => 'client.b@beta.com',
        ]);
        $customerB->update(['user_id' => $clientUserB->id]);

        // 1. Authorized PM can download
        $pmRes = $this->actingAs($pm)->get("/deliverables/{$deliverable->id}/download");
        $pmRes->assertStatus(200);

        // 2. Client User A (Owner of Project) can download
        $clientARes = $this->actingAs($clientUserA)->get("/deliverables/{$deliverable->id}/download");
        $clientARes->assertStatus(200);

        // 3. Client User B (Different company) is strictly FORBIDDEN (403)
        $clientBRes = $this->actingAs($clientUserB)->get("/deliverables/{$deliverable->id}/download");
        $clientBRes->assertStatus(403);
    }

    public function test_task_attachment_download_blocks_external_users(): void
    {
        $superAdmin = User::where('role', 'super_admin')->first();
        $externalUser = User::factory()->create(['role' => 'external_user']);

        $board = KanbanBoard::first();
        $column = KanbanColumn::where('board_id', $board->id)->first() ?? KanbanColumn::create([
            'board_id' => $board->id,
            'title' => 'To Do',
            'position' => 0,
        ]);

        $task = KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $column->id,
            'created_by' => $superAdmin->id,
            'title' => 'Internal Architecture Review',
            'status' => 'open',
        ]);

        $file = UploadedFile::fake()->create('internal-spec.txt', 10, 'text/plain');
        $storedPath = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $task->id,
            'user_id' => $superAdmin->id,
            'file_name' => 'internal-spec.txt',
            'file_path' => $storedPath,
            'file_size_bytes' => 1024,
            'mime_type' => 'text/plain',
        ]);

        // External user is forbidden
        $extRes = $this->actingAs($externalUser)->get("/kanban/attachments/{$attachment->id}/download");
        $extRes->assertStatus(403);

        // Super Admin is permitted
        $adminRes = $this->actingAs($superAdmin)->get("/kanban/attachments/{$attachment->id}/download");
        $adminRes->assertStatus(200);
    }

    public function test_multi_contact_client_portal_access_and_explicit_grants(): void
    {
        $pm = User::factory()->create([
            'role' => 'project_manager',
            'department' => 'Production',
        ]);

        $customer = SalesCustomer::create([
            'name' => 'Omni Enterprise',
            'company' => 'Omni Corp',
            'email' => 'billing@omni.com',
            'status' => 'active',
            'portal_access_enabled' => true,
        ]);

        $project = AgencyProject::create([
            'name' => 'Omni Mobile App',
            'client_id' => $customer->id,
            'project_manager_id' => $pm->id,
            'status' => 'in_progress',
            'client_visible' => true,
        ]);

        $deliverable = ProjectDeliverable::create([
            'project_id' => $project->id,
            'title' => 'Sprint 1 APK',
            'version' => 1,
            'status' => 'approved_for_client',
            'is_client_visible' => true,
            'submitted_by' => $pm->id,
            'client_status' => 'pending',
        ]);

        // Contact A: Member with approval authority
        $contactA = User::factory()->create(['role' => 'external_user', 'email' => 'reviewer@omni.com']);
        ClientContact::create([
            'client_id' => $customer->id,
            'user_id' => $contactA->id,
            'role' => 'reviewer',
            'is_active' => true,
        ]);
        ClientProjectGrant::create([
            'project_id' => $project->id,
            'user_id' => $contactA->id,
            'can_view_tasks' => true,
            'can_approve' => true,
        ]);

        // Contact B: Observer without approval authority
        $contactB = User::factory()->create(['role' => 'external_user', 'email' => 'observer@omni.com']);
        ClientContact::create([
            'client_id' => $customer->id,
            'user_id' => $contactB->id,
            'role' => 'stakeholder',
            'is_active' => true,
        ]);
        ClientProjectGrant::create([
            'project_id' => $project->id,
            'user_id' => $contactB->id,
            'can_view_tasks' => true,
            'can_approve' => false, // Cannot approve
        ]);

        // Contact A accesses dashboard and project
        $resA = $this->actingAs($contactA)->get('/client-portal');
        $resA->assertStatus(200);

        // Contact A submits approval feedback
        $resFeedbackA = $this->actingAs($contactA)->post("/client-portal/deliverables/{$deliverable->id}/feedback", [
            'client_status' => 'approved',
            'client_feedback' => 'Looks great, approved!',
        ]);
        $resFeedbackA->assertRedirect();
        $this->assertEquals('approved', $deliverable->fresh()->client_status);

        // Reset deliverable to pending for Contact B test
        $deliverable->update(['client_status' => 'pending', 'status' => 'approved_for_client']);

        // Contact B cannot approve (forbidden 403 due to grant check)
        $resFeedbackB = $this->actingAs($contactB)->post("/client-portal/deliverables/{$deliverable->id}/feedback", [
            'client_status' => 'approved',
            'client_feedback' => 'Attempting unauthorized approval',
        ]);
        $resFeedbackB->assertStatus(403);
    }

    public function test_ssrf_protection_filters_unsafe_addresses(): void
    {
        $webhookService = app(WebhookService::class);

        $this->assertFalse($webhookService->isSafeUrl('http://127.0.0.1/admin'));
        $this->assertFalse($webhookService->isSafeUrl('http://localhost:8000/webhook'));
        $this->assertFalse($webhookService->isSafeUrl('http://169.254.169.254/latest/meta-data/'));
        $this->assertFalse($webhookService->isSafeUrl('http://service.internal/hook'));
        $this->assertFalse($webhookService->isSafeUrl('ftp://example.com/test'));
        $this->assertFalse($webhookService->isSafeUrl('http://192.168.1.1/'));
        $this->assertFalse($webhookService->isSafeUrl('http://10.0.0.1/'));

        $this->assertTrue($webhookService->isSafeUrl('https://api.github.com/webhooks'));
        $this->assertTrue($webhookService->isSafeUrl('https://hooks.slack.com/services/T00/B00/X00'));
    }

    public function test_report_export_supports_csv_json_and_print_html_formats(): void
    {
        $superAdmin = User::where('role', 'super_admin')->first();

        $report = AnalyticsReport::create([
            'title' => 'Executive Task Progress',
            'report_type' => 'task_completion',
            'created_by' => $superAdmin->id,
            'config' => [],
        ]);

        // 1. CSV format (default)
        $csvRes = $this->actingAs($superAdmin)->get("/reports/{$report->id}/export");
        $csvRes->assertStatus(200);
        $this->assertStringContainsString('text/csv', $csvRes->headers->get('Content-Type'));

        // 2. JSON format
        $jsonRes = $this->actingAs($superAdmin)->get("/reports/{$report->id}/export?format=json");
        $jsonRes->assertStatus(200);
        $this->assertStringContainsString('application/json', $jsonRes->headers->get('Content-Type'));
        $data = $jsonRes->json();
        $this->assertArrayHasKey('report', $data);
        $this->assertArrayHasKey('headers', $data);
        $this->assertArrayHasKey('rows', $data);

        // 3. Print HTML format
        $printRes = $this->actingAs($superAdmin)->get("/reports/{$report->id}/export?format=print");
        $printRes->assertStatus(200);
        $this->assertStringContainsString('text/html', $printRes->headers->get('Content-Type'));
        $this->assertStringContainsString('ANGORA WORK OS', $printRes->getContent());
        $this->assertStringContainsString('@media print', $printRes->getContent());
    }

    public function test_real_time_broadcasting_events_and_sync_fallback(): void
    {
        Event::fake([
            TaskUpdatedEvent::class,
            CommentAddedEvent::class,
            DeliverableStatusChangedEvent::class,
        ]);

        $superAdmin = User::where('role', 'super_admin')->first();
        $board = KanbanBoard::first();
        $column = KanbanColumn::where('board_id', $board->id)->first() ?? KanbanColumn::create([
            'board_id' => $board->id,
            'title' => 'To Do',
            'position' => 0,
        ]);

        $task = KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $column->id,
            'created_by' => $superAdmin->id,
            'title' => 'Broadcast Testing Task',
            'status' => 'open',
        ]);

        // Update task column triggers TaskUpdatedEvent
        $this->actingAs($superAdmin)->patch("/kanban/tasks/{$task->id}/column", [
            'column_id' => $column->id,
        ]);
        Event::assertDispatched(TaskUpdatedEvent::class);

        // Store comment triggers CommentAddedEvent
        $this->actingAs($superAdmin)->post("/kanban/tasks/{$task->id}/comments", [
            'message' => 'Real-time comment test',
        ]);
        Event::assertDispatched(CommentAddedEvent::class);

        // Resilient event sync API fallback endpoint
        $tokenData = \App\Models\ApiToken::createToken($superAdmin, 'Sync Token', ['tasks:read']);
        $syncRes = $this->withHeader('Authorization', 'Bearer ' . $tokenData['plain_text_token'])
            ->getJson("/api/v1/sync/events?board_id={$board->id}");
        $syncRes->assertStatus(200);
        $syncData = $syncRes->json();
        $this->assertArrayHasKey('synced_at', $syncData);
        $this->assertArrayHasKey('events', $syncData);
        $this->assertGreaterThanOrEqual(1, $syncData['events_count']);
    }

    public function test_workdocs_and_dashboards_index_views_render_successfully_with_agency_projects(): void
    {
        $superAdmin = User::where('role', 'super_admin')->first();
        $customer = SalesCustomer::create([
            'name' => 'Acme Test Customer',
            'company' => 'Acme Inc',
            'email' => 'acme@test.com',
            'status' => 'active',
        ]);

        $project = AgencyProject::create([
            'name' => 'Alpha Core Redesign',
            'client_id' => $customer->id,
            'status' => 'in_progress',
        ]);

        $this->assertNotNull($project->code);

        // 1. GET /workdocs renders 200 OK
        $workdocsRes = $this->actingAs($superAdmin)->get('/workdocs');
        $workdocsRes->assertStatus(200);

        // 2. GET /dashboards renders 200 OK
        $dashboardsRes = $this->actingAs($superAdmin)->get('/dashboards');
        $dashboardsRes->assertStatus(200);

        // 3. GET /forms renders 200 OK
        $formsRes = $this->actingAs($superAdmin)->get('/forms');
        $formsRes->assertStatus(200);

        // 4. GET /templates renders 200 OK
        $templatesRes = $this->actingAs($superAdmin)->get('/templates');
        $templatesRes->assertStatus(200);
    }
}

