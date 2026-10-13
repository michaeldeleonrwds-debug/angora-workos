<?php

namespace App\Http\Controllers;

use App\Models\AgencyProject;
use App\Models\Dashboard;
use App\Models\DashboardMember;
use App\Models\DashboardWidget;
use App\Models\KanbanBoard;
use App\Models\User;
use App\Services\DashboardAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomDashboardController extends Controller
{
    public function __construct(
        protected DashboardAnalyticsService $analyticsService
    ) {}

    /**
     * Display Dashboard Hub with all accessible dashboards
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Deny external client users
        if ($user->role === 'external_user') {
            abort(403, 'Unauthorized access to internal dashboards.');
        }

        $dashboards = Dashboard::with(['owner:id,name', 'widgets'])
            ->where(function ($query) use ($user) {
                $query->where('visibility', 'public')
                    ->orWhere('owner_id', $user->id)
                    ->orWhereHas('members', function ($m) use ($user) {
                        $m->where('user_id', $user->id);
                    });
            })
            ->where('is_archived', false)
            ->orderBy('is_favorite', 'desc')
            ->orderBy('updated_at', 'desc')
            ->get();

        $projects = AgencyProject::select('id', 'name', 'code')->get();
        $boards = KanbanBoard::select('id', 'title')->get();

        return Inertia::render('dashboards/index', [
            'dashboards' => $dashboards,
            'projects' => $projects,
            'boards' => $boards,
        ]);
    }

    /**
     * Display a specific Dashboard and compute data for all its widgets
     */
    public function show(Request $request, Dashboard $dashboard): Response
    {
        $user = $request->user();

        if ($user->role === 'external_user') {
            abort(403, 'Unauthorized access.');
        }

        // Check view permission
        if ($dashboard->visibility === 'private' && $dashboard->owner_id !== $user->id) {
            $isMember = $dashboard->members()->where('user_id', $user->id)->exists();
            if (!$isMember && $user->role !== 'super_admin') {
                abort(403, 'Unauthorized access to this private dashboard.');
            }
        }

        $dashboard->load(['owner:id,name', 'widgets', 'project:id,name,code']);

        // Compute data for each widget
        $widgetsWithData = $dashboard->widgets->map(function ($widget) use ($user) {
            $data = $this->analyticsService->computeWidgetData($widget, $user);
            return array_merge($widget->toArray(), ['data' => $data]);
        });

        $boards = KanbanBoard::select('id', 'title')->get();
        $projects = AgencyProject::select('id', 'name')->get();

        return Inertia::render('dashboards/show', [
            'dashboard' => array_merge($dashboard->toArray(), ['widgets' => $widgetsWithData]),
            'boards' => $boards,
            'projects' => $projects,
            'canEdit' => $user->role === 'super_admin' || $dashboard->owner_id === $user->id,
        ]);
    }

    /**
     * Create a new dashboard
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->role === 'external_user') {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string',
            'type' => 'required|string|in:executive,agency,project,department,personal,custom',
            'department' => 'nullable|string',
            'project_id' => 'nullable|exists:agency_projects,id',
            'visibility' => 'required|string|in:private,team,public',
            'filters' => 'nullable|array',
        ]);

        $dashboard = Dashboard::create([
            ...$validated,
            'owner_id' => $user->id,
            'icon' => $validated['icon'] ?? 'LayoutDashboard',
        ]);

        // If template chosen, initialize default starter widgets
        $this->seedStarterWidgets($dashboard, $validated['type']);

        return redirect()->route('dashboards.show', $dashboard->id)
            ->with('success', 'Dashboard created successfully.');
    }

    /**
     * Update an existing dashboard
     */
    public function update(Request $request, Dashboard $dashboard): RedirectResponse
    {
        $user = $request->user();
        if ($dashboard->owner_id !== $user->id && $user->role !== 'super_admin') {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string',
            'visibility' => 'required|string|in:private,team,public',
            'is_favorite' => 'boolean',
            'filters' => 'nullable|array',
        ]);

        $dashboard->update($validated);

        return back()->with('success', 'Dashboard updated.');
    }

    /**
     * Delete / Archive a dashboard
     */
    public function destroy(Request $request, Dashboard $dashboard): RedirectResponse
    {
        $user = $request->user();
        if ($dashboard->owner_id !== $user->id && $user->role !== 'super_admin') {
            abort(403);
        }

        $dashboard->delete();

        return redirect()->route('dashboards.index')
            ->with('success', 'Dashboard deleted successfully.');
    }

    /**
     * Add a widget to a dashboard
     */
    public function storeWidget(Request $request, Dashboard $dashboard): RedirectResponse
    {
        $user = $request->user();
        if ($dashboard->owner_id !== $user->id && $user->role !== 'super_admin') {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|string|in:numbers,battery,chart,workload,timeline,calendar,task_list,activity',
            'config' => 'nullable|array',
            'layout' => 'nullable|array',
        ]);

        $maxPos = $dashboard->widgets()->max('position') ?? 0;

        $dashboard->widgets()->create([
            'title' => $validated['title'],
            'type' => $validated['type'],
            'config' => $validated['config'] ?? [],
            'layout' => $validated['layout'] ?? ['w' => 6, 'h' => 4],
            'position' => $maxPos + 1,
        ]);

        return back()->with('success', 'Widget added.');
    }

    /**
     * Update an existing widget
     */
    public function updateWidget(Request $request, Dashboard $dashboard, DashboardWidget $widget): RedirectResponse
    {
        $user = $request->user();
        if ($dashboard->owner_id !== $user->id && $user->role !== 'super_admin') {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'config' => 'sometimes|array',
            'layout' => 'sometimes|array',
            'position' => 'sometimes|integer',
        ]);

        $widget->update($validated);

        return back()->with('success', 'Widget updated.');
    }

    /**
     * Remove a widget from a dashboard
     */
    public function destroyWidget(Request $request, Dashboard $dashboard, DashboardWidget $widget): RedirectResponse
    {
        $user = $request->user();
        if ($dashboard->owner_id !== $user->id && $user->role !== 'super_admin') {
            abort(403);
        }

        $widget->delete();

        return back()->with('success', 'Widget removed.');
    }

    /**
     * Batch update layout / positions of widgets
     */
    public function updateLayout(Request $request, Dashboard $dashboard): JsonResponse
    {
        $user = $request->user();
        if ($dashboard->owner_id !== $user->id && $user->role !== 'super_admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $items = $request->validate([
            'widgets' => 'required|array',
            'widgets.*.id' => 'required|exists:dashboard_widgets,id',
            'widgets.*.position' => 'required|integer',
            'widgets.*.layout' => 'nullable|array',
        ])['widgets'];

        foreach ($items as $item) {
            DashboardWidget::where('id', $item['id'])
                ->where('dashboard_id', $dashboard->id)
                ->update([
                    'position' => $item['position'],
                    'layout' => $item['layout'] ?? null,
                ]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Seed starter widgets according to dashboard type
     */
    protected function seedStarterWidgets(Dashboard $dashboard, string $type): void
    {
        if ($type === 'executive' || $type === 'portfolio') {
            $dashboard->widgets()->createMany([
                [
                    'title' => 'Total Portfolio Tasks',
                    'type' => 'numbers',
                    'config' => ['metric' => 'total_tasks'],
                    'layout' => ['w' => 3, 'h' => 2],
                    'position' => 1,
                ],
                [
                    'title' => 'Completed Tasks',
                    'type' => 'numbers',
                    'config' => ['metric' => 'completed_tasks'],
                    'layout' => ['w' => 3, 'h' => 2],
                    'position' => 2,
                ],
                [
                    'title' => 'Overdue Tasks',
                    'type' => 'numbers',
                    'config' => ['metric' => 'overdue_tasks'],
                    'layout' => ['w' => 3, 'h' => 2],
                    'position' => 3,
                ],
                [
                    'title' => 'Active Agency Projects',
                    'type' => 'numbers',
                    'config' => ['metric' => 'agency_active_projects'],
                    'layout' => ['w' => 3, 'h' => 2],
                    'position' => 4,
                ],
                [
                    'title' => 'Portfolio Status Breakdown',
                    'type' => 'battery',
                    'config' => ['group_by' => 'status'],
                    'layout' => ['w' => 6, 'h' => 4],
                    'position' => 5,
                ],
                [
                    'title' => 'Resource Workload & Capacity',
                    'type' => 'workload',
                    'config' => ['capacity_tasks' => 5],
                    'layout' => ['w' => 6, 'h' => 4],
                    'position' => 6,
                ],
            ]);
        } elseif ($type === 'agency' || $type === 'project') {
            $dashboard->widgets()->createMany([
                [
                    'title' => 'Pending Deliverables',
                    'type' => 'numbers',
                    'config' => ['metric' => 'deliverables_pending'],
                    'layout' => ['w' => 4, 'h' => 2],
                    'position' => 1,
                ],
                [
                    'title' => 'Project Tasks Progress',
                    'type' => 'battery',
                    'config' => ['group_by' => 'status'],
                    'layout' => ['w' => 8, 'h' => 2],
                    'position' => 2,
                ],
                [
                    'title' => 'Upcoming Milestones & Timeline',
                    'type' => 'timeline',
                    'config' => [],
                    'layout' => ['w' => 8, 'h' => 4],
                    'position' => 3,
                ],
                [
                    'title' => 'High Priority Items',
                    'type' => 'task_list',
                    'config' => ['list_filter' => 'high_priority'],
                    'layout' => ['w' => 4, 'h' => 4],
                    'position' => 4,
                ],
            ]);
        } else {
            // General starter
            $dashboard->widgets()->createMany([
                [
                    'title' => 'Active Work Items',
                    'type' => 'numbers',
                    'config' => ['metric' => 'in_progress_tasks'],
                    'layout' => ['w' => 4, 'h' => 2],
                    'position' => 1,
                ],
                [
                    'title' => 'Status Progress',
                    'type' => 'battery',
                    'config' => ['group_by' => 'status'],
                    'layout' => ['w' => 8, 'h' => 2],
                    'position' => 2,
                ],
                [
                    'title' => 'My Actionable Tasks',
                    'type' => 'task_list',
                    'config' => ['list_filter' => 'my_tasks'],
                    'layout' => ['w' => 6, 'h' => 4],
                    'position' => 3,
                ],
                [
                    'title' => 'Recent Activity',
                    'type' => 'activity',
                    'config' => ['limit' => 6],
                    'layout' => ['w' => 6, 'h' => 4],
                    'position' => 4,
                ],
            ]);
        }
    }
}
