<?php

namespace Tests\Feature;

use App\Models\BoardGroup;
use App\Models\KanbanAttachment;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanCommentMention;
use App\Models\KanbanTask;
use App\Models\SystemNotification;
use App\Models\User;
use App\Models\Workspace;
use App\Services\HtmlSanitizerService;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class NotificationAndCollaborationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $projectManager;
    protected User $designer;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $column;
    protected BoardGroup $group;
    protected KanbanTask $task;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
            'name' => 'Alice Admin',
            'email' => 'admin@angora.test',
        ]);

        $this->projectManager = User::factory()->create([
            'role' => 'project_manager',
            'status' => 'active',
            'name' => 'Paula PM',
            'email' => 'pm@angora.test',
        ]);

        $this->designer = User::factory()->create([
            'role' => 'dept_user',
            'department' => 'Creative & Design',
            'status' => 'active',
            'name' => 'David Designer',
            'email' => 'designer@angora.test',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Design Workspace',
            'owner_id' => $this->superAdmin->id,
            'created_by' => $this->superAdmin->id,
        ]);
        $this->workspace->members()->create(['user_id' => $this->designer->id, 'role' => 'member']);
        $this->workspace->members()->create(['user_id' => $this->projectManager->id, 'role' => 'admin']);

        $this->board = KanbanBoard::create([
            'title' => 'Product Design Board',
            'workspace_id' => $this->workspace->id,
            'department' => 'Design',
            'visibility' => 'public',
            'created_by' => $this->superAdmin->id,
        ]);

        $this->column = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Progress',
            'position' => 0,
            'color' => '#0073ea',
            'stage_key' => 'in_progress',
            'semantic_category' => 'in_progress',
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Sprint 1',
            'position' => 0,
        ]);

        $this->task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Design Homepage Mockup',
            'created_by' => $this->superAdmin->id,
            'assigned_to' => $this->designer->id,
        ]);
    }

    public function test_get_kanban_boards_show_does_not_return_405_method_not_allowed(): void
    {
        // Issue P1: GET /kanban/boards/{board} previously returned 405 MethodNotAllowedHttpException
        $response = $this->actingAs($this->superAdmin)->get(route('kanban.boards.show', $this->board->id));

        $response->assertStatus(302);
        $response->assertRedirect('/kanban?board=' . $this->board->id);
    }

    public function test_get_kanban_boards_show_preserves_query_parameters(): void
    {
        $response = $this->actingAs($this->superAdmin)->get(
            route('kanban.boards.show', [
                'board' => $this->board->id,
                'item' => $this->task->id,
                'tab' => 'updates',
                'target_id' => 42,
            ])
        );

        $response->assertStatus(302);
        $response->assertRedirect('/kanban?board=' . $this->board->id . '&item=' . $this->task->id . '&tab=updates&target_id=42');
    }

    public function test_notification_service_generates_canonical_task_link(): void
    {
        $internalLink = NotificationService::generateTaskLink(
            $this->task,
            'updates',
            99,
            $this->projectManager
        );

        $this->assertStringContainsString('/kanban?', $internalLink);
        $this->assertStringContainsString('board=' . $this->board->id, $internalLink);
        $this->assertStringContainsString('item=' . $this->task->id, $internalLink);
        $this->assertStringContainsString('tab=updates', $internalLink);
        $this->assertStringContainsString('target_id=99', $internalLink);
    }

    public function test_html_sanitizer_removes_xss_scripts_and_event_handlers(): void
    {
        $sanitizer = app(HtmlSanitizerService::class);

        $maliciousHtml = '<p>Safe text</p><script>alert("xss")</script><img src="x" onerror="alert(1)" /><a href="javascript:alert(1)">Click</a>';
        $cleaned = $sanitizer->clean($maliciousHtml);

        $this->assertStringNotContainsString('<script>', $cleaned);
        $this->assertStringNotContainsString('onerror', $cleaned);
        $this->assertStringNotContainsString('javascript:', $cleaned);
        $this->assertStringContainsString('Safe text', $cleaned);
    }

    public function test_html_sanitizer_preserves_allowed_rich_text_formatting(): void
    {
        $sanitizer = app(HtmlSanitizerService::class);

        $richHtml = '<h2>Header</h2><p><strong>Bold</strong> and <em>italic</em> and <u>underline</u> and <s>strike</s></p>'
            . '<ul><li>Item 1</li></ul><blockquote>Quote</blockquote>'
            . '<span data-type="mention" data-id="5" data-label="Paula PM">@Paula PM</span>';

        $cleaned = $sanitizer->clean($richHtml);

        $this->assertStringContainsString('<h2>Header</h2>', $cleaned);
        $this->assertStringContainsString('<strong>Bold</strong>', $cleaned);
        $this->assertStringContainsString('<em>italic</em>', $cleaned);
        $this->assertStringContainsString('<u>underline</u>', $cleaned);
        $this->assertStringContainsString('<s>strike</s>', $cleaned);
        $this->assertStringContainsString('<ul><li>Item 1</li></ul>', $cleaned);
        $this->assertStringContainsString('<blockquote>Quote</blockquote>', $cleaned);
        $this->assertStringContainsString('data-type="mention"', $cleaned);
        $this->assertStringContainsString('data-id="5"', $cleaned);
    }

    public function test_html_sanitizer_extracts_mention_user_ids(): void
    {
        $sanitizer = app(HtmlSanitizerService::class);

        $html = '<p>Hello <span data-type="mention" data-id="10" data-label="User 10">@User 10</span> and <span data-type="mention" data-id="20">@User 20</span></p>';
        $ids = $sanitizer->extractMentionUserIds($html);

        $this->assertEquals([10, 20], $ids);
    }

    public function test_store_comment_with_mention_creates_mention_record_and_notification(): void
    {
        $commentHtml = '<p>Hey <span data-type="mention" data-id="' . $this->projectManager->id . '" data-label="Paula PM">@Paula PM</span> check this out!</p>';

        $response = $this->actingAs($this->designer)->post(route('kanban.tasks.comments.store', $this->task->id), [
            'message' => $commentHtml,
        ]);

        $response->assertStatus(302);

        $comment = KanbanComment::where('task_id', $this->task->id)->latest()->first();
        $this->assertNotNull($comment);
        $this->assertStringContainsString('check this out!', $comment->message);

        // Check KanbanCommentMention record
        $this->assertDatabaseHas('kanban_comment_mentions', [
            'comment_id' => $comment->id,
            'user_id' => $this->projectManager->id,
        ]);

        // Check SystemNotification created with deep link
        $notification = SystemNotification::where('user_id', $this->projectManager->id)
            ->where('category', 'mentions')
            ->latest()
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString('David Designer mentioned you', $notification->title);
        $this->assertStringContainsString('item=' . $this->task->id, $notification->link);
        $this->assertStringContainsString('tab=updates', $notification->link);
        $this->assertStringContainsString('target_id=' . $comment->id, $notification->link);
    }

    public function test_duplicate_mentions_in_same_comment_do_not_duplicate_records_or_notifications(): void
    {
        // Mention the same user twice in the same message
        $commentHtml = '<p>Hey <span data-type="mention" data-id="' . $this->projectManager->id . '">@Paula</span> and again <span data-type="mention" data-id="' . $this->projectManager->id . '">@Paula</span></p>';

        $response = $this->actingAs($this->designer)->post(route('kanban.tasks.comments.store', $this->task->id), [
            'message' => $commentHtml,
        ]);

        $response->assertStatus(302);

        $comment = KanbanComment::where('task_id', $this->task->id)->latest()->first();

        $mentionCount = KanbanCommentMention::where('comment_id', $comment->id)
            ->where('user_id', $this->projectManager->id)
            ->count();

        $this->assertEquals(1, $mentionCount);

        $notificationCount = SystemNotification::where('user_id', $this->projectManager->id)
            ->where('category', 'mentions')
            ->count();

        $this->assertEquals(1, $notificationCount);
    }

    public function test_self_mention_does_not_create_notification(): void
    {
        // Designer mentions themselves
        $commentHtml = '<p>Self note <span data-type="mention" data-id="' . $this->designer->id . '">@David</span></p>';

        $response = $this->actingAs($this->designer)->post(route('kanban.tasks.comments.store', $this->task->id), [
            'message' => $commentHtml,
        ]);

        $response->assertStatus(302);

        $notificationCount = SystemNotification::where('user_id', $this->designer->id)
            ->where('category', 'mentions')
            ->count();

        $this->assertEquals(0, $notificationCount);
    }

    public function test_comment_image_upload_endpoint_accepts_valid_image(): void
    {
        $file = UploadedFile::fake()->create('mockup.png', 50, 'image/png');

        $response = $this->actingAs($this->designer)->post(
            route('kanban.tasks.comments.upload-image', $this->task->id),
            ['image' => $file]
        );

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'url',
            'attachment_id',
            'file_name',
        ]);

        $attachmentId = $response->json('attachment_id');
        $this->assertDatabaseHas('kanban_attachments', [
            'id' => $attachmentId,
            'task_id' => $this->task->id,
            'file_name' => 'mockup.png',
        ]);
    }

    public function test_comment_image_upload_endpoint_rejects_non_image(): void
    {
        $file = UploadedFile::fake()->create('malicious.php', 10, 'text/x-php');

        $response = $this->actingAs($this->designer)->post(
            route('kanban.tasks.comments.upload-image', $this->task->id),
            ['image' => $file],
            ['Accept' => 'application/json']
        );

        $response->assertStatus(422);
    }

    public function test_preview_attachment_endpoint_streams_file(): void
    {
        $file = UploadedFile::fake()->create('photo.jpg', 40, 'image/jpeg');
        $path = $file->store('kanban-attachments', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $this->task->id,
            'file_name' => 'photo.jpg',
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => 'image/jpeg',
            'user_id' => $this->designer->id,
        ]);

        $response = $this->actingAs($this->designer)->get(
            route('kanban.attachments.preview', $attachment->id)
        );

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'image/jpeg');
    }
}
