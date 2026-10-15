<?php

namespace App\Policies;

use App\Models\KanbanBoard;
use App\Models\User;

class BoardPolicy
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
     * Determine whether the user can view the board.
     */
    public function view(User $user, KanbanBoard $board): bool
    {
        $workspace = $board->workspace;
        if (!$workspace) {
            return (int) $board->created_by === (int) $user->id
                || $board->members()->where('user_id', $user->id)->exists();
        }

        // If board member explicitly exists in board_members table
        $boardMembership = $board->members()->where('user_id', $user->id)->first();
        if ($boardMembership) {
            return true;
        }

        // Clients cannot access standard internal boards unless explicitly invited in board_members
        if ($user->primaryRoleName() === 'client') {
            return false;
        }

        // Must have access to the workspace
        $isWorkspaceMember = $workspace->owner_id === $user->id
            || $workspace->members()->where('user_id', $user->id)->exists();

        if (!$isWorkspaceMember) {
            return false;
        }

        // If private board, must be creator, workspace owner/admin, or explicitly invited in board_members / settings
        if ($board->visibility === 'private') {
            if ($board->created_by === $user->id || $workspace->owner_id === $user->id) {
                return true;
            }

            $invitedUserIds = $board->settings['invited_user_ids'] ?? $board->settings['member_ids'] ?? [];
            if (is_array($invitedUserIds) && in_array($user->id, $invitedUserIds, false)) {
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
        if (! $user->hasPermission('workos.boards.manage')) {
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
        if (! $user->hasPermission('workos.boards.manage') || ! $this->view($user, $board)) {
            return false;
        }

        if ($board->created_by === $user->id) {
            return true;
        }

        $boardMember = $board->members()->where('user_id', $user->id)->first();
        if ($boardMember && in_array($boardMember->role, ['owner', 'admin', 'editor'], true)) {
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
     * Determine whether the user can manage workflow statuses/stages on the board.
     */
    public function manageStatuses(User $user, KanbanBoard $board): bool
    {
        if (! $user->hasPermission('workos.boards.manage')) {
            return false;
        }

        return $this->update($user, $board);
    }

    /**
     * Determine whether the user can manage dynamic columns on the board.
     */
    public function manageColumns(User $user, KanbanBoard $board): bool
    {
        if (! $user->hasPermission('workos.boards.manage')) {
            return false;
        }

        return $this->update($user, $board);
    }

    /**
     * Determine whether the user can manage task groups on the board.
     */
    public function manageGroups(User $user, KanbanBoard $board): bool
    {
        if (! $user->hasPermission('workos.boards.manage')) {
            return false;
        }

        return $this->update($user, $board);
    }

    /**
     * Determine whether the user can manage automations on the board.
     */
    public function manageAutomations(User $user, KanbanBoard $board): bool
    {
        if (! $user->hasPermission('workos.boards.manage')) {
            return false;
        }

        return $this->update($user, $board);
    }

    /**
     * Determine whether the user can export board data, delivery metrics, or workload reports.
     */
    public function export(User $user, KanbanBoard $board): bool
    {
        if (! $user->hasPermission('workos.tasks.export')) {
            return false;
        }

        return $this->view($user, $board);
    }

    /**
     * Determine whether the user can delete the board.
     */
    public function delete(User $user, KanbanBoard $board): bool
    {
        if (! $user->hasPermission('workos.boards.manage')) {
            return false;
        }

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

    /**
     * Determine whether the user can manage members on the board.
     */
    public function manageMembers(User $user, KanbanBoard $board): bool
    {
        if (! $user->hasPermission('workos.boards.manage')) {
            return false;
        }

        if ($board->created_by === $user->id) {
            return true;
        }

        $boardMember = $board->members()->where('user_id', $user->id)->first();
        if ($boardMember && in_array($boardMember->role, ['owner', 'admin'], true)) {
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
}
