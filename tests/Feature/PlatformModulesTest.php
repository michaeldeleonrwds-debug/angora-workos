<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformModulesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_super_admin_can_access_dashboard_and_all_department_modules(): void
    {
        $superAdmin = User::role('super_admin')->first();
        $this->actingAs($superAdmin);

        $routes = [
            '/dashboard',
            '/kanban',
            '/hr',
            '/production',
            '/sales',
            '/marketing',
            '/finance',
            '/operations',
            '/compliance',
            '/documents',
            '/analytics',
            '/audit-logs',
        ];

        foreach ($routes as $route) {
            $response = $this->get($route);
            $response->assertStatus(200);
        }
    }

    public function test_user_can_switch_role_persona(): void
    {
        $superAdmin = User::role('super_admin')->first();
        $this->actingAs($superAdmin);

        $productionStaff = User::role('production_staff')->first();

        $response = $this->post('/switch-role', [
            'user_id' => $productionStaff->id,
        ]);

        $response->assertStatus(302);
        $this->assertAuthenticatedAs($productionStaff);
    }
}
