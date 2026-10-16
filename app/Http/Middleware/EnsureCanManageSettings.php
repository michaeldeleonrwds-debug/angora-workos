<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCanManageSettings
{
    /**
     * Handle an incoming request.
     *
     * Ensures unauthorized users are redirected away from privileged settings pages
     * rather than seeing a 403 error page.
     */
    public function handle(Request $request, Closure $next, string $gate = 'manage-workspace-settings'): Response
    {
        $user = $request->user();

        if (!$user || $user->cannot($gate)) {
            if ($request->isMethod('GET')) {
                return redirect()->route('profile.edit');
            }

            abort(403, "You don't have permission to perform this action.");
        }

        return $next($request);
    }
}
