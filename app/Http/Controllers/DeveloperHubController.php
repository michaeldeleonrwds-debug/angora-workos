<?php

namespace App\Http\Controllers;

use App\Models\ApiRequestLog;
use App\Models\ApiToken;
use App\Models\WebhookDelivery;
use App\Models\WebhookSubscription;
use App\Services\WebhookService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeveloperHubController extends Controller
{
    public function __construct(
        protected WebhookService $webhookService
    ) {}

    /**
     * Developer Portal Overview
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $tokens = ApiToken::where('user_id', $user->id)
            ->latest()
            ->get();

        $webhooks = WebhookSubscription::where('workspace_id', $user->current_workspace_id)
            ->withCount('deliveries')
            ->latest()
            ->get();

        $recentDeliveries = WebhookDelivery::with('subscription')
            ->whereHas('subscription', function ($q) use ($user) {
                $q->where('workspace_id', $user->current_workspace_id);
            })
            ->latest()
            ->take(20)
            ->get();

        $recentRequestLogs = ApiRequestLog::where('user_id', $user->id)
            ->latest()
            ->take(20)
            ->get();

        return Inertia::render('developer/index', [
            'tokens' => $tokens,
            'webhooks' => $webhooks,
            'recentDeliveries' => $recentDeliveries,
            'recentRequestLogs' => $recentRequestLogs,
        ]);
    }

    /**
     * Generate personal access token
     */
    public function storeToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'scopes' => 'nullable|array',
            'expires_days' => 'nullable|integer|min:1|max:365',
        ]);

        $user = $request->user();
        $expiresAt = !empty($validated['expires_days']) 
            ? Carbon::now()->addDays($validated['expires_days']) 
            : null;

        $created = ApiToken::createToken(
            $user,
            $validated['name'],
            $validated['scopes'] ?? ['*'],
            $expiresAt,
            $user->current_workspace_id
        );

        return response()->json([
            'success' => true,
            'message' => 'API Token generated successfully. Please copy it immediately as it will not be displayed again.',
            'plain_text_token' => $created['plain_text_token'],
            'token' => $created['token'],
        ], 201);
    }

    /**
     * Revoke personal access token
     */
    public function revokeToken(Request $request, int $tokenId): JsonResponse
    {
        $token = ApiToken::where('id', $tokenId)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $token->update(['is_revoked' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Token has been revoked.',
        ]);
    }

    /**
     * Create webhook subscription
     */
    public function storeWebhook(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'url' => 'required|url',
            'events' => 'required|array|min:1',
        ]);

        $user = $request->user();

        // Check SSRF
        if (!$this->webhookService->isSafeUrl($validated['url'])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid webhook target URL. Target must be a public HTTP/HTTPS endpoint (private loopback/LAN addresses restricted).',
            ], 422);
        }

        $subscription = WebhookSubscription::create([
            'workspace_id' => $user->current_workspace_id,
            'created_by' => $user->id,
            'name' => $validated['name'],
            'url' => $validated['url'],
            'secret' => bin2hex(random_bytes(24)),
            'events' => $validated['events'],
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Webhook subscription registered.',
            'subscription' => $subscription,
        ], 201);
    }

    /**
     * Delete webhook subscription
     */
    public function deleteWebhook(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $subscription = WebhookSubscription::where('id', $id)
            ->where('workspace_id', $user->current_workspace_id)
            ->firstOrFail();

        $subscription->delete();

        return response()->json([
            'success' => true,
            'message' => 'Webhook subscription deleted.',
        ]);
    }

    /**
     * Send test ping to verify webhook endpoint
     */
    public function testWebhook(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $subscription = WebhookSubscription::where('id', $id)
            ->where('workspace_id', $user->current_workspace_id)
            ->firstOrFail();

        $delivery = $this->webhookService->deliver($subscription, 'ping.test', [
            'message' => 'Angora Work OS test webhook payload',
            'triggered_by' => $user->name,
            'timestamp' => now()->toIso8601String(),
        ]);

        return response()->json([
            'success' => $delivery->is_successful,
            'message' => $delivery->is_successful ? 'Test webhook delivered successfully!' : 'Delivery attempted but failed.',
            'delivery' => $delivery,
        ]);
    }
}
