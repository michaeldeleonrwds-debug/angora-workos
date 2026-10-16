<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered()
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_users_can_authenticate_using_the_login_screen()
    {
        $user = User::factory()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password()
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }

    public function test_quick_login_works_in_local_environment()
    {
        $user = User::factory()->create([
            'role' => 'super_admin',
            'department' => 'Executive',
        ]);

        $response = $this->post('/dev-quick-login', [
            'user_id' => $user->id,
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_quick_login_is_forbidden_in_production()
    {
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
        $this->app->detectEnvironment(fn () => 'production');

        $user = User::factory()->create();

        $response = $this->post('/dev-quick-login', [
            'user_id' => $user->id,
        ]);

        $response->assertStatus(403);
        $this->assertGuest();
    }

    public function test_login_screen_renders_safely_when_users_have_null_roles_or_departments(): void
    {
        // 1. User with no roles and null department
        $noRoleUser = User::factory()->create([
            'name' => 'No Role User',
            'email' => 'norole@test.com',
            'department' => 'Operations',
        ]);
        $noRoleUser->syncRoles([]);

        // 2. External client user with no Spatie roles
        $clientUser = User::factory()->create([
            'name' => 'Portal Client',
            'email' => 'client@portal.test',
            'department' => 'Client External',
        ]);
        $clientUser->syncRoles([]);

        \App\Models\SalesCustomer::create([
            'name' => 'Portal Customer',
            'company_name' => 'Portal Customer Inc',
            'email' => 'client@portal.test',
            'user_id' => $clientUser->id,
            'status' => 'active',
            'client_portal_access' => true,
        ]);

        $response = $this->get('/login');
        $response->assertStatus(200);

        $response->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('auth/login')
            ->has('testAccounts')
            ->where('testAccounts', function ($accounts) use ($clientUser, $noRoleUser) {
                $accountsArray = collect($accounts);

                // Both users must be present
                $clientAccount = $accountsArray->firstWhere('id', $clientUser->id);
                $noRoleAccount = $accountsArray->firstWhere('id', $noRoleUser->id);

                if (! $clientAccount || ! $noRoleAccount) {
                    return false;
                }

                // Roles must NEVER be null
                if ($clientAccount['role'] === null || $noRoleAccount['role'] === null) {
                    return false;
                }

                // Client role properly resolved
                return $clientAccount['role'] === 'client';
            })
        );
    }

    public function test_client_user_redirects_to_client_portal_dashboard_on_login(): void
    {
        $clientUser = User::factory()->create([
            'email' => 'client.redirect@apex.test',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
        ]);
        $clientUser->syncRoles([]);

        \App\Models\SalesCustomer::create([
            'name' => 'Apex Redirect Ltd',
            'company_name' => 'Apex Redirect Ltd',
            'email' => 'client.redirect@apex.test',
            'user_id' => $clientUser->id,
            'status' => 'active',
            'client_portal_access' => true,
        ]);

        $response = $this->post('/login', [
            'email' => $clientUser->email,
            'password' => 'password123',
        ]);

        $this->assertAuthenticatedAs($clientUser);
        $response->assertRedirect(route('client-portal.dashboard', absolute: false));
    }

    public function test_client_user_redirects_to_client_portal_dashboard_on_quick_login(): void
    {
        $clientUser = User::factory()->create([
            'email' => 'client.quick@apex.test',
        ]);
        $clientUser->syncRoles([]);

        \App\Models\SalesCustomer::create([
            'name' => 'Apex Quick Ltd',
            'company_name' => 'Apex Quick Ltd',
            'email' => 'client.quick@apex.test',
            'user_id' => $clientUser->id,
            'status' => 'active',
            'client_portal_access' => true,
        ]);

        $response = $this->post('/dev-quick-login', [
            'user_id' => $clientUser->id,
        ]);

        $this->assertAuthenticatedAs($clientUser);
        $response->assertRedirect(route('client-portal.dashboard', absolute: false));
    }

    public function test_internal_staff_redirects_to_internal_dashboard_on_login(): void
    {
        $this->seed(\Database\Seeders\RbacSeeder::class);

        $employee = User::factory()->create([
            'email' => 'internal.employee@angora.test',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
            'role' => 'employee',
        ]);

        $response = $this->post('/login', [
            'email' => $employee->email,
            'password' => 'password123',
        ]);

        $this->assertAuthenticatedAs($employee);
        $response->assertRedirect(route('dashboard', absolute: false));
    }
}
