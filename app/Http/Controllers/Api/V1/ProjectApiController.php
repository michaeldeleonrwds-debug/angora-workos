<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AgencyProject;
use App\Models\ProjectDeliverable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectApiController extends Controller
{
    /**
     * List projects with status and deliverables count
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isExternal = $user->hasRole('external_user');

        $query = AgencyProject::with(['client:id,name,company,company_name', 'projectManager:id,name', 'projectLeader:id,name'])
            ->withCount('deliverables');

        if ($isExternal && $user->customer_id) {
            $query->where('client_id', $user->customer_id)->where('client_visible', true);
        }

        $projects = $query->latest()->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $projects->items(),
            'pagination' => [
                'current_page' => $projects->currentPage(),
                'total' => $projects->total(),
            ],
        ]);
    }

    /**
     * Show project details
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $project = AgencyProject::with(['client', 'projectManager', 'projectLeader', 'members.user', 'deliverables'])->findOrFail($id);

        if ($user->hasRole('external_user') && (!$project->client_visible || $project->client_id !== $user->customer_id)) {
            return response()->json(['success' => false, 'message' => 'Project not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $project,
        ]);
    }

    /**
     * List deliverables for project
     */
    public function deliverables(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $project = AgencyProject::findOrFail($id);

        $query = ProjectDeliverable::where('project_id', $project->id);
        if ($user->hasRole('external_user')) {
            $query->where('is_client_visible', true);
        }

        $deliverables = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $deliverables,
        ]);
    }
}
