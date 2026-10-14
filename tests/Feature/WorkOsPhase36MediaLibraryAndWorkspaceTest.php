<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\MediaAsset;
use App\Models\MediaUsage;
use App\Models\TaskActivity;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorkOsPhase36MediaLibraryAndWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $memberUser;
    protected User $otherUser;
    protected Workspace $workspaceA;
    protected Workspace $workspaceB;
    protected KanbanBoard $boardA;
    protected BoardGroup $group;
    protected KanbanColumn $column;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'department' => 'Executive',
        ]);

        $this->memberUser = User::factory()->create([
            'role' => 'dept_user',
            'department' => 'Design',
        ]);

        $this->otherUser = User::factory()->create([
            'role' => 'dept_user',
            'department' => 'Marketing',
        ]);

        $this->workspaceA = Workspace::create([
            'name' => 'Design Workspace',
            'owner_id' => $this->memberUser->id,
            'is_favorite' => false,
            'is_archived' => false,
        ]);

        WorkspaceMember::create([
            'workspace_id' => $this->workspaceA->id,
            'user_id' => $this->memberUser->id,
            'role' => 'admin',
        ]);

        $this->workspaceB = Workspace::create([
            'name' => 'Marketing Workspace',
            'owner_id' => $this->otherUser->id,
            'is_favorite' => false,
            'is_archived' => false,
        ]);

        WorkspaceMember::create([
            'workspace_id' => $this->workspaceB->id,
            'user_id' => $this->otherUser->id,
            'role' => 'admin',
        ]);

        $this->boardA = KanbanBoard::create([
            'workspace_id' => $this->workspaceA->id,
            'title' => 'Design Sprint Board',
            'department' => 'Design',
            'visibility' => 'public',
            'is_favorite' => false,
            'is_template' => false,
            'created_by' => $this->memberUser->id,
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->boardA->id,
            'title' => 'Sprint 1',
            'color' => '#579BFC',
            'position' => 0,
        ]);

        $this->column = KanbanColumn::create([
            'board_id' => $this->boardA->id,
            'title' => 'In Progress',
            'color' => '#FDAB3D',
            'position' => 0,
        ]);
    }

    /**
     * 1. Workspace switching tests
     */
    public function test_workspace_switcher_scopes_access_for_regular_users(): void
    {
        // Member user should only have workspaceA in shared Inertia props
        $response = $this->actingAs($this->memberUser)
            ->get('/kanban?workspace=' . $this->workspaceA->id);

        $response->assertStatus(200);
        $workspaces = $response->viewData('page')['props']['userWorkspaces'];
        $workspaceIds = collect($workspaces)->pluck('id')->all();

        $this->assertContains($this->workspaceA->id, $workspaceIds);
        $this->assertNotContains($this->workspaceB->id, $workspaceIds);
    }

    public function test_super_admin_can_access_all_workspaces_in_switcher(): void
    {
        $response = $this->actingAs($this->superAdmin)->get('/kanban');

        $response->assertStatus(200);
        $workspaces = $response->viewData('page')['props']['userWorkspaces'];
        $workspaceIds = collect($workspaces)->pluck('id')->all();

        $this->assertContains($this->workspaceA->id, $workspaceIds);
        $this->assertContains($this->workspaceB->id, $workspaceIds);
    }

    public function test_switching_workspace_persists_in_session(): void
    {
        $this->actingAs($this->memberUser)
            ->get('/kanban?workspace=' . $this->workspaceA->id)
            ->assertSessionHas('active_workspace_id', $this->workspaceA->id);

        // Next visit without query param preserves the session workspace
        $response = $this->actingAs($this->memberUser)->get('/kanban');
        $response->assertStatus(200);
        $activeWorkspaceId = $response->viewData('page')['props']['activeWorkspaceId'];
        $this->assertEquals($this->workspaceA->id, $activeWorkspaceId);
    }

    protected function createFakePng(string $name = 'test.png', int $sizeKb = 1): UploadedFile
    {
        $png1x1 = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        if ($sizeKb > 1) {
            $png1x1 .= str_repeat('0', ($sizeKb - 1) * 1024);
        }
        return UploadedFile::fake()->createWithContent($name, $png1x1, 'image/png');
    }

    /**
     * 2. Media Library Upload and Validation Tests
     */
    public function test_media_upload_validates_mime_types(): void
    {
        $fakePdf = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');

        $response = $this->actingAs($this->memberUser)->postJson('/media/upload', [
            'file' => $fakePdf,
            'workspace_id' => $this->workspaceA->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_media_upload_validates_max_file_size(): void
    {
        // 11MB file exceeds 10MB limit
        $largeImage = $this->createFakePng('large.png', 11 * 1024);

        $response = $this->actingAs($this->memberUser)->postJson('/media/upload', [
            'file' => $largeImage,
            'workspace_id' => $this->workspaceA->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_media_upload_stores_file_and_creates_asset_record(): void
    {
        $image = $this->createFakePng('brand-logo.png', 10);

        $response = $this->actingAs($this->memberUser)->postJson('/media/upload', [
            'file' => $image,
            'workspace_id' => $this->workspaceA->id,
            'title' => 'Brand Logo Header',
            'alt_text' => 'Official Angora Logo',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('asset.title', 'Brand Logo Header');
        $response->assertJsonPath('asset.alt_text', 'Official Angora Logo');

        $asset = MediaAsset::first();
        $this->assertNotNull($asset);
        $this->assertEquals('Brand Logo Header', $asset->title);
        $this->assertEquals($this->memberUser->id, $asset->user_id);
        $this->assertEquals($this->workspaceA->id, $asset->workspace_id);

        Storage::disk('public')->assertExists($asset->file_path);
    }

    /**
     * 3. Task Attachment and Safe Detach Tests
     */
    public function test_media_can_be_attached_to_task_and_logs_activity(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->boardA->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Website Header Design',
            'priority' => 'High',
            'progress' => 0,
            'created_by' => $this->memberUser->id,
            'position' => 0,
        ]);

        $image = $this->createFakePng('hero-banner.png');

        $response = $this->actingAs($this->memberUser)->postJson('/media/upload', [
            'file' => $image,
            'workspace_id' => $this->workspaceA->id,
            'attachable_type' => 'task',
            'attachable_id' => $task->id,
            'field_name' => 'hero_image',
        ]);

        $response->assertStatus(201);

        $asset = MediaAsset::first();
        $this->assertDatabaseHas('media_usages', [
            'media_asset_id' => $asset->id,
            'attachable_type' => KanbanTask::class,
            'attachable_id' => $task->id,
            'field_name' => 'hero_image',
        ]);

        // Verify activity logged
        $activity = TaskActivity::where('task_id', $task->id)
            ->where('event_type', 'image_attached')
            ->first();

        $this->assertNotNull($activity);
        $this->assertStringContainsString('Attached image', $activity->description);
    }

    public function test_detaching_media_removes_usage_without_deleting_physical_asset(): void
    {
        $task = KanbanTask::create([
            'board_id' => $this->boardA->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Social Media Post Asset',
            'priority' => 'Medium',
            'progress' => 0,
            'created_by' => $this->memberUser->id,
            'position' => 0,
        ]);

        $image = $this->createFakePng('post-preview.png');

        $uploadRes = $this->actingAs($this->memberUser)->postJson('/media/upload', [
            'file' => $image,
            'workspace_id' => $this->workspaceA->id,
            'attachable_type' => 'task',
            'attachable_id' => $task->id,
            'field_name' => 'preview',
        ]);

        $assetId = $uploadRes->json('asset.id');
        $asset = MediaAsset::findOrFail($assetId);

        // Detach media
        $detachRes = $this->actingAs($this->memberUser)->postJson('/media/detach', [
            'media_asset_id' => $assetId,
            'attachable_type' => 'task',
            'attachable_id' => $task->id,
            'field_name' => 'preview',
        ]);

        $detachRes->assertStatus(200);

        // Media usage should be gone
        $this->assertDatabaseMissing('media_usages', [
            'media_asset_id' => $assetId,
            'attachable_id' => $task->id,
        ]);

        // Physical asset and database record MUST remain intact
        $this->assertDatabaseHas('media_assets', ['id' => $assetId]);
        Storage::disk('public')->assertExists($asset->file_path);

        // Verify detachment activity logged
        $activity = TaskActivity::where('task_id', $task->id)
            ->where('event_type', 'image_detached')
            ->first();

        $this->assertNotNull($activity);
        $this->assertStringContainsString('Removed image', $activity->description);
    }

    /**
     * 4. Multi-Task Reuse & Safe Deletion Prevention
     */
    public function test_single_media_asset_can_be_reused_across_multiple_tasks(): void
    {
        $task1 = KanbanTask::create([
            'board_id' => $this->boardA->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Campaign Task 1',
            'priority' => 'Low',
            'progress' => 0,
            'created_by' => $this->memberUser->id,
            'position' => 0,
        ]);

        $task2 = KanbanTask::create([
            'board_id' => $this->boardA->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Campaign Task 2',
            'priority' => 'Low',
            'progress' => 0,
            'created_by' => $this->memberUser->id,
            'position' => 1,
        ]);

        $image = $this->createFakePng('shared-palette.png');

        $uploadRes = $this->actingAs($this->memberUser)->postJson('/media/upload', [
            'file' => $image,
            'workspace_id' => $this->workspaceA->id,
            'attachable_type' => 'task',
            'attachable_id' => $task1->id,
        ]);

        $assetId = $uploadRes->json('asset.id');

        // Attach existing asset to Task 2
        $attachRes = $this->actingAs($this->memberUser)->postJson('/media/attach', [
            'media_asset_id' => $assetId,
            'attachable_type' => 'task',
            'attachable_id' => $task2->id,
            'field_name' => 'moodboard',
        ]);

        $attachRes->assertStatus(200);

        $this->assertEquals(2, MediaUsage::where('media_asset_id', $assetId)->count());

        // Attempting to delete the asset while referenced must return 409 Conflict
        $deleteRes = $this->actingAs($this->memberUser)->deleteJson('/media/' . $assetId);
        $deleteRes->assertStatus(409);
        $this->assertDatabaseHas('media_assets', ['id' => $assetId]);

        // Detach from Task 1; Task 2 still references it
        $this->actingAs($this->memberUser)->postJson('/media/detach', [
            'media_asset_id' => $assetId,
            'attachable_type' => 'task',
            'attachable_id' => $task1->id,
            'field_name' => 'default',
        ]);

        // Still cannot delete because Task 2 has reference
        $deleteRes2 = $this->actingAs($this->memberUser)->deleteJson('/media/' . $assetId);
        $deleteRes2->assertStatus(409);

        // Detach from Task 2; now references count is 0
        $this->actingAs($this->memberUser)->postJson('/media/detach', [
            'media_asset_id' => $assetId,
            'attachable_type' => 'task',
            'attachable_id' => $task2->id,
            'field_name' => 'moodboard',
        ]);

        // Now safe delete succeeds
        $deleteRes3 = $this->actingAs($this->memberUser)->deleteJson('/media/' . $assetId);
        $deleteRes3->assertStatus(200);
        $this->assertDatabaseMissing('media_assets', ['id' => $assetId]);
    }

    /**
     * 5. Image Column Creation and Table Rendering
     */
    public function test_can_create_image_board_column(): void
    {
        $response = $this->actingAs($this->memberUser)->post('/kanban/boards/' . $this->boardA->id . '/columns', [
            'title' => 'Thumbnail',
            'type' => 'image',
            'scope' => 'task',
            'width' => 130,
        ]);

        $response->assertSessionHas('success', 'Column added');

        $this->assertDatabaseHas('board_columns', [
            'board_id' => $this->boardA->id,
            'title' => 'Thumbnail',
            'type' => 'image',
            'width' => 130,
        ]);
    }

    public function test_task_custom_values_can_store_image_reference(): void
    {
        $col = BoardColumn::create([
            'board_id' => $this->boardA->id,
            'key' => 'col_photo_123',
            'title' => 'Product Photo',
            'type' => 'image',
            'scope' => 'task',
            'width' => 130,
            'position' => 0,
        ]);

        $task = KanbanTask::create([
            'board_id' => $this->boardA->id,
            'column_id' => $this->column->id,
            'group_id' => $this->group->id,
            'title' => 'Product Card Redesign',
            'priority' => 'High',
            'progress' => 0,
            'created_by' => $this->memberUser->id,
            'position' => 0,
        ]);

        $this->actingAs($this->memberUser)->patch('/kanban/tasks/' . $task->id, [
            'custom_values' => [
                'col_photo_123' => [
                    'media_asset_id' => 42,
                    'url' => '/storage/media/test.png',
                    'filename' => 'product.png',
                ],
            ],
        ])->assertSessionHasNoErrors();

        $task->refresh();
        $this->assertEquals(42, $task->custom_values['col_photo_123']['media_asset_id']);
        $this->assertEquals('/storage/media/test.png', $task->custom_values['col_photo_123']['url']);
    }
}
