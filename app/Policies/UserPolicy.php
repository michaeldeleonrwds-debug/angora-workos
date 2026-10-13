<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
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
     * Determine whether the user can view the list of users.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'project_manager', 'account_manager'], true);
    }

    /**
     * Determine whether the user can view a specific user.
     */
    public function view(User $user, User $model): bool
    {
        if ($user->id === $model->id) {
            return true;
        }

        return in_array($user->role, ['super_admin', 'admin', 'project_manager', 'account_manager'], true);
    }

    /**
     * Determine whether the user can create/invite users.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin'], true);
    }

    /**
     * Determine whether the user can update a user.
     */
    public function update(User $user, User $model): bool
    {
        // Users can edit their own profile basic information
        if ($user->id === $model->id) {
            return true;
        }

        // Admins cannot edit Super Admins
        if ($model->isSuperAdmin() && !$user->isSuperAdmin()) {
            return false;
        }

        return in_array($user->role, ['super_admin', 'admin'], true);
    }

    /**
     * Determine whether the user can assign roles (prevent privilege escalation).
     */
    public function assignRole(User $user, string $targetRole): bool
    {
        // Only Super Admin can assign super_admin role
        if ($targetRole === 'super_admin') {
            return $user->isSuperAdmin();
        }

        // Admin can assign other roles, but not super_admin
        return in_array($user->role, ['super_admin', 'admin'], true);
    }

    /**
     * Determine whether the user can suspend or deactivate a user.
     */
    public function suspend(User $user, User $model): bool
    {
        // Cannot suspend yourself
        if ($user->id === $model->id) {
            return false;
        }

        // Cannot suspend super admin unless super admin
        if ($model->isSuperAdmin() && !$user->isSuperAdmin()) {
            return false;
        }

        return in_array($user->role, ['super_admin', 'admin'], true);
    }

    /**
     * Determine whether the user can delete a user.
     */
    public function delete(User $user, User $model): bool
    {
        if ($user->id === $model->id) {
            return false;
        }

        if ($model->isSuperAdmin()) {
            return false;
        }

        return $user->isSuperAdmin();
    }
}
