<?php

namespace App\Http\Controllers;

use App\Models\AgencyProject;
use App\Models\KanbanBoard;
use App\Models\User;
use App\Models\Workdoc;
use App\Models\WorkOsTemplate;
use App\Models\Workspace;
use App\Services\TemplateEngineService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TemplateController extends Controller
{
    public function __construct(
        protected TemplateEngineService $templateEngine
    ) {}

    /**
     * Templates Gallery
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if ($user->role === 'external_user') {
            abort(403);
        }

        $templates = WorkOsTemplate::with('creator:id,name')
            ->orderBy('is_system_template', 'desc')
            ->orderBy('title')
            ->get();

        $workspaces = Workspace::select('id', 'name')->get();
        $projects = AgencyProject::select('id', 'name', 'code')->get();
        $clients = \App\Models\SalesCustomer::select('id', 'name', 'company', 'company_name')->get();
        $managers = User::select('id', 'name')->get();

        return Inertia::render('templates/index', [
            'templates' => $templates,
            'workspaces' => $workspaces,
            'projects' => $projects,
            'clients' => $clients,
            'managers' => $managers,
        ]);
    }

    /**
     * Store new custom template from scratch or saved from existing entity
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (in_array($user->role, ['designer', 'client', 'guest', 'external_user'], true)) {
            abort(403, 'Unauthorized. Designers cannot register templates.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|string|in:board,project,task,workdoc',
            'category' => 'required|string',
            'icon' => 'nullable|string',
            'color' => 'nullable|string',
            'content_schema' => 'required|array',
        ]);

        WorkOsTemplate::create([
            ...$validated,
            'created_by' => $user->id,
            'is_system_template' => false,
        ]);

        return back()->with('success', 'Template registered.');
    }

    /**
     * Save an existing board as a reusable template blueprint
     */
    public function saveBoardAsTemplate(Request $request, KanbanBoard $board): RedirectResponse
    {
        $user = $request->user();
        if (in_array($user->role, ['designer', 'client', 'guest', 'external_user'], true)) {
            abort(403, 'Unauthorized. Designers cannot save board blueprints.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'required|string',
        ]);

        $board->load(['columns', 'groups', 'boardColumns', 'tasks.column', 'tasks.group']);

        $schema = [
            'department' => $board->department,
            'description' => $validated['description'] ?? $board->description,
            'stages' => $board->columns->map(fn($c) => ['title' => $c->title, 'color' => $c->color])->all(),
            'groups' => $board->groups->map(fn($g) => ['title' => $g->title, 'color' => $g->color])->all(),
            'columns' => $board->boardColumns->map(fn($bc) => ['key' => $bc->key, 'title' => $bc->title, 'type' => $bc->type, 'width' => $bc->width])->all(),
            'tasks' => $board->tasks->whereNull('parent_id')->take(10)->map(fn($t) => [
                'title' => $t->title,
                'priority' => $t->priority,
                'stage' => $t->column?->title,
                'group' => $t->group?->title,
            ])->all(),
        ];

        WorkOsTemplate::create([
            'title' => $validated['title'],
            'description' => $validated['description'],
            'type' => 'board',
            'category' => $validated['category'],
            'created_by' => $user->id,
            'is_system_template' => false,
            'icon' => 'FolderKanban',
            'color' => '#0085ff',
            'content_schema' => $schema,
        ]);

        return back()->with('success', "Board saved as template '{$validated['title']}'.");
    }

    /**
     * Instantiate an entity from template
     */
    public function instantiate(Request $request, WorkOsTemplate $template): RedirectResponse
    {
        $user = $request->user();
        if ($user->role === 'external_user') {
            abort(403);
        }

        if ($template->type === 'board') {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'workspace_id' => 'required|exists:workspaces,id',
            ]);

            $board = $this->templateEngine->createBoardFromTemplate(
                template: $template,
                workspaceId: $validated['workspace_id'],
                title: $validated['title'],
                user: $user
            );

            return redirect()->route('kanban.index', ['workspace' => $board->workspace_id, 'board' => $board->id])
                ->with('success', 'Board created from template.');
        }

        if ($template->type === 'project') {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'workspace_id' => 'required|exists:workspaces,id',
                'client_id' => 'nullable|exists:sales_customers,id',
                'project_manager_id' => 'nullable|exists:users,id',
                'project_leader_id' => 'nullable|exists:users,id',
                'budget_total' => 'nullable|numeric',
            ]);

            $project = $this->templateEngine->createProjectFromTemplate(
                template: $template,
                projectData: $validated,
                user: $user
            );

            return redirect()->route('projects.show', $project->id)
                ->with('success', 'Agency Project generated from template with linked board and deliverables.');
        }

        if ($template->type === 'workdoc') {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'project_id' => 'nullable|exists:agency_projects,id',
            ]);

            $doc = $this->templateEngine->createWorkdocFromTemplate(
                template: $template,
                title: $validated['title'],
                user: $user,
                projectId: $validated['project_id'] ?? null
            );

            return redirect()->route('workdocs.show', $doc->id)
                ->with('success', 'Workdoc created from template.');
        }

        if ($template->type === 'task') {
            $validated = $request->validate([
                'board_id' => 'required|exists:kanban_boards,id',
                'date_mapping_mode' => 'nullable|string|in:kickoff,deadline',
                'reference_date' => 'nullable|date',
                'target_group_id' => 'nullable|exists:board_groups,id',
                'new_group_title' => 'nullable|string|max:255',
                'assigned_to' => 'nullable|exists:users,id',
            ]);

            $board = KanbanBoard::findOrFail($validated['board_id']);
            if ($user->cannot('update', $board)) {
                abort(403);
            }

            $result = $this->templateEngine->instantiateTaskBlueprint(
                template: $template,
                board: $board,
                options: $validated,
                user: $user
            );

            return redirect()->route('kanban.index', ['workspace' => $board->workspace_id, 'board' => $board->id])
                ->with('success', "Task blueprint '{$template->title}' instantiated with {$result['count']} tasks.");
        }

        return back()->with('error', 'Unsupported template type.');
    }

    /**
     * Get available task list blueprints for a board
     */
    public function getTaskBlueprints(Request $request, KanbanBoard $board)
    {
        $user = $request->user();
        if ($user->cannot('view', $board)) {
            abort(403);
        }

        $blueprints = WorkOsTemplate::where('type', 'task')
            ->orderBy('is_system_template', 'desc')
            ->orderBy('title')
            ->get();

        return response()->json($blueprints);
    }

    /**
     * Instantiate task blueprint directly into board
     */
    public function instantiateTaskBlueprint(Request $request, KanbanBoard $board)
    {
        $user = $request->user();
        if ($user->cannot('update', $board)) {
            abort(403);
        }

        $validated = $request->validate([
            'template_id' => 'required|exists:work_os_templates,id',
            'date_mapping_mode' => 'nullable|string|in:kickoff,deadline',
            'reference_date' => 'nullable|date',
            'target_group_id' => 'nullable|exists:board_groups,id',
            'new_group_title' => 'nullable|string|max:255',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $template = WorkOsTemplate::where('type', 'task')->findOrFail($validated['template_id']);

        $result = $this->templateEngine->instantiateTaskBlueprint(
            template: $template,
            board: $board,
            options: $validated,
            user: $user
        );

        if ($request->wantsJson()) {
            return response()->json([
                'message' => "Workflow blueprint '{$template->title}' instantiated successfully",
                'group' => $result['group'],
                'tasks_count' => $result['count'],
            ]);
        }

        return back()->with('success', "Workflow blueprint '{$template->title}' instantiated successfully with {$result['count']} tasks.");
    }

    /**
     * Save an existing task group as a reusable blueprint
     */
    public function saveGroupAsBlueprint(Request $request, \App\Models\BoardGroup $group)
    {
        $user = $request->user();
        $board = $group->board;
        if ($board && $user->cannot('update', $board)) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:50',
        ]);

        $template = $this->templateEngine->saveGroupAsTemplate(
            group: $group,
            title: $validated['title'],
            description: $validated['description'] ?? null,
            category: $validated['category'] ?? 'general',
            user: $user
        );

        if ($request->wantsJson()) {
            return response()->json([
                'message' => "Blueprint '{$template->title}' saved successfully",
                'template' => $template,
            ]);
        }

        return back()->with('success', "Blueprint '{$template->title}' saved successfully");
    }

    /**
     * Delete template
     */
    public function destroy(Request $request, WorkOsTemplate $template): RedirectResponse
    {
        $user = $request->user();
        if ($user->role === 'external_user' || ($template->created_by !== $user->id && $user->role !== 'super_admin')) {
            abort(403);
        }

        $template->delete();

        return back()->with('success', 'Template removed.');
    }
}
