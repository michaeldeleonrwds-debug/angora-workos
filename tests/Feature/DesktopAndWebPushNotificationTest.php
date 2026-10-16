<?php

namespace Tests\Feature;

use App\Jobs\SendWebPushNotificationJob;
use App\Models\NotificationPreference;
use App\Models\SystemNotification;
use App\Models\User;
use App\Models\WebPushSubscription;
use App\Services\NotificationService;
use App\Services\WebPushService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DesktopAndWebPushNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->user = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'name' => 'Test Admin',
            'email' => 'admin.test@angora.test',
        ]);

        $this->otherUser = User::factory()->create([
            'role' => 'designer',
            'status' => 'active',
            'name' => 'Test Designer',
            'email' => 'designer.test@angora.test',
        ]);
    }

    public function test_vapid_public_key_endpoint_returns_json(): void
    {
        $response = $this->actingAs($this->user)->getJson(route('push.vapid-public-key'));

        $response->assertOk()
            ->assertJsonStructure(['public_key']);

        $this->assertNotEmpty($response->json('public_key'));
    }

    public function test_unauthenticated_user_cannot_access_push_endpoints(): void
    {
        $this->getJson(route('push.vapid-public-key'))->assertUnauthorized();
        $this->postJson(route('push.subscribe'), [])->assertUnauthorized();
        $this->postJson(route('push.unsubscribe'), [])->assertUnauthorized();
        $this->postJson(route('push.test'), [])->assertUnauthorized();
    }

    public function test_user_can_subscribe_to_web_push(): void
    {
        $fakeEndpoint = 'https://fcm.googleapis.com/fcm/send/fake-subscription-token-12345';
        $payload = [
            'endpoint' => $fakeEndpoint,
            'keys' => [
                'p256dh' => 'BD4...fakeKey...',
                'auth' => 'fakeAuthSecret123',
            ],
            'contentEncoding' => 'aes128gcm',
            'device_name' => 'Chrome on Windows',
        ];

        $response = $this->actingAs($this->user)->postJson(route('push.subscribe'), $payload);

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('web_push_subscriptions', [
            'user_id' => $this->user->id,
            'endpoint_hash' => hash('sha256', $fakeEndpoint),
            'content_encoding' => 'aes128gcm',
        ]);

        $this->user->refresh();
        $this->assertTrue($this->user->push_notifications_enabled);
        $this->assertTrue($this->user->desktop_notifications_enabled);
    }

    public function test_user_can_unsubscribe_from_web_push(): void
    {
        $fakeEndpoint = 'https://fcm.googleapis.com/fcm/send/fake-subscription-token-99999';
        WebPushSubscription::create([
            'user_id' => $this->user->id,
            'endpoint' => $fakeEndpoint,
            'endpoint_hash' => hash('sha256', $fakeEndpoint),
            'public_key' => 'fakePub',
            'auth_token' => 'fakeAuth',
            'content_encoding' => 'aes128gcm',
        ]);

        $response = $this->actingAs($this->user)->postJson(route('push.unsubscribe'), [
            'endpoint' => $fakeEndpoint,
        ]);

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseMissing('web_push_subscriptions', [
            'endpoint_hash' => hash('sha256', $fakeEndpoint),
        ]);
    }

    public function test_test_notification_endpoint_creates_system_notification_and_dispatches(): void
    {
        $response = $this->actingAs($this->user)->postJson(route('push.test'));

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('system_notifications', [
            'user_id' => $this->user->id,
            'title' => 'Angora Work OS: Test Alert',
            'type' => 'success',
        ]);
    }

    public function test_notification_service_dispatches_web_push_job(): void
    {
        Queue::fake([SendWebPushNotificationJob::class]);

        $notificationService = app(NotificationService::class);
        $notification = $notificationService->notify(
            recipient: $this->otherUser,
            title: 'Task Assigned',
            message: 'You were assigned to a task',
            type: 'info',
            category: 'assignments',
            link: '/kanban?item=42',
            actorId: $this->user->id
        );

        $this->assertNotNull($notification);
        Queue::assertPushed(SendWebPushNotificationJob::class, function ($job) use ($notification) {
            return $job->notification->id === $notification->id;
        });
    }

    public function test_user_can_update_desktop_and_sound_notification_preferences(): void
    {
        $response = $this->actingAs($this->user)->putJson(route('notifications.preferences.update'), [
            'desktop_notifications_enabled' => true,
            'push_notifications_enabled' => true,
            'sound_notifications_enabled' => true,
            'preferences' => [
                [
                    'category' => 'mentions',
                    'in_app_enabled' => true,
                    'desktop_enabled' => true,
                    'push_enabled' => true,
                    'email_enabled' => false,
                ],
            ],
        ]);

        $response->assertOk();

        $this->user->refresh();
        $this->assertTrue($this->user->desktop_notifications_enabled);
        $this->assertTrue($this->user->push_notifications_enabled);
        $this->assertTrue($this->user->sound_notifications_enabled);

        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $this->user->id,
            'category' => 'mentions',
            'in_app_enabled' => true,
            'desktop_enabled' => true,
            'email_enabled' => false,
        ]);
    }

    public function test_settings_center_notifications_page_renders_with_vapid_and_preferences(): void
    {
        $response = $this->actingAs($this->user)->get(route('settings.notifications'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('settings/notifications')
                ->has('preferences')
                ->has('categoryPreferences')
                ->has('vapidPublicKey')
                ->has('desktopEnabled')
                ->has('pushEnabled')
                ->has('soundEnabled')
            );
    }

    public function test_user_can_auto_save_settings_notifications_via_json(): void
    {
        $response = $this->actingAs($this->user)->putJson(route('settings.notifications.update'), [
            'desktop_enabled' => true,
            'push_enabled' => true,
            'sound_enabled' => true,
            'category_preferences' => [
                [
                    'category' => 'assignments',
                    'in_app_enabled' => true,
                    'desktop_enabled' => true,
                    'push_enabled' => true,
                    'email_enabled' => true,
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
            ]);

        $this->user->refresh();
        $this->assertTrue($this->user->desktop_notifications_enabled);
        $this->assertTrue($this->user->push_notifications_enabled);
        $this->assertTrue($this->user->sound_notifications_enabled);
    }
}
