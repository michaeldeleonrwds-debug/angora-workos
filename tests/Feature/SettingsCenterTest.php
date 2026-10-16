<?php

namespace Tests\Feature;

use App\Models\SystemSetting;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsCenterTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $employee;
    private User $clientUser;
    private Workspace $workspace;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->superAdmin = User::factory()->create(['role' => 'super_admin']);
        $this->superAdmin->assignRole('super_admin');

        $this->employee = User::factory()->create(['role' => 'employee']);
        $this->employee->assignRole('employee');

        $this->clientUser = User::factory()->create(['email' => 'client@angora.test']);
        $this->clientUser->syncRoles([]);

        $this->workspace = Workspace::create([
            'name' => 'Settings Test Workspace',
            'slug' => 'settings-test-workspace',
            'owner_id' => $this->superAdmin->id,
            'status' => 'active',
        ]);
        $this->workspace->members()->create(['user_id' => $this->superAdmin->id, 'role' => 'owner']);
        $this->workspace->members()->create(['user_id' => $this->employee->id, 'role' => 'member']);
    }

    public function test_settings_landing_page_accessible_by_internal_users(): void
    {
        // 1. Super Admin access
        $response = $this->actingAs($this->superAdmin)->get('/settings');
        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->component('settings/index')
            ->has('canManageSystem')
            ->where('canManageSystem', true)
            ->has('systemStatus')
        );

        // 2. Regular employee access is gracefully redirected to personal profile
        $employeeResponse = $this->actingAs($this->employee)->get('/settings');
        $employeeResponse->assertRedirect(route('profile.edit'));
    }

    public function test_profile_page_renders_redesigned_profile_component(): void
    {
        $response = $this->actingAs($this->employee)->get('/settings/profile');
        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->component('settings/profile')
        );
    }

    public function test_profile_information_can_be_updated(): void
    {
        $response = $this->actingAs($this->employee)->patch('/settings/profile', [
            'name' => 'Updated Employee Name',
            'email' => 'updated.employee@angora.test',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect('/settings/profile');

        $this->employee->refresh();
        $this->assertEquals('Updated Employee Name', $this->employee->name);
        $this->assertEquals('updated.employee@angora.test', $this->employee->email);
    }

    public function test_super_admin_can_access_all_system_settings_routes(): void
    {
        $systemRoutes = [
            '/settings/system/smtp' => 'settings/system/smtp',
            '/settings/system/storage' => 'settings/system/storage',
            '/settings/system/reverb' => 'settings/system/reverb',
            '/settings/system/optimization' => 'settings/system/optimization',
            '/settings/system/queues' => 'settings/system/queues',
            '/settings/system/health' => 'settings/system/health',
        ];

        foreach ($systemRoutes as $url => $component) {
            $response = $this->actingAs($this->superAdmin)->get($url);
            $response->assertSuccessful();
            $response->assertInertia(fn ($page) => $page->component($component));
        }
    }

    public function test_unauthorized_users_cannot_access_system_settings_routes(): void
    {
        $systemRoutes = [
            '/settings/system/smtp',
            '/settings/system/storage',
            '/settings/system/reverb',
            '/settings/system/optimization',
            '/settings/system/queues',
            '/settings/system/health',
        ];

        foreach ($systemRoutes as $url) {
            // Employee attempt is gracefully redirected to profile
            $response = $this->actingAs($this->employee)->get($url);
            $response->assertRedirect(route('profile.edit'));

            // Client attempt is gracefully redirected to profile
            $clientResponse = $this->actingAs($this->clientUser)->get($url);
            $clientResponse->assertRedirect(route('profile.edit'));
        }
    }

    public function test_system_settings_save_and_encrypt_sensitive_credentials(): void
    {
        // 1. Save SMTP settings with password
        $smtpResponse = $this->actingAs($this->superAdmin)->post('/settings/system/smtp', [
            'mail_mailer' => 'smtp',
            'mail_host' => 'smtp.test.com',
            'mail_port' => 587,
            'mail_username' => 'testuser',
            'mail_password' => 'secret_smtp_password_123',
            'mail_encryption' => 'tls',
            'mail_from_address' => 'noreply@angora.test',
            'mail_from_name' => 'Angora Mailer',
        ]);
        $smtpResponse->assertSessionHasNoErrors();

        // Verify password is encrypted in database
        $passwordSetting = SystemSetting::where('key', 'mail_password')->first();
        $this->assertNotNull($passwordSetting);
        $this->assertTrue($passwordSetting->is_encrypted);
        $this->assertNotEquals('secret_smtp_password_123', $passwordSetting->value);
        $this->assertEquals('secret_smtp_password_123', SystemSetting::get('mail_password'));

        // 2. Save Storage settings with secret key
        $storageResponse = $this->actingAs($this->superAdmin)->post('/settings/system/storage', [
            'filesystem_disk' => 's3',
            'aws_access_key_id' => 'AKIAIOSFODNN7EXAMPLE',
            'aws_secret_access_key' => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            'aws_default_region' => 'auto',
            'aws_bucket' => 'angora-bucket',
            'aws_endpoint' => 'https://r2.cloudflarestorage.com',
            'aws_url' => 'https://cdn.example.com',
            'aws_use_path_style' => false,
        ]);
        $storageResponse->assertSessionHasNoErrors();

        // Verify secret key is encrypted in database
        $secretSetting = SystemSetting::where('key', 's3_secret')->first();
        $this->assertNotNull($secretSetting);
        $this->assertTrue($secretSetting->is_encrypted);
        $this->assertNotEquals('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', $secretSetting->value);
        $this->assertEquals('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', SystemSetting::get('s3_secret'));

        // 3. Save Image Optimization settings
        $optResponse = $this->actingAs($this->superAdmin)->post('/settings/system/optimization', [
            'enabled' => true,
            'max_width' => 1920,
            'max_height' => 1080,
            'quality' => 85,
            'generate_webp' => true,
        ]);
        $optResponse->assertSessionHasNoErrors();
        $this->assertEquals('85', SystemSetting::get('image_quality'));
    }

    public function test_diagnostic_test_endpoints_return_json_status(): void
    {
        $smtpTest = $this->actingAs($this->superAdmin)->postJson('/settings/system/smtp/test');
        $smtpTest->assertSuccessful();
        $smtpTest->assertJsonStructure(['success', 'message']);

        $storageTest = $this->actingAs($this->superAdmin)->postJson('/settings/system/storage/test');
        $storageTest->assertSuccessful();
        $storageTest->assertJsonStructure(['success', 'message']);

        $reverbTest = $this->actingAs($this->superAdmin)->postJson('/settings/system/reverb/test');
        $reverbTest->assertSuccessful();
        $reverbTest->assertJsonStructure(['success', 'message']);
    }

    public function test_notification_and_workspace_settings_persist(): void
    {
        // 1. Notification preferences
        $notifResponse = $this->actingAs($this->employee)->put('/settings/notifications', [
            'email_task_assigned' => true,
            'email_task_comment' => false,
            'email_review_status' => true,
            'in_app_mentions' => true,
            'in_app_task_moves' => false,
            'sound_enabled' => false,
        ]);
        $notifResponse->assertSessionHasNoErrors();

        $savedPrefs = SystemSetting::get('user_notifications_' . $this->employee->id);
        $this->assertIsArray($savedPrefs);
        $this->assertFalse($savedPrefs['email_task_comment']);
        $this->assertFalse($savedPrefs['sound_enabled']);

        // 2. Workspace update
        $wsResponse = $this->actingAs($this->superAdmin)->patch('/settings/workspace', [
            'workspace_id' => $this->workspace->id,
            'name' => 'Renamed Settings Workspace',
            'description' => 'Updated operational summary',
            'color' => '#00c875',
            'icon' => 'folder-kanban',
        ]);
        $wsResponse->assertSessionHasNoErrors();

        $this->workspace->refresh();
        $this->assertEquals('Renamed Settings Workspace', $this->workspace->name);
        $this->assertEquals('#00c875', $this->workspace->color);
    }

    public function test_file_manager_route_renders_inertia_page(): void
    {
        $response = $this->actingAs($this->superAdmin)->get('/settings/data/files');
        $response->assertSuccessful();
        $response->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('media/index')
            ->has('assets')
            ->has('filters')
            ->has('storageDisk')
        );

        $employeeResponse = $this->actingAs($this->employee)->get('/settings/data/files');
        $employeeResponse->assertRedirect(route('profile.edit'));

        $mediaResponse = $this->actingAs($this->employee)->get('/media');
        $mediaResponse->assertSuccessful();
        $mediaResponse->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('media/index')
        );
    }

    public function test_media_index_returns_raw_json_when_requested_via_api(): void
    {
        $response = $this->actingAs($this->employee)->getJson('/media');
        $response->assertSuccessful();
        $response->assertJsonStructure([
            'current_page',
            'data',
            'total',
        ]);
    }
}

