<?php

namespace App\Services\Authorization;

use App\Models\RbacPermission;
use App\Models\RbacRole;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RbacGovernanceService
{
    public function canManage(User $actor): bool
    {
        return $actor->status === 'active'
            && ($actor->isSuperAdmin()
                || ($actor->hasRole('admin') && $actor->hasPermission('rbac.manage')));
    }

    public function canManageRole(User $actor, RbacRole $role): bool
    {
        return $this->canManage($actor)
            && ($actor->isSuperAdmin()
                ? $role->name !== 'super_admin'
                : ! $role->is_protected && ! $this->hasNonDelegableGrant($role));
    }

    public function canAssignRole(User $actor, RbacRole $role, ?User $target = null): bool
    {
        if (! $this->canManage($actor)) {
            return false;
        }

        if ($target && $target->hasAnyRole('super_admin', 'admin') && ! $actor->isSuperAdmin()) {
            return false;
        }

        if ($target && $target->id === $actor->id && ! $actor->isSuperAdmin()) {
            return false;
        }

        if (! $actor->isSuperAdmin() && ($role->is_protected || $this->hasNonDelegableGrant($role))) {
            return false;
        }

        return true;
    }

    public function canDelegate(User $actor, RbacPermission $permission): bool
    {
        return $this->canManage($actor)
            && ! $permission->is_protected
            && ($actor->isSuperAdmin() || $permission->is_delegable);
    }

    private function hasNonDelegableGrant(RbacRole $role): bool
    {
        return $role->permissions()
            ->where(fn ($query) => $query->where('is_protected', true)->orWhere('is_delegable', false))
            ->exists();
    }

    public function assertLastActiveSuperAdminSafe(User $target, ?string $newRole = null, ?string $newStatus = null): void
    {
        if (! $target->isSuperAdmin() ||
            ($newRole === null || $newRole === 'super_admin') &&
            ($newStatus === null || $newStatus === 'active')) {
            return;
        }

        $activeCount = User::role('super_admin')->where('status', 'active')->lockForUpdate()->count();
        abort_if($activeCount <= 1 && $target->status === 'active', 403, 'The last active Super Admin cannot be removed.');
    }
}
