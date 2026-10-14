<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WorkOsDirectAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_authenticated_user_can_directly_access_kanban_without_inertia_header(): void
    {
        $user = User::where('role', 'super_admin')->first();

        $response = $this->actingAs($user)->get('/kanban');

        $response->assertStatus(200);
        $this->assertStringContainsString('data-page=', $response->getContent());
        $this->assertStringContainsString('kanban\/index', $response->getContent());

        // Verify that Link header does not exceed Apache's 8190-byte mod_fcgid limit
        if ($response->headers->has('Link')) {
            $this->assertLessThan(
                8190,
                strlen($response->headers->get('Link')),
                'Link header exceeds Apache mod_fcgid LimitRequestFieldSize (8190 bytes)'
            );
        }
    }

    public function test_authenticated_user_can_access_kanban_via_inertia_spa_request(): void
    {
        $user = User::where('role', 'super_admin')->first();
        $dummyRequest = Request::create('/kanban', 'GET');
        $version = app(HandleInertiaRequests::class)->version($dummyRequest);

        $response = $this->actingAs($user)->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $version,
            'X-Requested-With' => 'XMLHttpRequest',
        ])->get('/kanban');

        $response->assertStatus(200);
        $response->assertHeader('X-Inertia', 'true');
        $this->assertEquals('kanban/index', $response->json('component'));
    }

    public function test_inertia_page_assertion_verifies_kanban_component(): void
    {
        $user = User::where('role', 'super_admin')->first();

        $response = $this->actingAs($user)->get('/kanban');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('kanban/index')
            ->has('activeBoard')
            ->has('workspaces')
            ->has('boards')
        );
    }

    public function test_direct_access_to_dashboard_works_cleanly(): void
    {
        $user = User::where('role', 'super_admin')->first();

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertStatus(200);
        $this->assertStringContainsString('data-page=', $response->getContent());
    }
}
