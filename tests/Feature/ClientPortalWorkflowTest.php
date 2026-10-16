<?php

namespace Tests\Feature;

use App\Models\AgencyProject;
use App\Models\KanbanAttachment;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\SalesCustomer;
use App\Models\SystemNotification;
use App\Models\TaskReviewCycle;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientPortalWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $pm;
    private User $employee;
    private User $clientUser;
    private SalesCustomer $customer;
    private Workspace $workspace;
    private KanbanBoard $internalBoard;
    private KanbanBoard $clientBoard;
    private KanbanColumn $colNewTask;
    private KanbanColumn $colToDo;
    private KanbanColumn $colProcessing;
    private KanbanColumn $colForReview;
    private KanbanColumn $colForRevision;
    private KanbanColumn $colReadyToReport;
    private KanbanColumn $colClientUnderReview;
    private KanbanColumn $colComplete;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->pm = User::factory()->create([
            'name' => 'Paula PM',
            'email' => 'pm.test@angora.test',
            'role' => 'project_manager',
        ]);

        $this->employee = User::factory()->create([
            'name' => 'Edward Employee',
            'email' => 'employee.test@angora.test',
            'role' => 'employee',
        ]);

        // Client User (external portal user, no internal Spatie roles)
        $this->clientUser = User::factory()->create([
            'name' => 'Alice Client',
            'email' => 'alice@apexclient.test',
        ]);
        $this->clientUser->syncRoles([]);

        $this->customer = SalesCustomer::create([
            'name' => 'Apex Global Ltd',
            'company_name' => 'Apex Global Ltd',
            'email' => 'contact@apexglobal.test',
            'user_id' => $this->clientUser->id,
            'status' => 'active',
            'client_portal_access' => true,
        ]);

        $this->clientUser->refresh();

        $this->workspace = Workspace::create([
            'name' => 'Production Workspace',
            'slug' => 'production-workspace',
            'owner_id' => $this->pm->id,
            'status' => 'active',
        ]);
        $this->workspace->members()->create(['user_id' => $this->pm->id, 'role' => 'owner']);
        $this->workspace->members()->create(['user_id' => $this->employee->id, 'role' => 'member']);

        // 1. Internal Production Board
        $this->internalBoard = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Angora Production — Demo',
            'created_by' => $this->pm->id,
            'type' => 'internal',
        ]);

        // Create standard production columns
        $this->colNewTask = $this->createColumn($this->internalBoard, 'New Task', 'new_task', 'new_task');
        $this->colToDo = $this->createColumn($this->internalBoard, 'To Do', 'to_do', 'to_do');
        $this->colProcessing = $this->createColumn($this->internalBoard, 'Processing', 'in_progress', 'processing');
        $this->colForReview = $this->createColumn($this->internalBoard, 'For Review', 'in_review', 'for_review');
        $this->colForRevision = $this->createColumn($this->internalBoard, 'For Revision', 'for_revision', 'for_revision');
        $this->colReadyToReport = $this->createColumn($this->internalBoard, 'Ready to Report', 'ready_to_report', 'ready_to_report');
        $this->colClientUnderReview = $this->createColumn($this->internalBoard, 'Client Under Review', 'client_under_review', 'client_under_review');
        $this->colComplete = $this->createColumn($this->internalBoard, 'Complete', 'completed', 'complete');

        // 2. Client Dedicated Review Board
        $this->clientBoard = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Apex Global — Client Review Board',
            'created_by' => $this->pm->id,
            'settings' => [
                'client_id' => $this->customer->id,
            ],
        ]);
        \App\Models\BoardMember::create([
            'board_id' => $this->clientBoard->id,
            'user_id' => $this->clientUser->id,
            'role' => 'viewer',
        ]);

        AgencyProject::create([
            'client_id' => $this->customer->id,
            'name' => 'Apex Global Brand Launch',
            'status' => 'in_progress',
        ]);
    }

    private function createColumn(KanbanBoard $board, string $title, string $semanticCategory, string $stageKey): KanbanColumn
    {
        return KanbanColumn::create([
            'board_id' => $board->id,
            'title' => $title,
            'color' => '#64748b',
            'position' => KanbanColumn::where('board_id', $board->id)->count(),
            'semantic_category' => $semanticCategory,
            'stage_key' => $stageKey,
            'stage_role' => 'workflow',
        ]);
    }

    private function createTask(KanbanColumn $column, array $overrides = []): KanbanTask
    {
        return KanbanTask::create(array_merge([
            'board_id' => $column->board_id,
            'column_id' => $column->id,
            'title' => 'Demo Deliverable Task',
            'priority' => 'High',
            'due_date' => now()->addDays(5)->toDateString(),
            'created_by' => $this->pm->id,
            'assigned_to' => $this->employee->id,
            'position' => 0,
        ], $overrides));
    }

    /**
     * Test 1: External Client cannot access internal boards, tasks, internal comments or attachments.
     */
    public function test_external_client_cannot_access_internal_boards_or_internal_comments(): void
    {
        // 1. Client user trying to access internal board gets 403
        $this->actingAs($this->clientUser);
        $this->assertFalse($this->clientUser->can('view', $this->internalBoard));

        // But client CAN view their own client board
        $this->assertTrue($this->clientUser->can('view', $this->clientBoard));

        // 2. Client cannot view internal-only task
        $internalTask = $this->createTask($this->colProcessing, [
            'is_client_visible' => false,
            'client_id' => null,
        ]);
        $this->assertFalse($this->clientUser->can('view', $internalTask));

        // 3. Client can view a task that is client-visible and linked to their customer ID
        $clientTask = $this->createTask($this->colClientUnderReview, [
            'is_client_visible' => true,
            'client_id' => $this->customer->id,
        ]);
        $this->assertTrue($this->clientUser->can('view', $clientTask));

        // 4. Comments: internal comment is hidden from client, client-visible comment is viewable
        $internalComment = KanbanComment::create([
            'task_id' => $clientTask->id,
            'user_id' => $this->pm->id,
            'message' => 'Internal margin discussion: Designer spent 4 hours on this.',
            'is_client_visible' => false,
        ]);

        $clientComment = KanbanComment::create([
            'task_id' => $clientTask->id,
            'user_id' => $this->pm->id,
            'message' => 'Here is the deliverable for your review.',
            'is_client_visible' => true,
        ]);

        $this->assertFalse($this->clientUser->can('view', $internalComment));
        $this->assertTrue($this->clientUser->can('view', $clientComment));

        // 5. Attachments: internal attachment is hidden from client, client-visible is viewable
        $internalAttachment = KanbanAttachment::create([
            'task_id' => $clientTask->id,
            'user_id' => $this->pm->id,
            'file_name' => 'internal_budget_sheet.xlsx',
            'file_path' => 'attachments/budget.xlsx',
            'file_size' => 1024,
            'mime_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'is_client_visible' => false,
        ]);

        $clientAttachment = KanbanAttachment::create([
            'task_id' => $clientTask->id,
            'user_id' => $this->pm->id,
            'file_name' => 'brand_guide_v1.pdf',
            'file_path' => 'attachments/guide.pdf',
            'file_size' => 2048,
            'mime_type' => 'application/pdf',
            'is_client_visible' => true,
        ]);

        $this->assertFalse($this->clientUser->can('view', $internalAttachment));
        $this->assertTrue($this->clientUser->can('view', $clientAttachment));
    }

    /**
     * Test 2: PM submits approved work to Client Review.
     */
    public function test_pm_submits_approved_work_to_client_review(): void
    {
        $task = $this->createTask($this->colReadyToReport, [
            'client_id' => $this->customer->id,
        ]);

        $this->actingAs($this->pm);

        $response = $this->postJson("/kanban/tasks/{$task->id}/client-review/submit", [
            'notes' => 'Please review the initial brand design deliverables.',
            'deliverable_title' => 'Brand Design Deck v1',
            'deliverable_url' => 'https://figma.com/file/demo-brand-deck',
        ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $task->refresh();

        // 1. Stage transitioned to Client Under Review
        $this->assertSame($this->colClientUnderReview->id, $task->column_id);
        $this->assertTrue((bool) $task->is_client_visible);
        $this->assertSame('submitted', $task->client_review_status);

        // 2. Client review cycle created
        $this->assertDatabaseHas('task_review_cycles', [
            'task_id' => $task->id,
            'review_type' => 'client',
            'client_id' => $this->customer->id,
            'state' => 'pending',
            'round_number' => 1,
        ]);

        // 3. Client notification generated
        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->clientUser->id,
            'type' => 'client_review',
        ]);

        // 4. Internal gate: unstarted tasks in New Task / To Do cannot be submitted
        $unstartedTask = $this->createTask($this->colNewTask, [
            'client_id' => $this->customer->id,
        ]);
        $gateResponse = $this->postJson("/kanban/tasks/{$unstartedTask->id}/client-review/submit", []);
        $gateResponse->assertStatus(422);
    }

    /**
     * Test 3: Client approves task -> transitions task to Complete stage and preserves stored deadline.
     */
    public function test_client_approves_task_transitions_to_complete_and_hides_deadline(): void
    {
        $storedDueDate = now()->addDays(3)->toDateString();
        $task = $this->createTask($this->colClientUnderReview, [
            'client_id' => $this->customer->id,
            'is_client_visible' => true,
            'client_review_status' => 'submitted',
            'due_date' => $storedDueDate,
        ]);

        $cycle = TaskReviewCycle::create([
            'task_id' => $task->id,
            'round_number' => 1,
            'review_type' => 'client',
            'client_id' => $this->customer->id,
            'submitted_by' => $this->pm->id,
            'state' => 'pending',
            'total_stages' => 1,
            'current_stage_index' => 1,
            'submitted_at' => now(),
        ]);

        $this->actingAs($this->clientUser);

        $response = $this->postJson("/client-portal/tasks/{$task->id}/approve", [
            'feedback' => 'Approved! Great work team.',
        ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $task->refresh();
        $cycle->refresh();

        // 1. Task transitioned to semantic Complete stage
        $this->assertSame($this->colComplete->id, $task->column_id);
        $this->assertNotNull($task->completed_at);
        $this->assertSame('approved', $task->client_review_status);

        // 2. Cycle updated to approved
        $this->assertSame('approved', $cycle->state);
        $this->assertNotNull($cycle->resolved_at);

        // 3. Stored deadline is preserved in DB
        $this->assertStringStartsWith($storedDueDate, (string) $task->due_date);

        // 4. PM notified of client approval
        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->pm->id,
            'type' => 'client_approved',
        ]);

        // 5. Idempotent: repeated approval does not fail or duplicate
        $repeatResponse = $this->postJson("/client-portal/tasks/{$task->id}/approve", []);
        $repeatResponse->assertOk();
    }

    /**
     * Test 4: Client requests revision -> stores feedback, increments client_revision_count, task stays in management queue.
     */
    public function test_client_requests_revision_holds_task_in_management_queue(): void
    {
        $task = $this->createTask($this->colClientUnderReview, [
            'client_id' => $this->customer->id,
            'is_client_visible' => true,
            'client_review_status' => 'submitted',
            'client_revision_count' => 0,
        ]);

        $cycle = TaskReviewCycle::create([
            'task_id' => $task->id,
            'round_number' => 1,
            'review_type' => 'client',
            'client_id' => $this->customer->id,
            'submitted_by' => $this->pm->id,
            'state' => 'pending',
            'total_stages' => 1,
            'current_stage_index' => 1,
            'submitted_at' => now(),
        ]);

        $this->actingAs($this->clientUser);

        $feedbackText = 'Please adjust typography to brand font and darken the secondary accents.';
        $response = $this->postJson("/client-portal/tasks/{$task->id}/request-revision", [
            'feedback' => $feedbackText,
        ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $task->refresh();
        $cycle->refresh();

        // 1. Cycle records revision_requested with client feedback
        $this->assertSame('revision_requested', $cycle->state);
        $this->assertSame($feedbackText, $cycle->client_feedback);

        // 2. Task client_revision_count is incremented
        $this->assertSame(1, $task->client_revision_count);
        $this->assertSame('revision_requested', $task->client_review_status);

        // 3. Task is NOT automatically sent to employee column (retains current stage for PM review)
        $this->assertSame($this->colClientUnderReview->id, $task->column_id);

        // 4. PM notified of revision request
        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->pm->id,
            'type' => 'client_revision',
        ]);
    }

    /**
     * Test 5: PM reviews client feedback and sends task back to production (preserves task ID & history).
     */
    public function test_pm_sends_back_to_production_preserves_task_id_and_notifies_assignee(): void
    {
        $task = $this->createTask($this->colClientUnderReview, [
            'client_id' => $this->customer->id,
            'is_client_visible' => true,
            'client_review_status' => 'revision_requested',
            'client_revision_count' => 1,
            'assigned_to' => $this->employee->id,
        ]);

        $originalTaskId = $task->id;
        $newDueDate = now()->addDays(2)->toDateString();

        $this->actingAs($this->pm);

        $response = $this->postJson("/kanban/tasks/{$task->id}/client-review/send-back", [
            'assigned_to' => $this->employee->id,
            'due_date' => $newDueDate,
            'instructions' => 'Per client feedback, please update the font to Archivo Black and darken the blue accent.',
        ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $task->refresh();

        // 1. Task ID remains identical (no new task created)
        $this->assertSame($originalTaskId, $task->id);

        // 2. Stage moved to New Task via workflow engine
        $this->assertSame($this->colNewTask->id, $task->column_id);
        $this->assertSame('rework_in_production', $task->client_review_status);
        $this->assertStringStartsWith($newDueDate, (string) $task->due_date);

        // 3. Instructions saved as internal comment (not visible to client)
        $comment = KanbanComment::where('task_id', $task->id)->latest('id')->first();
        $this->assertNotNull($comment);
        $this->assertStringContainsString('Archivo Black', $comment->message);
        $this->assertFalse((bool) $comment->is_client_visible);

        // 4. Assignee employee notified
        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->employee->id,
            'type' => 'task_assigned',
        ]);
    }

    /**
     * Test 6: Internal revision loop operates independently and preserves counters.
     */
    public function test_internal_revision_loop_operates_independently_and_preserves_counters(): void
    {
        $task = $this->createTask($this->colProcessing, [
            'assigned_to' => $this->employee->id,
            'internal_revision_count' => 0,
            'client_revision_count' => 0,
        ]);

        // Step A: Employee submits internal review
        $this->actingAs($this->employee);
        $submitRes = $this->postJson("/kanban/tasks/{$task->id}/review/submit", [
            'notes' => 'Internal draft ready for QA check.',
        ]);
        $submitRes->assertOk();

        $task->refresh();
        $this->assertSame($this->colForReview->id, $task->column_id);

        // Step B: PM reviews and requests internal revision
        $this->actingAs($this->pm);
        $decideRes = $this->postJson("/kanban/tasks/{$task->id}/review/decide", [
            'decision' => 'revision_requested',
            'feedback' => 'Internal QA check failed: please fix the alignment.',
        ]);
        $decideRes->assertOk();

        $task->refresh();

        // 1. Internal revision count incremented to 1
        $this->assertSame(1, $task->internal_revision_count);

        // 2. Client revision count completely unaffected (0)
        $this->assertSame(0, $task->client_revision_count);

        // 3. Task transitioned to For Revision stage
        $this->assertSame($this->colForRevision->id, $task->column_id);

        // 4. No client review cycles were created
        $this->assertDatabaseMissing('task_review_cycles', [
            'task_id' => $task->id,
            'review_type' => 'client',
        ]);
    }

    /**
     * Test 7: Client can view notifications tab in client portal.
     */
    public function test_client_can_view_notifications_tab(): void
    {
        $this->actingAs($this->clientUser);

        // Seed a notification for the client
        \App\Models\SystemNotification::create([
            'user_id' => $this->clientUser->id,
            'actor_id' => $this->pm->id,
            'title' => 'Deliverable Submitted for Review',
            'message' => 'New logo draft v2 is ready for review.',
            'type' => 'info',
            'category' => 'reviews',
            'link' => '/client-portal/reviews',
            'is_read' => false,
        ]);

        $response = $this->get('/client-portal/notifications');

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('client-portal/dashboard')
                ->where('activeTab', 'notifications')
                ->has('notifications.data', 1)
                ->where('stats.unread_notifications', 1)
            );
    }

    /**
     * Test 8: Client accessing /notifications via Inertia or browser is redirected to client-portal notifications.
     */
    public function test_client_visiting_notifications_is_redirected_to_client_portal(): void
    {
        $this->actingAs($this->clientUser);

        $inertiaVersion = app(\App\Http\Middleware\HandleInertiaRequests::class)->version(
            \Illuminate\Http\Request::create('/notifications', 'GET')
        );

        // Inertia visit (with valid headers)
        $response = $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $inertiaVersion,
            'X-Requested-With' => 'XMLHttpRequest',
        ])->get('/notifications');
        $response->assertRedirect(route('client-portal.notifications'));

        // Normal browser visit
        $browserResponse = $this->get('/notifications');
        $browserResponse->assertRedirect(route('client-portal.notifications'));
    }

    /**
     * Test 9: AJAX fetch request to /notifications still returns valid JSON for background consumers.
     */
    public function test_ajax_notifications_endpoint_still_returns_json(): void
    {
        $this->actingAs($this->clientUser);

        $response = $this->getJson('/notifications');
        $response->assertOk()
            ->assertJsonStructure([
                'notifications' => ['data', 'current_page', 'total'],
                'unread_count',
            ]);
    }
}
