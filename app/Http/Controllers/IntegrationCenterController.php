<?php

namespace App\Http\Controllers;

use App\Models\ThirdPartyIntegration;
use App\Services\IntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationCenterController extends Controller
{
    public function __construct(
        protected IntegrationService $integrationService
    ) {}

    /**
     * Integrations Center Gallery
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $integrations = $this->integrationService->getIntegrations($user->current_workspace_id);

        return Inertia::render('integrations/index', [
            'integrations' => $integrations,
        ]);
    }

    /**
     * Connect third-party service
     */
    public function connect(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => 'required|in:google_drive,slack,github,figma,canva',
            'account_identifier' => 'nullable|string',
            'api_token' => 'nullable|string',
            'client_id' => 'nullable|string',
            'client_secret' => 'nullable|string',
        ]);

        $user = $request->user();
        $credentials = [
            'api_token' => $validated['api_token'] ?? null,
            'client_id' => $validated['client_id'] ?? null,
            'client_secret' => $validated['client_secret'] ?? null,
        ];

        $integration = $this->integrationService->connect(
            $user,
            $validated['provider'],
            $credentials,
            $validated['account_identifier'] ?? 'Active Connection',
            $user->current_workspace_id
        );

        return response()->json([
            'success' => true,
            'message' => "Connected {$integration->name} successfully.",
            'integration' => $integration,
        ]);
    }

    /**
     * Disconnect third-party service
     */
    public function disconnect(Request $request, int $id): JsonResponse
    {
        $integration = ThirdPartyIntegration::where('id', $id)
            ->where('workspace_id', $request->user()->current_workspace_id)
            ->firstOrFail();

        $this->integrationService->disconnect($integration);

        return response()->json([
            'success' => true,
            'message' => "Disconnected {$integration->name}.",
        ]);
    }
}
