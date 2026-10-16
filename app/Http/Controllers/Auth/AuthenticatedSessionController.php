<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        $testAccounts = [];
        if (app()->environment(['local', 'testing'])) {
            $testAccounts = \App\Models\User::query()
                ->where('status', 'active')
                ->orderBy('id')
                ->get()
                ->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'department' => $u->department ?? 'General',
                    'role' => $u->primaryRoleName() ?? ($u->isClientUser() ? 'client' : 'guest'),
                ])
                ->values();
        }

        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'canRegister' => Route::has('register'),
            'status' => $request->session()->get('status'),
            'isLocalEnv' => app()->environment(['local', 'testing']),
            'testAccounts' => $testAccounts,
        ]);
    }

    /**
     * Handle development quick login (local environment only).
     */
    public function quickLogin(Request $request): RedirectResponse
    {
        abort_unless(app()->environment(['local', 'testing']), 403, 'Quick login is strictly limited to local development.');

        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $user = \App\Models\User::findOrFail($request->user_id);
        abort_if($user->isSuperAdmin() && $request->user() && ! $request->user()->isSuperAdmin(), 403);
        abort_if($user->status === 'inactive' || $user->status === 'suspended', 403, 'Cannot quick-login to a deactivated or suspended account.');

        Auth::login($user);
        $request->session()->regenerate();

        \App\Models\AuditLog::log(
            action: 'DEV_QUICK_LOGIN',
            department: $user->department,
            entityType: 'User',
            entityId: $user->id,
            description: "Development Quick Login as {$user->name} ({$user->primaryRoleName()})"
        );

        if ($user->isClientUser()) {
            return redirect()->intended(route('client-portal.dashboard', absolute: false));
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();
        if ($user && $user->isClientUser()) {
            return redirect()->intended(route('client-portal.dashboard', absolute: false));
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
