<?php

namespace Tests\Feature;

use App\Models\BoardGroup;
use App\Models\KanbanAttachment;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorkOsAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $userA;
    protected User $userB;
    protected Workspace $workspaceA;
    protected KanbanBoard $boardA;
    protected KanbanTask $taskA;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin = User::where('role', 'super_admin')->first();

        // Create User A
        $this->userA = User::factory()->create([
            'name' => 'User Alpha',
            'email' => 'user_a@angora.internal',
            'role' => 'developer',
            'department' => 'Engineering',
        ]);

        // Create User B
        $this->userB = User::factory()->create([
            'name' => 'User Beta',
            'email' => 'user_b@angora.internal',
            'role' => 'developer',
            'department' => 'Engineering',
        ]);

        // Workspace owned by User A
        $this->workspaceA = Workspace::create([
            'name' => 'Alpha Private Space',
            'owner_id' => $this->userA->id,
        ]);
        WorkspaceMember::create([
            'workspace_id' => $this->workspaceA->id,
            'user_id' => $this->userA->id,
            'role' => 'owner',
        ]);

        // Board owned by User A inside Workspace A
        $this->boardA = KanbanBoard::create([
            'workspace_id' => $this->workspaceA->id,
            'title' => 'Alpha Board',
            'department' => 'Engineering',
            'created_by' => $this->userA->id,
        ]);

        $column = KanbanColumn::create([
            'board_id' => $this->boardA->id,
            'title' => 'Working on it',
            'color' => '#fdab3d',
            'position' => 0,
        ]);

        $group = BoardGroup::create([
            'board_id' => $this->boardA->id,
            'title' => 'Q1 Goals',
            'color' => '#579BFC',
            'position' => 0,
        ]);

        $this->taskA = KanbanTask::create([
            'board_id' => $this->boardA->id,
            'column_id' => $column->id,
            'group_id' => $group->id,
            'title' => 'Confidential Alpha Item',
            'created_by' => $this->userA->id,
            'assigned_to' => $this->userA->id,
        ]);
    }

    public function test_workspace_isolation_unauthorized_user_cannot_access_or_mutate_other_workspace(): void
    {
        // User B tries to update User A's workspace
        $response = $this->actingAs($this->userB)->patch(route('workspaces.update', $this->workspaceA), [
            'name' => 'Hacked Name',
        ]);
        $response->assertForbidden();

        // User B tries to delete User A's workspace
        $deleteResponse = $this->actingAs($this->userB)->delete(route('workspaces.destroy', $this->workspaceA));
        $deleteResponse->assertForbidden();

        // User B should not see Workspace A in the index
        $indexResponse = $this->actingAs($this->userB)->get(route('kanban.index', ['workspace' => $this->workspaceA->id]));
        $indexResponse->assertOk();
        $workspaces = $indexResponse->inertiaProps('workspaces');
        $workspaceIds = collect($workspaces)->pluck('id')->all();
        $this->assertNotContains($this->workspaceA->id, $workspaceIds);
    }

    public function test_board_authorization_unauthorized_user_cannot_modify_or_delete_board(): void
    {
        // User B tries to update User A's board
        $response = $this->actingAs($this->userB)->patch(route('kanban.boards.update', $this->boardA), [
            'title' => 'Malicious Board Title',
        ]);
        $response->assertForbidden();

        // User B tries to delete User A's board
        $deleteResponse = $this->actingAs($this->userB)->delete(route('kanban.boards.delete', $this->boardA));
        $deleteResponse->assertForbidden();

        // User B tries to duplicate User A's board
        $dupResponse = $this->actingAs($this->userB)->post(route('kanban.boards.duplicate', $this->boardA));
        $dupResponse->assertForbidden();
    }

    public function test_task_idor_prevention_unauthorized_user_cannot_modify_or_delete_task(): void
    {
        // User B tries to update User A's task
        $response = $this->actingAs($this->userB)->patch(route('kanban.tasks.update', $this->taskA), [
            'title' => 'Tampered Title',
        ]);
        $response->assertForbidden();

        // User B tries to delete User A's task
        $deleteResponse = $this->actingAs($this->userB)->delete(route('kanban.tasks.delete', $this->taskA));
        $deleteResponse->assertForbidden();

        // User B tries to post a comment to User A's task
        $commentResponse = $this->actingAs($this->userB)->post(route('kanban.tasks.comments.store', $this->taskA), [
            'message' => 'Spam comment',
        ]);
        $commentResponse->assertForbidden();
    }

    public function test_attachment_download_protection_rejects_unauthorized_users(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->create('contract.pdf', 500, 'application/pdf');
        $path = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $this->taskA->id,
            'user_id' => $this->userA->id,
            'file_name' => 'contract.pdf',
            'file_path' => $path,
            'file_size_bytes' => 500,
            'mime_type' => 'application/pdf',
        ]);

        // User B tries to download attachment
        $downloadResponse = $this->actingAs($this->userB)->get(route('kanban.attachments.download', $attachment));
        $downloadResponse->assertForbidden();

        // User A (authorized) can download
        $authResponse = $this->actingAs($this->userA)->get(route('kanban.attachments.download', $attachment));
        $authResponse->assertOk();

        // Super Admin can download
        $adminResponse = $this->actingAs($this->superAdmin)->get(route('kanban.attachments.download', $attachment));
        $adminResponse->assertOk();
    }

    public function test_super_admin_bypasses_all_resource_authorization_checks(): void
    {
        // Super admin can update Workspace A
        $this->actingAs($this->superAdmin)->patch(route('workspaces.update', $this->workspaceA), [
            'name' => 'Admin Updated Workspace',
        ])->assertSessionHas('success');
        $this->assertEquals('Admin Updated Workspace', $this->workspaceA->fresh()->name);

        // Super admin can update Board A
        $this->actingAs($this->superAdmin)->patch(route('kanban.boards.update', $this->boardA), [
            'title' => 'Admin Updated Board',
        ])->assertSessionHas('success');
        $this->assertEquals('Admin Updated Board', $this->boardA->fresh()->title);

        // Super admin can update Task A
        $this->actingAs($this->superAdmin)->patch(route('kanban.tasks.update', $this->taskA), [
            'title' => 'Admin Updated Task',
        ])->assertSessionHas('success');
        $this->assertEquals('Admin Updated Task', $this->taskA->fresh()->title);
    }

    public function test_private_board_supports_explicitly_invited_members(): void
    {
        // Private board created in Workspace A
        $privateBoard = KanbanBoard::create([
            'workspace_id' => $this->workspaceA->id,
            'title' => 'Executive Confidential',
            'visibility' => 'private',
            'created_by' => $this->userA->id,
            'settings' => [
                'invited_user_ids' => [$this->userB->id],
            ],
        ]);

        // User B joins Workspace A as a regular member
        WorkspaceMember::create([
            'workspace_id' => $this->workspaceA->id,
            'user_id' => $this->userB->id,
            'role' => 'member',
        ]);

        // User B is explicitly invited via settings.invited_user_ids -> can view
        $this->assertTrue($this->userB->can('view', $privateBoard));

        // Create User C who is in workspace but NOT invited to private board
        $userC = User::factory()->create(['role' => 'developer']);
        WorkspaceMember::create([
            'workspace_id' => $this->workspaceA->id,
            'user_id' => $userC->id,
            'role' => 'member',
        ]);

        // User C cannot view the private board
        $this->assertFalse($userC->can('view', $privateBoard));
    }

    public function test_guest_freelancer_scoped_permissions(): void
    {
        $guest = User::factory()->create([
            'name' => 'Freelancer Dev',
            'role' => 'guest',
        ]);

        // Add guest to workspace as viewer
        WorkspaceMember::create([
            'workspace_id' => $this->workspaceA->id,
            'user_id' => $guest->id,
            'role' => 'viewer',
        ]);

        // Guest cannot create workspace or boards
        $this->assertFalse($guest->can('create', Workspace::class));
        $this->assertFalse($guest->can('create', [KanbanBoard::class, $this->workspaceA]));

        // Guest cannot update unassigned task
        $this->assertFalse($guest->can('update', $this->taskA));

        // Assign task to guest -> guest can now update their assigned task
        $this->taskA->update(['assigned_to' => $guest->id]);
        $this->assertTrue($guest->fresh()->can('update', $this->taskA));
    }

    public function test_client_account_isolated_from_unauthorized_internal_resources(): void
    {
        $client = User::factory()->create([
            'name' => 'Acme Client User',
            'role' => 'client',
        ]);

        // Client cannot create workspaces
        $this->assertFalse($client->can('create', Workspace::class));

        // Client cannot view Workspace A where they are not a member
        $this->assertFalse($client->can('view', $this->workspaceA));

        // Client cannot view or mutate Board A or Task A
        $this->assertFalse($client->can('view', $this->boardA));
        $this->assertFalse($client->can('update', $this->taskA));
        $this->assertFalse($client->can('delete', $this->taskA));
    }
}
