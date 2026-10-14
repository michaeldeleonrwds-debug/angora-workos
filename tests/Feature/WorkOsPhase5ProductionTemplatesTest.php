<?php

namespace Tests\Feature;

use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskDependency;
use App\Models\User;
use App\Models\WorkOsTemplate;
use App\Models\Workspace;
use App\Services\TaskDependencyService;
use App\Services\TemplateEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class WorkOsPhase5ProductionTemplatesTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $member;
    protected User $externalUser;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $colTodo;
    protected KanbanColumn $colDone;
    protected BoardGroup $group;
    protected WorkOsTemplate $videoTemplate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
            'name' => 'Admin User',
        ]);

        $this->member = User::factory()->create([
            'role' => 'dept_user',
            'status' => 'active',
            'name' => 'Member User',
        ]);

        $this->externalUser = User::factory()->create([
            'role' => 'external_user',
            'status' => 'active',
            'name' => 'Client External',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Production Workspace',
            'slug' => 'production-workspace',
            'owner_id' => $this->admin->id,
        ]);
        $this->workspace->users()->attach($this->admin->id, ['role' => 'admin']);
        $this->workspace->users()->attach($this->member->id, ['role' => 'admin']);
        $this->workspace->users()->attach($this->externalUser->id, ['role' => 'viewer']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Video Production Board',
            'created_by' => $this->admin->id,
        ]);

        $this->colTodo = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'To Do',
            'position' => 0,
            'color' => '#6b7280',
        ]);

        $this->colDone = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Done',
            'position' => 1,
            'color' => '#10b981',
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Sprint 1',
            'color' => '#0085ff',
            'position' => 0,
        ]);

        // Seed a sample task template
        $this->videoTemplate = WorkOsTemplate::create([
            'title' => 'Commercial Video Production',
            'description' => 'End-to-end commercial video production blueprint',
            'type' => 'task',
            'category' => 'production',
            'icon' => 'Film',
            'color' => '#e11d48',
            'is_system_template' => true,
            'created_by' => $this->admin->id,
            'content_schema' => [
                'group_name' => 'Video Production Batch',
                'group_color' => '#e11d48',
                'total_duration_days' => 9,
                'default_stage' => 'To Do',
                'tasks' => [
                    [
                        'temp_id' => 't1',
                        'title' => 'Scriptwriting & Storyboard',
                        'priority' => 'High',
                        'offset_days' => 0,
                        'duration_days' => 3,
                        'stage' => 'To Do',
                        'subtasks' => [
                            ['title' => 'Treatment Draft'],
                            ['title' => 'Storyboard sketches'],
                        ],
                    ],
                    [
                        'temp_id' => 't2',
                        'title' => 'Principal Photography Shoot',
                        'priority' => 'Critical',
                        'offset_days' => 3,
                        'duration_days' => 2,
                        'stage' => 'To Do',
                        'depends_on' => ['t1'],
                        'subtasks' => [
                            ['title' => 'Location Scout'],
                            ['title' => 'Production Day 1'],
                        ],
                    ],
                    [
                        'temp_id' => 't3',
                        'title' => 'Color Grading & Sound Mix',
                        'priority' => 'Medium',
                        'offset_days' => 5,
                        'duration_days' => 4,
                        'stage' => 'To Do',
                        'depends_on' => ['t2'],
                        'subtasks' => [],
                    ],
                ],
            ],
        ]);
    }

    public function test_user_can_list_task_blueprints_for_board()
    {
        $response = $this->actingAs($this->member)
            ->getJson("/kanban/boards/{$this->board->id}/task-blueprints");

        $response->assertOk();
        $response->assertJsonFragment([
            'title' => 'Commercial Video Production',
            'category' => 'production',
        ]);
    }

    public function test_user_can_instantiate_task_blueprint_with_kickoff_date_mapping()
    {
        $kickoff = Carbon::parse('2026-11-01');

        $response = $this->actingAs($this->member)
            ->postJson("/kanban/boards/{$this->board->id}/task-blueprints/instantiate", [
                'template_id' => $this->videoTemplate->id,
                'date_mapping_mode' => 'kickoff',
                'reference_date' => $kickoff->toDateString(),
                'new_group_title' => 'Q4 Commercial Campaign',
                'assigned_to' => $this->member->id,
            ]);

        $response->assertOk();
        $response->assertJsonPath('tasks_count', 3);

        $this->assertDatabaseHas('board_groups', [
            'board_id' => $this->board->id,
            'title' => 'Q4 Commercial Campaign',
        ]);

        $group = BoardGroup::where('board_id', $this->board->id)
            ->where('title', 'Q4 Commercial Campaign')
            ->first();

        $this->assertNotNull($group);

        $t1 = KanbanTask::where('board_id', $this->board->id)
            ->where('group_id', $group->id)
            ->where('title', 'Scriptwriting & Storyboard')
            ->first();

        $this->assertNotNull($t1);
        $this->assertEquals($this->member->id, $t1->assigned_to);
        $this->assertEquals($kickoff->toDateString(), Carbon::parse($t1->start_date)->toDateString());
        // Duration 3 days => 2026-11-01 + 3 days = 2026-11-04
        $this->assertEquals($kickoff->copy()->addDays(3)->toDateString(), Carbon::parse($t1->due_date)->toDateString());

        // Check subtasks were created
        $subtasks = KanbanTask::where('parent_id', $t1->id)->get();
        $this->assertCount(2, $subtasks);
        $this->assertTrue($subtasks->pluck('title')->contains('Treatment Draft'));

        $t2 = KanbanTask::where('board_id', $this->board->id)
            ->where('group_id', $group->id)
            ->where('title', 'Principal Photography Shoot')
            ->first();

        $this->assertNotNull($t2);
        // t2 starts after t1 due date
        $this->assertEquals(Carbon::parse($t1->due_date)->toDateString(), Carbon::parse($t2->start_date)->toDateString());
    }

    public function test_user_can_instantiate_task_blueprint_with_deadline_backward_mapping()
    {
        $targetDeadline = Carbon::parse('2026-11-20');

        $response = $this->actingAs($this->member)
            ->postJson("/kanban/boards/{$this->board->id}/task-blueprints/instantiate", [
                'template_id' => $this->videoTemplate->id,
                'date_mapping_mode' => 'deadline',
                'reference_date' => $targetDeadline->toDateString(),
                'new_group_title' => 'Backward Scheduled Video',
            ]);

        $response->assertOk();

        $group = BoardGroup::where('title', 'Backward Scheduled Video')->first();
        $this->assertNotNull($group);

        $t3 = KanbanTask::where('group_id', $group->id)
            ->where('title', 'Color Grading & Sound Mix')
            ->first();

        $this->assertNotNull($t3);
        $this->assertEquals($targetDeadline->toDateString(), Carbon::parse($t3->due_date)->toDateString());
    }

    public function test_blueprint_instantiation_preserves_dependency_graph()
    {
        $kickoff = Carbon::parse('2026-11-01');

        $this->actingAs($this->admin)
            ->postJson("/kanban/boards/{$this->board->id}/task-blueprints/instantiate", [
                'template_id' => $this->videoTemplate->id,
                'date_mapping_mode' => 'kickoff',
                'reference_date' => $kickoff->toDateString(),
            ]);

        $t1 = KanbanTask::where('title', 'Scriptwriting & Storyboard')->first();
        $t2 = KanbanTask::where('title', 'Principal Photography Shoot')->first();
        $t3 = KanbanTask::where('title', 'Color Grading & Sound Mix')->first();

        $this->assertNotNull($t1);
        $this->assertNotNull($t2);
        $this->assertNotNull($t3);

        // Verify dependencies were created
        $this->assertDatabaseHas('task_dependencies', [
            'task_id' => $t2->id,
            'depends_on_task_id' => $t1->id,
            'dependency_type' => 'finish_to_start',
        ]);

        $this->assertDatabaseHas('task_dependencies', [
            'task_id' => $t3->id,
            'depends_on_task_id' => $t2->id,
            'dependency_type' => 'finish_to_start',
        ]);

        // t2 is blocked by unfinished t1
        $this->assertTrue($t2->is_blocked);
        // t1 has no predecessor so it is NOT blocked
        $this->assertFalse($t1->is_blocked);
    }

    public function test_user_can_save_existing_group_as_blueprint()
    {
        // Create 2 tasks in group with a dependency
        $taskA = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Concept Discovery',
            'priority' => 'High',
            'created_by' => $this->admin->id,
            'start_date' => Carbon::parse('2026-10-01'),
            'due_date' => Carbon::parse('2026-10-04'),
        ]);

        $taskB = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Design Presentation',
            'priority' => 'Medium',
            'created_by' => $this->admin->id,
            'start_date' => Carbon::parse('2026-10-05'),
            'due_date' => Carbon::parse('2026-10-08'),
        ]);

        // Add subtask
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'parent_id' => $taskA->id,
            'title' => 'Moodboard slide',
            'priority' => 'Low',
            'created_by' => $this->admin->id,
        ]);

        // Add dependency: taskB is blocked by taskA
        app(TaskDependencyService::class)->addDependency(
            task: $taskB,
            targetTaskId: $taskA->id,
            relationshipType: 'blocked_by',
            user: $this->admin
        );

        $response = $this->actingAs($this->admin)
            ->postJson("/kanban/groups/{$this->group->id}/save-as-blueprint", [
                'title' => 'Custom Branding Sprint Blueprint',
                'description' => 'Exported from live board group',
                'category' => 'design',
            ]);

        $response->assertOk();
        $response->assertJsonPath('template.title', 'Custom Branding Sprint Blueprint');

        $savedTemplate = WorkOsTemplate::where('title', 'Custom Branding Sprint Blueprint')->first();
        $this->assertNotNull($savedTemplate);
        $this->assertEquals('task', $savedTemplate->type);
        $this->assertEquals('design', $savedTemplate->category);

        $tasks = $savedTemplate->content_schema['tasks'];
        $this->assertCount(2, $tasks);
        $this->assertEquals('Concept Discovery', $tasks[0]['title']);
        $this->assertCount(1, $tasks[0]['subtasks']);
        $this->assertEquals('Design Presentation', $tasks[1]['title']);
        $this->assertContains($tasks[0]['key'], $tasks[1]['depends_on']);
    }

    public function test_external_user_cannot_save_or_instantiate_blueprints()
    {
        $response1 = $this->actingAs($this->externalUser)
            ->postJson("/kanban/boards/{$this->board->id}/task-blueprints/instantiate", [
                'template_id' => $this->videoTemplate->id,
            ]);

        $response1->assertForbidden();

        $response2 = $this->actingAs($this->externalUser)
            ->postJson("/kanban/groups/{$this->group->id}/save-as-blueprint", [
                'title' => 'Hacker Blueprint',
            ]);

        $response2->assertForbidden();
    }
}
