<?php

namespace Tests\Feature;

use App\Events\BoardColumnUpdatedEvent;
use App\Events\CommentAddedEvent;
use App\Events\CommentDeletedEvent;
use App\Events\CommentReactionEvent;
use App\Events\DeliverableStatusChangedEvent;
use App\Events\NotificationCreatedEvent;
use App\Events\TaskCreatedEvent;
use App\Events\TaskDeletedEvent;
use App\Events\TaskUpdatedEvent;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\SalesCustomer;
use App\Models\User;
use App\Models\Workspace;
use App\Support\SafeBroadcast;
use Database\Seeders\RbacSeeder;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class KanbanDragAndDropReliabilityTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $employee;
    private User $clientUser;
    private Workspace $workspace;
    private KanbanBoard $board;
    private KanbanColumn $sourceColumn;
    private KanbanColumn $targetColumn;
    private KanbanTask $task;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->employee = User::factory()->create(['role' => 'employee']);

        $this->clientUser = User::factory()->create(['email' => 'client@angora.test']);
        $this->clientUser->syncRoles([]);

        $this->workspace = Workspace::create([
            'name' => 'Reliability Test Workspace',
            'slug' => 'reliability-test-workspace',
            'owner_id' => $this->admin->id,
            'status' => 'active',
        ]);
        $this->workspace->members()->create(['user_id' => $this->admin->id, 'role' => 'owner']);
        $this->workspace->members()->create(['user_id' => $this->employee->id, 'role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Reliability Test Board',
            'created_by' => $this->admin->id,
        ]);

        $this->sourceColumn = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Progress',
            'position' => 0,
            'semantic_category' => 'in_progress',
        ]);

        $this->targetColumn = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'For Review',
            'position' => 1,
            'semantic_category' => 'in_review',
        ]);

        $this->task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->sourceColumn->id,
            'title' => 'Test Move Task',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->employee->id,
        ]);
    }

    public function test_task_move_persists_even_when_reverb_is_offline_without_500(): void
    {
        // Configure Reverb driver with offline host:port
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.options.host' => '127.0.0.1',
            'broadcasting.connections.reverb.options.port' => 9999, // Nothing listening
            'queue.default' => 'sync', // Execute synchronously to test resilience against immediate transport failure
        ]);

        $response = $this->actingAs($this->employee)
            ->withHeader('X-Angora-Optimistic', 'true')
            ->patchJson("/kanban/tasks/{$this->task->id}/column", [
                'column_id' => $this->targetColumn->id,
                'optimistic' => true,
            ]);

        // Must succeed with 200, NEVER return HTTP 500 BroadcastException
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'Task updated',
        ]);

        // Database mutation MUST be persisted
        $this->task->refresh();
        $this->assertEquals($this->targetColumn->id, $this->task->column_id);
    }

    public function test_events_implement_should_broadcast_and_after_commit(): void
    {
        $events = [
            new TaskCreatedEvent($this->task, $this->admin->id),
            new TaskUpdatedEvent($this->task, 'status_changed', $this->employee->id),
            new TaskDeletedEvent($this->board->id, $this->task->id, null, $this->admin->id),
            new BoardColumnUpdatedEvent($this->board->id, 'updated', $this->sourceColumn->id),
            new CommentDeletedEvent($this->task->id, 1, null, $this->admin->id),
            new CommentReactionEvent($this->task->id, 1, ['👍' => [1]], $this->admin->id),
            new NotificationCreatedEvent(new \App\Models\SystemNotification(['user_id' => 1])),
        ];

        foreach ($events as $event) {
            $this->assertInstanceOf(
                ShouldBroadcast::class,
                $event,
                get_class($event) . ' must implement ShouldBroadcast'
            );
            $this->assertTrue(
                property_exists($event, 'afterCommit') && $event->afterCommit === true,
                get_class($event) . ' must have afterCommit = true'
            );
        }
    }

    public function test_invalid_task_move_is_rejected_and_not_committed(): void
    {
        // Other board column
        $otherBoard = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Other Board',
            'created_by' => $this->admin->id,
        ]);
        $otherColumn = KanbanColumn::create([
            'board_id' => $otherBoard->id,
            'title' => 'Foreign Stage',
            'position' => 0,
        ]);

        $response = $this->actingAs($this->employee)
            ->patchJson("/kanban/tasks/{$this->task->id}/column", [
                'column_id' => $otherColumn->id,
            ]);

        // Must reject cross-board movement
        $response->assertStatus(403);

        // Position in database remains unchanged
        $this->task->refresh();
        $this->assertEquals($this->sourceColumn->id, $this->task->column_id);
    }

    public function test_client_authorization_remains_enforced_on_task_column_mutation(): void
    {
        // Client tries to move internal task
        $response = $this->actingAs($this->clientUser)
            ->patchJson("/kanban/tasks/{$this->task->id}/column", [
                'column_id' => $this->targetColumn->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_realtime_event_payloads_do_not_leak_internal_fields(): void
    {
        $event = new TaskUpdatedEvent($this->task, 'status_changed', $this->employee->id);
        $payload = $event->broadcastWith();

        $this->assertArrayHasKey('task_id', $payload);
        $this->assertArrayHasKey('board_id', $payload);
        $this->assertArrayHasKey('column_id', $payload);
        $this->assertArrayHasKey('title', $payload);
        $this->assertArrayHasKey('updated_by', $payload);
        $this->assertEquals($this->employee->id, $payload['updated_by']);

        // Must not expose sensitive credentials or full unneeded relationship graphs
        $this->assertArrayNotHasKey('secret', $payload);
        $this->assertArrayNotHasKey('api_token', $payload);
        $this->assertArrayNotHasKey('password', $payload);
    }

    public function test_safe_broadcast_swallows_transport_exceptions_gracefully(): void
    {
        $throwingEvent = new class implements ShouldBroadcast {
            public function broadcastOn(): array
            {
                throw new \RuntimeException('Simulated socket write failure');
            }
        };

        // Must not throw an unhandled exception
        SafeBroadcast::dispatch($throwingEvent);
        $this->assertTrue(true);
    }

    public function test_all_realtime_broadcast_events_route_to_realtime_queue(): void
    {
        $comment = new \App\Models\KanbanComment(['task_id' => $this->task->id, 'user_id' => $this->admin->id]);
        $deliverable = new \App\Models\ProjectDeliverable([
            'project_id' => 1,
            'title' => 'Deliverable 1',
            'status' => 'draft',
            'submitted_by' => $this->admin->id,
        ]);
        $notification = new \App\Models\SystemNotification(['user_id' => $this->admin->id]);

        $events = [
            new TaskCreatedEvent($this->task, $this->admin->id),
            new TaskUpdatedEvent($this->task, 'status_changed', $this->employee->id),
            new TaskDeletedEvent($this->board->id, $this->task->id, null, $this->admin->id),
            new BoardColumnUpdatedEvent($this->board->id, 'updated', $this->sourceColumn->id),
            new CommentAddedEvent($comment),
            new CommentDeletedEvent($this->task->id, 1, null, $this->admin->id),
            new CommentReactionEvent($this->task->id, 1, ['👍' => [1]], $this->admin->id),
            new DeliverableStatusChangedEvent($deliverable, 'internal'),
            new NotificationCreatedEvent($notification),
        ];

        foreach ($events as $event) {
            $this->assertEquals(
                'realtime',
                $event->broadcastQueue(),
                get_class($event) . '::broadcastQueue() must return "realtime"'
            );
            $this->assertEquals(
                'realtime',
                $event->queue,
                get_class($event) . '->$queue must be set to "realtime"'
            );
        }
    }

    public function test_task_updated_event_safely_serializes_string_and_carbon_due_dates(): void
    {
        // 1. Test with string due_date (raw database string)
        $this->task->due_date = '2026-10-31';
        $this->task->completed_at = '2026-10-17 12:00:00';
        $this->task->position = 3;
        $this->task->load('column');

        $eventWithString = new TaskUpdatedEvent($this->task, 'status_changed', $this->employee->id);
        $payload1 = $eventWithString->broadcastWith();

        $this->assertEquals('2026-10-31', $payload1['due_date']);
        $this->assertEquals(\Illuminate\Support\Carbon::parse('2026-10-17 12:00:00')->toIso8601String(), $payload1['completed_at']);
        $this->assertEquals(3, $payload1['position']);
        $this->assertEquals($this->sourceColumn->id, $payload1['column_id']);
        $this->assertEquals('In Progress', $payload1['status']);

        // 2. Test with Carbon instance due_date
        $this->task->due_date = \Illuminate\Support\Carbon::create(2026, 11, 15);
        $this->task->completed_at = \Illuminate\Support\Carbon::create(2026, 11, 14, 8, 30, 0);

        $eventWithCarbon = new TaskUpdatedEvent($this->task, 'status_changed', $this->employee->id);
        $payload2 = $eventWithCarbon->broadcastWith();

        $this->assertEquals('2026-11-15', $payload2['due_date']);
        $this->assertEquals(\Illuminate\Support\Carbon::create(2026, 11, 14, 8, 30, 0)->toIso8601String(), $payload2['completed_at']);

        // 3. Test with null due_date
        $this->task->due_date = null;
        $this->task->completed_at = null;

        $eventWithNull = new TaskUpdatedEvent($this->task, 'status_changed', $this->employee->id);
        $payload3 = $eventWithNull->broadcastWith();

        $this->assertNull($payload3['due_date']);
        $this->assertNull($payload3['completed_at']);
    }

    public function test_kanban_sync_fallback_endpoint_returns_board_and_tasks(): void
    {
        $response = $this->actingAs($this->employee)
            ->getJson("/kanban/sync?board_id={$this->board->id}");

        $response->assertSuccessful();
        $response->assertJsonStructure([
            'tasks',
            'board_columns',
            'status_columns',
            'cursor',
        ]);
        $this->assertIsArray($response->json('tasks'));
    }
}

