<?php

namespace App\Policies;

use App\Models\User;
use App\Models\RbacRole;
use App\Services\Authorization\RbacGovernanceService;

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

        return null;
    }

    /**
     * Determine whether the user can view the list of users.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('workos.users.view');
    }

    /**
     * Determine whether the user can view a specific user.
     */
    public function view(User $user, User $model): bool
    {
        if ($user->id === $model->id) {
            return true;
        }

        return $user->hasPermission('workos.users.view');
    }

    /**
     * Determine whether the user can create/invite users.
     */
    public function create(User $user): bool
    {
        return app(RbacGovernanceService::class)->canManage($user);
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
        if ($model->hasAnyRole('super_admin', 'admin') && !$user->isSuperAdmin()) {
            return false;
        }

        return app(RbacGovernanceService::class)->canManage($user);
    }

    /**
     * Determine whether the user can assign roles (prevent privilege escalation).
     */
    public function assignRole(User $user, string $targetRole, ?User $targetUser = null): bool
    {
        $role = RbacRole::findByName($targetRole, 'web');

        return app(RbacGovernanceService::class)->canAssignRole($user, $role, $targetUser);
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
        if ($model->hasAnyRole('super_admin', 'admin') && !$user->isSuperAdmin()) {
            return false;
        }

        return app(RbacGovernanceService::class)->canManage($user);
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
