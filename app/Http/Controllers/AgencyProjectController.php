<?php

namespace App\Http\Controllers;

use App\Models\AgencyProject;
use App\Models\AuditLog;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\ProjectDeliverable;
use App\Models\ProjectMember;
use App\Models\SalesCustomer;
use App\Models\SystemNotification;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AgencyProjectController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        $query = AgencyProject::with([
            'client',
            'projectManager',
            'projectLeader',
            'board',
            'members.user',
            'deliverables' => function ($q) {
                $q->latest();
            },
        ]);

        // Non-super-admins see projects where they are PM, PL, member, or all if permission permits
        if (!$user->isSuperAdmin() && !$user->hasPermission('projects.manage')) {
            $query->where(function ($q) use ($user) {
                $q->where('project_manager_id', $user->id)
                    ->orWhere('project_leader_id', $user->id)
                    ->orWhereHas('members', function ($sq) use ($user) {
                        $sq->where('user_id', $user->id);
                    });
            });
        }

        $statusFilter = $request->query('status');
        if ($statusFilter && $statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        $projects = $query->latest()->get();
        $clients = SalesCustomer::select('id', 'name', 'company', 'email', 'status', 'portal_access_enabled')->get();
        $users = User::select('id', 'name', 'department', 'email')->get();
        $boards = KanbanBoard::select('id', 'title', 'workspace_id')->get();
        $workspaces = Workspace::select('id', 'name')->get();

        return Inertia::render('projects/index', [
            'projects' => $projects,
            'clients' => $clients,
            'users' => $users,
            'boards' => $boards,
            'workspaces' => $workspaces,
            'currentFilter' => $statusFilter ?? 'all',
        ]);
    }

    public function show(AgencyProject $project)
    {
        $user = auth()->user();

        // Check view permission
        if (!$user->isSuperAdmin() && !$user->hasPermission('projects.view')) {
            $isMember = $project->project_manager_id === $user->id
                || $project->project_leader_id === $user->id
                || $project->members()->where('user_id', $user->id)->exists();

            if (!$isMember) {
                abort(403, 'Unauthorized access to project.');
            }
        }

        $project->load([
            'client.accountManager',
            'client.portalUser',
            'projectManager',
            'projectLeader',
            'board.columns.tasks.assignee',
            'board.groups.tasks.assignee',
            'members.user',
            'deliverables' => function ($q) {
                $q->with(['submitter', 'reviewer', 'task'])->latest();
            },
        ]);

        $users = User::select('id', 'name', 'department', 'email')->get();

        return Inertia::render('projects/show', [
            'project' => $project,
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'client_id' => 'required|exists:sales_customers,id',
            'project_manager_id' => 'nullable|exists:users,id',
            'project_leader_id' => 'nullable|exists:users,id',
            'board_id' => 'nullable|exists:kanban_boards,id',
            'create_board' => 'nullable|boolean',
            'status' => 'required|in:Planning,In Progress,Internal Review,Client Review,Completed,On Hold',
            'priority' => 'required|in:Low,Medium,High,Urgent',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'budget' => 'nullable|numeric|min:0',
            'client_visible' => 'nullable|boolean',
            'client_access_settings' => 'nullable|array',
            'members' => 'nullable|array',
            'members.*.user_id' => 'required|exists:users,id',
            'members.*.agency_role' => 'required|in:project_manager,project_leader,designer,developer,qa_engineer',
        ]);

        $createBoard = $validated['create_board'] ?? false;
        unset($validated['create_board']);

        $membersData = $validated['members'] ?? [];
        unset($validated['members']);

        // Default PM to creator if not set
        if (empty($validated['project_manager_id'])) {
            $validated['project_manager_id'] = auth()->id();
        }

        // Optionally create an associated Kanban board automatically if requested
        if ($createBoard && empty($validated['board_id'])) {
            $defaultWorkspace = Workspace::firstOrCreate(
                ['name' => 'Agency Client Workspaces'],
                ['description' => 'Dedicated workspaces for agency delivery and creative projects', 'owner_id' => auth()->id()]
            );

            $board = KanbanBoard::create([
                'workspace_id' => $defaultWorkspace->id,
                'title' => $validated['name'] . ' Delivery Board',
                'description' => 'Operations board for ' . $validated['name'],
                'department' => 'Operations',
                'visibility' => 'public',
                'created_by' => auth()->id(),
            ]);

            // Create agency workflow columns: Backlog -> In Design -> In Development -> Internal Review -> Approved for Client -> Client Feedback
            KanbanColumn::create(['board_id' => $board->id, 'title' => 'Backlog & Scope', 'color' => '#64748b', 'position' => 0]);
            KanbanColumn::create(['board_id' => $board->id, 'title' => 'In Design', 'color' => '#a25ddc', 'position' => 1]);
            KanbanColumn::create(['board_id' => $board->id, 'title' => 'In Development', 'color' => '#0085ff', 'position' => 2]);
            KanbanColumn::create(['board_id' => $board->id, 'title' => 'Internal Review', 'color' => '#fdab3d', 'position' => 3]);
            KanbanColumn::create(['board_id' => $board->id, 'title' => 'Client Review', 'color' => '#00c875', 'position' => 4]);

            $validated['board_id'] = $board->id;
        }

        $project = AgencyProject::create($validated);

        // Assign members
        if (!empty($membersData)) {
            foreach ($membersData as $member) {
                ProjectMember::firstOrCreate([
                    'project_id' => $project->id,
                    'user_id' => $member['user_id'],
                    'agency_role' => $member['agency_role'],
                ]);
            }
        }

        // Notify Project Leader & PM if assigned
        if ($project->project_leader_id && $project->project_leader_id !== auth()->id()) {
            SystemNotification::create([
                'user_id' => $project->project_leader_id,
                'title' => 'Assigned as Project Leader',
                'message' => "You have been assigned as Project Leader for project: {$project->name}",
                'type' => 'project_assignment',
                'link' => "/projects/{$project->id}",
            ]);
        }

        AuditLog::log(
            action: 'AGENCY_PROJECT_CREATED',
            department: 'Operations',
            entityType: 'AgencyProject',
            entityId: $project->id,
            description: "Created agency project '{$project->name}' for client #{$project->client_id}"
        );

        return redirect()->route('projects.show', $project->id)->with('success', 'Project created successfully');
    }

    public function update(Request $request, AgencyProject $project)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'client_id' => 'sometimes|exists:sales_customers,id',
            'project_manager_id' => 'nullable|exists:users,id',
            'project_leader_id' => 'nullable|exists:users,id',
            'board_id' => 'nullable|exists:kanban_boards,id',
            'status' => 'sometimes|in:Planning,In Progress,Internal Review,Client Review,Completed,On Hold',
            'priority' => 'sometimes|in:Low,Medium,High,Urgent',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'budget' => 'nullable|numeric|min:0',
            'client_visible' => 'nullable|boolean',
            'client_access_settings' => 'nullable|array',
        ]);

        $oldStatus = $project->status;
        $project->update($validated);

        if (isset($validated['status']) && $validated['status'] !== $oldStatus) {
            AuditLog::log(
                action: 'AGENCY_PROJECT_STATUS_CHANGED',
                department: 'Operations',
                entityType: 'AgencyProject',
                entityId: $project->id,
                description: "Project '{$project->name}' status changed from {$oldStatus} to {$project->status}"
            );
        }

        return back()->with('success', 'Project updated successfully');
    }

    public function assignMember(Request $request, AgencyProject $project)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'agency_role' => 'required|in:project_manager,project_leader,designer,developer,qa_engineer',
        ]);

        $member = ProjectMember::firstOrCreate([
            'project_id' => $project->id,
            'user_id' => $validated['user_id'],
            'agency_role' => $validated['agency_role'],
        ]);

        // Send system notification to user
        SystemNotification::create([
            'user_id' => $validated['user_id'],
            'title' => 'Added to Project Team',
            'message' => "You were added as {$validated['agency_role']} on '{$project->name}'",
            'type' => 'project_assignment',
            'link' => "/projects/{$project->id}",
        ]);

        return back()->with('success', 'Team member added');
    }

    public function removeMember(AgencyProject $project, ProjectMember $member)
    {
        if ($member->project_id !== $project->id) {
            abort(404);
        }

        $member->delete();

        return back()->with('success', 'Team member removed');
    }

    public function destroy(AgencyProject $project)
    {
        $name = $project->name;
        $project->delete();

        AuditLog::log(
            action: 'AGENCY_PROJECT_DELETED',
            department: 'Operations',
            entityType: 'AgencyProject',
            entityId: $project->id,
            description: "Deleted project '{$name}'"
        );

        return redirect()->route('projects.index')->with('success', 'Project deleted');
    }
}
