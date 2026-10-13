<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardApiController extends Controller
{
    /**
     * List boards for authorized workspace
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $workspaceId = $request->query('workspace_id', $user->current_workspace_id);

        $boards = KanbanBoard::withCount('tasks')
            ->where(function ($q) use ($workspaceId) {
                if ($workspaceId) {
                    $q->where('workspace_id', $workspaceId);
                }
            })
            ->latest()
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $boards->items(),
            'pagination' => [
                'current_page' => $boards->currentPage(),
                'total' => $boards->total(),
            ],
        ]);
    }

    /**
     * Get single board with groups and columns
     */
    public function show(int $id): JsonResponse
    {
        $board = KanbanBoard::with(['groups', 'columns', 'views'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $board,
        ]);
    }

    /**
     * Get board columns
     */
    public function columns(int $id): JsonResponse
    {
        $columns = BoardColumn::where('board_id', $id)->orderBy('sort_order', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $columns,
        ]);
    }

    /**
     * Get board groups
     */
    public function groups(int $id): JsonResponse
    {
        $groups = BoardGroup::where('board_id', $id)->orderBy('position', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $groups,
        ]);
    }
}
