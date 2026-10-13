<?php

namespace App\Policies;

use App\Models\KanbanAttachment;
use App\Models\User;

class AttachmentPolicy
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
     * Determine whether the user can view/download the attachment.
     */
    public function view(User $user, KanbanAttachment $attachment): bool
    {
        $task = $attachment->task;
        if (!$task) {
            return false;
        }

        return $user->can('view', $task);
    }

    /**
     * Determine whether the user can upload attachments to the task.
     */
    public function create(User $user, KanbanAttachment $attachment): bool
    {
        $task = $attachment->task;
        if (!$task) {
            return false;
        }

        return $user->can('view', $task);
    }

    /**
     * Determine whether the user can delete the attachment.
     */
    public function delete(User $user, KanbanAttachment $attachment): bool
    {
        if ($attachment->user_id === $user->id) {
            return true;
        }

        $task = $attachment->task;
        if ($task && $task->board) {
            return $user->can('update', $task->board);
        }

        return false;
    }
}
