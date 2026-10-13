<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BoardMember;
use App\Models\User;
use App\Models\UserInvitation;
use App\Models\WorkspaceMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;

class InvitationRedemptionController extends Controller
{
    /**
     * Show the invitation redemption page.
     */
    public function show(string $token)
    {
        $invitation = UserInvitation::with(['workspace:id,name', 'board:id,title', 'inviter:id,name'])
            ->where('token', $token)
            ->first();

        if (!$invitation || !$invitation->isPending()) {
            return Inertia::render('auth/invitation-invalid', [
                'message' => $invitation && $invitation->isExpired()
                    ? 'This invitation link has expired. Please request a new invitation.'
                    : 'This invitation is invalid or has already been redeemed.',
            ]);
        }

        return Inertia::render('auth/accept-invitation', [
            'invitation' => $invitation,
        ]);
    }

    /**
     * Accept the invitation and activate account.
     */
    public function accept(Request $request, string $token)
    {
        $invitation = UserInvitation::where('token', $token)->first();

        if (!$invitation || !$invitation->isPending()) {
            return back()->with('error', 'Invitation is invalid or has expired.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $invitation->email,
            'password' => Hash::make($validated['password']),
            'role' => $invitation->role,
            'department' => 'Operations',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        // Auto-join invited workspace if designated
        if ($invitation->workspace_id) {
            WorkspaceMember::firstOrCreate([
                'workspace_id' => $invitation->workspace_id,
                'user_id' => $user->id,
            ], [
                'role' => in_array($user->role, ['super_admin', 'admin']) ? 'admin' : 'member',
            ]);
        }

        // Auto-join invited board if designated
        if ($invitation->board_id) {
            BoardMember::firstOrCreate([
                'board_id' => $invitation->board_id,
                'user_id' => $user->id,
            ], [
                'role' => in_array($user->role, ['super_admin', 'admin']) ? 'admin' : ($user->role === 'guest' ? 'guest' : 'editor'),
            ]);
        }

        // Mark invitation redeemed
        $invitation->update(['accepted_at' => now()]);

        AuditLog::log(
            action: 'INVITATION_ACCEPTED',
            department: $user->department,
            entityType: 'User',
            entityId: $user->id,
            description: "Accepted invitation for role {$user->role}"
        );

        Auth::login($user);

        return redirect()->route('dashboard')->with('success', 'Welcome to Angora Work OS!');
    }
}
