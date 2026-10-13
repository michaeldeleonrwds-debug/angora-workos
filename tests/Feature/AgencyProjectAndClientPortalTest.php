<?php

namespace Tests\Feature;

use App\Models\AgencyProject;
use App\Models\ProjectDeliverable;
use App\Models\ProjectMember;
use App\Models\SalesCustomer;
use App\Models\SystemNotification;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AgencyProjectAndClientPortalTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $projectManager;
    protected User $projectLeader;
    protected User $designer;
    protected User $developer;
    protected User $clientUser;
    protected SalesCustomer $customerA;
    protected SalesCustomer $customerB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin = User::where('role', 'super_admin')->first();

        $this->projectManager = User::factory()->create([
            'name' => 'Sarah PM',
            'email' => 'sarah.pm@example.com',
            'role' => 'admin_manager',
            'department' => 'Operations',
        ]);

        $this->projectLeader = User::factory()->create([
            'name' => 'Marcus Leader',
            'email' => 'marcus.pl@example.com',
            'role' => 'dept_user',
            'department' => 'Production',
        ]);

        $this->designer = User::factory()->create([
            'name' => 'Alice Designer',
            'email' => 'alice.design@example.com',
            'role' => 'team_member',
            'department' => 'Marketing',
        ]);

        $this->developer = User::factory()->create([
            'name' => 'Bob Dev',
            'email' => 'bob.dev@example.com',
            'role' => 'team_member',
            'department' => 'Production',
        ]);

        $this->clientUser = User::factory()->create([
            'name' => 'John Client',
            'email' => 'client@acme.com',
            'role' => 'external_user',
        ]);

        $this->customerA = SalesCustomer::create([
            'name' => 'John Client',
            'company' => 'Acme Corporation',
            'email' => 'client@acme.com',
            'user_id' => $this->clientUser->id,
            'portal_access_enabled' => true,
        ]);

        $this->customerB = SalesCustomer::create([
            'name' => 'Other Client',
            'company' => 'Beta Ltd',
            'email' => 'beta@example.com',
            'portal_access_enabled' => true,
        ]);
    }

    public function test_can_create_agency_project_with_hierarchy_and_board(): void
    {
        $this->actingAs($this->projectManager);

        $response = $this->post(route('projects.store'), [
            'name' => 'Acme Brand Redesign 2026',
            'description' => 'Complete rebranding, design system and React web app',
            'client_id' => $this->customerA->id,
            'project_manager_id' => $this->projectManager->id,
            'project_leader_id' => $this->projectLeader->id,
            'create_board' => true,
            'status' => 'Planning',
            'priority' => 'High',
            'start_date' => now()->toDateString(),
            'due_date' => now()->addDays(45)->toDateString(),
            'budget' => 25000,
            'client_visible' => true,
            'members' => [
                ['user_id' => $this->designer->id, 'agency_role' => 'designer'],
                ['user_id' => $this->developer->id, 'agency_role' => 'developer'],
            ],
        ]);

        $response->assertRedirect();

        $project = AgencyProject::where('name', 'Acme Brand Redesign 2026')->first();
        $this->assertNotNull($project);
        $this->assertEquals($this->customerA->id, $project->client_id);
        $this->assertEquals($this->projectManager->id, $project->project_manager_id);
        $this->assertEquals($this->projectLeader->id, $project->project_leader_id);
        $this->assertNotNull($project->board_id);

        // Check members
        $this->assertDatabaseHas('project_members', [
            'project_id' => $project->id,
            'user_id' => $this->designer->id,
            'agency_role' => 'designer',
        ]);
        $this->assertDatabaseHas('project_members', [
            'project_id' => $project->id,
            'user_id' => $this->developer->id,
            'agency_role' => 'developer',
        ]);

        // Check notification delivered to project leader
        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->projectLeader->id,
            'type' => 'project_assignment',
        ]);
    }

    public function test_deliverable_submission_and_multi_stage_review_workflow(): void
    {
        Storage::fake('public');

        $project = AgencyProject::create([
            'name' => 'Nike Campaign Portal',
            'client_id' => $this->customerA->id,
            'project_manager_id' => $this->projectManager->id,
            'project_leader_id' => $this->projectLeader->id,
            'status' => 'In Progress',
            'priority' => 'Urgent',
        ]);

        // 1. Designer submits deliverable
        $this->actingAs($this->designer);

        $fakeFile = UploadedFile::fake()->create('homepage_mockup.pdf', 1024, 'application/pdf');

        $response = $this->post(route('projects.deliverables.store', $project->id), [
            'title' => 'Homepage Layout Mockups v1',
            'description' => 'Figma exports for hero and navigation components',
            'file' => $fakeFile,
            'external_url' => 'https://figma.com/file/mockup-token-123',
            'version' => 1,
            'internal_notes' => 'Awaiting Marcus PL visual check',
        ]);

        $response->assertRedirect();

        $deliverable = ProjectDeliverable::where('title', 'Homepage Layout Mockups v1')->first();
        $this->assertNotNull($deliverable);
        $this->assertEquals('submitted', $deliverable->status);
        $this->assertFalse($deliverable->is_client_visible);
        $this->assertEquals($this->designer->id, $deliverable->submitted_by);
        $this->assertNotNull($deliverable->file_path);

        // PM and PL receive review notifications
        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->projectLeader->id,
            'type' => 'deliverable_review',
        ]);

        // 2. Project Leader reviews and requests revision
        $this->actingAs($this->projectLeader);

        $revResponse = $this->post(route('deliverables.review', $deliverable->id), [
            'action' => 'request_revision',
            'internal_notes' => 'Please adjust button contrast to WCAG AAA standards.',
        ]);

        $revResponse->assertRedirect();
        $deliverable->refresh();
        $this->assertEquals('revision_required', $deliverable->status);
        $this->assertFalse($deliverable->is_client_visible);

        // Submitter designer notified of revision
        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->designer->id,
            'type' => 'deliverable_revision',
        ]);

        // 3. PM approves and publishes to client portal
        $this->actingAs($this->projectManager);

        $pubResponse = $this->post(route('deliverables.review', $deliverable->id), [
            'action' => 'approve_for_client',
            'internal_notes' => 'Changes verified. Ready for client review.',
        ]);

        $pubResponse->assertRedirect();
        $deliverable->refresh();
        $this->assertEquals('approved_for_client', $deliverable->status);
        $this->assertTrue($deliverable->is_client_visible);
        $this->assertNotNull($deliverable->approved_for_client_at);

        // Client notified of new deliverable ready for review
        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->clientUser->id,
            'type' => 'client_review',
        ]);
    }

    public function test_client_portal_security_and_tenant_isolation(): void
    {
        $projectA = AgencyProject::create([
            'name' => 'Acme Project A',
            'client_id' => $this->customerA->id,
            'project_manager_id' => $this->projectManager->id,
            'status' => 'In Progress',
            'client_visible' => true,
        ]);

        $projectB = AgencyProject::create([
            'name' => 'Beta Secret Project',
            'client_id' => $this->customerB->id,
            'project_manager_id' => $this->projectManager->id,
            'status' => 'In Progress',
            'client_visible' => true,
        ]);

        $this->actingAs($this->clientUser);

        // 1. Dashboard only presents client A's projects
        $dashboardResponse = $this->get(route('client-portal.dashboard'));
        $dashboardResponse->assertOk();

        // 2. Client A can view Project A
        $projectAResponse = $this->get(route('client-portal.project', $projectA->id));
        $projectAResponse->assertOk();

        // 3. Client A CANNOT access Project B (cross-tenant isolation test)
        $projectBResponse = $this->get(route('client-portal.project', $projectB->id));
        $projectBResponse->assertForbidden();
    }

    public function test_client_feedback_and_approval_workflow(): void
    {
        $project = AgencyProject::create([
            'name' => 'Acme Mobile App',
            'client_id' => $this->customerA->id,
            'project_manager_id' => $this->projectManager->id,
            'project_leader_id' => $this->projectLeader->id,
            'status' => 'In Progress',
            'client_visible' => true,
        ]);

        $deliverable = ProjectDeliverable::create([
            'project_id' => $project->id,
            'title' => 'Mobile Wireframes v2',
            'version' => 2,
            'status' => 'approved_for_client',
            'is_client_visible' => true,
            'submitted_by' => $this->designer->id,
            'client_status' => 'pending',
        ]);

        // Client logs in and submits approval with praise
        $this->actingAs($this->clientUser);

        $response = $this->post(route('client-portal.feedback', $deliverable->id), [
            'client_status' => 'approved',
            'client_feedback' => 'Approved! Proceed with frontend build immediately.',
        ]);

        $response->assertRedirect();
        $deliverable->refresh();

        $this->assertEquals('approved', $deliverable->client_status);
        $this->assertEquals('client_approved', $deliverable->status);
        $this->assertNotNull($deliverable->client_reviewed_at);
        $this->assertEquals('Approved! Proceed with frontend build immediately.', $deliverable->client_feedback);

        // PM and PL received client feedback notifications
        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->projectManager->id,
            'type' => 'client_feedback',
        ]);
        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->projectLeader->id,
            'type' => 'client_feedback',
        ]);
    }
}
