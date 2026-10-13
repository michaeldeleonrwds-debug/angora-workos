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
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvitationRedemptionController extends Controller
{
    /**
     * Show the invitation redemption page.
     */
    public function show(string $token)
    {
        $invitation = UserInvitation::findByRawToken($token);

        if (!$invitation || !$invitation->isPending()) {
            return Inertia::render('auth/invitation-invalid', [
                'message' => $invitation && $invitation->isExpired()
                    ? 'This invitation link has expired. Please request a new invitation.'
                    : 'This invitation is invalid or has already been redeemed.',
            ]);
        }

        $invitation->load(['workspace:id,name', 'board:id,title', 'inviter:id,name']);

        return Inertia::render('auth/accept-invitation', [
            'invitation' => $invitation,
        ]);
    }

    /**
     * Accept the invitation and activate account with strict concurrency protection.
     */
    public function accept(Request $request, string $token)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        return DB::transaction(function () use ($validated, $token) {
            // Find invitation by hash or token
            $invitationRef = UserInvitation::findByRawToken($token);

            if (!$invitationRef) {
                return redirect()->route('invitations.show', ['token' => $token])
                    ->with('error', 'Invitation is invalid or has expired.');
            }

            // Lock row for update to eliminate race conditions
            $invitation = UserInvitation::where('id', $invitationRef->id)
                ->lockForUpdate()
                ->first();

            if (!$invitation || !$invitation->isPending()) {
                return redirect()->route('invitations.show', ['token' => $token])
                    ->with('error', 'Invitation is invalid, has expired, or has already been redeemed.');
            }

            // Check if user already exists
            if (User::where('email', strtolower($invitation->email))->exists()) {
                $invitation->update(['accepted_at' => now()]);
                return redirect()->route('login')
                    ->with('error', 'An account with this email address already exists. Please log in.');
            }

            // Create user strictly with server-controlled invitation role
            $user = User::create([
                'name' => $validated['name'],
                'email' => strtolower($invitation->email),
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

            // Mark invitation redeemed atomically
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
        });
    }
}
