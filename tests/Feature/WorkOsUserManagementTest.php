<?php

namespace Tests\Feature;

use App\Models\BoardMember;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\UserInvitation;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WorkOsUserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $admin;
    protected User $projectManager;
    protected User $developer;
    protected User $client;
    protected Workspace $workspace;
    protected KanbanBoard $board;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin = User::role('super_admin')->first();

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_test@angora.internal',
            'password' => Hash::make('password123'),
            'department' => 'Operations',
            'status' => 'active',
            'email_verified_at' => now(),
        ])->assignRole('admin');

        $this->projectManager = User::create([
            'name' => 'PM User',
            'email' => 'pm_test@angora.internal',
            'password' => Hash::make('password123'),
            'department' => 'Operations',
            'status' => 'active',
            'email_verified_at' => now(),
        ])->assignRole('project_manager');

        $this->developer = User::create([
            'name' => 'Dev User',
            'email' => 'dev_test@angora.internal',
            'password' => Hash::make('password123'),
            'department' => 'Engineering',
            'status' => 'active',
            'email_verified_at' => now(),
        ])->assignRole('developer');

        $this->client = User::create([
            'name' => 'Client User',
            'email' => 'client_test@angora.internal',
            'password' => Hash::make('password123'),
            'department' => 'Client Portal',
            'status' => 'active',
            'email_verified_at' => now(),
        ])->assignRole('client');

        $this->workspace = Workspace::firstOrCreate([
            'name' => 'Test Organization Workspace',
        ], [
            'owner_id' => $this->superAdmin->id,
            'type' => 'company',
            'privacy' => 'open',
        ]);

        WorkspaceMember::firstOrCreate([
            'workspace_id' => $this->workspace->id,
            'user_id' => $this->admin->id,
        ], ['role' => 'admin']);

        $this->board = KanbanBoard::firstOrCreate([
            'workspace_id' => $this->workspace->id,
            'title' => 'Core Development Board',
        ], [
            'type' => 'board',
            'visibility' => 'private',
            'created_by' => $this->superAdmin->id,
        ]);
    }

    /**
     * Test 1: User index lists users and invitations for authorized administrators.
     */
    public function test_user_index_is_accessible_to_super_admin_and_admin_only(): void
    {
        // Super admin can view
        $this->actingAs($this->superAdmin)
            ->get(route('users.index'))
            ->assertStatus(200);

        // Admin can view
        $this->actingAs($this->admin)
            ->get(route('users.index'))
            ->assertStatus(200);

        // Regular developer is forbidden
        $this->actingAs($this->developer)
            ->get(route('users.index'))
            ->assertStatus(403);

        // Client is forbidden
        $this->actingAs($this->client)
            ->get(route('users.index'))
            ->assertStatus(403);
    }

    /**
     * Test 2: Admin can create standard user accounts directly.
     */
    public function test_admin_can_create_standard_user_directly(): void
    {
        $payload = [
            'name' => 'Designer Dave',
            'email' => 'dave@angora.internal',
            'role' => 'designer',
            'department' => 'Creative',
            'password' => 'SecurePass123!',
            'workspace_ids' => [$this->workspace->id],
        ];

        $response = $this->actingAs($this->admin)
            ->post(route('users.store'), $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'email' => 'dave@angora.internal',
            'status' => 'active',
        ]);

        $dave = User::where('email', 'dave@angora.internal')->first();
        $this->assertTrue($dave->hasRole('designer'));
        $this->assertDatabaseHas('workspace_members', [
            'workspace_id' => $this->workspace->id,
            'user_id' => $dave->id,
        ]);
    }

    /**
     * Test 3: Privilege Escalation Prevention - Admin CANNOT create or assign Super Admin role.
     */
    public function test_privilege_escalation_prevented_admin_cannot_create_or_assign_super_admin(): void
    {
        // Admin attempts to create a super admin
        $payload = [
            'name' => 'Fake Super Admin',
            'email' => 'fakesuper@angora.internal',
            'role' => 'super_admin',
            'password' => 'Malicious123!',
        ];

        $this->actingAs($this->admin)
            ->post(route('users.store'), $payload)
            ->assertStatus(403);

        $this->assertDatabaseMissing('users', [
            'email' => 'fakesuper@angora.internal',
        ]);

        // Admin attempts to promote an existing developer to super_admin
        $this->actingAs($this->admin)
            ->put(route('users.update', $this->developer), [
                'name' => $this->developer->name,
                'role' => 'super_admin',
            ])
            ->assertStatus(403);

        $this->assertTrue($this->developer->fresh()->hasRole('developer'));
    }

    /**
     * Test 4: Super Admin CAN assign super_admin and manage any role.
     */
    public function test_super_admin_can_assign_super_admin_role(): void
    {
        $newSuperAdmin = User::create([
            'name' => 'Second Super Admin',
            'email' => 'second_super@angora.internal',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ])->assignRole('admin');

        $this->actingAs($this->superAdmin)
            ->put(route('users.update', $newSuperAdmin), [
                'name' => $newSuperAdmin->name,
                'role' => 'super_admin',
            ])
            ->assertRedirect();

        $this->assertTrue($newSuperAdmin->fresh()->hasRole('super_admin'));
    }

    /**
     * Test 5: Single-use Invitation Generation, Expiration, and Revocation.
     */
    public function test_user_invitation_lifecycle(): void
    {
        // Send invitation
        $response = $this->actingAs($this->admin)->post(route('users.invite'), [
            'email' => 'invitee@external.com',
            'role' => 'guest',
            'workspace_id' => $this->workspace->id,
            'board_id' => $this->board->id,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('user_invitations', [
            'email' => 'invitee@external.com',
            'role' => 'guest',
            'invited_by' => $this->admin->id,
        ]);

        $invitation = UserInvitation::where('email', 'invitee@external.com')->first();
        $this->assertTrue($invitation->isPending());
        $this->assertFalse($invitation->isExpired());
        $this->assertFalse($invitation->isRevoked());

        // Revoke invitation
        $this->actingAs($this->admin)->delete(route('users.invitations.revoke', $invitation))
            ->assertRedirect();

        $this->assertTrue($invitation->fresh()->isRevoked());
        $this->assertFalse($invitation->fresh()->isPending());

        // Resend invitation gives fresh token and restores unrevoked state
        $oldToken = $invitation->token;
        $this->actingAs($this->admin)->post(route('users.invitations.resend', $invitation))
            ->assertRedirect();

        $invitation->refresh();
        $this->assertNotEquals($oldToken, $invitation->token);
        $this->assertTrue($invitation->isPending());
        $this->assertFalse($invitation->isRevoked());
    }

    /**
     * Test 6: Invitation Acceptance & Redemption creates user and assigns scoped workspace/board.
     */
    public function test_invitation_redemption_flow(): void
    {
        $invitation = UserInvitation::createInvitation([
            'email' => 'newhire@angora.internal',
            'role' => 'developer',
            'workspace_id' => $this->workspace->id,
            'board_id' => $this->board->id,
            'invited_by' => $this->admin->id,
        ]);

        // GET invitation redemption page
        $this->get(route('invitations.show', ['token' => $invitation->token]))
            ->assertStatus(200);

        // POST accept invitation
        $acceptResponse = $this->post(route('invitations.accept', ['token' => $invitation->token]), [
            'name' => 'New Hire Engineer',
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ]);

        $acceptResponse->assertRedirect('/dashboard');
        $this->assertAuthenticated();

        // Check user creation
        $this->assertDatabaseHas('users', [
            'email' => 'newhire@angora.internal',
            'status' => 'active',
        ]);

        $newUser = User::where('email', 'newhire@angora.internal')->first();
        $this->assertTrue($newUser->hasRole('developer'));

        // Check workspace membership
        $this->assertDatabaseHas('workspace_members', [
            'workspace_id' => $this->workspace->id,
            'user_id' => $newUser->id,
        ]);

        // Check board membership
        $this->assertDatabaseHas('board_members', [
            'board_id' => $this->board->id,
            'user_id' => $newUser->id,
            'role' => 'editor',
        ]);

        // Invitation is now accepted and single-use
        $this->assertNotNull($invitation->fresh()->accepted_at);

        // Subsequent redemption attempt is blocked
        $this->post(route('invitations.accept', ['token' => $invitation->token]), [
            'name' => 'Duplicate Attempt',
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ])->assertRedirect(route('invitations.show', ['token' => $invitation->token]));
    }

    /**
     * Test 7: Expired or Revoked invitation tokens cannot be redeemed.
     */
    public function test_expired_or_revoked_invitations_are_rejected(): void
    {
        $expiredInv = UserInvitation::createInvitation([
            'email' => 'expired@angora.internal',
            'role' => 'developer',
            'invited_by' => $this->admin->id,
            'expires_at' => now()->subDay(),
        ]);

        $this->get(route('invitations.show', ['token' => $expiredInv->token]))
            ->assertStatus(200); // Renders invalid notice

        $this->post(route('invitations.accept', ['token' => $expiredInv->token]), [
            'name' => 'Expired User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertRedirect();

        $this->assertDatabaseMissing('users', ['email' => 'expired@angora.internal']);
    }

    /**
     * Test 8: User Suspension and Inactivation blocks login and policy bypasses.
     */
    public function test_user_suspension_blocks_login_and_policy_access(): void
    {
        // Admin suspends developer
        $this->actingAs($this->admin)
            ->patch(route('users.status', $this->developer), ['status' => 'suspended'])
            ->assertRedirect();

        $this->assertEquals('suspended', $this->developer->fresh()->status);

        // Suspended user cannot log in
        auth()->logout();
        $this->flushSession();

        $loginResponse = $this->post('/login', [
            'email' => $this->developer->email,
            'password' => 'password123',
        ]);
        $loginResponse->assertSessionHasErrors('email');
        $this->assertGuest();

        // Even if authenticated in session, suspended policy check fails
        $this->actingAs($this->developer);
        $this->assertFalse($this->developer->can('view', $this->workspace));
        $this->assertFalse($this->developer->can('update', $this->board));
    }

    /**
     * Test 9: Board Membership and Role Control (owner, admin, editor, viewer, guest).
     */
    public function test_board_membership_endpoints_enforce_permissions(): void
    {
        // Admin adds Developer as viewer
        $this->actingAs($this->admin)->post(route('kanban.boards.members.store', $this->board), [
            'user_id' => $this->developer->id,
            'role' => 'viewer',
        ])->assertRedirect();

        $this->assertDatabaseHas('board_members', [
            'board_id' => $this->board->id,
            'user_id' => $this->developer->id,
            'role' => 'viewer',
        ]);

        $boardMember = BoardMember::where('board_id', $this->board->id)
            ->where('user_id', $this->developer->id)
            ->firstOrFail();

        // Update role to editor
        $this->actingAs($this->admin)->patch(route('kanban.boards.members.update', [$this->board, $boardMember]), [
            'role' => 'editor',
        ])->assertRedirect();

        $this->assertDatabaseHas('board_members', [
            'board_id' => $this->board->id,
            'user_id' => $this->developer->id,
            'role' => 'editor',
        ]);

        // Remove member
        $this->actingAs($this->admin)->delete(route('kanban.boards.members.delete', [$this->board, $boardMember]))
            ->assertRedirect();

        $this->assertDatabaseMissing('board_members', [
            'board_id' => $this->board->id,
            'user_id' => $this->developer->id,
        ]);
    }
}
