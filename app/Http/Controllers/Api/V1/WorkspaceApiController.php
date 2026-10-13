<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceApiController extends Controller
{
    /**
     * List user workspaces
     */
    public function index(Request $request): JsonResponse
    {
        $workspaces = Workspace::withCount(['boards'])->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $workspaces,
        ]);
    }

    /**
     * Show workspace
     */
    public function show(int $id): JsonResponse
    {
        $workspace = Workspace::with(['boards', 'members.user'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $workspace,
        ]);
    }
}
