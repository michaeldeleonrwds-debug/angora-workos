<?php

namespace App\Providers;

use App\Models\KanbanAttachment;
use App\Models\KanbanBoard;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\Workspace;
use App\Policies\AttachmentPolicy;
use App\Policies\BoardPolicy;
use App\Policies\CommentPolicy;
use App\Policies\TaskPolicy;
use App\Policies\WorkspacePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Workspace::class, WorkspacePolicy::class);
        Gate::policy(KanbanBoard::class, BoardPolicy::class);
        Gate::policy(KanbanTask::class, TaskPolicy::class);
        Gate::policy(KanbanComment::class, CommentPolicy::class);
        Gate::policy(KanbanAttachment::class, AttachmentPolicy::class);
    }
}
