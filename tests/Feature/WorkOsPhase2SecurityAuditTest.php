<?php

namespace Tests\Feature;

use App\Models\BoardMember;
use App\Models\KanbanAttachment;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\UserInvitation;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WorkOsPhase2SecurityAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $admin;
    protected User $projectManager;
    protected User $developer;
    protected User $guest;
    protected User $client;
    protected Workspace $workspace;
    protected KanbanBoard $board;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin = User::where('role', 'super_admin')->first();

        $this->admin = User::create([
            'name' => 'Security Admin',
            'email' => 'sec_admin@angora.internal',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'department' => 'Security',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->projectManager = User::create([
            'name' => 'Security PM',
            'email' => 'sec_pm@angora.internal',
            'password' => Hash::make('password123'),
            'role' => 'project_manager',
            'department' => 'Operations',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->developer = User::create([
            'name' => 'Security Dev',
            'email' => 'sec_dev@angora.internal',
            'password' => Hash::make('password123'),
            'role' => 'developer',
            'department' => 'Engineering',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->guest = User::create([
            'name' => 'Security Guest',
            'email' => 'sec_guest@angora.internal',
            'password' => Hash::make('password123'),
            'role' => 'guest',
            'department' => 'External',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->client = User::create([
            'name' => 'Security Client',
            'email' => 'sec_client@angora.internal',
            'password' => Hash::make('password123'),
            'role' => 'client',
            'department' => 'Client Portal',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->workspace = Workspace::firstOrCreate([
            'name' => 'Secure Corporate Workspace',
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
            'title' => 'Secure Board Alpha',
        ], [
            'type' => 'board',
            'visibility' => 'private',
            'created_by' => $this->superAdmin->id,
        ]);
    }

    /**
     * AUDIT A1: Secure Token Storage and Hashing
     * Raw token string must match SHA-256 token_hash, and findByRawToken must resolve it.
     */
    public function test_invitation_tokens_are_hashed_and_resolved_securely(): void
    {
        $invitation = UserInvitation::createInvitation([
            'email' => 'cryptocheck@angora.internal',
            'role' => 'developer',
            'invited_by' => $this->admin->id,
        ]);

        $this->assertNotNull($invitation->rawToken);
        $this->assertEquals(hash('sha256', $invitation->rawToken), $invitation->token_hash);

        // findByRawToken must find invitation by raw token
        $resolved = UserInvitation::findByRawToken($invitation->rawToken);
        $this->assertNotNull($resolved);
        $this->assertEquals($invitation->id, $resolved->id);

        // Raw token lookup with invalid string must fail
        $this->assertNull(UserInvitation::findByRawToken('invalid-fake-token-attempt'));
    }

    /**
     * AUDIT A2: Single-Use Redemption and Identity Enforcement
     */
    public function test_invitation_single_use_and_identity_validation(): void
    {
        $invitation = UserInvitation::createInvitation([
            'email' => 'singleuse@angora.internal',
            'role' => 'developer',
            'invited_by' => $this->admin->id,
            'workspace_id' => $this->workspace->id,
        ]);

        $token = $invitation->rawToken;

        // First redemption succeeds
        $this->post(route('invitations.accept', ['token' => $token]), [
            'name' => 'First User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertRedirect(route('dashboard'));

        $this->assertNotNull($invitation->fresh()->accepted_at);

        // Subsequent redemption fails
        auth()->logout();
        $this->flushSession();

        $this->post(route('invitations.accept', ['token' => $token]), [
            'name' => 'Second Duplicate User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertRedirect(route('invitations.show', ['token' => $token]));
    }

    /**
     * AUDIT A3: Concurrent Invitation Redemption Race Condition Protection
     */
    public function test_concurrent_invitation_redemption_protection(): void
    {
        $invitation = UserInvitation::createInvitation([
            'email' => 'concurrency@angora.internal',
            'role' => 'developer',
            'invited_by' => $this->admin->id,
        ]);

        $token = $invitation->rawToken;

        // Simulate two sequential redemption attempts against transactional lock
        $res1 = $this->post(route('invitations.accept', ['token' => $token]), [
            'name' => 'Winner User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);
        $res1->assertRedirect(route('dashboard'));

        auth()->logout();
        $this->flushSession();

        $res2 = $this->post(route('invitations.accept', ['token' => $token]), [
            'name' => 'Loser User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);
        $res2->assertRedirect(route('invitations.show', ['token' => $token]));

        // Exactly 1 user record created
        $this->assertEquals(1, User::where('email', 'concurrency@angora.internal')->count());
    }

    /**
     * AUDIT A4: Invitation Authorization Scoping
     * Admin cannot invite into a workspace or board where they lack manageMembers permission.
     */
    public function test_invitation_authorization_rejects_unauthorized_scope(): void
    {
        $foreignWorkspace = Workspace::create([
            'name' => 'Foreign Private Workspace',
            'owner_id' => $this->superAdmin->id,
        ]);

        // Admin (not member/owner of foreignWorkspace) attempts to invite into foreignWorkspace
        $this->actingAs($this->admin)
            ->post(route('users.invite'), [
                'email' => 'scopetest@angora.internal',
                'role' => 'developer',
                'workspace_id' => $foreignWorkspace->id,
            ])
            ->assertStatus(403);

        $this->assertDatabaseMissing('user_invitations', [
            'email' => 'scopetest@angora.internal',
        ]);
    }

    /**
     * AUDIT B2: Existing Session Revocation via Centralized Active-Account Middleware
     * When user is suspended in DB, an active session attempting ANY protected request is immediately terminated.
     */
    public function test_active_session_is_terminated_immediately_upon_suspension(): void
    {
        // 1. User logs in successfully
        $this->actingAs($this->developer);

        // 2. Access dashboard is allowed initially
        $this->get(route('dashboard'))->assertStatus(200);

        // 3. Admin suspends developer in DB
        $this->developer->update(['status' => 'suspended']);

        // 4. Developer attempts protected operations with existing session
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
        $this->assertGuest();

        // 5. Protected API / mutation attempt also rejected
        $this->actingAs($this->developer);
        $this->get('/kanban')->assertRedirect(route('login'));
        $this->assertGuest();
    }

    /**
     * AUDIT C1: Privilege Escalation Prevention
     * Admins cannot promote themselves or others to super_admin.
     */
    public function test_privilege_escalation_strictly_rejected(): void
    {
        // Admin tries to self-elevate
        $this->actingAs($this->admin)
            ->put(route('users.update', $this->admin), [
                'name' => 'Elevated Admin',
                'role' => 'super_admin',
            ])
            ->assertStatus(403);

        $this->assertEquals('admin', $this->admin->fresh()->role);

        // Admin tries to suspend Super Admin
        $this->actingAs($this->admin)
            ->patch(route('users.status', $this->superAdmin), [
                'status' => 'suspended',
            ])
            ->assertStatus(403);

        $this->assertEquals('active', $this->superAdmin->fresh()->status);
    }

    /**
     * AUDIT C6: Nested-Resource Mismatch IDOR Prevention
     * Cannot modify or remove a board member using a mismatched board ID.
     */
    public function test_nested_resource_idor_protection(): void
    {
        $otherBoard = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Other Board Beta',
            'created_by' => $this->superAdmin->id,
        ]);

        $boardMember = BoardMember::create([
            'board_id' => $this->board->id,
            'user_id' => $this->developer->id,
            'role' => 'editor',
        ]);

        // Attempt to remove boardMember using mismatched $otherBoard
        $this->actingAs($this->admin)
            ->delete(route('kanban.boards.members.delete', [$otherBoard, $boardMember]))
            ->assertStatus(404);

        $this->assertDatabaseHas('board_members', [
            'id' => $boardMember->id,
        ]);

        // Attempt to update boardMember using mismatched $otherBoard
        $this->actingAs($this->admin)
            ->patch(route('kanban.boards.members.update', [$otherBoard, $boardMember]), [
                'role' => 'viewer',
            ])
            ->assertStatus(404);

        $this->assertEquals('editor', $boardMember->fresh()->role);
    }

    /**
     * AUDIT D: Quick Login Security
     * Development quick-login strictly rejects suspended or inactive accounts.
     */
    public function test_quick_login_rejects_suspended_accounts(): void
    {
        $suspendedUser = User::create([
            'name' => 'Suspended QA',
            'email' => 'suspended_qa@angora.internal',
            'password' => Hash::make('password123'),
            'role' => 'developer',
            'status' => 'suspended',
        ]);

        $this->post(route('login.quick'), ['user_id' => $suspendedUser->id])
            ->assertStatus(403);

        $this->assertGuest();
    }
}
