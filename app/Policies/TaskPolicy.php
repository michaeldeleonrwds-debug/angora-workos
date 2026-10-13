<?php

namespace App\Policies;

use App\Models\KanbanTask;
use App\Models\User;

class TaskPolicy
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
     * Determine whether the user can view the task.
     */
    public function view(User $user, KanbanTask $task): bool
    {
        $board = $task->board;
        if (!$board) {
            return false;
        }

        if (!$user->can('view', $board)) {
            return false;
        }

        // Clients must be assigned or have explicit access to client-visible tasks
        if ($user->role === 'client') {
            return $task->assigned_to === $user->id || $task->created_by === $user->id;
        }

        return true;
    }

    /**
     * Determine whether the user can create tasks on a board.
     */
    public function create(User $user, KanbanTask $task): bool
    {
        $board = $task->board;
        if (!$board) {
            return false;
        }

        if (in_array($user->role, ['client', 'guest'], true)) {
            return false;
        }

        $boardMember = $board->members()->where('user_id', $user->id)->first();
        if ($boardMember && $boardMember->role === 'viewer') {
            return false;
        }

        return $user->can('view', $board);
    }

    /**
     * Determine whether the user can update the task.
     */
    public function update(User $user, KanbanTask $task): bool
    {
        $board = $task->board;
        if (!$board) {
            return false;
        }

        // Clients/Guests cannot update arbitrary tasks unless assigned or permitted
        if (in_array($user->role, ['client', 'guest'], true)) {
            return $task->assigned_to === $user->id || $task->created_by === $user->id;
        }

        // Board viewers cannot edit tasks unless assigned
        $boardMember = $board->members()->where('user_id', $user->id)->first();
        if ($boardMember && $boardMember->role === 'viewer') {
            return $task->assigned_to === $user->id;
        }

        return $user->can('view', $board);
    }

    /**
     * Determine whether the user can delete the task.
     */
    public function delete(User $user, KanbanTask $task): bool
    {
        if (in_array($user->role, ['client', 'guest'], true)) {
            return false;
        }

        if ($task->created_by === $user->id) {
            return true;
        }

        $board = $task->board;
        if (!$board) {
            return false;
        }

        return $user->can('update', $board);
    }
}
