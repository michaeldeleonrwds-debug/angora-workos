<?php

namespace App\Http\Middleware;

use App\Models\ApiRequestLog;
use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next, ?string $requiredScope = null): Response
    {
        $startTime = microtime(true);

        $plainTextToken = $request->bearerToken() ?? $request->query('api_token');

        if (!$plainTextToken) {
            return response()->json([
                'success' => false,
                'message' => 'Missing API token. Please provide Bearer token in Authorization header.',
                'error_code' => 'UNAUTHORIZED',
            ], 401);
        }

        $hash = hash('sha256', $plainTextToken);
        $apiToken = ApiToken::with('user')->where('token_hash', $hash)->first();

        if (!$apiToken || !$apiToken->isValid()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid, expired, or revoked API token.',
                'error_code' => 'INVALID_TOKEN',
            ], 401);
        }

        // Check required scope
        if ($requiredScope && !$apiToken->hasScope($requiredScope)) {
            return response()->json([
                'success' => false,
                'message' => "Insufficient token scope. Required: {$requiredScope}",
                'error_code' => 'FORBIDDEN_SCOPE',
            ], 403);
        }

        // Authenticate as token's user
        Auth::setUser($apiToken->user);
        $request->attributes->set('api_token', $apiToken);

        // Update token last used
        $apiToken->update([
            'last_used_at' => now(),
            'last_used_ip' => $request->ip(),
        ]);

        /** @var Response $response */
        $response = $next($request);

        // Record API request log
        $durationMs = (int) round((microtime(true) - $startTime) * 1000);
        ApiRequestLog::create([
            'api_token_id' => $apiToken->id,
            'user_id' => $apiToken->user_id,
            'method' => $request->method(),
            'path' => $request->path(),
            'ip' => $request->ip(),
            'status_code' => $response->getStatusCode(),
            'response_time_ms' => $durationMs,
        ]);

        return $response;
    }
}
