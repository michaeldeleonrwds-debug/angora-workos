<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Services\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskApiController extends Controller
{
    public function __construct(
        protected WebhookService $webhookService
    ) {}

    /**
     * List tasks with filtering, sorting, and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isExternal = $user->hasRole('external_user');

        $query = KanbanTask::with(['assignee:id,name,email', 'board:id,title,workspace_id', 'group:id,title']);

        if ($isExternal) {
            $query->where('client_visible', true);
        }

        if ($request->has('board_id')) {
            $query->where('board_id', $request->query('board_id'));
        }

        if ($request->has('status_id')) {
            $query->where('status_id', $request->query('status_id'));
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->query('priority'));
        }

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where('title', 'like', "%{$search}%");
        }

        $sortField = $request->query('sort', 'created_at');
        $sortDir = $request->query('dir', 'desc');
        if (in_array($sortField, ['id', 'title', 'priority', 'due_date', 'created_at', 'sort_order'])) {
            $query->orderBy($sortField, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $perPage = min((int) $request->query('per_page', 25), 100);
        $tasks = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $tasks->items(),
            'pagination' => [
                'current_page' => $tasks->currentPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
                'last_page' => $tasks->lastPage(),
            ],
        ]);
    }

    /**
     * Get single task
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $task = KanbanTask::with(['assignee:id,name,email', 'board', 'group', 'subitems', 'comments.user'])->findOrFail($id);

        if ($user->hasRole('external_user') && !$task->client_visible) {
            return response()->json(['success' => false, 'message' => 'Task not found or access restricted.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $task,
        ]);
    }

    /**
     * Create task
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'board_id' => 'required|exists:kanban_boards,id',
            'group_id' => 'nullable|exists:board_groups,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'status_id' => 'nullable|integer',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'custom_values' => 'nullable|array',
            'client_visible' => 'nullable|boolean',
        ]);

        $board = KanbanBoard::findOrFail($validated['board_id']);

        $column = KanbanColumn::where('board_id', $board->id)->first() ?? KanbanColumn::create([
            'board_id' => $board->id,
            'title' => 'To Do',
            'color' => '#579bfc',
            'position' => 0,
        ]);

        $task = KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $column->id,
            'created_by' => $request->user()->id,
            'group_id' => $validated['group_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'priority' => $validated['priority'] ?? 'medium',
            'status_id' => $validated['status_id'] ?? 1,
            'assigned_to' => $validated['assigned_to'] ?? $request->user()->id,
            'due_date' => $validated['due_date'] ?? null,
            'custom_values' => $validated['custom_values'] ?? [],
            'client_visible' => $validated['client_visible'] ?? false,
            'sort_order' => ((int) KanbanTask::where('board_id', $board->id)->max('sort_order')) + 1,
        ]);

        // Dispatch outbound webhook
        $this->webhookService->dispatch('task.created', [
            'task_id' => $task->id,
            'board_id' => $board->id,
            'title' => $task->title,
            'priority' => $task->priority,
            'creator_id' => $request->user()->id,
        ], $board->workspace_id);

        return response()->json([
            'success' => true,
            'message' => 'Task created successfully.',
            'data' => $task,
        ], 201);
    }

    /**
     * Update task
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $task = KanbanTask::with('board')->findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'status_id' => 'nullable|integer',
            'group_id' => 'nullable|exists:board_groups,id',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'custom_values' => 'nullable|array',
            'client_visible' => 'nullable|boolean',
        ]);

        $statusChanged = isset($validated['status_id']) && $validated['status_id'] !== $task->status_id;

        $task->update($validated);

        if ($statusChanged) {
            $this->webhookService->dispatch('task.status_changed', [
                'task_id' => $task->id,
                'board_id' => $task->board_id,
                'status_id' => $task->status_id,
                'updated_by' => $request->user()->id,
            ], $task->board?->workspace_id);
        } else {
            $this->webhookService->dispatch('task.updated', [
                'task_id' => $task->id,
                'board_id' => $task->board_id,
                'updated_by' => $request->user()->id,
            ], $task->board?->workspace_id);
        }

        return response()->json([
            'success' => true,
            'message' => 'Task updated successfully.',
            'data' => $task->fresh(),
        ]);
    }

    /**
     * Delete task
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $task = KanbanTask::with('board')->findOrFail($id);
        $boardId = $task->board_id;
        $workspaceId = $task->board?->workspace_id;

        $task->delete();

        $this->webhookService->dispatch('task.deleted', [
            'task_id' => $id,
            'board_id' => $boardId,
        ], $workspaceId);

        return response()->json([
            'success' => true,
            'message' => 'Task deleted successfully.',
        ]);
    }

    /**
     * Add comment to task
     */
    public function addComment(Request $request, int $id): JsonResponse
    {
        $task = KanbanTask::with('board')->findOrFail($id);

        $validated = $request->validate([
            'comment' => 'required|string',
        ]);

        $comment = KanbanComment::create([
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'comment' => $validated['comment'],
        ]);

        $this->webhookService->dispatch('comment.added', [
            'task_id' => $task->id,
            'comment_id' => $comment->id,
            'user_id' => $request->user()->id,
        ], $task->board?->workspace_id);

        return response()->json([
            'success' => true,
            'data' => $comment->load('user:id,name,email'),
        ], 201);
    }

    /**
     * Poll / sync recent events as fallback for real-time collaboration
     */
    public function syncEvents(Request $request): JsonResponse
    {
        $since = $request->query('since', now()->subMinutes(5)->toDateTimeString());
        $boardId = $request->query('board_id');

        $tasksQuery = KanbanTask::where('updated_at', '>=', $since);
        if ($boardId) {
            $tasksQuery->where('board_id', $boardId);
        }
        $updatedTasks = $tasksQuery->orderBy('updated_at', 'desc')->take(50)->get(['id', 'board_id', 'column_id', 'title', 'status', 'priority', 'updated_at']);

        $commentsQuery = KanbanComment::where('created_at', '>=', $since)->with('user:id,name');
        if ($boardId) {
            $commentsQuery->whereHas('task', fn($q) => $q->where('board_id', $boardId));
        }
        $newComments = $commentsQuery->orderBy('created_at', 'desc')->take(50)->get();

        $events = [];
        foreach ($updatedTasks as $t) {
            $events[] = [
                'type' => 'task.updated',
                'task_id' => $t->id,
                'board_id' => $t->board_id,
                'column_id' => $t->column_id,
                'title' => $t->title,
                'status' => $t->status,
                'timestamp' => $t->updated_at->toIso8601String(),
            ];
        }
        foreach ($newComments as $c) {
            $events[] = [
                'type' => 'comment.added',
                'comment_id' => $c->id,
                'task_id' => $c->task_id,
                'author' => $c->user?->name,
                'timestamp' => $c->created_at->toIso8601String(),
            ];
        }

        return response()->json([
            'synced_at' => now()->toIso8601String(),
            'events_count' => count($events),
            'events' => $events,
        ]);
    }
}

