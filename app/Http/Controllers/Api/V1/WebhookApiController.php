<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookApiController extends Controller
{
    public function __construct(
        protected WebhookService $webhookService
    ) {}

    /**
     * Inbound webhook receiver
     */
    public function handleIncoming(Request $request, string $service): JsonResponse
    {
        $payload = $request->all();
        $event = $request->header('X-GitHub-Event') ?? $request->header('X-Event-Key') ?? $request->input('event', 'generic.ping');
        $idempotencyKey = $request->header('X-Idempotency-Key') ?? $request->header('X-GitHub-Delivery') ?? md5($service . json_encode($payload));

        $log = $this->webhookService->processIncoming($service, $event, $payload, $idempotencyKey);

        return response()->json([
            'success' => true,
            'message' => 'Incoming webhook received and processed.',
            'log_id' => $log->id,
            'status' => $log->status,
        ], 200);
    }
}
