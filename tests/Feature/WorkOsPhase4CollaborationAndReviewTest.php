<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\NotificationPreference;
use App\Models\SystemNotification;
use App\Models\TaskActivity;
use App\Models\TaskReviewCycle;
use App\Models\TaskReviewDecision;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsPhase4CollaborationAndReviewTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $projectManager;
    protected User $designer;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $colTodo;
    protected KanbanColumn $colInProgress;
    protected KanbanColumn $colReview;
    protected KanbanColumn $colDone;
    protected KanbanColumn $colRevision;
    protected BoardGroup $group;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
            'name' => 'Alice Admin',
        ]);

        $this->projectManager = User::factory()->create([
            'role' => 'project_manager',
            'status' => 'active',
            'name' => 'Paula PM',
        ]);

        $this->designer = User::factory()->create([
            'role' => 'dept_user',
            'department' => 'Creative & Design',
            'status' => 'active',
            'name' => 'David Designer',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Main Workspace',
            'owner_id' => $this->superAdmin->id,
        ]);
        $this->workspace->users()->attach([$this->projectManager->id, $this->designer->id]);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Design Production',
            'created_by' => $this->superAdmin->id,
        ]);

        $this->colTodo = KanbanColumn::create(['board_id' => $this->board->id, 'title' => 'Not Started', 'position' => 0]);
        $this->colInProgress = KanbanColumn::create(['board_id' => $this->board->id, 'title' => 'Working on it', 'position' => 1]);
        $this->colReview = KanbanColumn::create(['board_id' => $this->board->id, 'title' => 'Review', 'position' => 2]);
        $this->colRevision = KanbanColumn::create(['board_id' => $this->board->id, 'title' => 'Needs Revision', 'position' => 3]);
        $this->colDone = KanbanColumn::create(['board_id' => $this->board->id, 'title' => 'Done', 'position' => 4]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Sprint 1',
            'position' => 0,
        ]);
    }

    public function test_notification_listing_and_filtering()
    {
        SystemNotification::create([
            'user_id' => $this->designer->id,
            'title' => 'Assignment 1',
            'message' => 'Task assigned to you',
            'type' => 'info',
            'category' => 'assignments',
            'is_read' => false,
        ]);

        SystemNotification::create([
            'user_id' => $this->designer->id,
            'title' => 'Mention 1',
            'message' => 'Someone mentioned you',
            'type' => 'info',
            'category' => 'mentions',
            'is_read' => true,
        ]);

        // Filter unread
        $response = $this->actingAs($this->designer)->getJson(route('notifications.index', ['tab' => 'unread']));
        $response->assertOk();
        $this->assertCount(1, $response->json('notifications.data'));
        $this->assertEquals(1, $response->json('unread_count'));

        // Filter by category
        $catResponse = $this->actingAs($this->designer)->getJson(route('notifications.index', ['category' => 'mentions']));
        $catResponse->assertOk();
        $this->assertCount(1, $catResponse->json('notifications.data'));
        $this->assertEquals('Mention 1', $catResponse->json('notifications.data.0.title'));
    }

    public function test_mark_notification_as_read_and_mark_all_read()
    {
        $notif1 = SystemNotification::create([
            'user_id' => $this->designer->id,
            'title' => 'Alert 1',
            'message' => 'Hello',
            'is_read' => false,
        ]);

        $notif2 = SystemNotification::create([
            'user_id' => $this->designer->id,
            'title' => 'Alert 2',
            'message' => 'World',
            'is_read' => false,
        ]);

        // Mark single as read
        $this->actingAs($this->designer)->patchJson(route('notifications.read', $notif1))->assertOk();
        $this->assertTrue($notif1->fresh()->is_read);
        $this->assertFalse($notif2->fresh()->is_read);

        // Mark all as read
        $this->actingAs($this->designer)->postJson(route('notifications.mark-all-read'))->assertOk();
        $this->assertTrue($notif2->fresh()->is_read);
    }

    public function test_notification_preferences_get_and_update()
    {
        $getRes = $this->actingAs($this->designer)->getJson(route('notifications.preferences'));
        $getRes->assertOk();
        $this->assertNotEmpty($getRes->json('preferences'));

        // Update preferences
        $updateRes = $this->actingAs($this->designer)->putJson(route('notifications.preferences.update'), [
            'preferences' => [
                ['category' => 'mentions', 'in_app_enabled' => true, 'email_enabled' => false],
                ['category' => 'assignments', 'in_app_enabled' => false, 'email_enabled' => true],
            ],
        ]);
        $updateRes->assertOk();

        $pref = NotificationPreference::where('user_id', $this->designer->id)->where('category', 'assignments')->first();
        $this->assertNotNull($pref);
        $this->assertFalse($pref->in_app_enabled);
    }

    public function test_task_assignment_dispatches_notification()
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Logo Redesign',
            'created_by' => $this->superAdmin->id,
        ]);

        // Assign task to designer
        $this->actingAs($this->superAdmin)->patch(route('kanban.tasks.update', $task), [
            'assigned_to' => $this->designer->id,
        ]);

        $notif = SystemNotification::where('user_id', $this->designer->id)->where('category', 'assignments')->first();
        $this->assertNotNull($notif);
        $this->assertStringContainsString('Logo Redesign', $notif->title);
    }

    public function test_comment_mentions_dispatch_notification()
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Social Banner',
            'created_by' => $this->superAdmin->id,
        ]);

        // Comment mentioning designer by name: @David Designer
        $this->actingAs($this->superAdmin)->post(route('kanban.tasks.comments.store', $task), [
            'message' => 'Hey @David Designer please check the vector export!',
        ]);

        $mentionNotif = SystemNotification::where('user_id', $this->designer->id)->where('category', 'mentions')->first();
        $this->assertNotNull($mentionNotif);
        $this->assertStringContainsString('Alice Admin mentioned you', $mentionNotif->title);
    }

    public function test_task_review_submission_lifecycle()
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colInProgress->id,
            'group_id' => $this->group->id,
            'title' => 'Branding Assets Pack',
            'assigned_to' => $this->designer->id,
            'created_by' => $this->superAdmin->id,
        ]);

        // Designer submits for review
        $res = $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.submit', $task), [
            'notes' => 'Completed all SVG and PNG exports, ready for review.',
        ]);

        $res->assertOk();
        $this->assertEquals(1, $res->json('cycle.round_number'));
        $this->assertEquals('pending', $res->json('cycle.state'));

        // Verify task column moved to Review column automatically
        $this->assertEquals($this->colReview->id, $task->fresh()->column_id);

        // Verify TaskActivity recorded
        $activity = TaskActivity::where('task_id', $task->id)->where('event_type', 'review_submitted')->first();
        $this->assertNotNull($activity);
        $this->assertStringContainsString('Round 1', $activity->description);

        // Submitting again while pending is rejected
        $dupRes = $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.submit', $task), [
            'notes' => 'Attempting duplicate submit',
        ]);
        $dupRes->assertStatus(422);
    }

    public function test_self_review_prevention_for_designer()
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colReview->id,
            'group_id' => $this->group->id,
            'title' => 'Icon Set',
            'assigned_to' => $this->designer->id,
            'created_by' => $this->superAdmin->id,
        ]);

        TaskReviewCycle::create([
            'task_id' => $task->id,
            'round_number' => 1,
            'submitted_by' => $this->designer->id,
            'state' => 'pending',
            'submitted_at' => now(),
        ]);

        // Designer attempts to approve their own work
        $res = $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'approved',
            'feedback' => 'Self approved',
        ]);

        // Must be rejected with 403 Forbidden
        $res->assertStatus(403);
    }

    public function test_project_manager_can_request_revision_and_trigger_round_two()
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colReview->id,
            'group_id' => $this->group->id,
            'title' => 'Pitch Deck',
            'assigned_to' => $this->designer->id,
            'created_by' => $this->superAdmin->id,
        ]);

        $cycle1 = TaskReviewCycle::create([
            'task_id' => $task->id,
            'round_number' => 1,
            'submitted_by' => $this->designer->id,
            'state' => 'pending',
            'submitted_at' => now(),
        ]);

        // PM requests revision
        $decideRes = $this->actingAs($this->projectManager)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'revision_requested',
            'feedback' => 'Adjust the slide 4 contrast and typography hierarchy.',
        ]);

        $decideRes->assertOk();
        $this->assertEquals('revision_requested', $cycle1->fresh()->state);
        // Task automatically moved to Needs Revision column
        $this->assertEquals($this->colRevision->id, $task->fresh()->column_id);

        // Verify revision notification sent to designer
        $notif = SystemNotification::where('user_id', $this->designer->id)->where('category', 'reviews')->first();
        $this->assertNotNull($notif);
        $this->assertStringContainsString('Revision Requested', $notif->title);

        // Designer submits Round 2
        $round2Res = $this->actingAs($this->designer)->postJson(route('kanban.tasks.review.submit', $task), [
            'notes' => 'Updated contrast and font sizing per feedback.',
        ]);

        $round2Res->assertOk();
        $this->assertEquals(2, $round2Res->json('cycle.round_number'));

        // PM approves Round 2
        $approveRes = $this->actingAs($this->projectManager)->postJson(route('kanban.tasks.review.decide', $task), [
            'decision' => 'approved',
            'feedback' => 'Looks flawless, approved for delivery!',
        ]);

        $approveRes->assertOk();
        // Task moved to Done column
        $this->assertEquals($this->colDone->id, $task->fresh()->column_id);
        $this->assertEquals(100, $task->fresh()->progress);
    }

    public function test_kanban_group_and_status_sync()
    {
        // Setup matching group for Done
        $doneGroup = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Done',
            'position' => 2,
        ]);

        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'group_id' => $this->group->id,
            'title' => 'Sync Test Task',
            'created_by' => $this->superAdmin->id,
        ]);

        // Move to Done column
        $this->actingAs($this->superAdmin)->patch(route('kanban.tasks.update-column', $task), [
            'column_id' => $this->colDone->id,
        ]);

        // Task group_id should automatically sync to the matching 'Done' group
        $this->assertEquals($doneGroup->id, $task->fresh()->group_id);
    }
}
