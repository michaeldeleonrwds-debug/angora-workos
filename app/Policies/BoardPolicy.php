<?php

namespace App\Policies;

use App\Models\KanbanBoard;
use App\Models\User;

class BoardPolicy
{
    /**
     * Perform pre-authorization checks. Super admin can do anything.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can view the board.
     */
    public function view(User $user, KanbanBoard $board): bool
    {
        // Board belongs to a workspace
        $workspace = $board->workspace;
        if (!$workspace) {
            return true;
        }

        // Must have access to the workspace
        $isWorkspaceMember = $workspace->owner_id === $user->id
            || $workspace->members()->where('user_id', $user->id)->exists();

        if (!$isWorkspaceMember) {
            return false;
        }

        // If private board, must be creator or workspace owner/admin
        if ($board->visibility === 'private') {
            if ($board->created_by === $user->id || $workspace->owner_id === $user->id) {
                return true;
            }

            $membership = $workspace->members()->where('user_id', $user->id)->first();
            return $membership && in_array($membership->role, ['owner', 'admin'], true);
        }

        return true;
    }

    /**
     * Determine whether the user can create boards in a workspace.
     */
    public function create(User $user, $workspace = null): bool
    {
        if (in_array($user->role, ['client', 'guest'], true)) {
            return false;
        }

        if ($workspace) {
            if ($workspace->owner_id === $user->id) {
                return true;
            }
            $membership = $workspace->members()->where('user_id', $user->id)->first();
            return $membership && in_array($membership->role, ['owner', 'admin', 'member'], true);
        }

        return true;
    }

    /**
     * Determine whether the user can update the board.
     */
    public function update(User $user, KanbanBoard $board): bool
    {
        if ($board->created_by === $user->id) {
            return true;
        }

        $workspace = $board->workspace;
        if ($workspace) {
            if ($workspace->owner_id === $user->id) {
                return true;
            }
            $membership = $workspace->members()->where('user_id', $user->id)->first();
            return $membership && in_array($membership->role, ['owner', 'admin'], true);
        }

        return false;
    }

    /**
     * Determine whether the user can delete the board.
     */
    public function delete(User $user, KanbanBoard $board): bool
    {
        if ($board->created_by === $user->id) {
            return true;
        }

        $workspace = $board->workspace;
        if ($workspace) {
            if ($workspace->owner_id === $user->id) {
                return true;
            }
            $membership = $workspace->members()->where('user_id', $user->id)->first();
            return $membership && in_array($membership->role, ['owner', 'admin'], true);
        }

        return false;
    }

    /**
     * Determine whether the user can duplicate the board.
     */
    public function duplicate(User $user, KanbanBoard $board): bool
    {
        return $this->view($user, $board) && $this->create($user, $board->workspace);
    }
}
