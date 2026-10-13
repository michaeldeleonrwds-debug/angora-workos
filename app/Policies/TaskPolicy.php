<?php

namespace App\Policies;

use App\Models\KanbanTask;
use App\Models\User;

class TaskPolicy
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
     * Determine whether the user can view the task.
     */
    public function view(User $user, KanbanTask $task): bool
    {
        $board = $task->board;
        if (!$board) {
            return false;
        }

        return $user->can('view', $board);
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

        return $user->can('view', $board);
    }

    /**
     * Determine whether the user can delete the task.
     */
    public function delete(User $user, KanbanTask $task): bool
    {
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
