<?php

namespace Tests\Feature;

use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanAttachment;
use App\Models\KanbanTask;
use App\Models\SalesCustomer;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TiptapImageUploadCsrfTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $employee;
    private User $clientUser;
    private User $otherClientUser;
    private Workspace $workspace;
    private KanbanBoard $board;
    private KanbanColumn $column;
    private KanbanTask $task;
    private KanbanTask $clientTask;
    private SalesCustomer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        Storage::fake('public');

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->employee = User::factory()->create(['role' => 'employee']);
        $this->clientUser = User::factory()->create(['email' => 'client@acme.com']);
        $this->clientUser->syncRoles([]);
        $this->otherClientUser = User::factory()->create(['email' => 'other@corp.com']);
        $this->otherClientUser->syncRoles([]);

        $this->workspace = Workspace::create([
            'name' => 'Upload Test Workspace',
            'slug' => 'upload-test-workspace',
            'owner_id' => $this->admin->id,
            'status' => 'active',
        ]);
        $this->workspace->members()->create(['user_id' => $this->admin->id, 'role' => 'owner']);
        $this->workspace->members()->create(['user_id' => $this->employee->id, 'role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Upload Test Board',
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
            'title' => 'Staff Only Task',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->employee->id,
            'is_client_visible' => false,
        ]);

        $this->clientTask = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'title' => 'Client Visible Task',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->employee->id,
            'client_id' => $this->customer->id,
            'is_client_visible' => true,
        ]);
    }

    private function createFakeImage(string $filename = 'diagram.png'): UploadedFile
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        return UploadedFile::fake()->createWithContent($filename, $png);
    }

    public function test_authenticated_user_with_valid_csrf_token_can_upload_comment_image(): void
    {
        $file = $this->createFakeImage('diagram.png');

        $response = $this->actingAs($this->employee)
            ->withSession(['_token' => 'test-csrf-token'])
            ->withHeaders([
                'X-CSRF-TOKEN' => 'test-csrf-token',
                'X-Requested-With' => 'XMLHttpRequest',
                'Accept' => 'application/json',
            ])
            ->post("/kanban/tasks/{$this->task->id}/comments/upload-image", [
                'image' => $file,
                '_token' => 'test-csrf-token',
            ]);

        $response->assertSuccessful();
        $response->assertJsonStructure([
            'success',
            'attachment_id',
            'url',
            'file_name',
        ]);
        $this->assertTrue($response->json('success'));

        $attachmentId = $response->json('attachment_id');
        $attachment = KanbanAttachment::find($attachmentId);
        $this->assertNotNull($attachment);
        $this->assertEquals('diagram.png', $attachment->file_name);
        $this->assertEquals($this->employee->id, $attachment->user_id);
        Storage::disk($attachment->getStorageDisk())->assertExists($attachment->file_path);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $file = $this->createFakeImage('diagram.png');

        $response = $this->postJson("/kanban/tasks/{$this->task->id}/comments/upload-image", [
            'image' => $file,
        ]);

        $response->assertUnauthorized();
    }

    public function test_client_cannot_upload_image_to_internal_only_task(): void
    {
        $file = $this->createFakeImage('unauthorized.png');

        $response = $this->actingAs($this->clientUser)
            ->postJson("/kanban/tasks/{$this->task->id}/comments/upload-image", [
                'image' => $file,
            ]);

        $response->assertForbidden();
    }

    public function test_authorized_client_can_upload_image_to_client_visible_task(): void
    {
        $file = $this->createFakeImage('feedback.png');

        $response = $this->actingAs($this->clientUser)
            ->postJson("/kanban/tasks/{$this->clientTask->id}/comments/upload-image", [
                'image' => $file,
            ]);

        $response->assertSuccessful();
        $this->assertTrue($response->json('success'));

        $attachment = KanbanAttachment::find($response->json('attachment_id'));
        $this->assertNotNull($attachment);
        $this->assertTrue($attachment->is_client_visible);
    }

    public function test_client_cannot_preview_internal_only_attachment(): void
    {
        $file = $this->createFakeImage('internal_architecture.png');
        $path = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->employee->id,
            'file_name' => 'internal_architecture.png',
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => 'image/png',
            'is_client_visible' => false,
            'disk' => 'public',
        ]);

        $response = $this->actingAs($this->clientUser)
            ->get(route('kanban.attachments.preview', $attachment));

        $response->assertForbidden();
    }

    public function test_authorized_user_can_preview_and_download_attachment(): void
    {
        $file = $this->createFakeImage('spec.png');
        $path = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->employee->id,
            'file_name' => 'spec.png',
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => 'image/png',
            'is_client_visible' => false,
            'disk' => 'public',
        ]);

        $previewResponse = $this->actingAs($this->employee)
            ->get(route('kanban.attachments.preview', $attachment));
        $previewResponse->assertSuccessful();

        $downloadResponse = $this->actingAs($this->employee)
            ->get(route('kanban.attachments.download', $attachment));
        $downloadResponse->assertSuccessful();
    }
}
