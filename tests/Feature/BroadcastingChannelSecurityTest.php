<?php

namespace Tests\Feature;

use App\Models\AgencyProject;
use App\Models\ClientContact;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\SalesCustomer;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Tests\TestCase;

class BroadcastingChannelSecurityTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $employee;
    private User $clientUser;
    private User $otherClientUser;
    private Workspace $workspace;
    private KanbanBoard $board;
    private KanbanTask $task;
    private SalesCustomer $customer;
    private AgencyProject $project;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->employee = User::factory()->create(['role' => 'employee']);

        $this->clientUser = User::factory()->create([
            'email' => 'client1@test.com',
        ]);
        $this->clientUser->syncRoles([]);

        $this->otherClientUser = User::factory()->create([
            'email' => 'client2@test.com',
        ]);
        $this->otherClientUser->syncRoles([]);

        $this->workspace = Workspace::create([
            'name' => 'Broadcast Test Workspace',
            'slug' => 'broadcast-test-workspace',
            'owner_id' => $this->admin->id,
            'status' => 'active',
        ]);
        $this->workspace->members()->create(['user_id' => $this->admin->id, 'role' => 'owner']);
        $this->workspace->members()->create(['user_id' => $this->employee->id, 'role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Broadcast Test Board',
            'created_by' => $this->admin->id,
        ]);

        $column = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Progress',
            'position' => 0,
        ]);

        $this->customer = SalesCustomer::create([
            'name' => 'Acme Corp',
            'email' => 'client1@test.com',
            'user_id' => $this->clientUser->id,
            'portal_access_enabled' => true,
        ]);

        $this->project = AgencyProject::create([
            'name' => 'Acme Campaign',
            'client_id' => $this->customer->id,
            'project_manager_id' => $this->admin->id,
            'client_visible' => true,
        ]);

        $this->task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $column->id,
            'title' => 'Client Visible Task',
            'created_by' => $this->admin->id,
            'client_id' => $this->customer->id,
            'is_client_visible' => true,
        ]);
    }

    public function test_user_can_authenticate_their_own_user_channel(): void
    {
        $response = $this->actingAs($this->employee)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-users.' . $this->employee->id,
            ]);

        $response->assertSuccessful();
    }

    public function test_user_cannot_authenticate_another_users_channel(): void
    {
        $response = $this->actingAs($this->employee)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-users.' . $this->admin->id,
            ]);

        $response->assertForbidden();
    }

    public function test_client_cannot_access_internal_board_channel(): void
    {
        $response = $this->actingAs($this->clientUser)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-boards.' . $this->board->id,
            ]);

        $response->assertForbidden();
    }

    public function test_client_cannot_access_internal_task_channel(): void
    {
        $response = $this->actingAs($this->clientUser)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-tasks.' . $this->task->id,
            ]);

        $response->assertForbidden();
    }

    public function test_authorized_client_can_access_their_project_channel(): void
    {
        $response = $this->actingAs($this->clientUser)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-client-projects.' . $this->project->id,
            ]);

        $response->assertSuccessful();
    }

    public function test_unauthorized_client_cannot_access_other_client_project_channel(): void
    {
        $response = $this->actingAs($this->otherClientUser)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-client-projects.' . $this->project->id,
            ]);

        $response->assertForbidden();
    }

    public function test_board_presence_channel_returns_user_info_for_member(): void
    {
        $response = $this->actingAs($this->employee)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'presence-boards.' . $this->board->id,
            ]);

        $response->assertSuccessful();
        $data = $response->json();
        $this->assertArrayHasKey('channel_data', $data);
        $channelData = json_decode($data['channel_data'], true);
        $this->assertEquals($this->employee->id, $channelData['user_info']['id']);
        $this->assertEquals($this->employee->name, $channelData['user_info']['name']);
    }

    public function test_staff_can_access_internal_task_channel(): void
    {
        $response = $this->actingAs($this->employee)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-tasks.' . $this->task->id,
            ]);

        $response->assertSuccessful();
    }

    public function test_authorized_client_can_access_client_task_channel(): void
    {
        $response = $this->actingAs($this->clientUser)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-client-tasks.' . $this->task->id,
            ]);

        $response->assertSuccessful();
    }

    public function test_client_cannot_access_client_task_channel_if_not_client_visible(): void
    {
        $this->task->update(['is_client_visible' => false]);

        $response = $this->actingAs($this->clientUser)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-client-tasks.' . $this->task->id,
            ]);

        $response->assertForbidden();
    }
}
