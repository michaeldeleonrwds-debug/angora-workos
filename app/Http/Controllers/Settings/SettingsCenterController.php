<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SystemNotification;
use App\Models\SystemSetting;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsCenterController extends Controller
{
    /**
     * Settings Center Landing / Overview
     */
    public function index(Request $request): mixed
    {
        $user = $request->user();
        $canManageSystem = $user->isSuperAdmin() || $user->hasPermission('system.settings.manage');
        $canManageWorkspace = $user->isSuperAdmin() || $user->hasRole('admin');

        // Only SuperAdmin or Admin can view Settings Overview; all other users go directly to Profile
        if (!$canManageSystem && !$canManageWorkspace) {
            return redirect()->route('profile.edit');
        }

        $activeWorkspace = null;
        $activeWorkspaceId = session('active_workspace_id');
        if ($activeWorkspaceId) {
            $activeWorkspace = Workspace::find($activeWorkspaceId);
        }
        if (!$activeWorkspace) {
            $activeWorkspace = Workspace::where('owner_id', $user->id)
                ->orWhereHas('members', fn ($q) => $q->where('user_id', $user->id))
                ->first();
        }

        $systemStatus = null;
        if ($canManageSystem) {
            $redisRunning = $this->probeSocket('127.0.0.1', (int) env('REDIS_PORT', 6379));
            $minioRunning = $this->probeSocket('127.0.0.1', 9500);

            $jobsPending = 0;
            $queueDriver = config('queue.default', 'redis');
            if ($queueDriver === 'redis' && $redisRunning) {
                try {
                    $jobsPending = \Illuminate\Support\Facades\Queue::connection('redis')->size('realtime')
                        + \Illuminate\Support\Facades\Queue::connection('redis')->size('default')
                        + \Illuminate\Support\Facades\Queue::connection('redis')->size('media');
                } catch (\Throwable $e) {
                    $jobsPending = DB::table('jobs')->count();
                }
            } else {
                $jobsPending = DB::table('jobs')->count();
            }

            $systemStatus = [
                'reverb_running' => $this->probeSocket('127.0.0.1', (int) env('REVERB_SERVER_PORT', 8080)),
                'reverb_host' => config('reverb.servers.reverb.host', '127.0.0.1') . ':' . config('reverb.servers.reverb.port', 8080),
                'storage_disk' => config('filesystems.default', 's3'),
                'storage_bucket' => SystemSetting::get('s3_bucket', env('AWS_BUCKET', 'angora-dev')),
                'minio_running' => $minioRunning,
                'redis_running' => $redisRunning,
                'queue_driver' => $queueDriver,
                'cache_driver' => config('cache.default', 'redis'),
                'mail_configured' => !empty(SystemSetting::get('mail_host', env('MAIL_HOST'))),
                'mail_driver' => config('mail.default', 'smtp'),
                'jobs_pending' => $jobsPending,
                'jobs_failed' => DB::table('failed_jobs')->count(),
                'realtime_queue' => config('broadcasting.queue', env('BROADCAST_QUEUE', 'realtime')),
                'php_version' => PHP_VERSION,
                'gd_available' => extension_loaded('gd'),
                'imagick_available' => extension_loaded('imagick'),
            ];
        }

        return Inertia::render('settings/index', [
            'activeWorkspace' => $activeWorkspace ? [
                'id' => $activeWorkspace->id,
                'name' => $activeWorkspace->name,
                'description' => $activeWorkspace->description,
                'color' => $activeWorkspace->color,
                'icon' => $activeWorkspace->icon,
            ] : null,
            'systemStatus' => $systemStatus,
            'canManageSystem' => $canManageSystem,
        ]);
    }

    /**
     * Notification Channel Preferences
     */
    public function notifications(Request $request): Response
    {
        $user = $request->user();
        $prefs = SystemSetting::get('user_notifications_' . $user->id, [
            'email_task_assigned' => true,
            'email_task_comment' => true,
            'email_review_status' => true,
            'in_app_mentions' => true,
            'in_app_task_moves' => true,
            'sound_enabled' => (bool) $user->sound_notifications_enabled,
            'desktop_enabled' => (bool) $user->desktop_notifications_enabled,
            'push_enabled' => (bool) $user->push_notifications_enabled,
        ]);

        $categories = ['mentions', 'assignments', 'reviews', 'deadlines', 'automations', 'system'];
        $existing = \App\Models\NotificationPreference::where('user_id', $user->id)->get()->keyBy('category');
        $categoryPreferences = [];
        foreach ($categories as $cat) {
            $p = $existing->get($cat);
            $categoryPreferences[] = [
                'category' => $cat,
                'in_app_enabled' => $p ? (bool) $p->in_app_enabled : true,
                'desktop_enabled' => $p ? (bool) ($p->desktop_enabled ?? true) : true,
                'push_enabled' => $p ? (bool) ($p->push_enabled ?? true) : true,
                'email_enabled' => $p ? (bool) $p->email_enabled : true,
            ];
        }

        return Inertia::render('settings/notifications', [
            'preferences' => $prefs,
            'categoryPreferences' => $categoryPreferences,
            'vapidPublicKey' => config('webpush.vapid.public_key', env('VAPID_PUBLIC_KEY')),
            'deviceCount' => $user->webPushSubscriptions()->count(),
            'desktopEnabled' => (bool) $user->desktop_notifications_enabled,
            'pushEnabled' => (bool) $user->push_notifications_enabled,
            'soundEnabled' => (bool) $user->sound_notifications_enabled,
        ]);
    }

    public function updateNotifications(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email_task_assigned' => 'nullable|boolean',
            'email_task_comment' => 'nullable|boolean',
            'email_review_status' => 'nullable|boolean',
            'in_app_mentions' => 'nullable|boolean',
            'in_app_task_moves' => 'nullable|boolean',
            'sound_enabled' => 'nullable|boolean',
            'desktop_enabled' => 'nullable|boolean',
            'push_enabled' => 'nullable|boolean',
            'category_preferences' => 'nullable|array',
        ]);

        $user = $request->user();

        // Update user model flags
        $userUpdates = [];
        if ($request->has('sound_enabled')) {
            $userUpdates['sound_notifications_enabled'] = (bool) $validated['sound_enabled'];
        }
        if ($request->has('desktop_enabled')) {
            $userUpdates['desktop_notifications_enabled'] = (bool) $validated['desktop_enabled'];
        }
        if ($request->has('push_enabled')) {
            $userUpdates['push_notifications_enabled'] = (bool) $validated['push_enabled'];
        }
        if (!empty($userUpdates)) {
            $user->update($userUpdates);
        }

        // Update category preferences if passed
        if (!empty($validated['category_preferences'])) {
            foreach ($validated['category_preferences'] as $item) {
                if (isset($item['category'])) {
                    \App\Models\NotificationPreference::updateOrCreate(
                        ['user_id' => $user->id, 'category' => $item['category']],
                        [
                            'in_app_enabled' => $item['in_app_enabled'] ?? true,
                            'desktop_enabled' => $item['desktop_enabled'] ?? true,
                            'push_enabled' => $item['push_enabled'] ?? true,
                            'email_enabled' => $item['email_enabled'] ?? true,
                        ]
                    );
                }
            }
        }

        SystemSetting::set('user_notifications_' . $user->id, $validated, 'notifications', false, $user->id, 'User notification preferences');

        return back()->with('success', 'Notification preferences updated successfully');
    }

    /**
     * Workspace General Settings
     */
    public function workspace(Request $request): Response
    {
        $user = $request->user();
        $activeWorkspaceId = session('active_workspace_id');
        $workspace = $activeWorkspaceId ? Workspace::find($activeWorkspaceId) : null;
        if (!$workspace) {
            $workspace = Workspace::where('owner_id', $user->id)
                ->orWhereHas('members', fn ($q) => $q->where('user_id', $user->id))
                ->first();
        }

        return Inertia::render('settings/workspace', [
            'workspace' => $workspace ? [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'description' => $workspace->description,
                'color' => $workspace->color,
                'icon' => $workspace->icon,
                'created_at' => $workspace->created_at?->toFormattedDateString(),
            ] : null,
        ]);
    }

    public function updateWorkspace(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'workspace_id' => 'required|exists:workspaces,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|max:20',
            'icon' => 'nullable|string|max:50',
        ]);

        $workspace = Workspace::findOrFail($validated['workspace_id']);
        Gate::authorize('update', $workspace);

        $workspace->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#0073ea',
            'icon' => $validated['icon'] ?? 'layout-grid',
        ]);

        return back()->with('success', 'Workspace settings updated');
    }

    /**
     * Workspace Branding
     */
    public function branding(Request $request): Response
    {
        $branding = SystemSetting::get('workspace_branding', [
            'app_name' => config('app.name', 'Angora Work OS'),
            'tagline' => 'Next-Generation Agency Operating System',
            'primary_color' => '#0073ea',
            'logo_url' => null,
        ]);

        return Inertia::render('settings/branding', [
            'branding' => $branding,
        ]);
    }

    public function updateBranding(Request $request): RedirectResponse
    {
        Gate::authorize('manage-system-settings');

        $validated = $request->validate([
            'app_name' => 'required|string|max:100',
            'tagline' => 'nullable|string|max:255',
            'primary_color' => 'required|string|max:20',
        ]);

        SystemSetting::set('workspace_branding', $validated, 'branding', false, auth()->id(), 'Application branding and logo metadata');

        return back()->with('success', 'Branding settings saved');
    }

    /**
     * SYSTEM: SMTP / Email
     */
    public function smtp(Request $request): Response
    {
        Gate::authorize('manage-system-settings');

        $hasPassword = !empty(SystemSetting::get('mail_password')) || !empty(env('MAIL_PASSWORD'));

        return Inertia::render('settings/system/smtp', [
            'smtp' => [
                'mail_mailer' => SystemSetting::get('mail_mailer', env('MAIL_MAILER', 'smtp')),
                'mail_host' => SystemSetting::get('mail_host', env('MAIL_HOST', '127.0.0.1')),
                'mail_port' => (int) SystemSetting::get('mail_port', env('MAIL_PORT', 2525)),
                'mail_username' => SystemSetting::get('mail_username', env('MAIL_USERNAME', '')),
                'has_password' => $hasPassword,
                'mail_encryption' => SystemSetting::get('mail_encryption', env('MAIL_ENCRYPTION', 'tls')),
                'mail_from_address' => SystemSetting::get('mail_from_address', env('MAIL_FROM_ADDRESS', 'noreply@angora.test')),
                'mail_from_name' => SystemSetting::get('mail_from_name', env('MAIL_FROM_NAME', 'Angora Work OS')),
            ],
            'status' => session('smtp_status'),
        ]);
    }

    public function updateSmtp(Request $request): RedirectResponse
    {
        Gate::authorize('manage-system-settings');

        $validated = $request->validate([
            'mail_mailer' => 'required|string|in:smtp,sendmail,log',
            'mail_host' => 'required|string|max:255',
            'mail_port' => 'required|integer|min:1|max:65535',
            'mail_username' => 'nullable|string|max:255',
            'mail_password' => 'nullable|string|max:255',
            'mail_encryption' => 'nullable|string|in:tls,ssl,starttls,none',
            'mail_from_address' => 'required|email|max:255',
            'mail_from_name' => 'required|string|max:255',
        ]);

        SystemSetting::set('mail_mailer', $validated['mail_mailer'], 'smtp', false, auth()->id());
        SystemSetting::set('mail_host', $validated['mail_host'], 'smtp', false, auth()->id());
        SystemSetting::set('mail_port', (string) $validated['mail_port'], 'smtp', false, auth()->id());
        SystemSetting::set('mail_username', $validated['mail_username'] ?? '', 'smtp', false, auth()->id());
        if (!empty($validated['mail_password']) && $validated['mail_password'] !== '••••••••') {
            SystemSetting::set('mail_password', $validated['mail_password'], 'smtp', true, auth()->id());
        }
        SystemSetting::set('mail_encryption', $validated['mail_encryption'] ?? 'tls', 'smtp', false, auth()->id());
        SystemSetting::set('mail_from_address', $validated['mail_from_address'], 'smtp', false, auth()->id());
        SystemSetting::set('mail_from_name', $validated['mail_from_name'], 'smtp', false, auth()->id());

        return back()->with('success', 'SMTP settings updated successfully');
    }

    public function testSmtp(Request $request): JsonResponse
    {
        Gate::authorize('manage-system-settings');

        $host = SystemSetting::get('mail_host', env('MAIL_HOST', '127.0.0.1'));
        $port = (int) SystemSetting::get('mail_port', env('MAIL_PORT', 2525));

        $connected = $this->probeSocket($host, $port, 3);

        return response()->json([
            'success' => $connected,
            'message' => $connected
                ? "Successfully reached SMTP server at {$host}:{$port}."
                : "Failed to connect to SMTP server at {$host}:{$port}. Please check host and port.",
        ]);
    }

    /**
     * SYSTEM: Storage / S3
     */
    public function storage(Request $request): Response
    {
        Gate::authorize('manage-system-settings');

        $hasSecret = !empty(SystemSetting::get('s3_secret')) || !empty(env('AWS_SECRET_ACCESS_KEY'));
        $minioRunning = $this->probeSocket('127.0.0.1', 9500);

        return Inertia::render('settings/system/storage', [
            'storage' => [
                'filesystem_disk' => config('filesystems.default', 's3'),
                'aws_access_key_id' => SystemSetting::get('s3_key', env('AWS_ACCESS_KEY_ID', 'minioadmin')),
                'has_secret' => $hasSecret,
                'aws_default_region' => SystemSetting::get('s3_region', env('AWS_DEFAULT_REGION', 'us-east-1')),
                'aws_bucket' => SystemSetting::get('s3_bucket', env('AWS_BUCKET', 'angora-dev')),
                'aws_endpoint' => SystemSetting::get('s3_endpoint', env('AWS_ENDPOINT', 'http://127.0.0.1:9500')),
                'aws_url' => SystemSetting::get('s3_url', env('AWS_URL', '')),
                'aws_use_path_style' => (bool) SystemSetting::get('s3_use_path_style', env('AWS_USE_PATH_STYLE_ENDPOINT', true)),
                'minio_running' => $minioRunning,
            ],
        ]);
    }

    public function updateStorage(Request $request): RedirectResponse
    {
        Gate::authorize('manage-system-settings');

        $validated = $request->validate([
            'filesystem_disk' => 'required|string|in:local,public,s3',
            'aws_access_key_id' => 'nullable|string|max:255',
            'aws_secret_access_key' => 'nullable|string|max:255',
            'aws_default_region' => 'nullable|string|max:50',
            'aws_bucket' => 'nullable|string|max:255',
            'aws_endpoint' => 'nullable|string|max:255',
            'aws_url' => 'nullable|string|max:255',
            'aws_use_path_style' => 'boolean',
        ]);

        SystemSetting::set('filesystem_disk', $validated['filesystem_disk'], 'storage', false, auth()->id());
        SystemSetting::set('s3_key', $validated['aws_access_key_id'] ?? '', 'storage', false, auth()->id());
        if (!empty($validated['aws_secret_access_key']) && $validated['aws_secret_access_key'] !== '••••••••') {
            SystemSetting::set('s3_secret', $validated['aws_secret_access_key'], 'storage', true, auth()->id());
        }
        SystemSetting::set('s3_region', $validated['aws_default_region'] ?? 'auto', 'storage', false, auth()->id());
        SystemSetting::set('s3_bucket', $validated['aws_bucket'] ?? '', 'storage', false, auth()->id());
        SystemSetting::set('s3_endpoint', $validated['aws_endpoint'] ?? '', 'storage', false, auth()->id());
        SystemSetting::set('s3_url', $validated['aws_url'] ?? '', 'storage', false, auth()->id());
        SystemSetting::set('s3_use_path_style', $validated['aws_use_path_style'] ? '1' : '0', 'storage', false, auth()->id());

        return back()->with('success', 'Storage settings saved');
    }

    public function testStorage(Request $request): JsonResponse
    {
        Gate::authorize('manage-system-settings');

        $disk = config('filesystems.default', 'local');
        try {
            $testFile = 'diagnostics/probe_' . time() . '.txt';
            Storage::disk($disk)->put($testFile, 'Angora storage diagnostic check at ' . now()->toIso8601String());
            $exists = Storage::disk($disk)->exists($testFile);
            Storage::disk($disk)->delete($testFile);

            return response()->json([
                'success' => $exists,
                'message' => $exists
                    ? "Successfully verified read/write operations on disk [{$disk}]."
                    : "Unable to verify file existence on disk [{$disk}].",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => "Storage probe failed on [{$disk}]: " . $e->getMessage(),
            ]);
        }
    }

    /**
     * SYSTEM: Reverb WebSockets
     */
    public function reverb(Request $request): Response
    {
        Gate::authorize('manage-system-settings');

        $isRunning = $this->probeSocket('127.0.0.1', (int) env('REVERB_SERVER_PORT', 8080));

        return Inertia::render('settings/system/reverb', [
            'reverb' => [
                'is_running' => $isRunning,
                'app_id' => env('REVERB_APP_ID', 'angora'),
                'app_key' => env('REVERB_APP_KEY', ''),
                'server_host' => env('REVERB_SERVER_HOST', '0.0.0.0'),
                'server_port' => (int) env('REVERB_SERVER_PORT', 8080),
                'host' => env('REVERB_HOST', '127.0.0.1'),
                'port' => (int) env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'vite_host' => env('VITE_REVERB_HOST', 'angora.test'),
                'vite_port' => (int) env('VITE_REVERB_PORT', 443),
                'vite_scheme' => env('VITE_REVERB_SCHEME', 'https'),
                'broadcast_driver' => config('broadcasting.default', 'reverb'),
                'broadcast_queue' => config('broadcasting.queue', 'realtime'),
            ],
        ]);
    }

    public function testReverb(Request $request): JsonResponse
    {
        Gate::authorize('manage-system-settings');

        $port = (int) env('REVERB_SERVER_PORT', 8080);
        $isConnected = $this->probeSocket('127.0.0.1', $port, 2);

        return response()->json([
            'success' => $isConnected,
            'message' => $isConnected
                ? "Reverb server is actively listening on 127.0.0.1:{$port}."
                : "Cannot reach Reverb server on 127.0.0.1:{$port}. Please start the reverb server.",
        ]);
    }

    /**
     * SYSTEM: Image Optimization
     */
    public function optimization(Request $request): Response
    {
        Gate::authorize('manage-system-settings');

        return Inertia::render('settings/system/optimization', [
            'optimization' => [
                'enabled' => (bool) SystemSetting::get('image_opt_enabled', true),
                'max_width' => (int) SystemSetting::get('image_max_width', 1920),
                'max_height' => (int) SystemSetting::get('image_max_height', 1080),
                'quality' => (int) SystemSetting::get('image_quality', 80),
                'generate_webp' => (bool) SystemSetting::get('image_generate_webp', true),
                'gd_available' => extension_loaded('gd'),
                'imagick_available' => extension_loaded('imagick'),
                'queue_name' => 'default',
            ],
        ]);
    }

    public function updateOptimization(Request $request): RedirectResponse
    {
        Gate::authorize('manage-system-settings');

        $validated = $request->validate([
            'enabled' => 'boolean',
            'max_width' => 'required|integer|min:320|max:4096',
            'max_height' => 'required|integer|min:240|max:4096',
            'quality' => 'required|integer|min:30|max:100',
            'generate_webp' => 'boolean',
        ]);

        SystemSetting::set('image_opt_enabled', $validated['enabled'] ? '1' : '0', 'optimization', false, auth()->id());
        SystemSetting::set('image_max_width', (string) $validated['max_width'], 'optimization', false, auth()->id());
        SystemSetting::set('image_max_height', (string) $validated['max_height'], 'optimization', false, auth()->id());
        SystemSetting::set('image_quality', (string) $validated['quality'], 'optimization', false, auth()->id());
        SystemSetting::set('image_generate_webp', $validated['generate_webp'] ? '1' : '0', 'optimization', false, auth()->id());

        return back()->with('success', 'Image optimization settings updated');
    }

    /**
     * SYSTEM: Background Jobs & Queues
     */
    public function queues(Request $request): Response
    {
        Gate::authorize('manage-system-settings');

        $driver = config('queue.default', 'redis');
        $redisConnected = $this->probeSocket('127.0.0.1', (int) env('REDIS_PORT', 6379));

        $backlogRealtime = 0;
        $backlogDefault = 0;
        $backlogMedia = 0;

        if ($driver === 'redis' && $redisConnected) {
            try {
                $backlogRealtime = \Illuminate\Support\Facades\Queue::connection('redis')->size('realtime');
                $backlogDefault = \Illuminate\Support\Facades\Queue::connection('redis')->size('default');
                $backlogMedia = \Illuminate\Support\Facades\Queue::connection('redis')->size('media');
            } catch (\Throwable $e) {
                // Ignore
            }
        } else {
            $backlogDefault = DB::table('jobs')->count();
        }

        $jobsPending = $backlogRealtime + $backlogDefault + $backlogMedia;
        $jobsFailed = DB::table('failed_jobs')->count();
        $recentFailed = DB::table('failed_jobs')
            ->select('id', 'connection', 'queue', 'payload', 'exception', 'failed_at')
            ->latest('failed_at')
            ->take(10)
            ->get()
            ->map(function ($job) {
                $payload = json_decode($job->payload, true);
                return [
                    'id' => $job->id,
                    'queue' => $job->queue,
                    'displayName' => $payload['displayName'] ?? 'Unknown Job',
                    'failed_at' => $job->failed_at,
                    'error_snippet' => substr($job->exception, 0, 150) . '...',
                ];
            });

        return Inertia::render('settings/system/queues', [
            'queues' => [
                'driver' => $driver,
                'redis_connected' => $redisConnected,
                'realtime_queue' => config('broadcasting.queue', env('BROADCAST_QUEUE', 'realtime')),
                'default_queue' => 'default',
                'media_queue' => 'media',
                'backlog_realtime' => $backlogRealtime,
                'backlog_default' => $backlogDefault,
                'backlog_media' => $backlogMedia,
                'jobs_pending' => $jobsPending,
                'jobs_failed' => $jobsFailed,
                'recent_failed' => $recentFailed,
            ],
        ]);
    }

    public function retryFailedJobs(Request $request): RedirectResponse
    {
        Gate::authorize('manage-system-settings');

        Artisan::call('queue:retry', ['id' => ['all']]);

        return back()->with('success', 'Retried all failed jobs');
    }

    public function clearFailedJobs(Request $request): RedirectResponse
    {
        Gate::authorize('manage-system-settings');

        Artisan::call('queue:flush');

        return back()->with('success', 'Cleared all failed jobs');
    }

    /**
     * SYSTEM: System Health & Diagnostics
     */
    public function health(Request $request): Response
    {
        Gate::authorize('manage-system-settings');

        $dbConnected = false;
        $dbVersion = 'Unknown';
        try {
            $row = DB::select('SELECT VERSION() as version');
            $dbConnected = true;
            $dbVersion = $row[0]->version ?? 'MariaDB/MySQL';
        } catch (\Throwable $e) {
            $dbConnected = false;
        }

        $reverbRunning = $this->probeSocket('127.0.0.1', (int) env('REVERB_SERVER_PORT', 8080));
        $redisConnected = $this->probeSocket('127.0.0.1', (int) env('REDIS_PORT', 6379));
        $minioConnected = $this->probeSocket('127.0.0.1', 9500);

        $diagnostics = [
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'server_os' => PHP_OS_FAMILY,
            'environment' => app()->environment(),
            'database_connected' => $dbConnected,
            'database_version' => $dbVersion,
            'redis_connected' => $redisConnected,
            'minio_connected' => $minioConnected,
            'reverb_running' => $reverbRunning,
            'reverb_endpoint' => 'wss://' . env('VITE_REVERB_HOST', 'angora.test') . ':' . env('VITE_REVERB_PORT', 443),
            'storage_driver' => config('filesystems.default', 's3'),
            'queue_driver' => config('queue.default', 'redis'),
            'realtime_queue' => config('broadcasting.queue', 'realtime'),
            'gd_loaded' => extension_loaded('gd'),
            'imagick_loaded' => extension_loaded('imagick'),
            'sockets_loaded' => extension_loaded('sockets'),
            'openssl_loaded' => extension_loaded('openssl'),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time') . 's',
            'upload_max_filesize' => ini_get('upload_max_filesize'),
        ];

        return Inertia::render('settings/system/health', [
            'diagnostics' => $diagnostics,
        ]);
    }

    /**
     * DATA & SECURITY: Security Policies
     */
    public function security(Request $request): Response
    {
        $policy = SystemSetting::get('security_policy', [
            'session_lifetime' => config('session.lifetime', 120),
            'require_2fa' => false,
            'min_password_length' => 8,
            'rate_limit_login' => 5,
        ]);

        return Inertia::render('settings/security', [
            'policy' => $policy,
            'canManage' => $request->user()->isSuperAdmin() || $request->user()->hasPermission('system.settings.manage'),
        ]);
    }

    public function updateSecurity(Request $request): RedirectResponse
    {
        Gate::authorize('manage-system-settings');

        $validated = $request->validate([
            'session_lifetime' => 'required|integer|min:15|max:1440',
            'require_2fa' => 'boolean',
            'min_password_length' => 'required|integer|min:8|max:32',
            'rate_limit_login' => 'required|integer|min:3|max:20',
        ]);

        SystemSetting::set('security_policy', $validated, 'security', false, auth()->id(), 'System security and session policies');

        return back()->with('success', 'Security policy updated');
    }

    /**
     * Helper to probe TCP socket with short timeout
     */
    private function probeSocket(string $host, int $port, int $timeout = 1): bool
    {
        try {
            $fp = @fsockopen($host, $port, $errno, $errstr, $timeout);
            if ($fp) {
                fclose($fp);
                return true;
            }
            return false;
        } catch (\Throwable $e) {
            return false;
        }
    }
}
