<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;

class WorkspacePolicy
{
    /**
     * Perform pre-authorization checks. Super admin can do anything if active.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->status === 'inactive' || $user->status === 'suspended') {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can view any workspaces.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the workspace.
     */
    public function view(User $user, Workspace $workspace): bool
    {
        if ($workspace->owner_id === $user->id) {
            return true;
        }

        return $workspace->members()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can create workspaces.
     */
    public function create(User $user): bool
    {
        return in_array($user->primaryRoleName(), ['super_admin', 'admin', 'project_manager', 'account_manager'], true);
    }

    /**
     * Determine whether the user can update the workspace.
     */
    public function update(User $user, Workspace $workspace): bool
    {
        if ($user->primaryRoleName() === 'designer') {
            return false;
        }

        if ($workspace->owner_id === $user->id) {
            return true;
        }

        $membership = $workspace->members()->where('user_id', $user->id)->first();
        return $membership && in_array($membership->role, ['owner', 'admin'], true);
    }

    /**
     * Determine whether the user can delete the workspace.
     */
    public function delete(User $user, Workspace $workspace): bool
    {
        if ($user->primaryRoleName() === 'designer') {
            return false;
        }

        return $workspace->owner_id === $user->id;
    }

    /**
     * Determine whether the user can manage members in the workspace.
     */
    public function manageMembers(User $user, Workspace $workspace): bool
    {
        if ($user->primaryRoleName() === 'designer') {
            return false;
        }

        if ($workspace->owner_id === $user->id) {
            return true;
        }

        $membership = $workspace->members()->where('user_id', $user->id)->first();
        return $membership && in_array($membership->role, ['owner', 'admin'], true);
    }
}
