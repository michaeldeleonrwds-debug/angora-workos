<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\AutomationExecution;
use App\Models\BoardAutomation;
use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\BoardMember;
use App\Models\BoardView;
use App\Models\KanbanAttachment;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\BoardItemRelationship;
use App\Models\KanbanTask;
use App\Models\TaskActivity;
use App\Models\TaskDependency;
use App\Models\User;
use App\Models\Workspace;
use App\Services\AutomationEngineService;
use App\Services\CrossBoardService;
use App\Services\TaskActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class KanbanController extends Controller
{
    protected AutomationEngineService $automationEngine;
    protected CrossBoardService $crossBoardService;
    protected \App\Services\NotificationService $notificationService;
    protected \App\Services\TaskDependencyService $dependencyService;
    protected \App\Services\TaskRecurrenceService $recurrenceService;
    protected \App\Services\Authorization\WorkOsPermissionService $permissionService;

    public function __construct(
        AutomationEngineService $automationEngine,
        CrossBoardService $crossBoardService,
        \App\Services\NotificationService $notificationService,
        \App\Services\TaskDependencyService $dependencyService,
        \App\Services\TaskRecurrenceService $recurrenceService,
        \App\Services\Authorization\WorkOsPermissionService $permissionService
    ) {
        $this->automationEngine = $automationEngine;
        $this->crossBoardService = $crossBoardService;
        $this->notificationService = $notificationService;
        $this->dependencyService = $dependencyService;
        $this->recurrenceService = $recurrenceService;
        $this->permissionService = $permissionService;
    }
    public function index(Request $request)
    {
        $user = auth()->user();

        // 1. Get workspaces accessible by current user
        $workspacesQuery = Workspace::with([
            'boards' => function ($q) {
                $q->orderBy('title');
            },
            'members.user',
            'owner',
        ]);

        if (!$user->isSuperAdmin()) {
            $workspacesQuery->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('members', function ($mq) use ($user) {
                        $mq->where('user_id', $user->id);
                    });
            });
        }

        $workspaces = $workspacesQuery->get();

        if ($workspaces->isEmpty()) {
            $workspace = Workspace::create([
                'name' => 'Main Workspace',
                'description' => 'Default enterprise workspace',
                'owner_id' => $user->id,
            ]);
            \App\Models\WorkspaceMember::create([
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'role' => 'owner',
            ]);
            $workspaces = Workspace::with(['boards', 'members.user', 'owner'])->where('id', $workspace->id)->get();
        }

        // 2. Resolve Active Workspace & Board
        $workspaceId = $request->query('workspace') ?: session('active_workspace_id');
        $boardId = $request->query('board');

        $activeWorkspace = $workspaceId ? $workspaces->firstWhere('id', (int) $workspaceId) : $workspaces->first();
        if (!$activeWorkspace) {
            $activeWorkspace = $workspaces->first();
        }
        if ($activeWorkspace) {
            session(['active_workspace_id' => $activeWorkspace->id]);
        }

        $workspaceIds = $workspaces->pluck('id')->toArray();
        $boards = KanbanBoard::whereIn('workspace_id', $workspaceIds)
            ->select('id', 'workspace_id', 'title', 'description', 'department', 'folder_name', 'visibility', 'is_favorite', 'is_template', 'created_by')
            ->orderBy('title')
            ->get()
            ->filter(function ($b) use ($user) {
                return $user->can('view', $b);
            })->values();

        // Target active board ID
        $targetBoardId = null;
        if ($boardId) {
            $targetBoardId = $boards->firstWhere('id', (int) $boardId)?->id;
        }
        if (!$targetBoardId && $activeWorkspace) {
            $targetBoardId = $boards->firstWhere('workspace_id', $activeWorkspace->id)?->id;
        }
        if (!$targetBoardId) {
            $targetBoardId = $boards->first()?->id;
        }

        $activeBoard = $targetBoardId ? KanbanBoard::find($targetBoardId) : null;

        // Auto-heal active board if it lacks groups or dynamic columns and load full relations
        if ($activeBoard) {
            $this->ensureBoardIntegrity($activeBoard);

            $taskRelations = [
                'assignee',
                'column',
                'group',
                'subitems.assignee',
                'subitems.column',
                'subitems.mediaUsages.mediaAsset',
                'comments.user',
                'comments.replies.user',
                'attachments.user',
                'recurrenceRule',
                'dependencies.dependencyTask.column',
                'dependents.task.column',
                'activities' => function ($aq) {
                    $aq->latest()->take(10)->with('user');
                },
                'mediaUsages.mediaAsset',
                'outgoingRelationships.targetBoard',
                'outgoingRelationships.targetTask.column',
                'outgoingRelationships.targetTask.assignee',
            ];

            $activeBoard->load([
                'columns.tasks' => function ($q) use ($taskRelations) {
                    $q->whereNull('parent_id')
                        ->orderBy('position')
                        ->with($taskRelations);
                },
                'groups.tasks' => function ($q) use ($taskRelations) {
                    $q->whereNull('parent_id')
                        ->orderBy('position')
                        ->with($taskRelations);
                },
                'boardColumns' => function ($q) {
                    $q->orderBy('position');
                },
                'subitemColumns' => function ($q) {
                    $q->orderBy('position');
                },
                'views' => function ($q) {
                    $q->orderBy('position');
                },
                'workspace',
                'members.user',
                'users',
                'automations.creator',
                'automationExecutions.triggeredBy',
                'automationExecutions.task',
            ]);
        }

        // Deep linking: resolve selected item if requested via ?item={id}
        $selectedTaskId = $request->query('item');
        $selectedTask = null;
        if ($selectedTaskId) {
            $taskCandidate = KanbanTask::with([
                'assignee',
                'column',
                'group',
                'board',
                'subitems.assignee',
                'subitems.column',
                'comments.user',
                'comments.replies.user',
                'attachments.user',
                'dependencies.dependencyTask.column',
                'dependents.task.column',
                'activities.user',
                'outgoingRelationships.targetBoard',
                'outgoingRelationships.targetTask.column',
                'outgoingRelationships.targetTask.assignee',
            ])->find($selectedTaskId);

            if ($taskCandidate && $user->can('view', $taskCandidate)) {
                $selectedTask = $taskCandidate;
            }
        }

        // Resolve Mirror column values for all tasks on the active board
        $boardTasks = $activeBoard
            ? $activeBoard->columns->flatMap->tasks->merge($activeBoard->groups->flatMap->tasks)->unique('id')
            : collect();
        $mirroredValues = $activeBoard
            ? $this->crossBoardService->resolveMirrorsForBoard($activeBoard, $boardTasks, $user)
            : [];

        $users = User::select('id', 'name', 'role', 'department', 'email')->get();

        $permissions = $activeBoard ? $this->permissionService->getBoardPermissions($user, $activeBoard) : [
            'canView' => false,
            'canCreateTask' => false,
            'canEditTask' => false,
            'canEditProgress' => false,
            'canChangeStatus' => false,
            'canAssignUsers' => false,
            'canChangeDeadlines' => false,
            'canChangePriority' => false,
            'canDeleteTask' => false,
            'canManageBoard' => false,
            'canManageColumns' => false,
            'canManageGroups' => false,
            'canManageAutomations' => false,
            'canManageBlueprints' => false,
            'canManageDependencies' => false,
            'canManageRecurrence' => false,
            'canApproveReview' => false,
            'canExport' => false,
        ];

        return Inertia::render('kanban/index', [
            'workspaces' => $workspaces,
            'activeWorkspace' => $activeWorkspace,
            'boards' => $boards,
            'activeBoard' => $activeBoard,
            'users' => $users,
            'selectedTask' => $selectedTask,
            'mirroredValues' => $mirroredValues,
            'permissions' => $permissions,
        ]);
    }

    private function ensureBoardIntegrity(KanbanBoard $board): void
    {
        // 1. Ensure at least one group
        if ($board->groups()->count() === 0) {
            $g1 = BoardGroup::create([
                'board_id' => $board->id,
                'title' => 'Active Tasks',
                'color' => '#579BFC',
                'position' => 0,
            ]);

            BoardGroup::create([
                'board_id' => $board->id,
                'title' => 'Future Sprints',
                'color' => '#A25DDC',
                'position' => 1,
            ]);

            KanbanTask::where('board_id', $board->id)
                ->whereNull('group_id')
                ->whereNull('parent_id')
                ->update(['group_id' => $g1->id]);
        }

        // 2. Ensure dynamic columns exist
        if ($board->boardColumns()->count() === 0) {
            $defaultCols = [
                ['key' => 'col_person', 'title' => 'Owner', 'type' => 'people', 'position' => 0, 'width' => 140],
                ['key' => 'col_status', 'title' => 'Status', 'type' => 'status', 'position' => 1, 'width' => 150],
                ['key' => 'col_priority', 'title' => 'Priority', 'type' => 'priority', 'position' => 2, 'width' => 130],
                ['key' => 'col_date', 'title' => 'Due Date', 'type' => 'date', 'position' => 3, 'width' => 130],
                ['key' => 'col_timeline', 'title' => 'Timeline', 'type' => 'timeline', 'position' => 4, 'width' => 170],
                ['key' => 'col_progress', 'title' => 'Progress', 'type' => 'progress', 'position' => 5, 'width' => 150],
            ];

            foreach ($defaultCols as $col) {
                BoardColumn::create([
                    'board_id' => $board->id,
                    'key' => $col['key'],
                    'title' => $col['title'],
                    'type' => $col['type'],
                    'scope' => 'task',
                    'position' => $col['position'],
                    'width' => $col['width'],
                    'is_visible' => true,
                ]);
            }
        }

        // 2b. Ensure dynamic subtask columns exist
        if ($board->subitemColumns()->count() === 0) {
            $defaultSubCols = [
                ['key' => 'sub_designer', 'title' => 'Designer', 'type' => 'people', 'position' => 0, 'width' => 150, 'config' => null],
                ['key' => 'sub_deadline', 'title' => 'Deadline', 'type' => 'date', 'position' => 1, 'width' => 130, 'config' => null],
                ['key' => 'sub_status', 'title' => 'Status', 'type' => 'status', 'position' => 2, 'width' => 140, 'config' => null],
                [
                    'key' => 'sub_task_type',
                    'title' => 'Task Type',
                    'type' => 'dropdown',
                    'position' => 3,
                    'width' => 170,
                    'config' => [
                        'options' => [
                            'Email Automation',
                            'Landing Page',
                            'Logo',
                            'Poster',
                            'Promotional Kit',
                            'Resolution & Image Quality',
                            'Social Media Post',
                            'Video',
                        ],
                    ],
                ],
                ['key' => 'sub_internal_revision', 'title' => 'Internal Revision', 'type' => 'text', 'position' => 4, 'width' => 140, 'config' => null],
                ['key' => 'sub_client_revision', 'title' => 'Client Revision', 'type' => 'text', 'position' => 5, 'width' => 140, 'config' => null],
                ['key' => 'sub_client_requests', 'title' => 'Client Requests', 'type' => 'text', 'position' => 6, 'width' => 180, 'config' => null],
            ];

            foreach ($defaultSubCols as $col) {
                BoardColumn::create([
                    'board_id' => $board->id,
                    'key' => $col['key'],
                    'title' => $col['title'],
                    'type' => $col['type'],
                    'scope' => 'subtask',
                    'position' => $col['position'],
                    'width' => $col['width'],
                    'is_visible' => true,
                    'config' => $col['config'],
                ]);
            }
        }

        // 3. Ensure default views exist
        if ($board->views()->count() === 0) {
            BoardView::create(['board_id' => $board->id, 'name' => 'Main Table', 'type' => 'table', 'is_default' => true, 'position' => 0]);
            BoardView::create(['board_id' => $board->id, 'name' => 'Kanban', 'type' => 'kanban', 'is_default' => false, 'position' => 1]);
            BoardView::create(['board_id' => $board->id, 'name' => 'Timeline', 'type' => 'timeline', 'is_default' => false, 'position' => 2]);
            BoardView::create(['board_id' => $board->id, 'name' => 'Calendar', 'type' => 'calendar', 'is_default' => false, 'position' => 3]);
        }

        // 4. Ensure starter automation exists
        if ($board->automations()->count() === 0) {
            BoardAutomation::create([
                'board_id' => $board->id,
                'name' => 'Auto-Notify on Completion',
                'description' => 'When a task moves to Done, notify the creator and record an audit log',
                'trigger_type' => 'status_changed',
                'trigger_config' => ['to_status' => 'Done'],
                'conditions' => [
                    'match_type' => 'and',
                    'rules' => [
                        ['field' => 'status', 'operator' => 'equals', 'value' => 'Done'],
                    ],
                ],
                'actions' => [
                    ['type' => 'notify_creator', 'title' => 'Task Completed', 'message' => 'Your task has been marked as Done.'],
                    ['type' => 'create_audit_event', 'description' => 'Automated completion workflow executed.'],
                ],
                'is_active' => true,
                'created_by' => auth()->id() ?? 1,
            ]);
        }
    }

    public function storeBoard(Request $request)
    {
        $validated = $request->validate([
            'workspace_id' => 'required|exists:workspaces,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'folder_name' => 'nullable|string|max:100',
            'visibility' => 'nullable|in:public,private,shareable',
        ]);

        $workspace = Workspace::findOrFail($validated['workspace_id']);
        Gate::authorize('create', [KanbanBoard::class, $workspace]);

        $board = KanbanBoard::create([
            'workspace_id' => $validated['workspace_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'folder_name' => $validated['folder_name'] ?? null,
            'visibility' => $validated['visibility'] ?? 'public',
            'department' => auth()->user()->department ?? 'Operations',
            'created_by' => auth()->id(),
        ]);

        // Default stages (Columns)
        KanbanColumn::create(['board_id' => $board->id, 'title' => 'Not Started', 'color' => '#64748b', 'position' => 0]);
        KanbanColumn::create(['board_id' => $board->id, 'title' => 'Working on it', 'color' => '#fdab3d', 'position' => 1]);
        KanbanColumn::create(['board_id' => $board->id, 'title' => 'Quality Review', 'color' => '#a25ddc', 'position' => 2]);
        KanbanColumn::create(['board_id' => $board->id, 'title' => 'Done', 'color' => '#00c875', 'position' => 3]);

        $this->ensureBoardIntegrity($board);

        AuditLog::log(
            action: 'BOARD_CREATED',
            department: auth()->user()->department ?? 'Operations',
            entityType: 'KanbanBoard',
            entityId: $board->id,
            description: "Created board '{$board->title}'"
        );

        return redirect()->route('kanban.index', ['workspace' => $board->workspace_id, 'board' => $board->id])
            ->with('success', 'Board created successfully');
    }

    public function updateBoard(Request $request, KanbanBoard $board)
    {
        Gate::authorize('update', $board);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'folder_name' => 'nullable|string|max:100',
            'visibility' => 'nullable|in:public,private,shareable',
            'is_favorite' => 'nullable|boolean',
            'settings' => 'nullable|array',
        ]);

        $board->update($validated);

        return back()->with('success', 'Board updated');
    }

    public function duplicateBoard(KanbanBoard $board)
    {
        Gate::authorize('duplicate', $board);

        $newBoard = KanbanBoard::create([
            'workspace_id' => $board->workspace_id,
            'title' => $board->title . ' (Copy)',
            'description' => $board->description,
            'department' => $board->department,
            'folder_name' => $board->folder_name,
            'visibility' => $board->visibility,
            'created_by' => auth()->id(),
        ]);

        foreach ($board->columns as $col) {
            KanbanColumn::create([
                'board_id' => $newBoard->id,
                'title' => $col->title,
                'color' => $col->color,
                'position' => $col->position,
            ]);
        }

        foreach ($board->groups as $grp) {
            BoardGroup::create([
                'board_id' => $newBoard->id,
                'title' => $grp->title,
                'color' => $grp->color,
                'position' => $grp->position,
            ]);
        }

        foreach ($board->allBoardColumns as $bc) {
            BoardColumn::create([
                'board_id' => $newBoard->id,
                'key' => $bc->key,
                'title' => $bc->title,
                'type' => $bc->type,
                'scope' => $bc->scope ?? 'task',
                'config' => $bc->config,
                'position' => $bc->position,
                'width' => $bc->width,
                'is_visible' => $bc->is_visible,
            ]);
        }

        foreach ($board->views as $v) {
            BoardView::create([
                'board_id' => $newBoard->id,
                'name' => $v->name,
                'type' => $v->type,
                'is_default' => $v->is_default,
                'settings' => $v->settings,
                'position' => $v->position,
            ]);
        }

        return redirect()->route('kanban.index', ['workspace' => $newBoard->workspace_id, 'board' => $newBoard->id])
            ->with('success', 'Board duplicated successfully');
    }

    public function deleteBoard(KanbanBoard $board)
    {
        Gate::authorize('delete', $board);

        $workspaceId = $board->workspace_id;
        $board->delete();

        return redirect()->route('kanban.index', ['workspace' => $workspaceId])
            ->with('success', 'Board deleted successfully');
    }

    public function addBoardMember(Request $request, KanbanBoard $board)
    {
        Gate::authorize('manageMembers', $board);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|in:owner,admin,editor,viewer,guest',
        ]);

        BoardMember::updateOrCreate(
            ['board_id' => $board->id, 'user_id' => $validated['user_id']],
            ['role' => $validated['role']]
        );

        return back()->with('success', 'Member added to board');
    }

    public function removeBoardMember(KanbanBoard $board, BoardMember $member)
    {
        Gate::authorize('manageMembers', $board);

        abort_unless($member->board_id === $board->id, 404, 'Member does not belong to this board.');

        if ($member->role !== 'owner') {
            $member->delete();
        }

        return back()->with('success', 'Member removed from board');
    }

    public function updateBoardMemberRole(Request $request, KanbanBoard $board, BoardMember $member)
    {
        Gate::authorize('manageMembers', $board);

        abort_unless($member->board_id === $board->id, 404, 'Member does not belong to this board.');

        $validated = $request->validate([
            'role' => 'required|in:owner,admin,editor,viewer,guest',
        ]);

        if ($member->role !== 'owner') {
            $member->update(['role' => $validated['role']]);
        }

        return back()->with('success', 'Board member role updated');
    }

    // --- Workflow Stages (Kanban Columns) Management ---
    public function storeWorkflowStage(Request $request, KanbanBoard $board)
    {
        Gate::authorize('manageStatuses', $board);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
            'semantic_category' => 'nullable|in:not_started,in_progress,blocked,in_review,completed,cancelled',
        ]);

        $stage = KanbanColumn::create([
            'board_id' => $board->id,
            'title' => $validated['title'],
            'color' => $validated['color'] ?? '#64748b',
            'position' => $board->columns()->count(),
            'semantic_category' => $validated['semantic_category'] ?? KanbanColumn::categoryForLegacyLabel($validated['title']),
            'is_default' => !$board->columns()->exists(),
        ]);

        return back()->with('success', 'Stage created');
    }

    public function updateWorkflowStage(Request $request, KanbanColumn $column)
    {
        $board = $column->board;
        abort_unless($board, 404);
        Gate::authorize('manageStatuses', $board);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'color' => 'nullable|string|max:20',
            'semantic_category' => 'sometimes|in:not_started,in_progress,blocked,in_review,completed,cancelled',
            'is_default' => 'sometimes|boolean',
            'is_archived' => 'sometimes|boolean',
        ]);

        if (($validated['is_archived'] ?? false) && $column->is_default && !($validated['is_default'] ?? false)) {
            return back()->withErrors(['status' => 'Choose another default status before archiving this one.']);
        }
        if (($validated['is_default'] ?? false) && ($validated['is_archived'] ?? $column->is_archived)) {
            return back()->withErrors(['status' => 'An archived status cannot be the default.']);
        }

        $categoryChanged = isset($validated['semantic_category'])
            && $validated['semantic_category'] !== $column->semantic_category;
        DB::transaction(function () use ($board, $column, $validated, $categoryChanged) {
            if ($validated['is_default'] ?? false) {
                $board->columns()->update(['is_default' => false]);
            }
            $column->update($validated);
            if ($categoryChanged) {
                $completed = $column->isCompletionStatus();
                $tasksToUpdate = $column->tasks();
                if ($completed) {
                    $tasksToUpdate->whereNull('completed_at')->update(['completed_at' => now()]);
                } else {
                    $tasksToUpdate->update(['completed_at' => null]);
                }
                foreach ($column->tasks()->whereNotNull('parent_id')->with('parent')->get() as $subtask) {
                    $subtask->parent?->recalculateProgressFromSubtasks();
                }
            }
        });

        return back()->with('success', 'Stage updated');
    }

    public function deleteWorkflowStage(KanbanColumn $column)
    {
        $board = $column->board;
        abort_unless($board, 404);
        Gate::authorize('manageStatuses', $board);
        abort_if($column->is_default, 422, 'Choose another default status first.');
        abort_if($board->columns()->where('is_archived', false)->count() <= 1, 422, 'A board needs an active status.');
        $column->update(['is_archived' => true]);

        return back()->with('success', 'Status archived');
    }

    public function reorderWorkflowStages(Request $request, KanbanBoard $board)
    {
        Gate::authorize('manageStatuses', $board);

        $validated = $request->validate([
            'stage_ids' => 'required|array',
            'stage_ids.*' => 'distinct|exists:kanban_columns,id',
        ]);

        abort_unless(
            KanbanColumn::whereIn('id', $validated['stage_ids'])->where('board_id', $board->id)->count() === count($validated['stage_ids']),
            422,
            'Statuses must belong to this board.'
        );

        foreach ($validated['stage_ids'] as $idx => $id) {
            KanbanColumn::where('id', $id)->where('board_id', $board->id)->update(['position' => $idx]);
        }

        return back()->with('success', 'Stages reordered');
    }

    // --- Groups Management ---
    public function storeGroup(Request $request, KanbanBoard $board)
    {
        Gate::authorize('manageGroups', $board);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
        ]);

        $group = BoardGroup::create([
            'board_id' => $board->id,
            'title' => $validated['title'],
            'color' => $validated['color'] ?? '#579BFC',
            'position' => $board->groups()->count(),
        ]);

        return back()->with('success', 'Group created');
    }

    public function updateGroup(Request $request, BoardGroup $group)
    {
        $board = $group->board;
        if ($board) {
            Gate::authorize('manageGroups', $board);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'color' => 'nullable|string|max:20',
        ]);

        $group->update($validated);

        return back()->with('success', 'Group updated');
    }

    public function deleteGroup(BoardGroup $group)
    {
        $board = $group->board;
        if ($board) {
            Gate::authorize('manageGroups', $board);
        }

        $boardId = $group->board_id;
        $otherGroup = BoardGroup::where('board_id', $boardId)->where('id', '!=', $group->id)->first();
        if ($otherGroup) {
            KanbanTask::where('group_id', $group->id)->update(['group_id' => $otherGroup->id]);
        }
        $group->delete();

        return back()->with('success', 'Group deleted');
    }

    // --- Dynamic Columns Management ---
    public function storeBoardColumn(Request $request, KanbanBoard $board)
    {
        Gate::authorize('manageColumns', $board);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|string|in:text,long_text,status,priority,people,date,timeline,number,checkbox,dropdown,tags,rating,progress,link,formula,connect_boards,mirror,image',
            'scope' => 'nullable|string|in:task,subtask',
            'config' => 'nullable|array',
            'width' => 'nullable|integer',
        ]);

        $scope = $validated['scope'] ?? 'task';
        $prefix = $scope === 'subtask' ? 'sub_' : 'col_';
        $key = $prefix . strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $validated['title'])) . '_' . uniqid();
        $position = $scope === 'subtask' ? $board->subitemColumns()->count() : $board->boardColumns()->count();

        BoardColumn::create([
            'board_id' => $board->id,
            'key' => $key,
            'title' => $validated['title'],
            'type' => $validated['type'],
            'scope' => $scope,
            'config' => $validated['config'] ?? null,
            'width' => $validated['width'] ?? 150,
            'position' => $position,
        ]);

        return back()->with('success', 'Column added');
    }

    public function updateBoardColumn(Request $request, BoardColumn $column)
    {
        $board = $column->board;
        if ($board) {
            Gate::authorize('manageColumns', $board);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'is_visible' => 'nullable|boolean',
            'width' => 'nullable|integer',
            'config' => 'nullable|array',
        ]);

        $column->update($validated);

        return back()->with('success', 'Column updated');
    }

    public function duplicateBoardColumn(BoardColumn $column)
    {
        $board = $column->board;
        if ($board) {
            Gate::authorize('manageColumns', $board);
        }

        $newKey = 'col_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $column->title)) . '_copy_' . uniqid();
        $duplicated = BoardColumn::create([
            'board_id' => $column->board_id,
            'key' => $newKey,
            'title' => "{$column->title} (Copy)",
            'type' => $column->type,
            'config' => $column->config,
            'width' => $column->width,
            'position' => $board ? $board->boardColumns()->count() : ($column->position + 1),
            'is_visible' => true,
        ]);

        // If tasks have custom values for the original column, copy them over safely
        if ($board) {
            $tasks = KanbanTask::where('board_id', $board->id)->get();
            foreach ($tasks as $task) {
                if ($task->custom_values && isset($task->custom_values[$column->key])) {
                    $vals = $task->custom_values;
                    $vals[$newKey] = $vals[$column->key];
                    $task->update(['custom_values' => $vals]);
                }
            }
        }

        return back()->with('success', 'Column duplicated');
    }

    public function deleteBoardColumn(BoardColumn $column)
    {
        $board = $column->board;
        if ($board) {
            Gate::authorize('manageColumns', $board);
        }

        $column->delete();
        return back()->with('success', 'Column deleted');
    }

    public function reorderBoardColumns(Request $request, KanbanBoard $board)
    {
        Gate::authorize('manageColumns', $board);

        $validated = $request->validate([
            'column_ids' => 'required|array',
            'column_ids.*' => 'exists:board_columns,id',
        ]);

        foreach ($validated['column_ids'] as $index => $colId) {
            BoardColumn::where('id', $colId)->where('board_id', $board->id)->update(['position' => $index]);
        }

        return back()->with('success', 'Columns reordered');
    }

    public function toggleBoardFavorite(KanbanBoard $board)
    {
        Gate::authorize('view', $board);

        $board->update(['is_favorite' => !$board->is_favorite]);
        return back()->with('success', 'Board updated');
    }

    // --- Tasks / Items ---
    public function storeTask(Request $request)
    {
        $validated = $request->validate([
            'board_id' => 'required|exists:kanban_boards,id',
            'column_id' => 'nullable|exists:kanban_columns,id',
            'group_id' => 'nullable|exists:board_groups,id',
            'parent_id' => 'nullable|exists:kanban_tasks,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:Low,Medium,High,Urgent',
            'due_date' => 'nullable|date',
            'due_time' => 'nullable|string|max:10',
            'start_date' => 'nullable|date',
            'start_time' => 'nullable|string|max:10',
            'is_milestone' => 'nullable|boolean',
            'reminder_lead_minutes' => 'nullable|integer',
            'assigned_to' => 'nullable|exists:users,id',
            'labels' => 'nullable|array',
            'custom_values' => 'nullable|array',
            'progress' => 'nullable|integer|min:0|max:100',
        ]);

        if (!empty($validated['start_date']) && !empty($validated['due_date'])) {
            $startDateTime = $validated['start_date'] . ' ' . ($validated['start_time'] ?? '00:00');
            $dueDateTime = $validated['due_date'] . ' ' . ($validated['due_time'] ?? '23:59');
            if (strtotime($dueDateTime) < strtotime($startDateTime)) {
                return back()->with('error', 'Due date/time cannot precede start date/time');
            }
        }

        $board = KanbanBoard::findOrFail($validated['board_id']);
        Gate::authorize('create', [KanbanTask::class, $board]);

        $columnId = $validated['column_id'] ?? null;
        if (!$columnId) {
            $columnId = $board->columns()->first()?->id ?? KanbanColumn::create([
                'board_id' => $board->id,
                'title' => 'Not Started',
                'color' => '#64748b',
                'position' => 0,
            ])->id;
        }

        $groupId = $validated['group_id'] ?? null;
        if (!$groupId) {
            $groupId = $board->groups()->first()?->id ?? BoardGroup::create([
                'board_id' => $board->id,
                'title' => 'Active Tasks',
                'color' => '#579BFC',
                'position' => 0,
            ])->id;
        }

        $task = KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $columnId,
            'group_id' => $groupId,
            'parent_id' => $validated['parent_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'priority' => $validated['priority'] ?? 'Medium',
            'due_date' => $validated['due_date'] ?? null,
            'due_time' => $validated['due_time'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'start_time' => $validated['start_time'] ?? null,
            'is_milestone' => $validated['is_milestone'] ?? false,
            'reminder_lead_minutes' => $validated['reminder_lead_minutes'] ?? null,
            'assigned_to' => $validated['assigned_to'] ?? null,
            'labels' => $validated['labels'] ?? [],
            'custom_values' => $validated['custom_values'] ?? [],
            'progress' => $validated['progress'] ?? 0,
            'created_by' => auth()->id(),
            'position' => KanbanTask::where('board_id', $board->id)->where('column_id', $columnId)->count(),
        ]);

        if ($task->parent_id) {
            $task->parent?->recalculateProgressFromSubtasks();
        }

        TaskActivityService::log(
            task: $task,
            eventType: 'task_created',
            description: auth()->user()->name . " created this task",
            metadata: ['title' => $task->title, 'board' => $board->title]
        );

        AuditLog::log(
            action: 'KANBAN_TASK_CREATED',
            department: auth()->user()->department ?? 'Operations',
            entityType: 'KanbanTask',
            entityId: $task->id,
            description: "Created task: {$task->title} in board {$board->title}"
        );

        // Dispatch Automations for Item Created
        $this->automationEngine->dispatch('item_created', $task, [], auth()->user());

        if ($task->assigned_to && $task->assigned_to !== auth()->id()) {
            $assignee = User::find($task->assigned_to);
            if ($assignee) {
                $this->notificationService->notifyAssignment($task, $assignee, auth()->user());
            }
        }

        return back()->with('success', 'Task created successfully');
    }

    public function updateTask(Request $request, KanbanTask $task)
    {
        Gate::authorize('update', $task);

        // Field-level authorization: Contributors can only update progress and actual_hours on assigned tasks (unless workspace owner or board creator)
        $isBoardOrWorkspaceManager = ($task->board?->workspace && (int) $task->board->workspace->owner_id === (int) $request->user()->id)
            || ((int) $task->board?->created_by === (int) $request->user()->id)
            || in_array($request->user()->role, ['admin', 'super_admin', 'project_manager', 'admin_manager'], true);

        if (!$isBoardOrWorkspaceManager && in_array($request->user()->role, ['designer', 'developer', 'dept_user', 'employee'], true)) {
            $disallowedFields = [
                'title', 'description', 'priority', 'due_date', 'due_time',
                'start_date', 'start_time', 'is_milestone', 'reminder_lead_minutes',
                'assigned_to', 'column_id', 'group_id', 'labels', 'custom_values',
                'estimated_hours'
            ];
            foreach ($disallowedFields as $field) {
                if ($request->has($field)) {
                    abort(403, "Employees are not authorized to modify {$field}.");
                }
            }
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:Low,Medium,High,Urgent',
            'due_date' => 'nullable|date',
            'due_time' => 'nullable|string|max:10',
            'start_date' => 'nullable|date',
            'start_time' => 'nullable|string|max:10',
            'is_milestone' => 'nullable|boolean',
            'reminder_lead_minutes' => 'nullable|integer',
            'assigned_to' => 'nullable|exists:users,id',
            'column_id' => 'nullable|exists:kanban_columns,id',
            'group_id' => 'nullable|exists:board_groups,id',
            'labels' => 'nullable|array',
            'custom_values' => 'nullable|array',
            'progress' => 'nullable|integer|min:0|max:100',
            'estimated_hours' => 'nullable|numeric',
            'actual_hours' => 'nullable|numeric',
        ]);

        // Date order validation
        $effectiveStartDate = $validated['start_date'] ?? $task->start_date;
        $effectiveStartTime = $validated['start_time'] ?? $task->start_time ?? '00:00';
        $effectiveDueDate = $validated['due_date'] ?? $task->due_date;
        $effectiveDueTime = $validated['due_time'] ?? $task->due_time ?? '23:59';

        if (!empty($effectiveStartDate) && !empty($effectiveDueDate)) {
            $startDateTime = $effectiveStartDate . ' ' . $effectiveStartTime;
            $dueDateTime = $effectiveDueDate . ' ' . $effectiveDueTime;
            if (strtotime($dueDateTime) < strtotime($startDateTime)) {
                return back()->with('error', 'Due date/time cannot precede start date/time');
            }
        }

        if (isset($validated['column_id'])) {
            $status = KanbanColumn::where('board_id', $task->board_id)->findOrFail($validated['column_id']);
            abort_if($status->is_archived && $status->id !== $task->column_id, 422, 'Archived statuses cannot be assigned.');
            $task->applyWorkflowStatus($status);
        }
        if (isset($validated['group_id'])) {
            abort_unless(BoardGroup::where('board_id', $task->board_id)->whereKey($validated['group_id'])->exists(), 422);
        }

        if (isset($validated['custom_values'])) {
            $current = $task->custom_values ?? [];
            $validated['custom_values'] = array_merge($current, $validated['custom_values']);
        }

        $prevPriority = $task->priority;
        $prevAssigned = $task->assigned_to;
        $prevColumn = $task->getOriginal('column_id');
        $userName = auth()->user()->name;

        // Activity logging for specific field mutations
        if (isset($validated['title']) && $validated['title'] !== $task->title) {
            TaskActivityService::log(
                task: $task,
                eventType: 'task_renamed',
                description: "{$userName} renamed task from '{$task->title}' to '{$validated['title']}'",
                fieldName: 'title',
                oldValue: $task->title,
                newValue: $validated['title']
            );
        }

        if (isset($validated['priority']) && $validated['priority'] !== $prevPriority) {
            TaskActivityService::log(
                task: $task,
                eventType: 'priority_changed',
                description: "{$userName} changed priority from '{$prevPriority}' to '{$validated['priority']}'",
                fieldName: 'priority',
                oldValue: $prevPriority,
                newValue: $validated['priority']
            );
        }

        if (array_key_exists('assigned_to', $validated) && $validated['assigned_to'] !== $prevAssigned) {
            $prevUser = $prevAssigned ? User::find($prevAssigned)?->name : 'Unassigned';
            $newUser = $validated['assigned_to'] ? User::find($validated['assigned_to'])?->name : 'Unassigned';
            TaskActivityService::log(
                task: $task,
                eventType: 'assignee_changed',
                description: "{$userName} assigned '{$newUser}' (was '{$prevUser}')",
                fieldName: 'assigned_to',
                oldValue: $prevUser,
                newValue: $newUser
            );
        }

        if (isset($validated['due_date']) && $validated['due_date'] !== $task->due_date) {
            TaskActivityService::log(
                task: $task,
                eventType: 'due_date_changed',
                description: "{$userName} changed due date to {$validated['due_date']}",
                fieldName: 'due_date',
                oldValue: $task->due_date,
                newValue: $validated['due_date']
            );
        }

        if (array_key_exists('due_time', $validated) && $validated['due_time'] !== $task->due_time) {
            $formattedTime = $validated['due_time'] ? \Illuminate\Support\Carbon::parse($validated['due_time'])->format('g:i A') : 'None';
            TaskActivityService::log(
                task: $task,
                eventType: 'due_time_changed',
                description: "{$userName} changed due time to {$formattedTime}",
                fieldName: 'due_time',
                oldValue: $task->due_time,
                newValue: $validated['due_time']
            );
        }

        if (isset($validated['progress']) && $validated['progress'] !== $task->progress) {
            TaskActivityService::log(
                task: $task,
                eventType: 'progress_updated',
                description: "{$userName} updated progress to {$validated['progress']}%",
                fieldName: 'progress',
                oldValue: $task->progress,
                newValue: $validated['progress']
            );
        }

        if (isset($validated['description']) && $validated['description'] !== $task->description) {
            TaskActivityService::log(
                task: $task,
                eventType: 'description_updated',
                description: "{$userName} updated task description",
                fieldName: 'description'
            );
        }

        // Custom column mutations logging (e.g. Account Manager, Service Type, Client Deadline, etc.)
        if (isset($validated['custom_values']) && is_array($validated['custom_values'])) {
            $boardCols = $task->board?->allBoardColumns->keyBy('key') ?? collect();
            foreach ($validated['custom_values'] as $cKey => $cVal) {
                $oldVal = ($task->custom_values ?? [])[$cKey] ?? null;
                if ($oldVal !== $cVal) {
                    $colDef = $boardCols->get($cKey);
                    $colTitle = $colDef?->title ?? $cKey;

                    // Human-readable format if it's people assignment (array or single ID)
                    if ($colDef?->type === 'people') {
                        $resolveNames = function ($v) {
                            if (empty($v)) return 'None';
                            $ids = is_array($v) ? $v : [$v];
                            return User::whereIn('id', $ids)->pluck('name')->join(', ') ?: 'None';
                        };
                        $oldNames = $resolveNames($oldVal);
                        $newNames = $resolveNames($cVal);

                        TaskActivityService::log(
                            task: $task,
                            eventType: 'people_assignment_changed',
                            description: "{$userName} updated {$colTitle} to {$newNames} (was {$oldNames})",
                            fieldName: $cKey,
                            oldValue: $oldNames,
                            newValue: $newNames
                        );

                        // Notify newly assigned users
                        $oldIds = is_array($oldVal) ? $oldVal : ($oldVal ? [$oldVal] : []);
                        $newIds = is_array($cVal) ? $cVal : ($cVal ? [$cVal] : []);
                        $addedIds = array_diff($newIds, $oldIds);
                        foreach ($addedIds as $newUserId) {
                            if ((int) $newUserId !== (int) auth()->id()) {
                                $userObj = User::find($newUserId);
                                if ($userObj) {
                                    $this->notificationService->notifyAssignment($task, $userObj, auth()->user());
                                }
                            }
                        }
                    } else {
                        TaskActivityService::log(
                            task: $task,
                            eventType: 'custom_column_changed',
                            description: "{$userName} updated {$colTitle} to " . (is_array($cVal) ? json_encode($cVal) : (string) $cVal),
                            fieldName: $cKey,
                            oldValue: $oldVal,
                            newValue: $cVal
                        );
                    }
                }
            }
        }

        $task->update($validated);

        if ($task->parent_id) {
            $task->parent?->recalculateProgressFromSubtasks();
        }

        // Dispatch Automations
        if (isset($validated['priority']) && $validated['priority'] !== $prevPriority) {
            $this->automationEngine->dispatch('priority_changed', $task, ['prev_priority' => $prevPriority], auth()->user());
        }
        if (isset($validated['assigned_to']) && $validated['assigned_to'] !== $prevAssigned) {
            $this->automationEngine->dispatch('item_assigned', $task, ['prev_assigned' => $prevAssigned], auth()->user());
            if ($validated['assigned_to'] && (int) $validated['assigned_to'] !== (int) auth()->id()) {
                $assignee = User::find($validated['assigned_to']);
                if ($assignee) {
                    $this->notificationService->notifyAssignment($task, $assignee, auth()->user());
                }
            }
        }
        if (isset($validated['column_id'])) {
            $this->automationEngine->dispatch('status_changed', $task, ['prev_column' => $prevColumn], auth()->user());
        }
        $this->automationEngine->dispatch('item_updated', $task, [], auth()->user());
        \App\Events\TaskUpdatedEvent::dispatch($task, 'updated', auth()->id());

        if ($task->completed_at !== null) {
            $this->recurrenceService->handleTaskCompleted($task);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Task updated',
                'task' => $task->fresh(['column', 'group']),
            ]);
        }

        return back()->with('success', 'Task updated');
    }

    public function updateTaskColumn(Request $request, KanbanTask $task)
    {
        $validated = $request->validate([
            'column_id' => 'required|exists:kanban_columns,id',
            'position' => 'nullable|integer',
        ]);

        $status = KanbanColumn::findOrFail($validated['column_id']);
        if ((int) $status->board_id !== (int) $task->board_id) {
            abort(403, 'Cross-board or cross-workspace movement is not permitted.');
        }
        Gate::authorize('changeStatus', [$task, $status]);

        abort_if($status->is_archived && $status->id !== $task->column_id, 422, 'Archived statuses cannot be assigned.');

        // Review safety: if moving to in_review, ensure a review cycle is registered
        if ($status->semantic_category === 'in_review' || str_contains(strtolower($status->title), 'review')) {
            $pendingCycle = $task->reviewCycles()->where('state', 'pending')->first();
            if (!$pendingCycle) {
                $latestCycle = $task->reviewCycles()->latest('round_number')->first();
                $roundNumber = $latestCycle ? ($latestCycle->round_number + 1) : 1;
                \App\Models\TaskReviewCycle::create([
                    'task_id' => $task->id,
                    'round_number' => $roundNumber,
                    'submitted_by' => auth()->id(),
                    'state' => 'pending',
                    'total_stages' => 1,
                    'current_stage_index' => 1,
                    'notes' => 'Submitted via workflow movement',
                    'submitted_at' => now(),
                ]);
            }
        }

        $prevColumn = $task->column?->title;
        $task->applyWorkflowStatus($status);
        if (isset($validated['position'])) {
            $task->position = $validated['position'];
        }

        $newColumn = $status->title;

        // Cross-view sync: if board groups correspond to stages, sync group_id
        if ($newColumn && $task->board_id) {
            $matchingGroup = BoardGroup::where('board_id', $task->board_id)
                ->where(function ($q) use ($newColumn) {
                    $q->where('title', $newColumn)
                      ->orWhere('title', 'like', "%{$newColumn}%");
                })->first();

            if ($matchingGroup && $task->group_id !== $matchingGroup->id) {
                $task->group_id = $matchingGroup->id;
            }
        }

        $task->save();

        if ($task->parent_id) {
            $task->parent?->recalculateProgressFromSubtasks();
        }

        if ($prevColumn !== $newColumn) {
            TaskActivityService::log(
                task: $task,
                eventType: 'status_changed',
                description: auth()->user()->name . " changed Status from '{$prevColumn}' to '{$newColumn}'",
                fieldName: 'column_id',
                oldValue: $prevColumn,
                newValue: $newColumn
            );
        }

        AuditLog::log(
            action: 'KANBAN_TASK_MOVED',
            department: auth()->user()->department ?? 'Operations',
            entityType: 'KanbanTask',
            entityId: $task->id,
            description: "Moved task '{$task->title}' from {$prevColumn} to {$newColumn}"
        );

        $task->load('column', 'group', 'board');

        // Dispatch status_changed automation
        $this->automationEngine->dispatch('status_changed', $task, [
            'prev_column' => $prevColumn,
            'new_column' => $newColumn,
        ], auth()->user());

        \App\Events\TaskUpdatedEvent::dispatch($task, 'status_changed', auth()->id());

        if ($task->completed_at !== null) {
            $this->recurrenceService->handleTaskCompleted($task);
        }

        return back()->with('success', 'Task updated');
    }

    public function reorderTasks(Request $request)
    {
        $user = $request->user();

        if ($request->has('tasks') && is_array($request->input('tasks'))) {
            $taskItems = $request->input('tasks');
            $taskIds = array_column($taskItems, 'id');
        } else {
            $validated = $request->validate([
                'task_ids' => 'required|array',
                'task_ids.*' => 'exists:kanban_tasks,id',
                'column_id' => 'nullable|exists:kanban_columns,id',
            ]);
            $taskIds = $validated['task_ids'];
        }

        $tasks = KanbanTask::whereIn('id', $taskIds)->get()->keyBy('id');

        // Check authorization: if user is contributor, ALL reordered tasks must be assigned to them!
        if (in_array($user->role, ['designer', 'developer', 'dept_user', 'employee'], true)) {
            foreach ($taskIds as $id) {
                $task = $tasks->get($id);
                if (!$task || !$task->isAssignedTo($user)) {
                    abort(403, 'Employees are not authorized to reorder tasks assigned to other employees.');
                }
            }
        } else {
            foreach ($taskIds as $id) {
                $task = $tasks->get($id);
                if ($task && !$user->can('update', $task)) {
                    abort(403, 'Unauthorized to reorder tasks.');
                }
            }
        }

        $targetColId = $request->input('column_id');
        $targetCol = $targetColId ? KanbanColumn::find($targetColId) : null;

        if ($targetCol && in_array($user->role, ['designer', 'developer', 'dept_user', 'employee'], true)) {
            foreach ($taskIds as $id) {
                $task = $tasks->get($id);
                if ($task && !$user->can('changeStatus', [$task, $targetCol])) {
                    abort(403, 'Unauthorized workflow transition during reorder.');
                }
            }
        }

        // Apply positions
        DB::transaction(function () use ($taskIds, $tasks, $targetColId) {
            foreach ($taskIds as $idx => $id) {
                $task = $tasks->get($id);
                if ($task) {
                    $update = ['position' => $idx];
                    if ($targetColId) {
                        $update['column_id'] = $targetColId;
                    }
                    $task->update($update);
                }
            }
        });

        return back()->with('success', 'Tasks reordered');
    }

    public function updateTaskGroup(Request $request, KanbanTask $task)
    {
        Gate::authorize('changeGroup', $task);

        $validated = $request->validate([
            'group_id' => 'required|exists:board_groups,id',
            'position' => 'nullable|integer',
        ]);

        $prevGroup = $task->group?->title;
        $task->group_id = $validated['group_id'];
        if (isset($validated['position'])) {
            $task->position = $validated['position'];
        }
        $task->save();

        $newGroup = BoardGroup::find($validated['group_id'])?->title;
        if ($prevGroup !== $newGroup) {
            TaskActivityService::log(
                task: $task,
                eventType: 'group_changed',
                description: auth()->user()->name . " moved task from group '{$prevGroup}' to '{$newGroup}'",
                fieldName: 'group_id',
                oldValue: $prevGroup,
                newValue: $newGroup
            );
        }

        return back()->with('success', 'Task moved to group');
    }

    public function storeSubitem(Request $request, KanbanTask $task)
    {
        Gate::authorize('manageSubtasks', $task);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'due_time' => 'nullable|string|max:10',
            'start_date' => 'nullable|date',
            'start_time' => 'nullable|string|max:10',
            'column_id' => 'nullable|exists:kanban_columns,id',
        ]);

        // Prevent circular relationship or excessive depth (>3)
        $depth = 0;
        $curr = $task;
        while ($curr->parent_id && $depth < 5) {
            $depth++;
            $curr = $curr->parent;
        }

        if ($depth >= 3) {
            return back()->with('error', 'Subtask hierarchy depth limit reached (max 3 levels)');
        }

        $subitem = KanbanTask::create([
            'board_id' => $task->board_id,
            'group_id' => $task->group_id,
            'parent_id' => $task->id,
            'column_id' => $validated['column_id'] ?? $task->column_id,
            'title' => $validated['title'],
            'assigned_to' => $validated['assigned_to'] ?? null,
            'due_date' => $validated['due_date'] ?? null,
            'due_time' => $validated['due_time'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'start_time' => $validated['start_time'] ?? null,
            'priority' => 'Medium',
            'created_by' => auth()->id(),
            'position' => KanbanTask::where('parent_id', $task->id)->count(),
        ]);

        $task->recalculateProgressFromSubtasks();

        TaskActivityService::log(
            task: $task,
            eventType: 'subitem_created',
            description: auth()->user()->name . " added subitem '{$subitem->title}'",
            metadata: ['subitem_id' => $subitem->id, 'subitem_title' => $subitem->title]
        );

        return back()->with('success', 'Subitem added');
    }

    public function deleteTask(KanbanTask $task)
    {
        Gate::authorize('delete', $task);

        $taskTitle = $task->title;
        $parentId = $task->parent_id;

        $task->delete();

        if ($parentId) {
            $parent = KanbanTask::find($parentId);
            $parent?->recalculateProgressFromSubtasks();

            TaskActivityService::log(
                task: $parent,
                eventType: 'subitem_deleted',
                description: auth()->user()->name . " deleted subitem '{$taskTitle}'"
            );
        }

        AuditLog::log(
            action: 'KANBAN_TASK_DELETED',
            department: auth()->user()->department ?? 'Operations',
            entityType: 'KanbanTask',
            entityId: $task->id,
            description: "Deleted task: {$taskTitle}"
        );

        return back()->with('success', 'Task deleted');
    }

    // --- Comments, Threaded Replies & Reactions ---
    public function storeComment(Request $request, KanbanTask $task)
    {
        Gate::authorize('view', $task);

        $validated = $request->validate([
            'message' => 'required|string',
            'parent_id' => 'nullable|exists:kanban_comments,id',
        ]);

        $comment = KanbanComment::create([
            'task_id' => $task->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'user_id' => auth()->id(),
            'message' => $validated['message'],
        ]);

        TaskActivityService::log(
            task: $task,
            eventType: $comment->parent_id ? 'reply_added' : 'comment_added',
            description: auth()->user()->name . ($comment->parent_id ? " replied to an update" : " posted an update"),
            metadata: ['comment_id' => $comment->id]
        );

        \App\Events\CommentAddedEvent::dispatch($comment);

        // Notify mentioned users (@Name or @FirstName)
        $users = User::where('id', '!=', auth()->id())->get();
        $notifiedUserIds = [];
        foreach ($users as $user) {
            $firstName = explode(' ', $user->name)[0];
            $escapedFullName = preg_quote($user->name, '/');
            $escapedFirstName = preg_quote($firstName, '/');

            if (
                preg_match('/@' . $escapedFullName . '\b/i', $validated['message']) ||
                preg_match('/@' . $escapedFirstName . '\b/i', $validated['message'])
            ) {
                $this->notificationService->notifyMention($task, $user, auth()->user(), $validated['message']);
                $notifiedUserIds[] = $user->id;
            }
        }

        // Notify parent comment author if reply
        if ($comment->parent_id) {
            $parent = KanbanComment::find($comment->parent_id);
            if ($parent && $parent->user_id && $parent->user_id !== auth()->id() && !in_array($parent->user_id, $notifiedUserIds)) {
                $parentUser = User::find($parent->user_id);
                if ($parentUser) {
                    $this->notificationService->notify(
                        recipient: $parentUser,
                        title: 'New reply to your update',
                        message: auth()->user()->name . ' replied to your update on "' . $task->title . '"',
                        type: 'info',
                        category: 'mentions',
                        link: "/kanban?task_id={$task->id}",
                        actorId: auth()->id(),
                        metadata: ['task_id' => $task->id, 'comment_id' => $comment->id]
                    );
                    $notifiedUserIds[] = $parentUser->id;
                }
            }
        }

        // Notify task assignee if someone else commented and they weren't already notified
        if ($task->assigned_to && $task->assigned_to !== auth()->id() && !in_array($task->assigned_to, $notifiedUserIds)) {
            $assignee = User::find($task->assigned_to);
            if ($assignee) {
                $this->notificationService->notify(
                    recipient: $assignee,
                    title: 'New update on your task',
                    message: auth()->user()->name . ' posted an update on "' . $task->title . '"',
                    type: 'info',
                    category: 'system',
                    link: "/kanban?task_id={$task->id}",
                    actorId: auth()->id(),
                    metadata: ['task_id' => $task->id, 'comment_id' => $comment->id]
                );
            }
        }

        return back()->with('success', 'Update posted');
    }

    public function deleteComment(KanbanComment $comment)
    {
        Gate::authorize('delete', $comment);

        $comment->delete();
        return back()->with('success', 'Comment deleted');
    }

    public function toggleCommentReaction(Request $request, KanbanComment $comment)
    {
        $task = $comment->task;
        if ($task) {
            Gate::authorize('view', $task);
        }

        $validated = $request->validate([
            'emoji' => 'required|string|max:10',
        ]);

        $emoji = $validated['emoji'];
        $userId = auth()->id();
        $reactions = $comment->reactions ?? [];

        $usersForEmoji = $reactions[$emoji] ?? [];
        if (in_array($userId, $usersForEmoji)) {
            $usersForEmoji = array_values(array_filter($usersForEmoji, fn($id) => $id !== $userId));
            if (empty($usersForEmoji)) {
                unset($reactions[$emoji]);
            } else {
                $reactions[$emoji] = $usersForEmoji;
            }
        } else {
            $usersForEmoji[] = $userId;
            $reactions[$emoji] = $usersForEmoji;
        }

        $comment->update(['reactions' => $reactions]);

        return back()->with('success', 'Reaction updated');
    }

    // --- Attachments ---
    public function storeAttachment(Request $request, KanbanTask $task)
    {
        Gate::authorize('view', $task);

        $request->validate([
            'file' => 'required|file|max:20480', // 20MB limit
        ]);

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();
        $filePath = $file->store('attachments/kanban', 'public');

        $attachment = KanbanAttachment::create([
            'task_id' => $task->id,
            'user_id' => auth()->id(),
            'file_name' => $fileName,
            'file_path' => $filePath,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
        ]);

        TaskActivityService::log(
            task: $task,
            eventType: 'attachment_uploaded',
            description: auth()->user()->name . " uploaded attachment '{$fileName}'",
            metadata: ['file_name' => $fileName, 'file_size' => $file->getSize()]
        );

        AuditLog::log(
            action: 'TASK_ATTACHMENT_UPLOADED',
            department: auth()->user()->department ?? 'Operations',
            entityType: 'KanbanAttachment',
            entityId: $attachment->id,
            description: "Uploaded attachment '{$fileName}' to task '{$task->title}'"
        );

        return back()->with('success', 'Attachment uploaded');
    }

    public function deleteAttachment(KanbanAttachment $attachment)
    {
        Gate::authorize('delete', $attachment);

        $task = $attachment->task;
        $fileName = $attachment->file_name;

        if (Storage::disk('public')->exists($attachment->file_path)) {
            Storage::disk('public')->delete($attachment->file_path);
        }
        $attachment->delete();

        if ($task) {
            TaskActivityService::log(
                task: $task,
                eventType: 'attachment_deleted',
                description: auth()->user()->name . " deleted attachment '{$fileName}'"
            );
        }
        return back()->with('success', 'Attachment deleted');
    }

    public function downloadAttachment(KanbanAttachment $attachment)
    {
        Gate::authorize('view', $attachment);

        if (!$attachment->file_path || !Storage::disk('public')->exists($attachment->file_path)) {
            abort(404, 'Attachment file not found on storage.');
        }

        return Storage::disk('public')->download($attachment->file_path, $attachment->file_name);
    }

    // --- Views Management (Table, Kanban, Calendar, Timeline, Gantt, Workload, Chart, Files, Gallery) ---
    public function storeView(Request $request, KanbanBoard $board)
    {
        Gate::authorize('update', $board);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:table,kanban,calendar,timeline,gantt,workload,chart,files,gallery',
            'settings' => 'nullable|array',
        ]);

        $view = BoardView::create([
            'board_id' => $board->id,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'settings' => $validated['settings'] ?? [],
            'is_default' => false,
            'position' => $board->views()->count(),
        ]);

        return back()->with('success', "View '{$view->name}' created");
    }

    public function updateView(Request $request, BoardView $view)
    {
        $board = $view->board;
        if ($board) {
            Gate::authorize('update', $board);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:table,kanban,calendar,timeline,gantt,workload,chart,files,gallery',
            'settings' => 'nullable|array',
            'is_default' => 'sometimes|boolean',
        ]);

        if (!empty($validated['is_default'])) {
            BoardView::where('board_id', $view->board_id)->update(['is_default' => false]);
        }

        if (isset($validated['settings']) && is_array($validated['settings'])) {
            $existing = $view->settings ?? [];
            $validated['settings'] = array_merge($existing, $validated['settings']);
        }

        $view->update($validated);

        return back()->with('success', 'View updated');
    }

    public function deleteView(BoardView $view)
    {
        $board = $view->board;
        if ($board) {
            Gate::authorize('update', $board);
        }

        $boardId = $view->board_id;
        if (BoardView::where('board_id', $boardId)->count() <= 1) {
            return back()->with('error', 'Cannot delete the only view on the board');
        }

        $wasDefault = $view->is_default;
        $view->delete();

        if ($wasDefault) {
            $first = BoardView::where('board_id', $boardId)->first();
            $first?->update(['is_default' => true]);
        }

        return back()->with('success', 'View deleted');
    }

    public function reorderViews(Request $request, KanbanBoard $board)
    {
        Gate::authorize('update', $board);

        $validated = $request->validate([
            'view_ids' => 'required|array',
            'view_ids.*' => 'exists:board_views,id',
        ]);

        foreach ($validated['view_ids'] as $idx => $id) {
            BoardView::where('id', $id)->where('board_id', $board->id)->update(['position' => $idx]);
        }

        return back()->with('success', 'Views reordered');
    }

    // --- Task Dependencies & Sequencing ---
    public function getTaskDependencies(KanbanTask $task)
    {
        Gate::authorize('view', $task);
        return response()->json($this->dependencyService->getTaskDependenciesSummary($task));
    }

    public function searchLinkableTasks(Request $request, KanbanTask $task)
    {
        Gate::authorize('view', $task);
        $search = $request->query('query', '');
        $workspaceId = $task->board?->workspace_id;

        $tasks = KanbanTask::whereHas('board', function ($q) use ($workspaceId) {
                if ($workspaceId) {
                    $q->where('workspace_id', $workspaceId);
                }
            })
            ->where('id', '!=', $task->id)
            ->when($search, function ($q, $search) {
                $q->where('title', 'like', "%{$search}%");
            })
            ->with(['column:id,title,color'])
            ->limit(25)
            ->get(['id', 'board_id', 'column_id', 'title', 'due_date', 'priority', 'progress', 'completed_at']);

        return response()->json($tasks);
    }

    public function storeDependency(Request $request, KanbanTask $task)
    {
        Gate::authorize('manageDependencies', $task);

        $validated = $request->validate([
            'depends_on_task_id' => 'required|integer|exists:kanban_tasks,id|different:task_id',
            'relationship_type' => 'nullable|string|in:blocks,blocked_by,related_to',
            'dependency_type' => 'nullable|string|in:finish_to_start,start_to_start,finish_to_finish,start_to_finish',
            'lag_days' => 'nullable|integer',
        ]);

        try {
            $dep = $this->dependencyService->addDependency(
                task: $task,
                targetTaskId: (int) $validated['depends_on_task_id'],
                relationshipType: $validated['relationship_type'] ?? 'blocked_by',
                user: $request->user(),
                lagDays: $validated['lag_days'] ?? 0,
                dependencyType: $validated['dependency_type'] ?? 'finish_to_start'
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            if ($request->wantsJson()) {
                throw $e;
            }
            $errorMsg = collect($e->errors())->flatten()->first() ?? 'Invalid dependency.';
            return back()->with('error', $errorMsg)->withErrors($e->errors());
        }

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Dependency established successfully',
                'dependency' => $dep,
            ]);
        }

        return back()->with('success', 'Dependency established successfully');
    }

    public function deleteDependency(Request $request, TaskDependency $dependency)
    {
        $task = $dependency->task;
        abort_unless($task, 404);
        Gate::authorize('manageDependencies', $task);

        $this->dependencyService->removeDependency($dependency, $request->user());

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Dependency removed']);
        }

        return back()->with('success', 'Dependency removed');
    }

    public function getTaskRecurrence(KanbanTask $task)
    {
        Gate::authorize('view', $task);

        $rule = $task->recurrenceRule()->with('logs')->first();
        if (!$rule && $task->recurrence_rule_id) {
            $rule = \App\Models\TaskRecurrenceRule::with('logs')->find($task->recurrence_rule_id);
        }

        return response()->json([
            'rule' => $rule,
            'logs' => $rule?->logs ?? [],
        ]);
    }

    public function storeTaskRecurrence(Request $request, KanbanTask $task)
    {
        Gate::authorize('manageRecurrence', $task);

        $validated = $request->validate([
            'frequency' => 'required|string|in:daily,weekly,monthly,custom,on_completion',
            'interval' => 'required|integer|min:1',
            'days_of_week' => 'nullable|array',
            'days_of_week.*' => 'integer|between:1,7',
            'time_of_day' => 'nullable|string|max:10',
            'end_type' => 'required|string|in:never,after_occurrences,on_date',
            'max_occurrences' => 'nullable|integer|min:1',
            'end_date' => 'nullable|date',
            'is_active' => 'nullable|boolean',
            'copy_subtasks' => 'nullable|boolean',
            'copy_assignees' => 'nullable|boolean',
            'copy_custom_values' => 'nullable|boolean',
        ]);

        $rule = $this->recurrenceService->createOrUpdateRule($task, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Recurrence rule saved successfully',
                'rule' => $rule,
            ]);
        }

        return back()->with('success', 'Recurrence rule saved successfully');
    }

    public function toggleTaskRecurrence(Request $request, KanbanTask $task)
    {
        Gate::authorize('manageRecurrence', $task);

        $rule = $task->recurrenceRule;
        if (!$rule && $task->recurrence_rule_id) {
            $rule = \App\Models\TaskRecurrenceRule::find($task->recurrence_rule_id);
        }

        if (!$rule) {
            return response()->json(['message' => 'No recurrence rule found for this task'], 404);
        }

        $rule = $this->recurrenceService->togglePause($rule, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'message' => $rule->is_active ? 'Recurrence rule resumed' : 'Recurrence rule paused',
                'rule' => $rule,
            ]);
        }

        return back()->with('success', $rule->is_active ? 'Recurrence rule resumed' : 'Recurrence rule paused');
    }

    public function deleteTaskRecurrence(Request $request, KanbanTask $task)
    {
        Gate::authorize('manageRecurrence', $task);

        $rule = $task->recurrenceRule;
        if (!$rule && $task->recurrence_rule_id) {
            $rule = \App\Models\TaskRecurrenceRule::find($task->recurrence_rule_id);
        }

        if ($rule) {
            $this->recurrenceService->deleteRule($rule, $request->user());
        }

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Recurrence rule removed successfully']);
        }

        return back()->with('success', 'Recurrence rule removed');
    }

    public function runTaskRecurrenceNow(Request $request, KanbanTask $task)
    {
        Gate::authorize('manageRecurrence', $task);

        $rule = $task->recurrenceRule;
        if (!$rule && $task->recurrence_rule_id) {
            $rule = \App\Models\TaskRecurrenceRule::find($task->recurrence_rule_id);
        }

        if (!$rule) {
            return response()->json(['message' => 'No recurrence rule found to execute'], 404);
        }

        $newTask = $this->recurrenceService->spawnNextTask($rule, force: true);

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'New recurring task instance spawned successfully',
                'task' => $newTask,
                'rule' => $rule->fresh(),
            ]);
        }

        return back()->with('success', 'New recurring task spawned');
    }

    public function updateTaskSchedule(Request $request, KanbanTask $task)
    {
        Gate::authorize('update', $task);

        $isBoardOrWorkspaceManager = ($task->board?->workspace && (int) $task->board->workspace->owner_id === (int) $request->user()->id)
            || ((int) $task->board?->created_by === (int) $request->user()->id)
            || in_array($request->user()->role, ['admin', 'super_admin', 'project_manager', 'admin_manager'], true);

        if (!$isBoardOrWorkspaceManager && in_array($request->user()->role, ['designer', 'developer', 'dept_user', 'employee'], true)) {
            abort(403, 'Employees are not authorized to update task schedules.');
        }

        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'start_time' => 'nullable|string|max:10',
            'due_date' => 'nullable|date',
            'due_time' => 'nullable|string|max:10',
        ]);

        $effectiveStartDate = array_key_exists('start_date', $validated) ? $validated['start_date'] : $task->start_date;
        $effectiveStartTime = array_key_exists('start_time', $validated) ? $validated['start_time'] : ($task->start_time ?? '00:00');
        $effectiveDueDate = array_key_exists('due_date', $validated) ? $validated['due_date'] : $task->due_date;
        $effectiveDueTime = array_key_exists('due_time', $validated) ? $validated['due_time'] : ($task->due_time ?? '23:59');

        if (!empty($effectiveStartDate) && !empty($effectiveDueDate)) {
            $startDateTime = $effectiveStartDate . ' ' . ($effectiveStartTime ?: '00:00');
            $dueDateTime = $effectiveDueDate . ' ' . ($effectiveDueTime ?: '23:59');
            if (strtotime($dueDateTime) < strtotime($startDateTime)) {
                return back()->with('error', 'Due date/time cannot precede start date/time');
            }
        }

        $task->update($validated);

        return back()->with('success', 'Task schedule updated');
    }

    private function hasCircularDependency(int $currentId, int $targetId, array &$visited = []): bool
    {
        if ($currentId === $targetId) {
            return true;
        }

        if (isset($visited[$currentId])) {
            return false;
        }
        $visited[$currentId] = true;

        $nextTaskIds = TaskDependency::where('task_id', $currentId)->pluck('depends_on_task_id');
        foreach ($nextTaskIds as $nextId) {
            if ($this->hasCircularDependency($nextId, $targetId, $visited)) {
                return true;
            }
        }

        return false;
    }

    // --- Automation Engine Endpoints ---
    public function storeAutomation(Request $request, KanbanBoard $board)
    {
        Gate::authorize('manageAutomations', $board);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'trigger_type' => 'required|string',
            'trigger_config' => 'nullable|array',
            'conditions' => 'nullable|array',
            'actions' => 'required|array|min:1',
            'is_active' => 'nullable|boolean',
        ]);

        $automation = BoardAutomation::create([
            'board_id' => $board->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'trigger_type' => $validated['trigger_type'],
            'trigger_config' => $validated['trigger_config'] ?? [],
            'conditions' => $validated['conditions'] ?? ['match_type' => 'and', 'rules' => []],
            'actions' => $validated['actions'],
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => auth()->id(),
        ]);

        AuditLog::log(
            action: 'AUTOMATION_CREATED',
            department: $board->department ?? 'Operations',
            entityType: 'BoardAutomation',
            entityId: $automation->id,
            description: "Created automation rule: {$automation->name}"
        );

        return back()->with('success', 'Automation rule created');
    }

    public function updateAutomation(Request $request, BoardAutomation $automation)
    {
        $board = $automation->board;
        abort_unless($board, 404);
        Gate::authorize('manageAutomations', $board);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'trigger_type' => 'sometimes|string',
            'trigger_config' => 'nullable|array',
            'conditions' => 'nullable|array',
            'actions' => 'sometimes|array|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        $automation->update($validated);

        return back()->with('success', 'Automation rule updated');
    }

    public function toggleAutomation(BoardAutomation $automation)
    {
        $board = $automation->board;
        abort_unless($board, 404);
        Gate::authorize('manageAutomations', $board);

        $automation->update(['is_active' => !$automation->is_active]);
        $statusStr = $automation->is_active ? 'enabled' : 'disabled';
        return back()->with('success', "Automation {$statusStr}");
    }

    public function duplicateAutomation(BoardAutomation $automation)
    {
        $board = $automation->board;
        abort_unless($board, 404);
        Gate::authorize('manageAutomations', $board);

        $clone = $automation->replicate();
        $clone->name = "{$automation->name} (Copy)";
        $clone->created_by = auth()->id();
        $clone->execution_count = 0;
        $clone->last_executed_at = null;
        $clone->save();

        return back()->with('success', 'Automation duplicated');
    }

    public function deleteAutomation(BoardAutomation $automation)
    {
        $board = $automation->board;
        abort_unless($board, 404);
        Gate::authorize('manageAutomations', $board);

        $automation->delete();
        return back()->with('success', 'Automation rule deleted');
    }

    public function testAutomation(Request $request, BoardAutomation $automation)
    {
        $board = $automation->board;
        if ($board) {
            Gate::authorize('view', $board);
        }
        $task = KanbanTask::where('board_id', $automation->board_id)->first();
        if (!$task) {
            return back()->with('error', 'No tasks available on this board to test automation against');
        }

        $result = $this->automationEngine->evaluateAndExecute(
            $automation,
            $task,
            ['is_test_run' => true],
            auth()->user()
        );

        if ($result['status'] === 'success') {
            return back()->with('success', "Test execution succeeded on item: {$task->title} in {$result['duration_ms']}ms");
        }

        return back()->with('error', "Test execution result: {$result['status']} (" . ($result['reason'] ?? $result['error'] ?? 'unspecified') . ")");
    }

    /**
     * Polling-Based Synchronization endpoint (Phase 3.5).
     * Accepts:
     * - board_id: ID of active board
     * - since: ISO timestamp or UNIX timestamp change cursor
     * Returns:
     * - changed tasks since cursor
     * - unread notifications
     * - new server timestamp cursor
     */
    public function pollSync(Request $request)
    {
        $user = auth()->user();
        $boardId = $request->query('board_id');
        $since = $request->query('since');

        $sinceCarbon = null;
        if (!empty($since)) {
            try {
                $sinceCarbon = is_numeric($since) ? \Illuminate\Support\Carbon::createFromTimestamp((int)$since) : \Illuminate\Support\Carbon::parse($since);
            } catch (\Throwable $e) {
                $sinceCarbon = null;
            }
        }

        $tasks = collect();
        $boardColumns = null;
        $statusColumns = null;

        if ($boardId) {
            $board = KanbanBoard::find($boardId);
            if ($board && Gate::allows('view', $board)) {
                $tasksQuery = KanbanTask::where('board_id', $board->id)
                    ->with([
                        'assignee',
                        'column',
                        'group',
                        'subitems.assignee',
                        'subitems.column',
                        'subitems.mediaUsages.mediaAsset',
                        'mediaUsages.mediaAsset',
                    ]);

                if ($sinceCarbon) {
                    $tasksQuery->where('updated_at', '>', $sinceCarbon);
                }

                $tasks = $tasksQuery->get();
                $boardColumns = $board->boardColumns()->orderBy('position')->get();
                $statusColumns = $board->columns()->orderBy('position')->get();
            }
        }

        // Get unread notifications
        $notifications = \App\Models\SystemNotification::with('actor:id,name,avatar,avatar_url')
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->latest()
            ->take(10)
            ->get();

        $unreadCount = \App\Models\SystemNotification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'tasks' => $tasks,
            'board_columns' => $boardColumns,
            'status_columns' => $statusColumns,
            'unread_notifications_count' => $unreadCount,
            'recent_notifications' => $notifications,
            'cursor' => now()->toIso8601String(),
        ]);
    }

    /**
     * Update user preferences such as timezone.
     */
    public function updatePreferences(Request $request)
    {
        $validated = $request->validate([
            'timezone' => 'required|string|timezone',
        ]);

        auth()->user()->update([
            'timezone' => $validated['timezone'],
        ]);

        return back()->with('success', 'Preferences updated');
    }
}

