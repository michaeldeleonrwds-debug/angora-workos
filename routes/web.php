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

    // Production Management & Quality Control
    Route::get('/production', [\App\Http\Controllers\ProductionController::class, 'index'])->name('production.index')->middleware('permission:production.view');
    Route::post('/production/work-orders', [\App\Http\Controllers\ProductionController::class, 'storeWorkOrder'])->name('production.work-orders.store');
    Route::patch('/production/work-orders/{order}', [\App\Http\Controllers\ProductionController::class, 'updateWorkOrderStatus'])->name('production.work-orders.update');
    Route::post('/production/qc', [\App\Http\Controllers\ProductionController::class, 'storeQualityCheck'])->name('production.qc.store');
    Route::post('/production/incidents', [\App\Http\Controllers\ProductionController::class, 'storeIncident'])->name('production.incidents.store');

    // Department & Platform Modules (Protected by RBAC permissions)
    Route::get('/hr', [\App\Http\Controllers\HrController::class, 'index'])->name('hr.index')->middleware('permission:hr.view');
    Route::post('/hr/leaves', [\App\Http\Controllers\HrController::class, 'storeLeave'])->name('hr.leaves.store')->middleware('permission:hr.manage');
    Route::patch('/hr/leaves/{leave}', [\App\Http\Controllers\HrController::class, 'updateLeaveStatus'])->name('hr.leaves.update')->middleware('permission:hr.approve_leaves');

    Route::get('/sales', [\App\Http\Controllers\SalesController::class, 'index'])->name('sales.index')->middleware('permission:sales.view');
    Route::get('/marketing', [\App\Http\Controllers\MarketingController::class, 'index'])->name('marketing.index')->middleware('permission:marketing.view');
    Route::get('/finance', [\App\Http\Controllers\FinanceController::class, 'index'])->name('finance.index')->middleware('permission:finance.view');
    Route::get('/operations', [\App\Http\Controllers\OperationsController::class, 'index'])->name('operations.index')->middleware('permission:operations.view');
    Route::get('/compliance', [\App\Http\Controllers\ComplianceController::class, 'index'])->name('compliance.index')->middleware('permission:compliance.view');
    Route::get('/documents', [\App\Http\Controllers\DocumentController::class, 'index'])->name('documents.index')->middleware('permission:documents.view');
    Route::get('/analytics', [\App\Http\Controllers\AnalyticsController::class, 'index'])->name('analytics.index')->middleware('permission:analytics.view');
    Route::get('/audit-logs', [\App\Http\Controllers\AuditLogController::class, 'index'])->name('audit-logs.index')->middleware('permission:audit_logs.view');

    // RBAC Permissions Manager
    Route::get('/rbac', [\App\Http\Controllers\RbacController::class, 'index'])->name('rbac.index')->middleware('permission:rbac.manage');
    Route::post('/rbac/roles/{role}/permissions', [\App\Http\Controllers\RbacController::class, 'updateRolePermissions'])->name('rbac.roles.permissions.update')->middleware('permission:rbac.manage');

    // Agency Projects & Client Deliverables
    Route::get('/projects', [\App\Http\Controllers\AgencyProjectController::class, 'index'])->name('projects.index');
    Route::post('/projects', [\App\Http\Controllers\AgencyProjectController::class, 'store'])->name('projects.store');
    Route::get('/projects/{project}', [\App\Http\Controllers\AgencyProjectController::class, 'show'])->name('projects.show');
    Route::patch('/projects/{project}', [\App\Http\Controllers\AgencyProjectController::class, 'update'])->name('projects.update');
    Route::delete('/projects/{project}', [\App\Http\Controllers\AgencyProjectController::class, 'destroy'])->name('projects.destroy');
    Route::post('/projects/{project}/members', [\App\Http\Controllers\AgencyProjectController::class, 'assignMember'])->name('projects.members.store');
    Route::delete('/projects/{project}/members/{member}', [\App\Http\Controllers\AgencyProjectController::class, 'removeMember'])->name('projects.members.destroy');
    Route::post('/projects/{project}/deliverables', [\App\Http\Controllers\DeliverableController::class, 'store'])->name('projects.deliverables.store');
    Route::post('/deliverables/{deliverable}/review', [\App\Http\Controllers\DeliverableController::class, 'internalReview'])->name('deliverables.review');
    Route::delete('/deliverables/{deliverable}', [\App\Http\Controllers\DeliverableController::class, 'destroy'])->name('deliverables.destroy');
    Route::get('/deliverables/{deliverable}/download', [\App\Http\Controllers\DeliverableController::class, 'download'])->name('deliverables.download');

    // Client Portal
    Route::get('/client-portal', [\App\Http\Controllers\ClientPortalController::class, 'dashboard'])->name('client-portal.dashboard');
    Route::get('/client-portal/projects/{project}', [\App\Http\Controllers\ClientPortalController::class, 'project'])->name('client-portal.project');
    Route::post('/client-portal/deliverables/{deliverable}/feedback', [\App\Http\Controllers\ClientPortalController::class, 'submitFeedback'])->name('client-portal.feedback');

    // Cross-Department Linking
    Route::post('/cross-department/links', [\App\Http\Controllers\BoardRelationshipController::class, 'linkDepartmentEntity'])->name('cross-dept.links.store');

    // Forms, Workdocs & Templates
    Route::get('/forms', [\App\Http\Controllers\FormController::class, 'index'])->name('forms.index');
    Route::post('/forms', [\App\Http\Controllers\FormController::class, 'store'])->name('forms.store');
    Route::get('/forms/{form}/edit', [\App\Http\Controllers\FormController::class, 'edit'])->name('forms.edit');
    Route::patch('/forms/{form}', [\App\Http\Controllers\FormController::class, 'update'])->name('forms.update');
    Route::delete('/forms/{form}', [\App\Http\Controllers\FormController::class, 'destroy'])->name('forms.destroy');
    Route::post('/forms/{form}/fields/sync', [\App\Http\Controllers\FormController::class, 'syncFields'])->name('forms.fields.sync');
    Route::get('/forms/{form}/submissions', [\App\Http\Controllers\FormController::class, 'submissions'])->name('forms.submissions');

    Route::get('/workdocs', [\App\Http\Controllers\WorkdocController::class, 'index'])->name('workdocs.index');
    Route::post('/workdocs', [\App\Http\Controllers\WorkdocController::class, 'store'])->name('workdocs.store');
    Route::get('/workdocs/{workdoc}', [\App\Http\Controllers\WorkdocController::class, 'show'])->name('workdocs.show');
    Route::patch('/workdocs/{workdoc}', [\App\Http\Controllers\WorkdocController::class, 'update'])->name('workdocs.update');
    Route::delete('/workdocs/{workdoc}', [\App\Http\Controllers\WorkdocController::class, 'destroy'])->name('workdocs.destroy');
    Route::post('/workdocs/{workdoc}/comments', [\App\Http\Controllers\WorkdocController::class, 'storeComment'])->name('workdocs.comments.store');
    Route::patch('/workdocs/comments/{comment}/toggle', [\App\Http\Controllers\WorkdocController::class, 'toggleCommentResolve'])->name('workdocs.comments.toggle');
    Route::post('/workdocs/{workdoc}/versions/{version}/restore', [\App\Http\Controllers\WorkdocController::class, 'restoreVersion'])->name('workdocs.versions.restore');

    Route::get('/templates', [\App\Http\Controllers\TemplateController::class, 'index'])->name('templates.index');
    Route::post('/templates', [\App\Http\Controllers\TemplateController::class, 'store'])->name('templates.store');
    Route::post('/templates/save-board/{board}', [\App\Http\Controllers\TemplateController::class, 'saveBoardAsTemplate'])->name('templates.save-board');
    Route::post('/templates/{template}/instantiate', [\App\Http\Controllers\TemplateController::class, 'instantiate'])->name('templates.instantiate');
    Route::delete('/templates/{template}', [\App\Http\Controllers\TemplateController::class, 'destroy'])->name('templates.destroy');

    // Dashboards & Reporting
    Route::get('/dashboards', [\App\Http\Controllers\CustomDashboardController::class, 'index'])->name('dashboards.index');
    Route::post('/dashboards', [\App\Http\Controllers\CustomDashboardController::class, 'store'])->name('dashboards.store');
    Route::get('/dashboards/{dashboard}', [\App\Http\Controllers\CustomDashboardController::class, 'show'])->name('dashboards.show');
    Route::patch('/dashboards/{dashboard}', [\App\Http\Controllers\CustomDashboardController::class, 'update'])->name('dashboards.update');
    Route::delete('/dashboards/{dashboard}', [\App\Http\Controllers\CustomDashboardController::class, 'destroy'])->name('dashboards.destroy');
    Route::post('/dashboards/{dashboard}/widgets', [\App\Http\Controllers\CustomDashboardController::class, 'storeWidget'])->name('dashboards.widgets.store');
    Route::patch('/dashboards/{dashboard}/widgets/{widget}', [\App\Http\Controllers\CustomDashboardController::class, 'updateWidget'])->name('dashboards.widgets.update');
    Route::delete('/dashboards/{dashboard}/widgets/{widget}', [\App\Http\Controllers\CustomDashboardController::class, 'destroyWidget'])->name('dashboards.widgets.destroy');
    Route::post('/dashboards/{dashboard}/layout', [\App\Http\Controllers\CustomDashboardController::class, 'updateLayout'])->name('dashboards.layout.update');

    Route::get('/reports', [\App\Http\Controllers\ReportBuilderController::class, 'index'])->name('reports.index');
    Route::post('/reports', [\App\Http\Controllers\ReportBuilderController::class, 'store'])->name('reports.store');
    Route::get('/reports/{report}/preview', [\App\Http\Controllers\ReportBuilderController::class, 'preview'])->name('reports.preview');
    Route::get('/reports/{report}/export', [\App\Http\Controllers\ReportBuilderController::class, 'export'])->name('reports.export');
    Route::delete('/reports/{report}', [\App\Http\Controllers\ReportBuilderController::class, 'destroy'])->name('reports.destroy');
    Route::post('/reports/{report}/schedules', [\App\Http\Controllers\ReportBuilderController::class, 'storeSchedule'])->name('reports.schedules.store');
    Route::delete('/reports/schedules/{schedule}', [\App\Http\Controllers\ReportBuilderController::class, 'destroySchedule'])->name('reports.schedules.destroy');

    // AI & Integrations Hub
    Route::get('/ai', [\App\Http\Controllers\AiController::class, 'index'])->name('ai.index');
    Route::post('/ai/conversations', [\App\Http\Controllers\AiController::class, 'createConversation'])->name('ai.conversations.create');
    Route::post('/ai/conversations/{conversationId}/messages', [\App\Http\Controllers\AiController::class, 'sendMessage'])->name('ai.messages.send');
    Route::post('/ai/actions/approve-tasks', [\App\Http\Controllers\AiController::class, 'approveTasks'])->name('ai.tasks.approve');
    Route::post('/ai/actions/approve-automation', [\App\Http\Controllers\AiController::class, 'approveAutomation'])->name('ai.automation.approve');
    Route::post('/ai/actions/assist-workdoc', [\App\Http\Controllers\AiController::class, 'assistWorkdoc'])->name('ai.workdoc.assist');
    Route::post('/ai/config', [\App\Http\Controllers\AiController::class, 'updateConfig'])->name('ai.config.update');

    Route::get('/integrations', [\App\Http\Controllers\IntegrationCenterController::class, 'index'])->name('integrations.index');
    Route::post('/integrations/connect', [\App\Http\Controllers\IntegrationCenterController::class, 'connect'])->name('integrations.connect');
    Route::delete('/integrations/{id}', [\App\Http\Controllers\IntegrationCenterController::class, 'disconnect'])->name('integrations.disconnect');

    Route::get('/developer', [\App\Http\Controllers\DeveloperHubController::class, 'index'])->name('developer.index');
    Route::post('/developer/tokens', [\App\Http\Controllers\DeveloperHubController::class, 'storeToken'])->name('developer.tokens.store');
    Route::delete('/developer/tokens/{id}', [\App\Http\Controllers\DeveloperHubController::class, 'revokeToken'])->name('developer.tokens.revoke');
    Route::post('/developer/webhooks', [\App\Http\Controllers\DeveloperHubController::class, 'storeWebhook'])->name('developer.webhooks.store');
    Route::delete('/developer/webhooks/{id}', [\App\Http\Controllers\DeveloperHubController::class, 'deleteWebhook'])->name('developer.webhooks.delete');
    Route::post('/developer/webhooks/{id}/test', [\App\Http\Controllers\DeveloperHubController::class, 'testWebhook'])->name('developer.webhooks.test');

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

// Public Forms Routes (Renderable & Submittable without auth)
Route::get('/forms/view/{uuid}', [\App\Http\Controllers\FormController::class, 'showPublic'])->name('forms.public.show');
Route::post('/forms/view/{uuid}/submit', [\App\Http\Controllers\FormController::class, 'submit'])->name('forms.public.submit');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
