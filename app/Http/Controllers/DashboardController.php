<?php

namespace App\Http\Controllers;

use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\TaskReviewCycle;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $workspaceId = $request->query('workspace_id');

        // Base query with optional workspace scoping
        $taskQuery = KanbanTask::whereNull('parent_id');
        $boardQuery = KanbanBoard::query();

        if ($workspaceId) {
            $taskQuery->whereHas('board', function ($q) use ($workspaceId) {
                $q->where('workspace_id', $workspaceId);
            });
            $boardQuery->where('workspace_id', $workspaceId);
        } elseif (!$user->isSuperAdmin()) {
            // Scope to accessible workspaces
            $accessibleWorkspaceIds = Workspace::where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                  ->orWhereHas('members', fn($mq) => $mq->where('user_id', $user->id));
            })->pluck('id');

            $taskQuery->whereHas('board', function ($q) use ($accessibleWorkspaceIds) {
                $q->whereIn('workspace_id', $accessibleWorkspaceIds);
            });
            $boardQuery->whereIn('workspace_id', $accessibleWorkspaceIds);
        }

        $totalTasks = (clone $taskQuery)->count();
        $completedTasks = (clone $taskQuery)->whereNotNull('completed_at')->count();
        $urgentTasks = (clone $taskQuery)->where('priority', 'Urgent')->count();
        $inProgressTasks = (clone $taskQuery)->whereNull('completed_at')->count();
        $overdueTasks = (clone $taskQuery)
            ->whereNull('completed_at')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->toDateString())
            ->count();

        // Review & Workflow Intelligence metrics
        $reviewQuery = TaskReviewCycle::query();
        if ($workspaceId) {
            $reviewQuery->whereHas('task.board', fn($q) => $q->where('workspace_id', $workspaceId));
        }

        $pendingReviews = (clone $reviewQuery)->where('state', 'pending')->count();
        $approvedReviews = (clone $reviewQuery)->where('state', 'approved')->count();
        $revisionReviews = (clone $reviewQuery)->where('state', 'revision_requested')->count();

        $stats = [
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'in_progress_tasks' => $inProgressTasks,
            'urgent_tasks' => $urgentTasks,
            'overdue_tasks' => $overdueTasks,
            'pending_reviews' => $pendingReviews,
            'approved_reviews' => $approvedReviews,
            'revision_reviews' => $revisionReviews,
            'completion_rate' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0,
            'total_boards' => $boardQuery->count(),
            'total_workspaces' => Workspace::count(),
        ];

        // Recent Tasks
        $recentTasks = (clone $taskQuery)
            ->with(['board:id,title', 'column:id,title,color', 'group:id,title,color', 'assignee:id,name,email,avatar'])
            ->latest('updated_at')
            ->take(8)
            ->get();

        // Active Boards with task counts and groups
        $activeBoards = (clone $boardQuery)
            ->with(['workspace:id,name'])
            ->withCount(['tasks' => function ($q) {
                $q->whereNull('parent_id');
            }, 'groups'])
            ->latest('updated_at')
            ->take(6)
            ->get();

        // Status Breakdown for visual Monday battery
        $statusBreakdown = [
            'done' => $completedTasks,
            'working_on_it' => (clone $taskQuery)
                ->whereNull('completed_at')
                ->whereHas('column', function ($q) {
                    $q->where('title', 'like', '%progress%')->orWhere('title', 'like', '%working%');
                })->count(),
            'review' => (clone $taskQuery)
                ->whereNull('completed_at')
                ->whereHas('column', function ($q) {
                    $q->where('title', 'like', '%review%')->orWhere('title', 'like', '%approval%');
                })->count(),
            'stuck' => (clone $taskQuery)
                ->where('priority', 'Urgent')
                ->whereNull('completed_at')
                ->count(),
            'backlog' => (clone $taskQuery)
                ->whereNull('completed_at')
                ->whereHas('column', function ($q) {
                    $q->where('title', 'like', '%todo%')->orWhere('title', 'like', '%backlog%')->orWhere('title', 'like', '%not started%');
                })->count(),
        ];

        // Team Workload Analytics (active assignees with task counts)
        $teamMembers = User::where('status', 'active')
            ->whereIn('role', ['dept_user', 'project_manager', 'account_manager', 'admin'])
            ->select('id', 'name', 'email', 'avatar', 'role', 'department')
            ->get()
            ->map(function ($member) use ($taskQuery) {
                $memberTaskQuery = (clone $taskQuery)->where('assigned_to', $member->id);
                $activeCount = (clone $memberTaskQuery)->whereNull('completed_at')->count();
                $completedCount = (clone $memberTaskQuery)->whereNotNull('completed_at')->count();
                $overdueCount = (clone $memberTaskQuery)
                    ->whereNull('completed_at')
                    ->whereNotNull('due_date')
                    ->where('due_date', '<', now()->toDateString())
                    ->count();

                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'avatar' => $member->avatar,
                    'role' => $member->role,
                    'department' => $member->department,
                    'active_tasks' => $activeCount,
                    'completed_tasks' => $completedCount,
                    'overdue_tasks' => $overdueCount,
                ];
            })
            ->sortByDesc('active_tasks')
            ->values();

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'recentTasks' => $recentTasks,
            'activeBoards' => $activeBoards,
            'statusBreakdown' => $statusBreakdown,
            'teamWorkload' => $teamMembers,
            'selectedWorkspaceId' => $workspaceId ? (int) $workspaceId : null,
        ]);
    }
}
