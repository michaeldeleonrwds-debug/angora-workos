<?php

use App\Models\AgencyProject;
use App\Models\ClientContact;
use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/**
 * 1. Personal User Channel (Notifications, Direct Assignments, User Alerts)
 */
Broadcast::channel('users.{userId}', function (User $user, int $userId) {
    return (int) $user->id === (int) $userId || $user->isSuperAdmin();
});

/**
 * 2. Board Mutations & Presence Channel
 * Serves both private-boards.{boardId} and presence-boards.{boardId}.
 */
Broadcast::channel('boards.{boardId}', function (User $user, int $boardId) {
    if ($user->status === 'inactive' || $user->status === 'suspended') {
        return false;
    }

    // External client users must never listen to internal board channels
    if ($user->isClientUser() || $user->primaryRoleName() === 'external_user') {
        return false;
    }

    $board = KanbanBoard::find($boardId);
    if (!$board) {
        return false;
    }

    if ($user->isSuperAdmin() || $user->can('view', $board)) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar_url' => $user->avatar_url,
            'role' => $user->role ?? $user->primaryRoleName(),
        ];
    }

    return false;
});

/**
 * 3. Task Discussions & Presence Channel
 * Serves both private-tasks.{taskId} and presence-tasks.{taskId}.
 */
Broadcast::channel('tasks.{taskId}', function (User $user, int $taskId) {
    if ($user->status === 'inactive' || $user->status === 'suspended') {
        return false;
    }

    // External client users must not subscribe to internal staff task channels
    if ($user->isClientUser() || $user->primaryRoleName() === 'external_user') {
        return false;
    }

    $task = KanbanTask::find($taskId);
    if (!$task) {
        return false;
    }

    if ($user->isSuperAdmin() || $user->can('view', $task)) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar_url' => $user->avatar_url,
            'role' => $user->role ?? $user->primaryRoleName(),
        ];
    }

    return false;
});

/**
 * 4. Client Project Channel (Deliverables, Approvals, Revisions, Client Safe Updates)
 */
Broadcast::channel('client-projects.{projectId}', function (User $user, int $projectId) {
    if ($user->status === 'inactive' || $user->status === 'suspended') {
        return false;
    }

    $project = AgencyProject::find($projectId);
    if (!$project) {
        return false;
    }

    // Internal staff
    if (!$user->isClientUser() && $user->primaryRoleName() !== 'external_user') {
        if ($user->isSuperAdmin()
            || $project->project_manager_id === $user->id
            || $project->project_leader_id === $user->id
            || $project->members()->where('user_id', $user->id)->exists()
            || $user->hasPermission('kanban.view')) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'avatar_url' => $user->avatar_url,
                'role' => $user->role ?? $user->primaryRoleName(),
            ];
        }
        return false;
    }

    // External client user
    if (!$project->client_visible) {
        return false;
    }

    $isClient = ($project->client && $project->client->user_id === $user->id)
        || ClientContact::where('client_id', $project->client_id)->where('user_id', $user->id)->where('is_active', true)->exists();

    if ($isClient) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar_url' => $user->avatar_url,
            'role' => 'client',
        ];
    }

    return false;
});

/**
 * 5. Client Task Channel (Client-visible tasks and client comments)
 */
Broadcast::channel('client-tasks.{taskId}', function (User $user, int $taskId) {
    if ($user->status === 'inactive' || $user->status === 'suspended') {
        return false;
    }

    $task = KanbanTask::find($taskId);
    if (!$task || !$task->is_client_visible) {
        return false;
    }

    // Internal staff
    if (!$user->isClientUser() && $user->primaryRoleName() !== 'external_user') {
        if ($user->isSuperAdmin() || $user->can('view', $task)) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'avatar_url' => $user->avatar_url,
                'role' => $user->role ?? $user->primaryRoleName(),
            ];
        }
        return false;
    }

    // Client user
    $clientId = $task->client_id;
    if (!$clientId) {
        return false;
    }

    $isClient = ($task->client && $task->client->user_id === $user->id)
        || ClientContact::where('client_id', $clientId)->where('user_id', $user->id)->where('is_active', true)->exists();

    if ($isClient) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar_url' => $user->avatar_url,
            'role' => 'client',
        ];
    }

    return false;
});
