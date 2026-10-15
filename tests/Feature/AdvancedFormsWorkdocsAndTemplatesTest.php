<?php

namespace Tests\Feature;

use App\Models\AgencyProject;
use App\Models\Form;
use App\Models\FormField;
use App\Models\FormSubmission;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workdoc;
use App\Models\WorkdocVersion;
use App\Models\WorkOsTemplate;
use App\Models\Workspace;
use App\Services\FormProcessorService;
use App\Services\TemplateEngineService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdvancedFormsWorkdocsAndTemplatesTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $manager;
    protected User $teamMember;
    protected User $externalClient;
    protected Workspace $workspace;
    protected KanbanBoard $board;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin = User::role('super_admin')->first();
        $this->manager = User::factory()->create([
            'role' => 'admin_manager',
            'department' => 'Operations',
            'email' => 'manager_phase8@angora.work',
        ]);
        $this->teamMember = User::factory()->create([
            'role' => 'team_member',
            'department' => 'Operations',
            'email' => 'dev_phase8@angora.work',
        ]);
        $this->externalClient = User::factory()->create([
            'role' => 'external_user',
            'email' => 'client_phase8@external.com',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Agency Client Workflows',
            'owner_id' => $this->manager->id,
        ]);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Web Agency Requests',
            'department' => 'Operations',
            'created_by' => $this->manager->id,
        ]);

        KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'New Inbound Requests',
            'color' => '#0085ff',
            'position' => 0,
        ]);
    }

    public function test_can_create_form_and_sync_drag_and_drop_fields(): void
    {
        // 1. Create form
        $response = $this->actingAs($this->manager)->post('/forms', [
            'title' => 'Client Website Request Intake',
            'description' => 'Collect site requirements, platforms, and deadlines.',
            'category' => 'web_dev',
            'board_id' => $this->board->id,
            'visibility' => 'public',
        ]);

        $response->assertRedirect();
        $form = Form::where('title', 'Client Website Request Intake')->first();
        $this->assertNotNull($form);
        $this->assertNotEmpty($form->uuid);

        // 2. Sync fields via AJAX
        $syncResponse = $this->actingAs($this->manager)->postJson("/forms/{$form->id}/fields/sync", [
            'fields' => [
                [
                    'field_key' => 'title',
                    'label' => 'Website Project Title',
                    'type' => 'short_text',
                    'is_required' => true,
                    'maps_to_column' => 'title',
                    'position' => 0,
                ],
                [
                    'field_key' => 'project_type',
                    'label' => 'Project Type',
                    'type' => 'dropdown',
                    'is_required' => true,
                    'options' => ['Website', 'Design'],
                    'position' => 1,
                ],
                [
                    'field_key' => 'website_url',
                    'label' => 'Current Website URL',
                    'type' => 'url',
                    'is_required' => true,
                    'conditional_logic' => [
                        'field_key' => 'project_type',
                        'operator' => 'equals',
                        'value' => 'Website',
                    ],
                    'position' => 2,
                ],
            ],
        ]);

        $syncResponse->assertOk();
        $this->assertEquals(3, $form->fields()->count());
    }

    public function test_form_submission_creates_task_and_enforces_conditional_validation(): void
    {
        $form = Form::create([
            'title' => 'Public Development Form',
            'board_id' => $this->board->id,
            'owner_id' => $this->manager->id,
            'visibility' => 'public',
            'is_published' => true,
        ]);

        $form->fields()->createMany([
            [
                'field_key' => 'title',
                'label' => 'Project Name',
                'type' => 'short_text',
                'is_required' => true,
                'maps_to_column' => 'title',
                'position' => 0,
            ],
            [
                'field_key' => 'project_type',
                'label' => 'Type',
                'type' => 'dropdown',
                'is_required' => true,
                'position' => 1,
            ],
            [
                'field_key' => 'website_url',
                'label' => 'Site URL',
                'type' => 'url',
                'is_required' => true,
                'conditional_logic' => [
                    'field_key' => 'project_type',
                    'operator' => 'equals',
                    'value' => 'Website',
                ],
                'position' => 2,
            ],
        ]);

        // Submit matching conditional logic: Project Type = Website -> website_url is required
        $processor = app(FormProcessorService::class);
        $errors = $processor->validateConditionalLogic($form, [
            'title' => 'Acme Redesign',
            'project_type' => 'Website',
            // website_url omitted!
        ]);

        $this->assertArrayHasKey('website_url', $errors);

        // Valid submission
        $submission = $processor->processSubmission(
            form: $form,
            answers: [
                'title' => 'Acme Redesign',
                'project_type' => 'Website',
                'website_url' => 'https://acme.com',
                'submitter_name' => 'John Doe',
                'submitter_email' => 'john@acme.com',
            ],
            files: [],
            user: null,
            ip: '127.0.0.1'
        );

        $this->assertNotNull($submission);
        $this->assertNotNull($submission->created_task_id);

        $task = KanbanTask::find($submission->created_task_id);
        $this->assertEquals('Acme Redesign', $task->title);
        $this->assertEquals($this->board->id, $task->board_id);

        // Test idempotency: re-submitting with identical token does not duplicate task
        $duplicate = $processor->processSubmission(
            form: $form,
            answers: [
                '_submission_token' => $submission->submission_token,
                'title' => 'Acme Redesign',
            ]
        );
        $this->assertEquals($submission->id, $duplicate->id);
        $this->assertEquals(1, KanbanTask::where('title', 'Acme Redesign')->count());
    }

    public function test_workdoc_creation_autosave_versions_and_comments(): void
    {
        // 1. Create Workdoc
        $response = $this->actingAs($this->manager)->post('/workdocs', [
            'title' => 'Q4 Marketing Strategy Brief',
            'folder_name' => 'Marketing',
            'visibility' => 'team',
        ]);

        $response->assertRedirect();
        $doc = Workdoc::where('title', 'Q4 Marketing Strategy Brief')->first();
        $this->assertNotNull($doc);

        // 2. Autosave with milestone version snapshot
        $updateResponse = $this->actingAs($this->manager)->patchJson("/workdocs/{$doc->id}", [
            'title' => 'Q4 Marketing Strategy Brief v2',
            'content' => '<h1>Updated Goals</h1><p>Omnichannel media acquisition.</p>',
            'create_version' => true,
            'version_summary' => 'Milestone review approval',
        ]);
        $updateResponse->assertOk();

        $doc->refresh();
        $this->assertEquals('Q4 Marketing Strategy Brief v2', $doc->title);
        $this->assertGreaterThanOrEqual(2, $doc->versions()->count());

        // 3. Post Comment
        $commentResponse = $this->actingAs($this->teamMember)->post("/workdocs/{$doc->id}/comments", [
            'comment' => 'Looks solid! Please clarify target CPA metrics.',
        ]);
        $commentResponse->assertRedirect();
        $this->assertEquals(1, $doc->comments()->count());
    }

    public function test_client_portal_isolation_for_internal_workdocs(): void
    {
        $internalDoc = Workdoc::create([
            'title' => 'Confidential Agency Profitability',
            'content' => '<p>Confidential numbers</p>',
            'owner_id' => $this->manager->id,
            'visibility' => 'team',
        ]);

        // Client cannot access internal doc
        $clientResponse = $this->actingAs($this->externalClient)->get("/workdocs/{$internalDoc->id}");
        $clientResponse->assertStatus(403);

        // Share doc explicitly with client
        $internalDoc->update(['visibility' => 'client_shared']);
        $accessibleResponse = $this->actingAs($this->externalClient)->get("/workdocs/{$internalDoc->id}");
        $accessibleResponse->assertOk();
    }

    public function test_template_engine_instantiates_board_project_and_workdoc(): void
    {
        $templateService = app(TemplateEngineService::class);

        // 1. Board Template instantiation
        $boardTemplate = WorkOsTemplate::where('type', 'board')->first();
        $this->assertNotNull($boardTemplate);

        $clonedBoard = $templateService->createBoardFromTemplate(
            template: $boardTemplate,
            workspaceId: $this->workspace->id,
            title: 'Design Sprint Beta',
            user: $this->manager
        );

        $this->assertNotNull($clonedBoard);
        $this->assertEquals('Design Sprint Beta', $clonedBoard->title);
        $this->assertGreaterThanOrEqual(3, $clonedBoard->columns()->count());
        $this->assertGreaterThanOrEqual(1, $clonedBoard->tasks()->count());

        // 2. Full Project Template instantiation
        $projectTemplate = WorkOsTemplate::where('type', 'project')->first();
        $this->assertNotNull($projectTemplate);

        $project = $templateService->createProjectFromTemplate(
            template: $projectTemplate,
            projectData: [
                'name' => 'E-Commerce Platform Launch',
                'workspace_id' => $this->workspace->id,
                'project_manager_id' => $this->manager->id,
                'budget_total' => 25000,
            ],
            user: $this->manager
        );

        $this->assertNotNull($project);
        $this->assertNotNull($project->board);
        $this->assertGreaterThanOrEqual(1, $project->deliverables()->count());
    }
}
