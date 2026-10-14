<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskRecurrenceLog;
use App\Models\TaskRecurrenceRule;
use App\Models\User;
use App\Models\Workspace;
use App\Services\TaskRecurrenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class WorkOsPhase5RecurringTasksTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $member;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $colTodo;
    protected KanbanColumn $colDone;
    protected BoardGroup $group;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
            'name' => 'Admin Recurrence',
        ]);

        $this->member = User::factory()->create([
            'role' => 'dept_user',
            'status' => 'active',
            'name' => 'Member User',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Recurrence Workspace',
            'slug' => 'recurrence-workspace',
            'owner_id' => $this->admin->id,
        ]);
        $this->workspace->users()->attach($this->admin->id, ['role' => 'admin']);
        $this->workspace->users()->attach($this->member->id, ['role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Recurrence Board',
            'created_by' => $this->admin->id,
        ]);

        $this->colTodo = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'To Do',
            'position' => 0,
        ]);

        $this->colDone = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Done',
            'position' => 1,
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Weekly Ops',
            'color' => '#579BFC',
            'position' => 0,
        ]);
    }

    private function createTask(string $title, array $attrs = []): KanbanTask
    {
        return KanbanTask::create(array_merge([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'board_group_id' => $this->group->id,
            'group_id' => $this->group->id,
            'title' => $title,
            'created_by' => $this->admin->id,
            'position' => 0,
            'custom_values' => ['designer_ids' => [$this->member->id]],
        ], $attrs));
    }

    public function test_can_create_weekly_recurrence_rule_with_days_of_week(): void
    {
        $task = $this->createTask('Weekly Maintenance');

        $response = $this->actingAs($this->admin)->postJson("/kanban/tasks/{$task->id}/recurrence", [
            'frequency' => 'weekly',
            'interval' => 1,
            'days_of_week' => [1, 5], // Monday & Friday
            'time_of_day' => '09:00',
            'end_type' => 'never',
            'copy_subtasks' => true,
            'copy_assignees' => true,
            'copy_custom_values' => true,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('task_recurrence_rules', [
            'task_id' => $task->id,
            'workspace_id' => $this->workspace->id,
            'frequency' => 'weekly',
            'interval' => 1,
            'is_active' => true,
        ]);

        $rule = TaskRecurrenceRule::where('task_id', $task->id)->first();
        $this->assertNotNull($rule);
        $this->assertEquals([1, 5], $rule->days_of_week);
        $this->assertNotNull($rule->next_run_at);
        $this->assertEquals($rule->id, $task->fresh()->recurrence_rule_id);
    }

    public function test_spawn_next_task_preserves_assignees_custom_values_and_subtasks(): void
    {
        $task = $this->createTask('Blueprint Sprint Task', [
            'assigned_to' => $this->member->id,
            'custom_values' => [
                'designer_ids' => [$this->member->id],
                'account_manager' => [$this->admin->id],
            ],
            'start_date' => now()->format('Y-m-d'),
            'due_date' => now()->addDays(5)->format('Y-m-d'),
        ]);

        // Add subtask
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'board_group_id' => $this->group->id,
            'group_id' => $this->group->id,
            'parent_id' => $task->id,
            'title' => 'Subtask Checklist Item',
            'created_by' => $this->admin->id,
            'position' => 0,
        ]);

        $service = app(TaskRecurrenceService::class);
        $rule = $service->createOrUpdateRule($task, [
            'frequency' => 'daily',
            'interval' => 1,
            'end_type' => 'never',
            'copy_subtasks' => true,
            'copy_assignees' => true,
            'copy_custom_values' => true,
        ], $this->admin);

        $spawnedTask = $service->spawnNextTask($rule, force: true);

        $this->assertNotNull($spawnedTask);
        $this->assertNotEquals($task->id, $spawnedTask->id);
        $this->assertEquals($task->title, $spawnedTask->title);
        $this->assertEquals($this->member->id, $spawnedTask->assigned_to);
        $this->assertEquals([$this->member->id], $spawnedTask->custom_values['designer_ids']);
        $this->assertEquals([$this->admin->id], $spawnedTask->custom_values['account_manager']);
        $this->assertEquals(0, $spawnedTask->progress);
        $this->assertNull($spawnedTask->completed_at);

        // Check subtask was duplicated
        $this->assertEquals(1, $spawnedTask->subitems()->count());
        $this->assertEquals('Subtask Checklist Item', $spawnedTask->subitems->first()->title);

        // Check execution log
        $this->assertDatabaseHas('task_recurrence_logs', [
            'recurrence_rule_id' => $rule->id,
            'source_task_id' => $task->id,
            'generated_task_id' => $spawnedTask->id,
            'status' => 'success',
        ]);

        // Check occurrence count updated
        $this->assertEquals(1, $rule->fresh()->occurrences_count);
    }

    public function test_can_toggle_pause_and_resume_recurrence_rule(): void
    {
        $task = $this->createTask('Pausable Task');
        $service = app(TaskRecurrenceService::class);
        $rule = $service->createOrUpdateRule($task, [
            'frequency' => 'daily',
            'interval' => 1,
            'end_type' => 'never',
        ], $this->admin);

        $this->assertTrue($rule->is_active);

        // Toggle pause
        $responsePause = $this->actingAs($this->admin)->postJson("/kanban/tasks/{$task->id}/recurrence/toggle");
        $responsePause->assertStatus(200);
        $this->assertFalse($rule->fresh()->is_active);
        $this->assertNull($rule->fresh()->next_run_at);

        // Toggle resume
        $responseResume = $this->actingAs($this->admin)->postJson("/kanban/tasks/{$task->id}/recurrence/toggle");
        $responseResume->assertStatus(200);
        $this->assertTrue($rule->fresh()->is_active);
        $this->assertNotNull($rule->fresh()->next_run_at);
    }

    public function test_max_occurrences_limit_stops_recurrence(): void
    {
        $task = $this->createTask('Limited Run Task');
        $service = app(TaskRecurrenceService::class);
        $rule = $service->createOrUpdateRule($task, [
            'frequency' => 'daily',
            'interval' => 1,
            'end_type' => 'after_occurrences',
            'max_occurrences' => 2,
        ], $this->admin);

        // 1st run
        $first = $service->spawnNextTask($rule, force: true);
        $this->assertNotNull($first);
        $this->assertTrue($rule->fresh()->is_active);
        $this->assertEquals(1, $rule->fresh()->occurrences_count);

        // 2nd run
        $second = $service->spawnNextTask($rule->fresh(), force: true);
        $this->assertNotNull($second);
        $this->assertEquals(2, $rule->fresh()->occurrences_count);

        // Rule should now be marked inactive
        $this->assertFalse($rule->fresh()->is_active);
        $this->assertNull($rule->fresh()->next_run_at);

        // 3rd run should not spawn
        $third = $service->spawnNextTask($rule->fresh());
        $this->assertNull($third);
    }

    public function test_on_completion_recurrence_triggers_when_task_is_marked_done(): void
    {
        $task = $this->createTask('On Complete Task');
        $service = app(TaskRecurrenceService::class);
        $rule = $service->createOrUpdateRule($task, [
            'frequency' => 'on_completion',
            'interval' => 3,
            'end_type' => 'never',
        ], $this->admin);

        $this->actingAs($this->admin)->patchJson("/kanban/tasks/{$task->id}", [
            'column_id' => $this->colDone->id,
            'progress' => 100,
        ])->assertStatus(200);

        // A new instance should have been spawned automatically
        $spawned = KanbanTask::where('recurrence_rule_id', $rule->id)
            ->where('id', '!=', $task->id)
            ->first();

        $this->assertNotNull($spawned);
        $this->assertEquals('On Complete Task', $spawned->title);
    }

    public function test_artisan_command_processes_due_rules(): void
    {
        $task = $this->createTask('Due Recurring Task');
        $service = app(TaskRecurrenceService::class);
        $rule = $service->createOrUpdateRule($task, [
            'frequency' => 'daily',
            'interval' => 1,
            'end_type' => 'never',
        ], $this->admin);

        // Force next_run_at to past so it's due
        $rule->update(['next_run_at' => now()->subHour()]);

        $this->artisan('tasks:process-recurring')
            ->expectsOutputToContain('Spawned instances: 1')
            ->assertExitCode(0);

        $this->assertEquals(1, $rule->fresh()->occurrences_count);
    }

    public function test_can_delete_recurrence_rule(): void
    {
        $task = $this->createTask('Task to unlink recurrence');
        $service = app(TaskRecurrenceService::class);
        $rule = $service->createOrUpdateRule($task, [
            'frequency' => 'weekly',
            'interval' => 1,
            'end_type' => 'never',
        ], $this->admin);

        $response = $this->actingAs($this->admin)->deleteJson("/kanban/tasks/{$task->id}/recurrence");
        $response->assertStatus(200);

        $this->assertDatabaseMissing('task_recurrence_rules', ['id' => $rule->id]);
        $this->assertNull($task->fresh()->recurrence_rule_id);
    }
}
