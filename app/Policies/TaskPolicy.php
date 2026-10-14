<?php

namespace App\Policies;

use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
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
            return $task->isAssignedTo($user) || $task->created_by === $user->id;
        }

        return true;
    }

    /**
     * Determine whether the user can create tasks on a board.
     */
    public function create(User $user, $boardOrTask = null): bool
    {
        // Production contributors and external roles cannot create arbitrary tasks
        if (in_array($user->role, ['designer', 'client', 'guest', 'external_user'], true)) {
            return false;
        }

        $board = $boardOrTask instanceof KanbanBoard
            ? $boardOrTask
            : ($boardOrTask instanceof KanbanTask ? $boardOrTask->board : null);

        if ($board) {
            $boardMember = $board->members()->where('user_id', $user->id)->first();
            if ($boardMember && $boardMember->role === 'viewer') {
                return false;
            }

            if (!$user->can('view', $board)) {
                return false;
            }
        }

        return in_array($user->role, ['admin', 'admin_manager', 'project_manager', 'account_manager'], true);
    }

    /**
     * Determine whether the user can update the task.
     */
    public function update(User $user, KanbanTask $task): bool
    {
        $board = $task->board;
        if (!$board || !$user->can('view', $board)) {
            return false;
        }

        // Clients/Guests cannot update arbitrary tasks unless assigned
        if (in_array($user->role, ['client', 'guest', 'external_user'], true)) {
            return $task->isAssignedTo($user) || $task->created_by === $user->id;
        }

        // Designers can ONLY update tasks they are assigned to
        if ($user->role === 'designer') {
            return $task->isAssignedTo($user);
        }

        // Board viewers cannot edit tasks unless assigned
        $boardMember = $board->members()->where('user_id', $user->id)->first();
        if ($boardMember && $boardMember->role === 'viewer') {
            return $task->isAssignedTo($user);
        }

        // Admin, PM, AM or authorized board members can update
        return in_array($user->role, ['admin', 'admin_manager', 'project_manager', 'account_manager'], true)
            || ($boardMember && in_array($boardMember->role, ['owner', 'admin', 'editor'], true))
            || $board->created_by === $user->id;
    }

    /**
     * Determine whether the user can delete the task.
     */
    public function delete(User $user, KanbanTask $task): bool
    {
        // Designers and external users can never delete tasks
        if (in_array($user->role, ['designer', 'client', 'guest', 'external_user'], true)) {
            return false;
        }

        $board = $task->board;
        if (!$board || !$user->can('view', $board)) {
            return false;
        }

        if (in_array($user->role, ['admin', 'admin_manager', 'project_manager'], true)) {
            return true;
        }

        if ($user->role === 'account_manager' && ($task->created_by === $user->id || $board->created_by === $user->id)) {
            return true;
        }

        return $user->can('update', $board);
    }

    /**
     * Determine whether the user can change workflow status / column (e.g. Kanban drag).
     */
    public function changeStatus(User $user, KanbanTask $task, ?KanbanColumn $targetColumn = null): bool
    {
        if ($user->status === 'inactive' || $user->status === 'suspended') {
            return false;
        }

        if ($user->isSuperAdmin() || in_array($user->role, ['admin', 'admin_manager', 'project_manager'], true)) {
            return true;
        }

        if ($user->role === 'account_manager') {
            return $this->update($user, $task);
        }

        if (in_array($user->role, ['client', 'guest', 'external_user'], true)) {
            return false;
        }

        if ($user->role === 'designer') {
            return $this->canMoveAssignedTask($user, $task, $targetColumn);
        }

        return false;
    }

    /**
     * Determine whether an employee/designer can move their assigned task to a target workflow column.
     */
    public function canMoveAssignedTask(User $user, KanbanTask $task, ?KanbanColumn $targetColumn = null): bool
    {
        if ($user->status === 'inactive' || $user->status === 'suspended') {
            return false;
        }

        // Must be assigned to this user
        if (!$task->isAssignedTo($user)) {
            return false;
        }

        // Board access check
        $board = $task->board;
        if (!$board || !$user->can('view', $board)) {
            return false;
        }

        // If target column is specified, validate destination constraints
        if ($targetColumn) {
            // Must belong to the exact same board
            if ((int) $targetColumn->board_id !== (int) $task->board_id) {
                return false;
            }

            if ($targetColumn->is_archived) {
                return false;
            }

            $destCat = $targetColumn->semantic_category 
                ?: ($targetColumn->category ?? KanbanColumn::categoryForLegacyLabel($targetColumn->title));

            // Blocked tasks cannot advance forward past dependency restrictions
            if ($task->is_blocked && in_array($destCat, ['in_progress', 'in_review', 'completed'], true)) {
                return false;
            }

            // Designers cannot mark tasks completed or cancel tasks directly
            if ($destCat === 'completed' || $destCat === 'cancelled') {
                return false;
            }

            // Valid production transitions:
            // not_started -> in_progress, in_review, blocked
            // in_progress -> in_review, not_started, blocked
            // in_review -> in_progress (rework)
            // blocked -> in_progress, not_started
            // same column (reorder)
            return in_array($destCat, ['not_started', 'in_progress', 'in_review', 'blocked'], true);
        }

        return true;
    }

    /**
     * Determine whether the user can reorder this task.
     */
    public function reorder(User $user, KanbanTask $task): bool
    {
        if ($user->status === 'inactive' || $user->status === 'suspended') {
            return false;
        }

        if ($user->isSuperAdmin() || in_array($user->role, ['admin', 'admin_manager', 'project_manager', 'account_manager'], true)) {
            return true;
        }

        if ($user->role === 'designer') {
            return $task->isAssignedTo($user);
        }

        return false;
    }

    /**
     * Determine whether the user can move task groups.
     */
    public function changeGroup(User $user, KanbanTask $task): bool
    {
        if (in_array($user->role, ['designer', 'client', 'guest', 'external_user'], true)) {
            return false;
        }

        return $this->update($user, $task);
    }

    /**
     * Determine whether the user can manage dependencies for this task.
     */
    public function manageDependencies(User $user, KanbanTask $task): bool
    {
        if (in_array($user->role, ['designer', 'client', 'guest', 'external_user'], true)) {
            return false;
        }

        return in_array($user->role, ['admin', 'admin_manager', 'project_manager', 'account_manager'], true)
            && $this->update($user, $task);
    }

    /**
     * Determine whether the user can manage recurrence schedules for this task.
     */
    public function manageRecurrence(User $user, KanbanTask $task): bool
    {
        if (in_array($user->role, ['designer', 'client', 'guest', 'external_user'], true)) {
            return false;
        }

        return in_array($user->role, ['admin', 'admin_manager', 'project_manager', 'account_manager'], true)
            && $this->update($user, $task);
    }

    /**
     * Determine whether the user can create/manage subtasks under this task.
     */
    public function manageSubtasks(User $user, KanbanTask $task): bool
    {
        if (in_array($user->role, ['client', 'guest', 'external_user'], true)) {
            return false;
        }

        if ($user->role === 'designer') {
            return $task->isAssignedTo($user);
        }

        return $this->update($user, $task);
    }

    /**
     * Determine whether the user can submit the task for review.
     */
    public function submitReview(User $user, KanbanTask $task): bool
    {
        if (in_array($user->role, ['client', 'guest', 'external_user'], true)) {
            return false;
        }

        if ($task->isAssignedTo($user) || $task->created_by === $user->id) {
            return true;
        }

        return $this->update($user, $task);
    }

    /**
     * Determine whether the user can approve or request revisions on a task.
     */
    public function reviewTask(User $user, KanbanTask $task): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Designers can NEVER approve/review tasks (strict self-review prevention)
        if ($user->role === 'designer') {
            return false;
        }

        // PM and Admin can review internal stages
        if (in_array($user->role, ['admin', 'admin_manager', 'project_manager'], true)) {
            return true;
        }

        // Account Manager can review client liaison and account stages
        if ($user->role === 'account_manager') {
            return true;
        }

        $board = $task->board;
        if ($board && $board->created_by === $user->id) {
            return true;
        }

        $boardMember = $board?->members()->where('user_id', $user->id)->first();
        if ($boardMember && in_array($boardMember->role, ['owner', 'admin'], true)) {
            return true;
        }

        // Client / external users can review if the active stage specifies client required_role
        if (in_array($user->role, ['client', 'external_user'], true)) {
            $activeCycle = $task->reviewCycles()->where('state', 'pending')->latest('round_number')->first();
            $currentStage = $activeCycle?->stages()->where('stage_index', $activeCycle->current_stage_index ?? 1)->first();
            if ($currentStage && $currentStage->required_role === 'client') {
                return true;
            }
        }

        return false;
    }
}
