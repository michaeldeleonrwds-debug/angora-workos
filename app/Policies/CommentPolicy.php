<?php

namespace App\Policies;

use App\Models\KanbanComment;
use App\Models\User;

class CommentPolicy
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
     * Determine whether the user can create comments on a task.
     */
    public function create(User $user, KanbanComment $comment): bool
    {
        $task = $comment->task;
        return $task && $user->can('view', $task);
    }

    /**
     * Determine whether the user can delete the comment.
     */
    public function delete(User $user, KanbanComment $comment): bool
    {
        if ($comment->user_id === $user->id) {
            return true;
        }

        $task = $comment->task;
        if ($task && $task->board) {
            return $user->can('update', $task->board);
        }

        return false;
    }
}
