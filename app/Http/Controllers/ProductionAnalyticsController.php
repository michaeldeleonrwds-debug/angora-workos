<?php

namespace App\Http\Controllers;

use App\Models\KanbanBoard;
use App\Services\ProductionAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionAnalyticsController extends Controller
{
    public function __construct(
        protected ProductionAnalyticsService $analyticsService
    ) {}

    /**
     * Get production operational delivery metrics for a board.
     */
    public function getDeliveryMetrics(Request $request, KanbanBoard $board): JsonResponse
    {
        $user = $request->user();
        if ($user->cannot('view', $board)) {
            abort(403);
        }

        $validated = $request->validate([
            'days_window' => 'nullable|integer|min:7|max:365',
        ]);

        $metrics = $this->analyticsService->calculateDeliveryMetrics($board, $validated);

        return response()->json($metrics);
    }
}
