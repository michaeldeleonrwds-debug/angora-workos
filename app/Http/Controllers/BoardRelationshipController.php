<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\BoardColumn;
use App\Models\BoardItemRelationship;
use App\Models\CrossDepartmentLink;
use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\Workspace;
use App\Services\AutomationEngineService;
use App\Services\CrossBoardService;
use Illuminate\Http\Request;

class BoardRelationshipController extends Controller
{
    protected CrossBoardService $crossBoardService;
    protected AutomationEngineService $automationEngine;

    public function __construct(CrossBoardService $crossBoardService, AutomationEngineService $automationEngine)
    {
        $this->crossBoardService = $crossBoardService;
        $this->automationEngine = $automationEngine;
    }

    /**
     * Search accessible boards and items for linking.
     */
    public function searchTargetItems(Request $request)
    {
        $user = auth()->user();
        $targetBoardId = $request->query('board_id');
        $query = $request->query('query', '');

        // Fetch accessible target boards
        $boardsQuery = KanbanBoard::select('id', 'title', 'workspace_id', 'department');
        if (!$user->isSuperAdmin() && !$user->hasPermission('kanban.view')) {
            abort(403, 'Unauthorized.');
        }

        $accessibleBoards = $boardsQuery->get();

        $items = collect();
        if ($targetBoardId) {
            $itemsQuery = KanbanTask::where('board_id', $targetBoardId)
                ->with(['column:id,title,color', 'assignee:id,name']);

            if ($query) {
                $itemsQuery->where('title', 'like', "%{$query}%");
            }

            $items = $itemsQuery->latest()->take(30)->get()->map(function ($item) {
                return [
                    'id' => $item->id,
                    'title' => $item->title,
                    'board_id' => $item->board_id,
                    'status' => $item->column?->title,
                    'status_color' => $item->column?->color,
                    'priority' => $item->priority,
                    'assignee' => $item->assignee?->name,
                    'due_date' => $item->due_date,
                    'progress' => $item->progress,
                ];
            });
        }

        return response()->json([
            'boards' => $accessibleBoards,
            'items' => $items,
        ]);
    }

    /**
     * Connect one or multiple items to a source task.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'source_task_id' => 'required|exists:kanban_tasks,id',
            'target_task_ids' => 'required|array|min:1',
            'target_task_ids.*' => 'required|exists:kanban_tasks,id',
            'column_key' => 'nullable|string',
            'relation_type' => 'nullable|in:one_way,two_way',
        ]);

        $sourceTask = KanbanTask::findOrFail($validated['source_task_id']);
        $sourceBoardId = $sourceTask->board_id;
        $relationType = $validated['relation_type'] ?? 'one_way';
        $columnKey = $validated['column_key'] ?? 'connected_boards';

        $createdRels = [];

        foreach ($validated['target_task_ids'] as $targetTaskId) {
            // Prevent linking a task to itself
            if ((int) $targetTaskId === (int) $sourceTask->id) {
                continue;
            }

            $targetTask = KanbanTask::findOrFail($targetTaskId);

            // 1. Create primary relationship: source -> target
            $rel = BoardItemRelationship::firstOrCreate(
                [
                    'source_task_id' => $sourceTask->id,
                    'target_task_id' => $targetTask->id,
                    'column_key' => $columnKey,
                ],
                [
                    'source_board_id' => $sourceBoardId,
                    'target_board_id' => $targetTask->board_id,
                    'relation_type' => $relationType,
                    'created_by' => auth()->id(),
                ]
            );

            $createdRels[] = $rel;

            // 2. If bidirectional (two_way), create reciprocal relation: target -> source
            if ($relationType === 'two_way') {
                BoardItemRelationship::firstOrCreate(
                    [
                        'source_task_id' => $targetTask->id,
                        'target_task_id' => $sourceTask->id,
                        'column_key' => $columnKey,
                    ],
                    [
                        'source_board_id' => $targetTask->board_id,
                        'target_board_id' => $sourceBoardId,
                        'relation_type' => 'two_way',
                        'created_by' => auth()->id(),
                    ]
                );
            }
        }

        AuditLog::log(
            action: 'BOARD_ITEMS_CONNECTED',
            department: $sourceTask->board?->department ?? 'Operations',
            entityType: 'BoardItemRelationship',
            entityId: $sourceTask->id,
            description: "Connected item '{$sourceTask->title}' to " . count($createdRels) . " item(s)"
        );

        // Dispatch automation trigger for connected item
        $this->automationEngine->dispatch('connected_item_linked', $sourceTask, [
            'connected_count' => count($createdRels),
        ], auth()->user());

        return back()->with('success', 'Connected items linked successfully');
    }

    /**
     * Remove a relationship between two items.
     */
    public function destroy(Request $request, BoardItemRelationship $relationship)
    {
        $sourceTaskId = $relationship->source_task_id;
        $targetTaskId = $relationship->target_task_id;
        $columnKey = $relationship->column_key;
        $isTwoWay = $relationship->relation_type === 'two_way';

        $relationship->delete();

        // If two-way, clean up reciprocal relationship
        if ($isTwoWay) {
            BoardItemRelationship::where('source_task_id', $targetTaskId)
                ->where('target_task_id', $sourceTaskId)
                ->where('column_key', $columnKey)
                ->delete();
        }

        AuditLog::log(
            action: 'BOARD_ITEM_DISCONNECTED',
            department: 'Operations',
            entityType: 'BoardItemRelationship',
            entityId: $sourceTaskId,
            description: "Disconnected item #{$sourceTaskId} from #{$targetTaskId}"
        );

        return back()->with('success', 'Connection removed');
    }

    /**
     * Link cross-department entity (e.g. Sales Lead -> Task, Marketing Campaign -> Task).
     */
    public function linkDepartmentEntity(Request $request)
    {
        $validated = $request->validate([
            'source_entity_type' => 'required|string',
            'source_entity_id' => 'required|integer',
            'target_entity_type' => 'required|string',
            'target_entity_id' => 'required|integer',
            'relationship_name' => 'nullable|string',
        ]);

        $link = CrossDepartmentLink::firstOrCreate(
            [
                'source_entity_type' => $validated['source_entity_type'],
                'source_entity_id' => $validated['source_entity_id'],
                'target_entity_type' => $validated['target_entity_type'],
                'target_entity_id' => $validated['target_entity_id'],
                'relationship_name' => $validated['relationship_name'] ?? 'related_work',
            ],
            [
                'created_by' => auth()->id(),
            ]
        );

        return back()->with('success', 'Cross-department link created');
    }
}
