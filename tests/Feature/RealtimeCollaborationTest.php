<?php

namespace Tests\Feature;

use App\Events\BoardColumnUpdatedEvent;
use App\Events\CommentAddedEvent;
use App\Events\CommentDeletedEvent;
use App\Events\CommentReactionEvent;
use App\Events\NotificationCreatedEvent;
use App\Events\TaskCreatedEvent;
use App\Events\TaskDeletedEvent;
use App\Events\TaskUpdatedEvent;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\SalesCustomer;
use App\Models\SystemNotification;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class RealtimeCollaborationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $employee;
    private User $clientUser;
    private Workspace $workspace;
    private KanbanBoard $board;
    private KanbanColumn $column;
    private KanbanTask $task;
    private SalesCustomer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->employee = User::factory()->create(['role' => 'employee']);
        $this->clientUser = User::factory()->create(['email' => 'client@acme.com']);
        $this->clientUser->syncRoles([]);

        $this->workspace = Workspace::create([
            'name' => 'Collab Test Workspace',
            'slug' => 'collab-test-workspace',
            'owner_id' => $this->admin->id,
            'status' => 'active',
        ]);
        $this->workspace->members()->create(['user_id' => $this->admin->id, 'role' => 'owner']);
        $this->workspace->members()->create(['user_id' => $this->employee->id, 'role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Collab Test Board',
            'created_by' => $this->admin->id,
        ]);

        $this->column = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Progress',
            'position' => 0,
        ]);

        $this->customer = SalesCustomer::create([
            'name' => 'Acme Corp',
            'email' => 'client@acme.com',
            'user_id' => $this->clientUser->id,
            'portal_access_enabled' => true,
        ]);

        $this->task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'title' => 'Build Collaboration Engine',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->employee->id,
            'client_id' => $this->customer->id,
            'is_client_visible' => true,
        ]);
    }

    public function test_task_created_event_broadcasts_on_board_channel(): void
    {
        $event = new TaskCreatedEvent($this->task, $this->admin->id);

        $channels = array_map(fn ($c) => $c->name, $event->broadcastOn());
        $this->assertContains('private-boards.' . $this->board->id, $channels);
        $this->assertEquals('task.created', $event->broadcastAs());

        $payload = $event->broadcastWith();
        $this->assertEquals($this->task->id, $payload['task_id']);
        $this->assertEquals($this->board->id, $payload['board_id']);
        $this->assertEquals('Build Collaboration Engine', $payload['title']);
    }

    public function test_task_updated_event_broadcasts_on_board_and_task_channels(): void
    {
        $event = new TaskUpdatedEvent($this->task, 'status_changed', $this->employee->id);

        $channels = array_map(fn ($c) => $c->name, $event->broadcastOn());
        $this->assertContains('private-boards.' . $this->board->id, $channels);
        $this->assertContains('private-tasks.' . $this->task->id, $channels);
        $this->assertEquals('task.updated', $event->broadcastAs());

        $payload = $event->broadcastWith();
        $this->assertEquals($this->task->id, $payload['task_id']);
        $this->assertEquals('status_changed', $payload['action']);
    }

    public function test_task_deleted_event_broadcasts_on_board_and_task_channels(): void
    {
        $event = new TaskDeletedEvent($this->board->id, $this->task->id, null, $this->admin->id);

        $channels = array_map(fn ($c) => $c->name, $event->broadcastOn());
        $this->assertContains('private-boards.' . $this->board->id, $channels);
        $this->assertContains('private-tasks.' . $this->task->id, $channels);
        $this->assertEquals('task.deleted', $event->broadcastAs());

        $payload = $event->broadcastWith();
        $this->assertEquals($this->task->id, $payload['task_id']);
        $this->assertEquals($this->board->id, $payload['board_id']);
    }

    public function test_comment_added_event_broadcasts_with_message_and_author_info(): void
    {
        $comment = KanbanComment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->employee->id,
            'message' => '<p>Updated the implementation with Reverb WebSockets.</p>',
            'is_client_visible' => true,
        ]);

        $event = new CommentAddedEvent($comment);

        $channels = array_map(fn ($c) => $c->name, $event->broadcastOn());
        $this->assertContains('private-tasks.' . $this->task->id, $channels);
        $this->assertContains('private-client-tasks.' . $this->task->id, $channels);
        $this->assertEquals('comment.added', $event->broadcastAs());

        $payload = $event->broadcastWith();
        $this->assertEquals($comment->id, $payload['id']);
        $this->assertEquals($this->employee->name, $payload['user_name']);
        $this->assertStringContainsString('Reverb WebSockets', $payload['message']);
    }

    public function test_internal_comment_does_not_broadcast_to_client_channel(): void
    {
        $internalComment = KanbanComment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->employee->id,
            'message' => '<p>Internal note: do not share with client yet.</p>',
            'is_client_visible' => false,
        ]);

        $event = new CommentAddedEvent($internalComment);

        $channels = array_map(fn ($c) => $c->name, $event->broadcastOn());
        $this->assertContains('private-tasks.' . $this->task->id, $channels);
        $this->assertNotContains('private-client-tasks.' . $this->task->id, $channels);
    }

    public function test_comment_reaction_event_broadcasts_updated_reactions(): void
    {
        $event = new CommentReactionEvent($this->task->id, 999, ['👍' => [$this->employee->id]], $this->employee->id);

        $channels = array_map(fn ($c) => $c->name, $event->broadcastOn());
        $this->assertContains('private-tasks.' . $this->task->id, $channels);
        $this->assertEquals('comment.reaction', $event->broadcastAs());

        $payload = $event->broadcastWith();
        $this->assertArrayHasKey('👍', $payload['reactions']);
    }

    public function test_notification_created_event_broadcasts_on_user_channel(): void
    {
        $notification = SystemNotification::create([
            'user_id' => $this->employee->id,
            'actor_id' => $this->admin->id,
            'title' => 'New Task Assigned',
            'message' => 'You were assigned to Build Collaboration Engine',
            'type' => 'info',
            'category' => 'assignments',
        ]);

        $event = new NotificationCreatedEvent($notification);

        $channels = array_map(fn ($c) => $c->name, $event->broadcastOn());
        $this->assertContains('private-users.' . $this->employee->id, $channels);
        $this->assertEquals('notification.created', $event->broadcastAs());

        $payload = $event->broadcastWith();
        $this->assertEquals($notification->id, $payload['id']);
        $this->assertEquals('New Task Assigned', $payload['title']);
    }

    public function test_controller_dispatches_task_created_event_on_store(): void
    {
        Event::fake([TaskCreatedEvent::class]);

        $this->actingAs($this->admin)->post('/kanban/tasks', [
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'title' => 'Dispatch Verification Task',
            'priority' => 'High',
        ]);

        Event::assertDispatched(TaskCreatedEvent::class, function ($event) {
            return $event->task->title === 'Dispatch Verification Task'
                && (int) $event->task->board_id === (int) $this->board->id;
        });
    }

    public function test_controller_dispatches_comment_added_event_on_store(): void
    {
        Event::fake([CommentAddedEvent::class]);

        $this->actingAs($this->employee)->post("/kanban/tasks/{$this->task->id}/comments", [
            'message' => '<p>Real-time collaboration check</p>',
        ]);

        Event::assertDispatched(CommentAddedEvent::class, function ($event) {
            return (int) $event->comment->task_id === (int) $this->task->id;
        });
    }

    public function test_controller_dispatches_comment_reaction_event_on_toggle(): void
    {
        Event::fake([CommentReactionEvent::class]);

        $comment = KanbanComment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->admin->id,
            'message' => '<p>Hello world</p>',
        ]);

        $this->actingAs($this->employee)->post("/kanban/comments/{$comment->id}/reactions", [
            'emoji' => '🚀',
        ]);

        Event::assertDispatched(CommentReactionEvent::class, function ($event) use ($comment) {
            return (int) $event->commentId === (int) $comment->id
                && isset($event->reactions['🚀']);
        });
    }
}
