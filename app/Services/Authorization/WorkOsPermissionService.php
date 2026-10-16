<?php

namespace App\Services\Authorization;

use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\User;

class WorkOsPermissionService
{
    /**
     * Build the board UI permissions from registered capabilities and resource policies.
     *
     * @return array<string, bool>
     */
    public function getBoardPermissions(User $user, ?KanbanBoard $board = null): array
    {
        $canView = $board !== null && $user->can('view', $board);
        $canManageBoard = $canView
            && $user->hasPermission('workos.boards.manage')
            && $user->can('update', $board);
        $canEditTasks = $canView && ($user->hasPermission('workos.tasks.update') || $canManageBoard);
        $canMoveAny = $canView && $user->hasPermission('workos.tasks.move.any');
        $canMoveAssigned = $canView && $user->hasPermission('workos.tasks.move.assigned');

        return [
            'canView' => $canView,
            'canCreateTask' => $canView && $user->can('create', [KanbanTask::class, $board]),
            'canEditTask' => $canEditTasks,
            'canEditProgress' => false,
            'canChangeStatus' => $canMoveAny,
            'canMoveAssignedTask' => $canMoveAssigned || $canMoveAny,
            'canAssignUsers' => $canEditTasks,
            'canChangeDeadlines' => $canEditTasks,
            'canChangePriority' => $canEditTasks,
            'canDeleteTask' => $canView && $user->hasPermission('workos.tasks.delete'),
            'canViewAllTasks' => $canView && $user->hasPermission('workos.tasks.filter.any'),
            'canFilterPersonalTasks' => $canView && $user->hasPermission('workos.tasks.filter.personal'),
            'canManageBoard' => $canManageBoard,
            'canManageColumns' => $canManageBoard,
            'canManageGroups' => $canManageBoard,
            'canManageAutomations' => $canManageBoard,
            'canManageBlueprints' => $canManageBoard,
            'canManageDependencies' => $canEditTasks,
            'canManageRecurrence' => $canEditTasks,
            'canApproveReview' => $canView && $user->hasPermission('workos.tasks.review.decide'),
            'canExport' => $canView && $user->can('export', $board),
        ];
    }

    /**
     * Recognize assignments on the task and eligible child work categories.
     */
    public function isTaskAssignedToUser(KanbanTask $task, User|int|null $user): bool
    {
        return $task->isAssignedTo($user);
    }
}
