<?php

namespace App\Policies;

use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Services\WorkflowService;

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
        if ($user->primaryRoleName() === 'client') {
            return $task->isAssignedTo($user) || $task->created_by === $user->id;
        }

        return true;
    }

    /**
     * Determine whether the user can create tasks on a board.
     */
    public function create(User $user, $boardOrTask = null): bool
    {
        if (! $user->hasPermission('workos.tasks.create')) {
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

        return true;
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

        if (! $user->hasPermission('workos.tasks.update')) {
            if ($user->hasPermission('workos.boards.manage') && $user->can('update', $board)) {
                return true;
            }
            return $user->hasPermission('workos.tasks.update.assigned') && $task->isAssignedTo($user);
        }

        // Board viewers cannot edit tasks unless assigned
        $boardMember = $board->members()->where('user_id', $user->id)->first();
        if ($boardMember && $boardMember->role === 'viewer') {
            return $task->isAssignedTo($user);
        }

        // Admin, PM, AM or authorized board members can update
        return true;
    }

    /**
     * Determine whether the user can delete the task.
     */
    public function delete(User $user, KanbanTask $task): bool
    {
        if (! $user->hasPermission('workos.tasks.delete')) {
            return false;
        }

        $board = $task->board;
        if (!$board || !$user->can('view', $board)) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can change workflow status / column (e.g. Kanban drag).
     */
    public function changeStatus(User $user, KanbanTask $task, ?KanbanColumn $targetColumn = null): bool
    {
        if ($user->status === 'inactive' || $user->status === 'suspended') {
            return false;
        }

        $board = $task->board;
        if (! $board || ! $user->can('view', $board)) {
            return false;
        }
        if ($targetColumn && ((int) $targetColumn->board_id !== (int) $board->id || $targetColumn->is_archived)) {
            return false;
        }
        if ($targetColumn && $task->is_blocked && in_array($targetColumn->semantic_category, ['in_progress', 'in_review', 'completed'], true)) {
            return false;
        }

        if ($user->hasPermission('workos.tasks.move.any')) {
            return true;
        }
        if ($user->hasPermission('workos.tasks.move.assigned')) {
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

        if (! $user->hasPermission('workos.tasks.move.assigned') || !$task->isAssignedTo($user)) {
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

            // Boards with a configured workflow graph constrain contributors to
            // contributor-allowed edges; legacy boards (no transitions) are unaffected.
            if (! $this->workflowAllowsTransition($task, $targetColumn)) {
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
     * Whether the board's dynamic workflow graph permits this contributor move.
     * Boards without configured transitions return true (legacy rules apply).
     */
    private function workflowAllowsTransition(KanbanTask $task, ?KanbanColumn $targetColumn): bool
    {
        if (! $targetColumn) {
            return true;
        }

        $board = $task->board;
        if (! $board) {
            return true;
        }

        return app(WorkflowService::class)->contributorMayTransition($board, $task->column, $targetColumn) !== false;
    }

    /**
     * Determine whether the user can reorder this task.
     */
    public function reorder(User $user, KanbanTask $task): bool
    {
        if ($user->status === 'inactive' || $user->status === 'suspended') {
            return false;
        }

        if (! $task->board || ! $user->can('view', $task->board)) {
            return false;
        }

        if ($user->hasPermission('workos.tasks.move.any')) {
            return true;
        }
        if ($user->hasPermission('workos.tasks.move.assigned')) {
            return $task->isAssignedTo($user);
        }

        return false;
    }

    /**
     * Determine whether the user can move task groups.
     */
    public function changeGroup(User $user, KanbanTask $task): bool
    {
        if (in_array($user->primaryRoleName(), ['designer', 'developer', 'dept_user', 'employee', 'client', 'guest', 'external_user'], true)) {
            return false;
        }

        return $this->update($user, $task);
    }

    /**
     * Determine whether the user can manage dependencies for this task.
     */
    public function manageDependencies(User $user, KanbanTask $task): bool
    {
        if (in_array($user->primaryRoleName(), ['designer', 'developer', 'dept_user', 'employee', 'client', 'guest', 'external_user'], true)) {
            return false;
        }

        return in_array($user->primaryRoleName(), ['super_admin', 'admin', 'admin_manager', 'project_manager', 'account_manager'], true)
            && $this->update($user, $task);
    }

    /**
     * Determine whether the user can manage recurrence schedules for this task.
     */
    public function manageRecurrence(User $user, KanbanTask $task): bool
    {
        if (in_array($user->primaryRoleName(), ['designer', 'developer', 'dept_user', 'employee', 'client', 'guest', 'external_user'], true)) {
            return false;
        }

        return in_array($user->primaryRoleName(), ['super_admin', 'admin', 'admin_manager', 'project_manager', 'account_manager'], true)
            && $this->update($user, $task);
    }

    /**
     * Determine whether the user can create/manage subtasks under this task.
     */
    public function manageSubtasks(User $user, KanbanTask $task): bool
    {
        if (! $user->hasPermission('workos.tasks.review.submit')) {
            return false;
        }

        if (in_array($user->primaryRoleName(), ['designer', 'developer', 'dept_user', 'employee'], true)) {
            return $task->isAssignedTo($user);
        }

        return $this->update($user, $task);
    }

    /**
     * Determine whether the user can submit the task for review.
     */
    public function submitReview(User $user, KanbanTask $task): bool
    {
        if (! $this->view($user, $task)) {
            return false;
        }
        if (in_array($user->primaryRoleName(), ['client', 'guest', 'external_user'], true)) {
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
        if (in_array($user->primaryRoleName(), ['client', 'external_user'], true)) {
            $board = $task->board;
            if (! $board || ! $user->can('view', $board)) {
                return false;
            }
            $activeCycle = $task->reviewCycles()->where('state', 'pending')->latest('round_number')->first();
            $currentStage = $activeCycle?->stages()->where('stage_index', $activeCycle->current_stage_index ?? 1)->first();

            return $currentStage?->required_role === 'client';
        }

        if (! $this->view($user, $task)) {
            return false;
        }

        return $user->hasPermission('workos.tasks.review.decide');
    }
}
