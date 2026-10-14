<?php

namespace Tests\Feature;

use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskReviewCycle;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsPhase5MultiStageReviewTest extends TestCase
{
    use RefreshDatabase;

    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $colTodo;
    protected KanbanColumn $colReview;
    protected KanbanColumn $colRevision;
    protected KanbanColumn $colDone;
    protected User $admin;
    protected User $projectManager;
    protected User $designer;
    protected User $client;
    protected User $otherDeptUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'name' => 'Admin User',
            'email' => 'admin@angora.test',
        ]);

        $this->projectManager = User::factory()->create([
            'role' => 'project_manager',
            'name' => 'Project Manager',
            'email' => 'pm@angora.test',
        ]);

        $this->designer = User::factory()->create([
            'role' => 'dept_user',
            'name' => 'Designer User',
            'email' => 'designer@angora.test',
        ]);

        $this->client = User::factory()->create([
            'role' => 'client',
            'name' => 'Client Stakeholder',
            'email' => 'client@angora.test',
        ]);

        $this->otherDeptUser = User::factory()->create([
            'role' => 'dept_user',
            'name' => 'Other Member',
            'email' => 'other@angora.test',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Production Studio',
            'slug' => 'production-studio',
            'owner_id' => $this->admin->id,
            'status' => 'active',
        ]);

        foreach ([$this->admin, $this->projectManager, $this->designer, $this->client, $this->otherDeptUser] as $u) {
            $this->workspace->members()->create([
                'user_id' => $u->id,
                'role' => $u->role === 'client' ? 'viewer' : 'member',
            ]);
        }

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Brand Campaign Q4',
            'created_by' => $this->admin->id,
        ]);

        $this->colTodo = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'To Do',
            'position' => 0,
            'semantic_category' => 'not_started',
        ]);

        $this->colReview = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Review',
            'position' => 1,
            'semantic_category' => 'in_review',
        ]);

        $this->colRevision = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Needs Revision',
            'position' => 2,
            'semantic_category' => 'blocked',
        ]);

        $this->colDone = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Done',
            'position' => 3,
            'semantic_category' => 'completed',
        ]);
    }

    public function test_user_can_submit_multi_stage_review_cycle(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'title' => 'Interactive Banner Production',
            'created_by' => $this->designer->id,
            'assigned_to' => $this->designer->id,
        ]);

        $response = $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.submit', $task), [
            'notes' => 'Please inspect design assets and motion timing.',
            'stages' => [
                ['name' => 'Internal QA', 'required_role' => 'project_manager'],
                ['name' => 'Client Final Sign-off', 'required_role' => 'client'],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('task_review_cycles', [
            'task_id' => $task->id,
            'round_number' => 1,
            'state' => 'pending',
            'total_stages' => 2,
            'current_stage_index' => 1,
        ]);

        $cycle = TaskReviewCycle::where('task_id', $task->id)->first();
        $this->assertEquals(2, $cycle->stages()->count());

        $stage1 = $cycle->stages()->where('stage_index', 1)->first();
        $stage2 = $cycle->stages()->where('stage_index', 2)->first();

        $this->assertEquals('Internal QA', $stage1->name);
        $this->assertEquals('project_manager', $stage1->required_role);
        $this->assertEquals('in_progress', $stage1->status);

        $this->assertEquals('Client Final Sign-off', $stage2->name);
        $this->assertEquals('client', $stage2->required_role);
        $this->assertEquals('pending', $stage2->status);

        // Task moved to In Review column
        $this->assertEquals($this->colReview->id, $task->fresh()->column_id);
    }

    public function test_stage_progression_advances_without_prematurely_completing_task(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colReview->id,
            'title' => 'Brand Identity Guide',
            'created_by' => $this->designer->id,
            'assigned_to' => $this->designer->id,
        ]);

        $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.submit', $task), [
            'stages' => [
                ['name' => 'Lead Review', 'required_role' => 'project_manager'],
                ['name' => 'Client Sign-off', 'required_role' => 'client'],
            ],
        ])->assertOk();

        // PM approves Stage 1
        $decideRes = $this->actingAs($this->projectManager)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'approved',
            'feedback' => 'Internal QA passed with flying colors.',
        ]);

        $decideRes->assertOk();

        $cycle = TaskReviewCycle::where('task_id', $task->id)->first();
        $this->assertEquals('pending', $cycle->state);
        $this->assertEquals(2, $cycle->current_stage_index);

        $stage1 = $cycle->stages()->where('stage_index', 1)->first();
        $stage2 = $cycle->stages()->where('stage_index', 2)->first();

        $this->assertEquals('approved', $stage1->status);
        $this->assertEquals($this->projectManager->id, $stage1->reviewer_id);
        $this->assertEquals('in_progress', $stage2->status);

        // Task should NOT be marked completed yet
        $this->assertNull($task->fresh()->completed_at);
        $this->assertNotEquals($this->colDone->id, $task->fresh()->column_id);
    }

    public function test_stage_role_gating_enforces_specified_role(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colReview->id,
            'title' => 'Product Packaging Render',
            'created_by' => $this->designer->id,
            'assigned_to' => $this->designer->id,
        ]);

        $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.submit', $task), [
            'stages' => [
                ['name' => 'PM Approval', 'required_role' => 'project_manager'],
            ],
        ])->assertOk();

        // Non-PM dept user tries to approve -> rejected with 403
        $forbiddenRes = $this->actingAs($this->otherDeptUser)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'approved',
        ]);
        $forbiddenRes->assertStatus(403);

        // PM can approve
        $allowedRes = $this->actingAs($this->projectManager)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'approved',
            'feedback' => 'Approved by Project Manager.',
        ]);
        $allowedRes->assertOk();
    }

    public function test_final_stage_approval_completes_task_and_moves_to_done(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colReview->id,
            'title' => 'Commercial Video Master',
            'created_by' => $this->designer->id,
            'assigned_to' => $this->designer->id,
            'progress' => 80,
        ]);

        $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.submit', $task), [
            'stages' => [
                ['name' => 'Internal Review', 'required_role' => 'project_manager'],
                ['name' => 'Client Final Sign-off', 'required_role' => 'client'],
            ],
        ])->assertOk();

        // Approve Stage 1
        $this->actingAs($this->projectManager)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'approved',
        ])->assertOk();

        // Approve Stage 2 (Final Stage)
        $finalRes = $this->actingAs($this->client)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'approved',
            'feedback' => 'Love the commercial, approved for broadcast!',
        ]);

        $finalRes->assertOk();

        $cycle = TaskReviewCycle::where('task_id', $task->id)->first();
        $this->assertEquals('approved', $cycle->state);
        $this->assertNotNull($cycle->resolved_at);

        $freshTask = $task->fresh();
        $this->assertEquals($this->colDone->id, $freshTask->column_id);
        $this->assertEquals(100, $freshTask->progress);
        $this->assertNotNull($freshTask->completed_at);
    }

    public function test_revision_request_halts_cycle_and_routes_to_needs_revision(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colReview->id,
            'title' => 'Social Ad Set',
            'created_by' => $this->designer->id,
            'assigned_to' => $this->designer->id,
        ]);

        $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.submit', $task), [
            'stages' => [
                ['name' => 'Lead Review', 'required_role' => 'project_manager'],
                ['name' => 'Client Sign-off', 'required_role' => 'client'],
            ],
        ])->assertOk();

        // PM requests revision on Stage 1
        $revRes = $this->actingAs($this->projectManager)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'revision_requested',
            'feedback' => 'Logo size on slide 2 is too small.',
        ]);

        $revRes->assertOk();

        $cycle = TaskReviewCycle::where('task_id', $task->id)->first();
        $this->assertEquals('revision_requested', $cycle->state);
        $this->assertNotNull($cycle->resolved_at);

        $stage1 = $cycle->stages()->where('stage_index', 1)->first();
        $this->assertEquals('revision_requested', $stage1->status);

        // Task moved to Needs Revision column
        $this->assertEquals($this->colRevision->id, $task->fresh()->column_id);
    }

    public function test_designer_self_review_prevention(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colReview->id,
            'title' => 'Billboard Layout',
            'created_by' => $this->designer->id,
            'assigned_to' => $this->designer->id,
        ]);

        $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.submit', $task))->assertOk();

        // Submitter designer attempts to approve their own review
        $res = $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'approved',
        ]);

        $res->assertStatus(403);
    }
}
