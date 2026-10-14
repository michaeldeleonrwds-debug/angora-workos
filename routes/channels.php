<?php

use App\Models\AgencyProject;
use App\Models\ClientContact;
use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('users.{userId}', function (User $user, int $userId) {
    return (int) $user->id === (int) $userId || $user->isSuperAdmin();
});

Broadcast::channel('boards.{boardId}', function (User $user, int $boardId) {
    if ($user->isSuperAdmin()) {
        return true;
    }

    if ($user->role === 'external_user') {
        return false;
    }

    $board = KanbanBoard::find($boardId);
    if (!$board) {
        return false;
    }

    if ($board->workspace_id) {
        $isMember = $board->workspace->members()->where('user_id', $user->id)->exists();
        if ($isMember) {
            return true;
        }
    }

    return $user->hasPermission('kanban.view');
});

Broadcast::channel('tasks.{taskId}', function (User $user, int $taskId) {
    if ($user->isSuperAdmin()) {
        return true;
    }

    $task = KanbanTask::find($taskId);
    if (!$task) {
        return false;
    }

    if ($user->role === 'external_user') {
        // External user can only join if task is linked to their client project and visible
        return false;
    }

    return $user->hasPermission('kanban.view');
});

Broadcast::channel('projects.{projectId}', function (User $user, int $projectId) {
    if ($user->isSuperAdmin()) {
        return true;
    }

    $project = AgencyProject::find($projectId);
    if (!$project) {
        return false;
    }

    // Internal staff
    if ($user->role !== 'external_user') {
        return $project->project_manager_id === $user->id
            || $project->project_leader_id === $user->id
            || $project->members()->where('user_id', $user->id)->exists()
            || $user->hasPermission('kanban.view');
    }

    // External client user
    if (!$project->client_visible) {
        return false;
    }

    if ($project->client && $project->client->user_id === $user->id) {
        return true;
    }

    return ClientContact::where('client_id', $project->client_id)
        ->where('user_id', $user->id)
        ->where('is_active', true)
        ->exists();
});
