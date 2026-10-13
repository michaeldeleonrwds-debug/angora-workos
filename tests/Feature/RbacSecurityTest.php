<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_external_user_is_forbidden_from_hr_and_production_modules(): void
    {
        $externalUser = User::where('role', 'external_user')->first();
        $this->actingAs($externalUser);

        // HR is restricted
        $hrResponse = $this->get('/hr');
        $hrResponse->assertStatus(403);

        // Production is restricted
        $prodResponse = $this->get('/production');
        $prodResponse->assertStatus(403);

        // Finance is restricted
        $finResponse = $this->get('/finance');
        $finResponse->assertStatus(403);

        // Sales is allowed
        $salesResponse = $this->get('/sales');
        $salesResponse->assertStatus(200);
    }

    public function test_team_member_cannot_access_rbac_matrix_manager(): void
    {
        $teamMember = User::where('role', 'team_member')->first();
        $this->actingAs($teamMember);

        $response = $this->get('/rbac');
        $response->assertStatus(403);
    }

    public function test_super_admin_can_access_and_manage_rbac(): void
    {
        $superAdmin = User::where('role', 'super_admin')->first();
        $this->actingAs($superAdmin);

        $response = $this->get('/rbac');
        $response->assertStatus(200);

        // Can update permissions
        $permId = Permission::first()->id;
        $updateResponse = $this->post('/rbac/roles/marketing_staff/permissions', [
            'permission_ids' => [$permId],
        ]);
        $updateResponse->assertStatus(302);
    }
}
