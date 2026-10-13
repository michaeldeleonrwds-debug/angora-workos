<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\BoardView;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class WorkspaceController extends Controller
{
    public function store(Request $request)
    {
        Gate::authorize('create', Workspace::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
        ]);

        $workspace = Workspace::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'icon' => $validated['icon'] ?? 'layout-grid',
            'color' => $validated['color'] ?? '#C8AEF5',
            'owner_id' => auth()->id(),
        ]);

        WorkspaceMember::create([
            'workspace_id' => $workspace->id,
            'user_id' => auth()->id(),
            'role' => 'owner',
        ]);

        // Create an initial default board in this workspace
        $board = KanbanBoard::create([
            'workspace_id' => $workspace->id,
            'title' => 'Main Board',
            'description' => 'Initial operational board for ' . $workspace->name,
            'department' => auth()->user()->department ?? 'Operations',
            'created_by' => auth()->id(),
        ]);

        // Default stages (Kanban columns)
        $colBacklog = KanbanColumn::create(['board_id' => $board->id, 'title' => 'Not Started', 'color' => '#64748b', 'position' => 0]);
        $colInProgress = KanbanColumn::create(['board_id' => $board->id, 'title' => 'Working on it', 'color' => '#fdab3d', 'position' => 1]);
        $colDone = KanbanColumn::create(['board_id' => $board->id, 'title' => 'Done', 'color' => '#00c875', 'position' => 2]);

        // Default groups
        BoardGroup::create(['board_id' => $board->id, 'title' => 'This Month', 'color' => '#579BFC', 'position' => 0]);
        BoardGroup::create(['board_id' => $board->id, 'title' => 'Next Month', 'color' => '#A25DDC', 'position' => 1]);

        // Default dynamic columns
        $defaultCols = [
            ['key' => 'col_person', 'title' => 'Person', 'type' => 'people', 'position' => 0, 'width' => 140],
            ['key' => 'col_status', 'title' => 'Status', 'type' => 'status', 'position' => 1, 'width' => 150],
            ['key' => 'col_priority', 'title' => 'Priority', 'type' => 'priority', 'position' => 2, 'width' => 130],
            ['key' => 'col_date', 'title' => 'Date', 'type' => 'date', 'position' => 3, 'width' => 130],
            ['key' => 'col_timeline', 'title' => 'Timeline', 'type' => 'timeline', 'position' => 4, 'width' => 170],
            ['key' => 'col_progress', 'title' => 'Progress', 'type' => 'progress', 'position' => 5, 'width' => 150],
        ];

        foreach ($defaultCols as $col) {
            BoardColumn::create([
                'board_id' => $board->id,
                'key' => $col['key'],
                'title' => $col['title'],
                'type' => $col['type'],
                'position' => $col['position'],
                'width' => $col['width'],
                'is_visible' => true,
            ]);
        }

        // Default views
        BoardView::create(['board_id' => $board->id, 'name' => 'Main Table', 'type' => 'table', 'is_default' => true, 'position' => 0]);
        BoardView::create(['board_id' => $board->id, 'name' => 'Kanban', 'type' => 'kanban', 'is_default' => false, 'position' => 1]);

        AuditLog::log(
            action: 'WORKSPACE_CREATED',
            department: auth()->user()->department ?? 'Operations',
            entityType: 'Workspace',
            entityId: $workspace->id,
            description: "Created workspace '{$workspace->name}'"
        );

        return redirect()->route('kanban.index', ['workspace' => $workspace->id, 'board' => $board->id])
            ->with('success', 'Workspace created successfully');
    }

    public function update(Request $request, Workspace $workspace)
    {
        Gate::authorize('update', $workspace);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
        ]);

        $workspace->update($validated);

        AuditLog::log(
            action: 'WORKSPACE_UPDATED',
            department: auth()->user()->department ?? 'Operations',
            entityType: 'Workspace',
            entityId: $workspace->id,
            description: "Updated workspace '{$workspace->name}'"
        );

        return back()->with('success', 'Workspace updated');
    }

    public function toggleFavorite(Workspace $workspace)
    {
        Gate::authorize('view', $workspace);

        $workspace->update(['is_favorite' => !$workspace->is_favorite]);
        return back()->with('success', 'Workspace updated');
    }

    public function addMember(Request $request, Workspace $workspace)
    {
        Gate::authorize('manageMembers', $workspace);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|in:admin,member,viewer',
        ]);

        WorkspaceMember::updateOrCreate(
            ['workspace_id' => $workspace->id, 'user_id' => $validated['user_id']],
            ['role' => $validated['role']]
        );

        return back()->with('success', 'Member added to workspace');
    }

    public function removeMember(Workspace $workspace, WorkspaceMember $member)
    {
        Gate::authorize('manageMembers', $workspace);

        if ($member->workspace_id === $workspace->id && $member->role !== 'owner') {
            $member->delete();
        }

        return back()->with('success', 'Member removed');
    }

    public function updateMemberRole(Request $request, Workspace $workspace, WorkspaceMember $member)
    {
        Gate::authorize('manageMembers', $workspace);

        $validated = $request->validate([
            'role' => 'required|in:admin,member,viewer',
        ]);

        if ($member->workspace_id === $workspace->id && $member->role !== 'owner') {
            $member->update(['role' => $validated['role']]);
        }

        return back()->with('success', 'Member role updated');
    }

    public function destroy(Workspace $workspace)
    {
        Gate::authorize('delete', $workspace);

        // Don't delete if it's the only workspace
        if (Workspace::count() <= 1) {
            return back()->with('error', 'Cannot delete the only remaining workspace');
        }

        $workspace->delete();

        return redirect()->route('kanban.index')->with('success', 'Workspace deleted');
    }
}
