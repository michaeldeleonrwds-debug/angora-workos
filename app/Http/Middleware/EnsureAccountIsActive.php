<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    /**
     * Handle an incoming request.
     *
     * Ensures that authenticated users with 'inactive' or 'suspended' status
     * immediately lose access to all protected functionality and their session is invalidated.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();

            if ($user->status === 'inactive' || $user->status === 'suspended') {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => 'Your account has been deactivated or suspended. Please contact your administrator.',
                    ], 403);
                }

                return redirect()->route('login')->withErrors([
                    'email' => 'Your account has been deactivated or suspended. Please contact your administrator.',
                ]);
            }
        }

        return $next($request);
    }
}
