<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleSwitchController extends Controller
{
    public function switchRole(Request $request)
    {
        abort_unless(app()->environment('local', 'testing'), 403, 'Role switching is strictly forbidden in production.');

        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $user = User::findOrFail($request->user_id);
        Auth::login($user);

        AuditLog::log(
            action: 'ROLE_PERSONA_SWITCH',
            department: $user->department,
            entityType: 'User',
            entityId: $user->id,
            description: "Switched active test persona to {$user->name} ({$user->role})"
        );

        return back()->with('success', "Switched persona to {$user->name} ({$user->role})");
    }
}
