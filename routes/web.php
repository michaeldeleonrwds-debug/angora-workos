<?php

use App\Http\Controllers\BoardRelationshipController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\KanbanController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\RoleSwitchController;
use App\Http\Controllers\WorkspaceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    // 0. Monday.com Dashboard & Role Switcher
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/switch-role', [RoleSwitchController::class, 'switchRole'])->name('role.switch');

    // 1. Monday Work OS: Workspaces, Boards, Tasks & Productivity
    Route::get('/kanban', [KanbanController::class, 'index'])->name('kanban.index');

    // Workspaces
    Route::post('/workspaces', [WorkspaceController::class, 'store'])->name('workspaces.store');
    Route::patch('/workspaces/{workspace}', [WorkspaceController::class, 'update'])->name('workspaces.update');
    Route::delete('/workspaces/{workspace}', [WorkspaceController::class, 'destroy'])->name('workspaces.destroy');
    Route::post('/workspaces/{workspace}/favorite', [WorkspaceController::class, 'toggleFavorite'])->name('workspaces.favorite');
    Route::post('/workspaces/{workspace}/members', [WorkspaceController::class, 'addMember'])->name('workspaces.members.store');
    Route::delete('/workspaces/{workspace}/members/{member}', [WorkspaceController::class, 'removeMember'])->name('workspaces.members.delete');
    Route::patch('/workspaces/{workspace}/members/{member}', [WorkspaceController::class, 'updateMemberRole'])->name('workspaces.members.update');

    // Boards
    Route::post('/kanban/boards', [KanbanController::class, 'storeBoard'])->name('kanban.boards.store');
    Route::patch('/kanban/boards/{board}', [KanbanController::class, 'updateBoard'])->name('kanban.boards.update');
    Route::post('/kanban/boards/{board}/duplicate', [KanbanController::class, 'duplicateBoard'])->name('kanban.boards.duplicate');
    Route::delete('/kanban/boards/{board}', [KanbanController::class, 'deleteBoard'])->name('kanban.boards.delete');
    Route::post('/kanban/boards/{board}/favorite', [KanbanController::class, 'toggleBoardFavorite'])->name('kanban.boards.favorite');
    Route::post('/kanban/boards/{board}/members', [KanbanController::class, 'addBoardMember'])->name('kanban.boards.members.store');
    Route::delete('/kanban/boards/{board}/members/{member}', [KanbanController::class, 'removeBoardMember'])->name('kanban.boards.members.delete');
    Route::patch('/kanban/boards/{board}/members/{member}', [KanbanController::class, 'updateBoardMemberRole'])->name('kanban.boards.members.update');

    // Board Groups
    Route::post('/kanban/boards/{board}/groups', [KanbanController::class, 'storeGroup'])->name('kanban.groups.store');
    Route::patch('/kanban/groups/{group}', [KanbanController::class, 'updateGroup'])->name('kanban.groups.update');
    Route::delete('/kanban/groups/{group}', [KanbanController::class, 'deleteGroup'])->name('kanban.groups.delete');

    // Workflow Stages (Kanban Columns)
    Route::post('/kanban/boards/{board}/stages', [KanbanController::class, 'storeWorkflowStage'])->name('kanban.stages.store');
    Route::patch('/kanban/stages/{column}', [KanbanController::class, 'updateWorkflowStage'])->name('kanban.stages.update');
    Route::delete('/kanban/stages/{column}', [KanbanController::class, 'deleteWorkflowStage'])->name('kanban.stages.delete');
    Route::post('/kanban/boards/{board}/stages/reorder', [KanbanController::class, 'reorderWorkflowStages'])->name('kanban.stages.reorder');

    // Dynamic Columns
    Route::post('/kanban/boards/{board}/columns', [KanbanController::class, 'storeBoardColumn'])->name('kanban.columns.store');
    Route::patch('/kanban/board-columns/{column}', [KanbanController::class, 'updateBoardColumn'])->name('kanban.columns.update');
    Route::post('/kanban/board-columns/{column}/duplicate', [KanbanController::class, 'duplicateBoardColumn'])->name('kanban.columns.duplicate');
    Route::delete('/kanban/board-columns/{column}', [KanbanController::class, 'deleteBoardColumn'])->name('kanban.columns.delete');
    Route::post('/kanban/boards/{board}/columns/reorder', [KanbanController::class, 'reorderBoardColumns'])->name('kanban.columns.reorder');

    // Tasks & Subitems
    Route::post('/kanban/tasks', [KanbanController::class, 'storeTask'])->name('kanban.tasks.store');
    Route::patch('/kanban/tasks/{task}', [KanbanController::class, 'updateTask'])->name('kanban.tasks.update');
    Route::patch('/kanban/tasks/{task}/column', [KanbanController::class, 'updateTaskColumn'])->name('kanban.tasks.update-column');
    Route::patch('/kanban/tasks/{task}/group', [KanbanController::class, 'updateTaskGroup'])->name('kanban.tasks.update-group');
    Route::post('/kanban/tasks/reorder', [KanbanController::class, 'reorderTasks'])->name('kanban.tasks.reorder');
    Route::post('/kanban/tasks/{task}/subitems', [KanbanController::class, 'storeSubitem'])->name('kanban.tasks.subitems.store');
    Route::delete('/kanban/tasks/{task}', [KanbanController::class, 'deleteTask'])->name('kanban.tasks.delete');

    // Comments, Replies & Reactions
    Route::post('/kanban/tasks/{task}/comments', [KanbanController::class, 'storeComment'])->name('kanban.tasks.comments.store');
    Route::delete('/kanban/comments/{comment}', [KanbanController::class, 'deleteComment'])->name('kanban.comments.delete');
    Route::post('/kanban/comments/{comment}/reactions', [KanbanController::class, 'toggleCommentReaction'])->name('kanban.comments.reactions');

    // Attachments
    Route::post('/kanban/tasks/{task}/attachments', [KanbanController::class, 'storeAttachment'])->name('kanban.tasks.attachments.store');
    Route::get('/kanban/attachments/{attachment}/download', [KanbanController::class, 'downloadAttachment'])->name('kanban.attachments.download');
    Route::delete('/kanban/attachments/{attachment}', [KanbanController::class, 'deleteAttachment'])->name('kanban.attachments.delete');

    // Centralized Media Library
    Route::get('/media', [MediaController::class, 'index'])->name('media.index');
    Route::post('/media/upload', [MediaController::class, 'upload'])->name('media.upload');
    Route::post('/media/attach', [MediaController::class, 'attach'])->name('media.attach');
    Route::post('/media/detach', [MediaController::class, 'detach'])->name('media.detach');
    Route::delete('/media/{mediaAsset}', [MediaController::class, 'destroy'])->name('media.destroy');

    // Views Management
    Route::post('/kanban/boards/{board}/views', [KanbanController::class, 'storeView'])->name('kanban.views.store');
    Route::patch('/kanban/views/{view}', [KanbanController::class, 'updateView'])->name('kanban.views.update');
    Route::delete('/kanban/views/{view}', [KanbanController::class, 'deleteView'])->name('kanban.views.delete');
    Route::post('/kanban/boards/{board}/views/reorder', [KanbanController::class, 'reorderViews'])->name('kanban.views.reorder');

    // Task Dependencies & Scheduling
    Route::post('/kanban/tasks/{task}/dependencies', [KanbanController::class, 'storeDependency'])->name('kanban.tasks.dependencies.store');
    Route::delete('/kanban/dependencies/{dependency}', [KanbanController::class, 'deleteDependency'])->name('kanban.dependencies.delete');
    Route::patch('/kanban/tasks/{task}/schedule', [KanbanController::class, 'updateTaskSchedule'])->name('kanban.tasks.schedule.update');

    // Connect Boards & Cross-Board Relationships
    Route::get('/kanban/connected-items/search', [BoardRelationshipController::class, 'searchTargetItems'])->name('kanban.relationships.search');
    Route::post('/kanban/relationships', [BoardRelationshipController::class, 'store'])->name('kanban.relationships.store');
    Route::delete('/kanban/relationships/{relationship}', [BoardRelationshipController::class, 'destroy'])->name('kanban.relationships.destroy');

    // Automation Engine
    Route::post('/kanban/boards/{board}/automations', [KanbanController::class, 'storeAutomation'])->name('kanban.automations.store');
    Route::patch('/kanban/automations/{automation}', [KanbanController::class, 'updateAutomation'])->name('kanban.automations.update');
    Route::post('/kanban/automations/{automation}/toggle', [KanbanController::class, 'toggleAutomation'])->name('kanban.automations.toggle');
    Route::post('/kanban/automations/{automation}/duplicate', [KanbanController::class, 'duplicateAutomation'])->name('kanban.automations.duplicate');
    Route::delete('/kanban/automations/{automation}', [KanbanController::class, 'deleteAutomation'])->name('kanban.automations.delete');
    Route::post('/kanban/automations/{automation}/test', [KanbanController::class, 'testAutomation'])->name('kanban.automations.test');

    // Polling Synchronization & User Preferences
    Route::get('/kanban/sync', [KanbanController::class, 'pollSync'])->name('kanban.sync');
    Route::post('/user/preferences', [KanbanController::class, 'updatePreferences'])->name('user.preferences.update');

    // Notification Center & Preferences
    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
    Route::patch('/notifications/{notification}/read', [\App\Http\Controllers\NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/mark-all-read', [\App\Http\Controllers\NotificationController::class, 'markAllRead'])->name('notifications.mark-all-read');
    Route::delete('/notifications/{notification}', [\App\Http\Controllers\NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::get('/notifications/preferences', [\App\Http\Controllers\NotificationController::class, 'getPreferences'])->name('notifications.preferences');
    Route::put('/notifications/preferences', [\App\Http\Controllers\NotificationController::class, 'updatePreferences'])->name('notifications.preferences.update');

    // Review & Approval Workflow
    Route::get('/kanban/tasks/{task}/review', [\App\Http\Controllers\TaskReviewController::class, 'index'])->name('kanban.tasks.review.index');
    Route::post('/kanban/tasks/{task}/review/submit', [\App\Http\Controllers\TaskReviewController::class, 'submit'])->name('kanban.tasks.review.submit');
    Route::post('/kanban/tasks/{task}/review/decide', [\App\Http\Controllers\TaskReviewController::class, 'decide'])->name('kanban.tasks.review.decide');

    // 2. User Management & Administrative Operations
    Route::get('/users', [\App\Http\Controllers\UserController::class, 'index'])->name('users.index');
    Route::post('/users', [\App\Http\Controllers\UserController::class, 'store'])->name('users.store');
    Route::match(['put', 'patch'], '/users/{user}', [\App\Http\Controllers\UserController::class, 'update'])->name('users.update');
    Route::match(['post', 'patch'], '/users/{user}/status', [\App\Http\Controllers\UserController::class, 'toggleStatus'])->name('users.status');
    Route::delete('/users/{user}', [\App\Http\Controllers\UserController::class, 'destroy'])->name('users.destroy');

    // Invitations Admin (Protected with rate limiting: max 20 per minute)
    Route::post('/users/invite', [\App\Http\Controllers\UserController::class, 'invite'])
        ->middleware('throttle:20,1')
        ->name('users.invite');
    Route::post('/users/invitations/{invitation}/resend', [\App\Http\Controllers\UserController::class, 'resendInvitation'])
        ->middleware('throttle:20,1')
        ->name('users.invitations.resend');
    Route::delete('/users/invitations/{invitation}', [\App\Http\Controllers\UserController::class, 'revokeInvitation'])
        ->name('users.invitations.revoke');
});

// Public Invitation Acceptance Routes (Rate-limited: 30 views/min, 10 acceptances/min to prevent enumeration & brute force)
Route::get('/invitations/{token}', [\App\Http\Controllers\Auth\InvitationRedemptionController::class, 'show'])
    ->middleware('throttle:30,1')
    ->name('invitations.show');
Route::post('/invitations/{token}', [\App\Http\Controllers\Auth\InvitationRedemptionController::class, 'accept'])
    ->middleware('throttle:10,1')
    ->name('invitations.accept');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
