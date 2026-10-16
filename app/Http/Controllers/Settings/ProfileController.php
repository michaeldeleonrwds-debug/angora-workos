<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return to_route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /**
     * Upload or update the user's profile avatar.
     */
    public function updateAvatar(Request $request): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'file', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        $file = $request->file('avatar');

        // Verify it is a valid image via getimagesize
        $imageInfo = @getimagesize($file->getRealPath());
        if ($imageInfo === false) {
            return back()->withErrors(['avatar' => 'The uploaded file is not a valid image.']);
        }

        $user = $request->user();

        // Delete old avatar if stored locally
        $this->deleteStoredAvatar($user);

        // Store new file in default storage disk using logical user avatar key
        $extension = $file->getClientOriginalExtension() ?: 'png';
        $diskName = config('filesystems.default', 'public');
        $path = \App\Services\StorageKeyService::userAvatarKey($user->id, $extension);
        \Illuminate\Support\Facades\Storage::disk($diskName)->put($path, $file->getContent());

        $user->avatar = $path;
        $user->avatar_url = $path;
        $user->save();

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Avatar updated successfully',
                'avatar_url' => $user->avatar_url,
            ]);
        }

        return back()->with('status', 'avatar-updated');
    }

    /**
     * Remove the user's profile avatar.
     */
    public function destroyAvatar(Request $request): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $user = $request->user();

        $this->deleteStoredAvatar($user);

        $user->avatar = null;
        $user->avatar_url = null;
        $user->save();

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Avatar removed successfully',
            ]);
        }

        return back()->with('status', 'avatar-deleted');
    }

    /**
     * Helper to safely remove stored avatar from public disk.
     */
    protected function deleteStoredAvatar($user): void
    {
        $rawPath = $user->getRawOriginal('avatar') ?? $user->getRawOriginal('avatar_url');
        if ($rawPath && !str_starts_with($rawPath, 'http://') && !str_starts_with($rawPath, 'https://') && !str_starts_with($rawPath, 'data:')) {
            $cleanPath = preg_replace('#^/?storage/#', '', $rawPath);
            $diskName = config('filesystems.default', 'public');
            if (\Illuminate\Support\Facades\Storage::disk($diskName)->exists($cleanPath)) {
                \Illuminate\Support\Facades\Storage::disk($diskName)->delete($cleanPath);
            }
            if ($diskName !== 'public' && \Illuminate\Support\Facades\Storage::disk('public')->exists($cleanPath)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($cleanPath);
            }
        }
    }
}
