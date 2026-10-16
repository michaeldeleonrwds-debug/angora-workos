<?php

namespace Tests\Feature;

use App\Jobs\OptimizeImageJob;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanAttachment;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ImageOptimizationService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageOptimizationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private KanbanBoard $board;
    private KanbanColumn $column;
    private KanbanTask $task;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        Storage::fake('public');
        config(['broadcasting.default' => 'null']);

        $this->admin = User::factory()->create(['role' => 'admin']);

        $workspace = Workspace::create([
            'name' => 'Optimization Test Workspace',
            'slug' => 'optimization-test-workspace',
            'owner_id' => $this->admin->id,
            'status' => 'active',
        ]);
        $workspace->members()->create(['user_id' => $this->admin->id, 'role' => 'owner']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $workspace->id,
            'title' => 'Optimization Test Board',
            'created_by' => $this->admin->id,
        ]);

        $this->column = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Progress',
            'position' => 0,
        ]);

        $this->task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->column->id,
            'title' => 'Optimize Assets Task',
            'created_by' => $this->admin->id,
        ]);
    }

    private function createPngFile(string $filename = 'test.png'): UploadedFile
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        return UploadedFile::fake()->createWithContent($filename, $png);
    }

    public function test_service_extracts_dimensions_and_records_variants(): void
    {
        $file = $this->createPngFile('hero.png');
        $path = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->admin->id,
            'file_name' => 'hero.png',
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => 'image/png',
            'disk' => 'public',
            'processing_status' => 'pending',
        ]);

        $service = new ImageOptimizationService();
        $result = $service->optimize($attachment);

        $attachment->refresh();
        $this->assertEquals('ready', $attachment->processing_status);
        $this->assertNotEmpty($attachment->optimized_variants);
        $this->assertArrayHasKey('original', $attachment->optimized_variants);
        $this->assertEquals($path, $attachment->optimized_variants['original']);

        $this->assertIsArray($attachment->dimensions);
        $this->assertEquals(1, $attachment->dimensions['width'] ?? null);
        $this->assertEquals(1, $attachment->dimensions['height'] ?? null);
    }

    public function test_service_handles_non_image_files_safely(): void
    {
        $file = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');
        $path = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->admin->id,
            'file_name' => 'document.pdf',
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => 'application/pdf',
            'disk' => 'public',
            'processing_status' => 'pending',
        ]);

        $service = new ImageOptimizationService();
        $result = $service->optimize($attachment);

        $this->assertEquals('ready', $result['status']);
    }

    public function test_job_optimizes_attachment(): void
    {
        $file = $this->createPngFile('asset.png');
        $path = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->admin->id,
            'file_name' => 'asset.png',
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => 'image/png',
            'disk' => 'public',
            'processing_status' => 'pending',
        ]);

        $job = new OptimizeImageJob($attachment);
        $job->handle(new ImageOptimizationService());

        $attachment->refresh();
        $this->assertEquals('ready', $attachment->processing_status);
        $this->assertNotNull($attachment->optimized_variants);
    }

    public function test_controller_dispatches_optimization_job_on_comment_image_upload(): void
    {
        Queue::fake();

        $file = $this->createPngFile('inline.png');

        $this->actingAs($this->admin)->post("/kanban/tasks/{$this->task->id}/comments/upload-image", [
            'image' => $file,
        ]);

        Queue::assertPushed(OptimizeImageJob::class, function ($job) {
            return $job->attachment->file_name === 'inline.png';
        });
    }
}
