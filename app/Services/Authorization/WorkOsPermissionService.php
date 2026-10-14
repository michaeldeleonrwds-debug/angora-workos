<?php

namespace App\Services\Authorization;

use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;

class WorkOsPermissionService
{
    /**
     * Build the frontend permissions/capabilities matrix for the current user and board.
     *
     * @return array<string, bool>
     */
    public function getBoardPermissions(User $user, ?KanbanBoard $board = null): array
    {
        if ($user->isSuperAdmin()) {
            return [
                'canView' => true,
                'canCreateTask' => true,
                'canEditTask' => true,
                'canEditProgress' => true,
                'canChangeStatus' => true,
                'canMoveAssignedTask' => true,
                'canAssignUsers' => true,
                'canChangeDeadlines' => true,
                'canChangePriority' => true,
                'canDeleteTask' => true,
                'canManageBoard' => true,
                'canManageColumns' => true,
                'canManageGroups' => true,
                'canManageAutomations' => true,
                'canManageBlueprints' => true,
                'canManageDependencies' => true,
                'canManageRecurrence' => true,
                'canApproveReview' => true,
                'canExport' => true,
            ];
        }

        $role = $user->role;
        $isBoardOwner = $board && $board->created_by === $user->id;
        $boardMember = $board ? $board->members()->where('user_id', $user->id)->first() : null;
        $isBoardAdmin = $boardMember && in_array($boardMember->role, ['owner', 'admin'], true);

        // Designer Role: strictly contributor permissions on assigned items only
        if ($role === 'designer') {
            return [
                'canView' => $board ? $user->can('view', $board) : true,
                'canCreateTask' => false,
                'canEditTask' => false, // Designers cannot edit arbitrary task metadata
                'canEditProgress' => true, // Allowed only on tasks assigned to them
                'canChangeStatus' => false, // Blanket status changes are disallowed
                'canMoveAssignedTask' => true, // Allowed to move and reorder assigned tasks
                'canAssignUsers' => false,
                'canChangeDeadlines' => false,
                'canChangePriority' => false,
                'canDeleteTask' => false,
                'canManageBoard' => false,
                'canManageColumns' => false,
                'canManageGroups' => false,
                'canManageAutomations' => false,
                'canManageBlueprints' => false,
                'canManageDependencies' => false,
                'canManageRecurrence' => false,
                'canApproveReview' => false,
                'canExport' => false,
            ];
        }

        // Project Manager: comprehensive production management
        if (in_array($role, ['admin', 'admin_manager', 'project_manager'], true)) {
            $canManage = $isBoardOwner || $isBoardAdmin || $user->can('update', $board);
            return [
                'canView' => true,
                'canCreateTask' => true,
                'canEditTask' => true,
                'canEditProgress' => true,
                'canChangeStatus' => true,
                'canMoveAssignedTask' => true,
                'canAssignUsers' => true,
                'canChangeDeadlines' => true,
                'canChangePriority' => true,
                'canDeleteTask' => true,
                'canManageBoard' => $canManage,
                'canManageColumns' => true,
                'canManageGroups' => true,
                'canManageAutomations' => true,
                'canManageBlueprints' => true,
                'canManageDependencies' => true,
                'canManageRecurrence' => true,
                'canApproveReview' => true,
                'canExport' => true,
            ];
        }

        // Account Manager: client and production task management within scope
        if ($role === 'account_manager') {
            return [
                'canView' => true,
                'canCreateTask' => true,
                'canEditTask' => true,
                'canEditProgress' => true,
                'canChangeStatus' => true,
                'canMoveAssignedTask' => true,
                'canAssignUsers' => true,
                'canChangeDeadlines' => true,
                'canChangePriority' => true,
                'canDeleteTask' => $isBoardOwner || $isBoardAdmin,
                'canManageBoard' => $isBoardOwner || $isBoardAdmin,
                'canManageColumns' => $isBoardOwner || $isBoardAdmin,
                'canManageGroups' => true,
                'canManageAutomations' => $isBoardOwner || $isBoardAdmin,
                'canManageBlueprints' => false,
                'canManageDependencies' => true,
                'canManageRecurrence' => true,
                'canApproveReview' => true,
                'canExport' => true,
            ];
        }

        // Client / Guest: minimal view or assigned only
        return [
            'canView' => $board ? $user->can('view', $board) : false,
            'canCreateTask' => false,
            'canEditTask' => false,
            'canEditProgress' => false,
            'canChangeStatus' => false,
            'canMoveAssignedTask' => false,
            'canAssignUsers' => false,
            'canChangeDeadlines' => false,
            'canChangePriority' => false,
            'canDeleteTask' => false,
            'canManageBoard' => false,
            'canManageColumns' => false,
            'canManageGroups' => false,
            'canManageAutomations' => false,
            'canManageBlueprints' => false,
            'canManageDependencies' => false,
            'canManageRecurrence' => false,
            'canApproveReview' => false,
            'canExport' => false,
        ];
    }

    /**
     * Check if a task is assigned to a user (via assigned_to or custom_values people arrays).
     */
    public function isTaskAssignedToUser(KanbanTask $task, User|int|null $user): bool
    {
        if (!$user) {
            return false;
        }

        $userId = $user instanceof User ? $user->id : (int) $user;
        if ($userId <= 0) {
            return false;
        }

        // 1. Direct legacy column
        if ((int) $task->assigned_to === $userId) {
            return true;
        }

        // 2. Custom values people columns (designer_ids, person, designer, am, etc.)
        if (is_array($task->custom_values)) {
            foreach ($task->custom_values as $val) {
                if (is_array($val)) {
                    if (in_array($userId, array_map('intval', $val), true)) {
                        return true;
                    }
                } elseif (is_numeric($val) && (int) $val === $userId) {
                    return true;
                }
            }
        }

        // 3. Subtask: inherit parent task assignment or creator
        if ($task->parent_id && $task->parent) {
            if ($this->isTaskAssignedToUser($task->parent, $user) || (int) $task->created_by === $userId) {
                return true;
            }
        }

        return false;
    }
}
