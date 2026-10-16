<?php

namespace Tests\Feature;

use App\Models\KanbanAttachment;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StorageMigrateCommandTest extends TestCase
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
        Storage::fake('s3');

        $this->admin = User::factory()->create(['role' => 'admin']);

        $workspace = Workspace::create([
            'name' => 'Storage Command Test Workspace',
            'slug' => 'storage-cmd-workspace',
            'owner_id' => $this->admin->id,
            'status' => 'active',
        ]);
        $workspace->members()->create(['user_id' => $this->admin->id, 'role' => 'owner']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $workspace->id,
            'title' => 'Storage Command Test Board',
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
            'title' => 'Migration Test Task',
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_dry_run_reports_eligible_attachments_without_mutating_disk(): void
    {
        $file = UploadedFile::fake()->create('mock-design.pdf', 250);
        $path = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->admin->id,
            'file_name' => 'mock-design.pdf',
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => 'application/pdf',
            'disk' => 'public',
        ]);

        $this->artisan('storage:migrate-to-s3 --dry-run')
            ->expectsOutputToContain('DRY RUN')
            ->expectsOutputToContain('Would migrate: #' . $attachment->id)
            ->assertSuccessful();

        $attachment->refresh();
        $this->assertEquals('public', $attachment->disk);
        Storage::disk('s3')->assertMissing($path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_migration_copies_file_and_updates_database_disk(): void
    {
        $file = UploadedFile::fake()->create('brand_guidelines.pdf', 350);
        $path = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->admin->id,
            'file_name' => 'brand_guidelines.pdf',
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => 'application/pdf',
            'disk' => 'public',
        ]);

        $this->artisan('storage:migrate-to-s3')
            ->expectsOutputToContain('Migrated #' . $attachment->id)
            ->assertSuccessful();

        $attachment->refresh();
        $this->assertEquals('s3', $attachment->disk);

        // Verify target file exists on S3
        Storage::disk('s3')->assertExists($path);

        // Verify local file is preserved as backup!
        Storage::disk('public')->assertExists($path);
    }

    public function test_migration_is_idempotent(): void
    {
        $file = UploadedFile::fake()->create('already_on_s3.png', 100);
        $path = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->admin->id,
            'file_name' => 'already_on_s3.png',
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => 'image/png',
            'disk' => 's3',
        ]);

        $this->artisan('storage:migrate-to-s3')
            ->expectsOutputToContain('All attachments are already stored on S3')
            ->assertSuccessful();
    }

    public function test_system_setting_encryption_and_decryption(): void
    {
        SystemSetting::set(
            key: 'storage.s3.secret_key',
            value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            group: 'storage',
            isEncrypted: true,
            userId: $this->admin->id,
            description: 'S3 Secret Access Key'
        );

        $record = SystemSetting::where('key', 'storage.s3.secret_key')->first();
        $this->assertNotNull($record);
        $this->assertTrue($record->is_encrypted);
        // Raw database column is encrypted
        $this->assertStringNotContainsString('wJalrXUtnFEMI', $record->value);

        // Decrypted via static get()
        $decrypted = SystemSetting::get('storage.s3.secret_key');
        $this->assertEquals('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', $decrypted);
    }
}
