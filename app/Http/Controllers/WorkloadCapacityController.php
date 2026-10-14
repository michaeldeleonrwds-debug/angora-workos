<?php

namespace App\Http\Controllers;

use App\Models\KanbanBoard;
use App\Models\User;
use App\Services\WorkloadCapacityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class WorkloadCapacityController extends Controller
{
    public function __construct(
        protected WorkloadCapacityService $workloadService
    ) {}

    /**
     * Get workload capacity metrics for a specific board.
     */
    public function getBoardWorkload(Request $request, KanbanBoard $board): JsonResponse
    {
        $user = $request->user();
        if ($user->cannot('view', $board)) {
            abort(403);
        }

        $validated = $request->validate([
            'timeframe' => 'nullable|string|in:daily,weekly,monthly,custom',
            'effort_split_mode' => 'nullable|string|in:equal,full',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $data = $this->workloadService->calculateBoardWorkload($board, $validated);

        return response()->json($data);
    }

    /**
     * Update user resource capacity (weekly / daily hours).
     */
    public function updateUserCapacity(Request $request, User $user): JsonResponse|RedirectResponse
    {
        $currentUser = $request->user();

        // Only super_admin, admin, project_manager, or self can update capacity
        if (!in_array($currentUser->role, ['super_admin', 'admin', 'admin_manager', 'project_manager'], true) && $currentUser->id !== $user->id) {
            abort(403, 'Unauthorized to modify member capacity.');
        }

        $validated = $request->validate([
            'weekly_capacity_hours' => 'required|numeric|min:1|max:168',
            'daily_capacity_hours' => 'nullable|numeric|min:1|max:24',
        ]);

        $this->workloadService->updateUserCapacity(
            user: $user,
            weeklyHours: (float) $validated['weekly_capacity_hours'],
            dailyHours: isset($validated['daily_capacity_hours']) ? (float) $validated['daily_capacity_hours'] : null
        );

        if ($request->wantsJson()) {
            return response()->json([
                'message' => "Capacity updated for {$user->name}.",
                'user' => [
                    'id' => $user->id,
                    'weekly_capacity_hours' => $user->weekly_capacity_hours,
                    'daily_capacity_hours' => $user->daily_capacity_hours,
                ],
            ]);
        }

        return back()->with('success', "Capacity updated for {$user->name}.");
    }
}
