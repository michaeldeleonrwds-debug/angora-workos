<?php

use App\Http\Controllers\Api\V1\BoardApiController;
use App\Http\Controllers\Api\V1\OpenApiDocumentationController;
use App\Http\Controllers\Api\V1\ProjectApiController;
use App\Http\Controllers\Api\V1\TaskApiController;
use App\Http\Controllers\Api\V1\WebhookApiController;
use App\Http\Controllers\Api\V1\WorkspaceApiController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public OpenAPI specification & inbound webhooks
    Route::get('/openapi.json', [OpenApiDocumentationController::class, 'spec'])->name('api.v1.openapi');
    Route::post('/webhooks/incoming/{service}', [WebhookApiController::class, 'handleIncoming'])->name('api.v1.webhooks.incoming');

    // Authenticated Developer API endpoints
    Route::middleware(['api.auth'])->group(function () {
        // Workspaces
        Route::get('/workspaces', [WorkspaceApiController::class, 'index'])->name('api.v1.workspaces.index');
        Route::get('/workspaces/{workspace}', [WorkspaceApiController::class, 'show'])->name('api.v1.workspaces.show');

        // Boards & Columns
        Route::get('/boards', [BoardApiController::class, 'index'])->name('api.v1.boards.index');
        Route::get('/boards/{board}', [BoardApiController::class, 'show'])->name('api.v1.boards.show');
        Route::get('/boards/{board}/columns', [BoardApiController::class, 'columns'])->name('api.v1.boards.columns');
        Route::get('/boards/{board}/groups', [BoardApiController::class, 'groups'])->name('api.v1.boards.groups');

        // Tasks CRUD & Sub-resources
        Route::get('/tasks', [TaskApiController::class, 'index'])->name('api.v1.tasks.index');
        Route::post('/tasks', [TaskApiController::class, 'store'])->name('api.v1.tasks.store');
        Route::get('/tasks/{task}', [TaskApiController::class, 'show'])->name('api.v1.tasks.show');
        Route::patch('/tasks/{task}', [TaskApiController::class, 'update'])->name('api.v1.tasks.update');
        Route::delete('/tasks/{task}', [TaskApiController::class, 'destroy'])->name('api.v1.tasks.destroy');
        Route::post('/tasks/{task}/comments', [TaskApiController::class, 'addComment'])->name('api.v1.tasks.comments');
        Route::get('/sync/events', [TaskApiController::class, 'syncEvents'])->name('api.v1.sync.events');

        // Agency Projects
        Route::get('/projects', [ProjectApiController::class, 'index'])->name('api.v1.projects.index');
        Route::get('/projects/{project}', [ProjectApiController::class, 'show'])->name('api.v1.projects.show');
        Route::get('/projects/{project}/deliverables', [ProjectApiController::class, 'deliverables'])->name('api.v1.projects.deliverables');
    });
});
