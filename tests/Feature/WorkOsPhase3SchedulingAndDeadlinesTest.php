<?php

namespace Tests\Feature;

use App\Models\BoardGroup;
use App\Models\BoardMember;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\SystemNotification;
use App\Models\TaskReminder;
use App\Models\User;
use App\Models\Workspace;
use App\Services\AutomationEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsPhase3SchedulingAndDeadlinesTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $user;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $column;
    protected BoardGroup $group;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@angora.test'],
            [
                'name' => 'Super Admin',
                'password' => bcrypt('password'),
                'role' => 'super_admin',
                'department' => 'Executive',
                'timezone' => 'UTC',
            ]
        );

        $this->user = User::firstOrCreate(
            ['email' => 'pm_phase3@angora.test'],
            [
                'name' => 'PM Phase 3',
                'password' => bcrypt('password'),
                'role' => 'project_manager',
                'department' => 'Operations',
                'timezone' => 'America/New_York',
            ]
        );

        $this->workspace = Workspace::firstOrCreate(
            ['name' => 'Phase 3 Workspace'],
            [
                'description' => 'Test workspace',
                'owner_id' => $this->user->id,
            ]
        );

        $this->board = KanbanBoard::firstOrCreate(
            ['title' => 'Phase 3 Board'],
            [
                'workspace_id' => $this->workspace->id,
                'created_by' => $this->user->id,
                'department' => 'Operations',
                'visibility' => 'private',
            ]
        );

        $this->column = KanbanColumn::firstOrCreate(
            ['board_id' => $this->board->id, 'title' => 'In Progress'],
            ['color' => '#579BFC', 'position' => 0]
        );

        $this->group = BoardGroup::firstOrCreate(
            ['board_id' => $this->board->id, 'title' => 'Active Group'],
            ['color' => '#579BFC', 'position' => 0]
        );
    }

    /** 1. Date-only task compatibility: date preserved without shifting or time enforcement */
    public function test_date_only_task_creation_and_compatibility(): void
    {
        $this->actingAs($this->user);

        $response = $this->post('/kanban/tasks', [
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Date Only Task',
            'due_date' => '2026-11-20',
        ]);

        $response->assertSessionHasNoErrors();
        $task = KanbanTask::where('title', 'Date Only Task')->first();
        $this->assertNotNull($task);
        $this->assertEquals('2026-11-20', $task->due_date);
        $this->assertNull($task->due_time);
        $this->assertNull($task->start_date);
        $this->assertNull($task->start_time);
    }

    /** 2. Date-and-time task creation and editing */
    public function test_date_and_time_task_creation_and_editing(): void
    {
        $this->actingAs($this->user);

        $response = $this->post('/kanban/tasks', [
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Timed Task',
            'start_date' => '2026-11-15',
            'start_time' => '09:00',
            'due_date' => '2026-11-15',
            'due_time' => '17:00',
            'is_milestone' => true,
            'reminder_lead_minutes' => 30,
        ]);

        $response->assertSessionHasNoErrors();
        $task = KanbanTask::where('title', 'Timed Task')->first();
        $this->assertNotNull($task);
        $this->assertEquals('2026-11-15', $task->start_date);
        $this->assertEquals('09:00', $task->start_time);
        $this->assertEquals('2026-11-15', $task->due_date);
        $this->assertEquals('17:00', $task->due_time);
        $this->assertTrue($task->is_milestone);
        $this->assertEquals(30, $task->reminder_lead_minutes);

        // Edit via PATCH /kanban/tasks/{task}
        $updateRes = $this->patch("/kanban/tasks/{$task->id}", [
            'due_time' => '18:30',
            'is_milestone' => false,
        ]);
        $updateRes->assertSessionHasNoErrors();
        $task->refresh();
        $this->assertEquals('18:30', $task->due_time);
        $this->assertFalse($task->is_milestone);
    }

    /** 3. Date ordering validation: due date/time cannot precede start date/time */
    public function test_due_date_cannot_precede_start_date(): void
    {
        $this->actingAs($this->user);

        $response = $this->post('/kanban/tasks', [
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Invalid Timing Task',
            'start_date' => '2026-11-20',
            'start_time' => '14:00',
            'due_date' => '2026-11-20',
            'due_time' => '12:00', // Precedes start time!
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('kanban_tasks', ['title' => 'Invalid Timing Task']);
    }

    /** 4. Timezone conversion and calculation */
    public function test_timezone_conversion_resolves_correct_utc_timestamp(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Timezone Test Task',
            'due_date' => '2026-11-15',
            'due_time' => '17:00',
            'assigned_to' => $this->user->id, // User is in America/New_York (UTC-5)
            'created_by' => $this->user->id,
        ]);

        $dueUtc = $task->getDueDateTimeUtc('America/New_York');
        $this->assertNotNull($dueUtc);
        // 17:00 in America/New_York (UTC-5 in November) is 22:00 UTC
        $this->assertEquals('2026-11-15 22:00:00', $dueUtc->format('Y-m-d H:i:s'));
    }

    /** 5. Overdue and deadline status calculations */
    public function test_overdue_and_deadline_status_calculations(): void
    {
        // Past task
        $pastTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Past Task',
            'due_date' => '2020-01-01',
            'due_time' => '10:00',
            'created_by' => $this->user->id,
        ]);
        $this->assertEquals('overdue', $pastTask->deadline_status);

        // Completed task past due date
        $pastTask->update([
            'progress' => 100,
            'completed_at' => '2020-01-02 12:00:00',
        ]);
        $this->assertEquals('completed_late', $pastTask->deadline_status);

        // Completed task on time
        $pastTask->update([
            'completed_at' => '2019-12-31 12:00:00',
        ]);
        $this->assertEquals('completed_on_time', $pastTask->deadline_status);

        // Future task
        $futureTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Future Task',
            'due_date' => '2030-01-01',
            'created_by' => $this->user->id,
        ]);
        $this->assertEquals('upcoming', $futureTask->deadline_status);
    }

    /** 6. Deadline reminders and idempotent dispatch */
    public function test_deadline_reminders_and_idempotent_dispatch(): void
    {
        $userTz = $this->user->timezone ?? 'UTC';
        $dueInUserTz = now($userTz)->addMinutes(10);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Urgent Reminder Task',
            'due_date' => $dueInUserTz->format('Y-m-d'),
            'due_time' => $dueInUserTz->format('H:i'),
            'reminder_lead_minutes' => 15, // Alert 15 mins before (now is within lead window)
            'assigned_to' => $this->user->id,
            'created_by' => $this->user->id,
        ]);

        $engine = app(AutomationEngineService::class);

        // Run 1: Should dispatch notification
        $dispatched = $engine->processTaskReminders();
        $this->assertGreaterThanOrEqual(1, $dispatched);

        $notification = SystemNotification::where('user_id', $this->user->id)
            ->where('type', 'task_reminder')
            ->where('link', 'like', "%item={$task->id}%")
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString('Deadline Reminder', $notification->title);

        $task->refresh();
        $this->assertNotNull($task->reminder_sent_at);

        // Run 2: Repeated execution should NOT create duplicate notification (Idempotency)
        $dispatchedSecond = $engine->processTaskReminders();
        $notificationCount = SystemNotification::where('user_id', $this->user->id)
            ->where('type', 'task_reminder')
            ->where('link', 'like', "%item={$task->id}%")
            ->count();

        $this->assertEquals(1, $notificationCount);
    }

    /** 7. Subitem deadlines with optional times */
    public function test_subitem_deadline_with_optional_time(): void
    {
        $this->actingAs($this->user);

        $parentTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Parent Task With Subitems',
            'created_by' => $this->user->id,
        ]);

        $response = $this->post("/kanban/tasks/{$parentTask->id}/subitems", [
            'title' => 'Timed Subitem',
            'due_date' => '2026-11-18',
            'due_time' => '14:30',
        ]);

        $response->assertSessionHasNoErrors();
        $sub = KanbanTask::where('parent_id', $parentTask->id)->where('title', 'Timed Subitem')->first();
        $this->assertNotNull($sub);
        $this->assertEquals('2026-11-18', $sub->due_date);
        $this->assertEquals('14:30', $sub->due_time);
    }

    /** 8. Polling endpoint /kanban/sync authentication and cursor increment */
    public function test_polling_sync_endpoint_with_cursor(): void
    {
        $this->actingAs($this->user);

        // Poll without cursor
        $res = $this->getJson("/kanban/sync?board_id={$this->board->id}");
        $res->assertStatus(200);
        $res->assertJsonStructure([
            'tasks',
            'unread_notifications_count',
            'recent_notifications',
            'cursor',
        ]);

        $cursor = $res->json('cursor');
        $this->assertNotNull($cursor);

        // Poll with cursor: no recent changes
        $res2 = $this->getJson("/kanban/sync?board_id={$this->board->id}&since=" . urlencode($cursor));
        $res2->assertStatus(200);
        $this->assertCount(0, $res2->json('tasks'));
    }

    /** 9. User preference timezone update endpoint */
    public function test_user_preference_timezone_update(): void
    {
        $this->actingAs($this->user);

        $res = $this->post('/user/preferences', [
            'timezone' => 'Asia/Tokyo',
        ]);

        $res->assertSessionHasNoErrors();
        $this->user->refresh();
        $this->assertEquals('Asia/Tokyo', $this->user->timezone);
    }

    /** 10. Authorization protection on schedule mutation */
    public function test_unauthorized_user_cannot_mutate_task_schedule(): void
    {
        $outsider = User::create([
            'name' => 'Outsider User',
            'email' => 'outsider_p3@angora.test',
            'password' => bcrypt('password'),
            'role' => 'client',
            'department' => 'External',
        ]);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Protected Schedule Task',
            'created_by' => $this->user->id,
        ]);

        $this->actingAs($outsider);
        $res = $this->patch("/kanban/tasks/{$task->id}/schedule", [
            'due_date' => '2026-12-31',
        ]);

        $res->assertStatus(403);
    }
}
