<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        if ($user->status !== 'active' || ! $user->hasPermission($permission)) {
            // Thrown as HttpException so the global handler in bootstrap/app.php
            // can render the standard branded page or JSON payload.
            abort(403, "Access Denied: Your role '{$user->primaryRoleName()}' does not have the required permission '{$permission}' to access this module.");
        }

        return $next($request);
    }
}
