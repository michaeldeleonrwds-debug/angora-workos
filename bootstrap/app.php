<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

if (!getenv('OPENSSL_CONF') || !file_exists((string) getenv('OPENSSL_CONF'))) {
    $defaultOpensslCnf = 'C:/ProgramData/envkit/services/php/8.5.9/extras/ssl/openssl.cnf';
    if (file_exists($defaultOpensslCnf)) {
        putenv("OPENSSL_CONF={$defaultOpensslCnf}");
        $_ENV['OPENSSL_CONF'] = $defaultOpensslCnf;
        $_SERVER['OPENSSL_CONF'] = $defaultOpensslCnf;
    }
}

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            \App\Http\Middleware\EnsureAccountIsActive::class,
        ]);

        $middleware->alias([
            'permission' => \App\Http\Middleware\RequirePermission::class,
            'api.auth' => \App\Http\Middleware\AuthenticateApiToken::class,
            'account.active' => \App\Http\Middleware\EnsureAccountIsActive::class,
            'settings.gate' => \App\Http\Middleware\EnsureCanManageSettings::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $deniedMessage = "You don't have permission to perform this action.";

        $renderDenied = function (Request $request, int $status, string $component, array $props) {
            $isInertia = $request->header('X-Inertia') !== null;
            $isInertiaNavigation = $isInertia
                && $request->isMethod('GET')
                && $request->header('X-Inertia-Partial-Data') === null;

            // Full-page unauthorized navigation renders a branded Angora error
            // page (never a raw Laravel exception page). Inertia SPA visits
            // keep their X-Inertia header so the client swaps to the error page
            // instead of showing the raw "invalid response" overlay.
            if ($isInertiaNavigation || (! $isInertia && ! $request->expectsJson())) {
                $response = Inertia::render($component, $props)->toResponse($request)->setStatusCode($status);

                if ($isInertiaNavigation) {
                    $response->headers->set('X-Inertia', 'true');
                }

                return $response;
            }

            // Async requests (Inertia mutations, partial reloads, fetch) get a
            // safe JSON payload so the client can toast without navigating.
            return response()->json([
                'message' => $props['message'],
                'code' => $status === 403 ? 'permission_denied' : 'action_not_allowed',
            ], $status);
        };

        $exceptions->render(function (AuthorizationException $e, Request $request) use ($renderDenied, $deniedMessage) {
            return $renderDenied($request, 403, 'errors/403', [
                'title' => 'Action Not Permitted',
                'message' => $deniedMessage,
                'status' => 403,
            ]);
        });

        $exceptions->render(function (HttpException $e, Request $request) use ($renderDenied, $deniedMessage) {
            if ($e->getStatusCode() === 403) {
                return $renderDenied($request, 403, 'errors/403', [
                    'title' => 'Action Not Permitted',
                    'message' => $deniedMessage,
                    'status' => 403,
                ]);
            }

            if ($e->getStatusCode() === 422) {
                $message = trim($e->getMessage());

                return $renderDenied($request, 422, 'errors/422', [
                    'title' => 'Action Not Allowed',
                    'message' => $message !== '' ? $message : 'This action is not allowed right now.',
                    'status' => 422,
                ]);
            }
        });
    })->create();
