<?php

namespace App\Http\Controllers;

use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Work OS & Kanban / Task metrics
        $totalTasks = KanbanTask::whereNull('parent_id')->count();
        $completedTasks = KanbanTask::whereNull('parent_id')->whereNotNull('completed_at')->count();
        $urgentTasks = KanbanTask::whereNull('parent_id')->where('priority', 'Urgent')->count();
        $inProgressTasks = KanbanTask::whereNull('parent_id')
            ->whereNull('completed_at')
            ->count();

        $stats = [
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'in_progress_tasks' => $inProgressTasks,
            'urgent_tasks' => $urgentTasks,
            'completion_rate' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0,
            'total_boards' => KanbanBoard::count(),
            'total_workspaces' => Workspace::count(),
        ];

        // Recent Tasks (top active tasks for Monday.com sample dashboard)
        $recentTasks = KanbanTask::whereNull('parent_id')
            ->with(['board:id,title', 'column:id,title,color', 'group:id,title,color', 'assignee:id,name,email'])
            ->latest('updated_at')
            ->take(8)
            ->get();

        // Active Boards with task counts and groups
        $activeBoards = KanbanBoard::with(['workspace:id,name'])
            ->withCount(['tasks' => function ($q) {
                $q->whereNull('parent_id');
            }, 'groups'])
            ->latest('updated_at')
            ->take(6)
            ->get();

        // Status Breakdown for visual Monday battery
        $statusBreakdown = [
            'done' => $completedTasks,
            'working_on_it' => KanbanTask::whereNull('parent_id')
                ->whereNull('completed_at')
                ->whereHas('column', function ($q) {
                    $q->where('title', 'like', '%progress%')->orWhere('title', 'like', '%working%');
                })->count(),
            'stuck' => KanbanTask::whereNull('parent_id')
                ->where('priority', 'Urgent')
                ->whereNull('completed_at')
                ->count(),
            'backlog' => KanbanTask::whereNull('parent_id')
                ->whereNull('completed_at')
                ->whereHas('column', function ($q) {
                    $q->where('title', 'like', '%todo%')->orWhere('title', 'like', '%backlog%')->orWhere('title', 'like', '%not started%');
                })->count(),
        ];

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'recentTasks' => $recentTasks,
            'activeBoards' => $activeBoards,
            'statusBreakdown' => $statusBreakdown,
        ]);
    }
}
