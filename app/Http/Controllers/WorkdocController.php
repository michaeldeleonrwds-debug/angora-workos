<?php

namespace App\Http\Controllers;

use App\Models\AgencyProject;
use App\Models\AuditLog;
use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workdoc;
use App\Models\WorkdocComment;
use App\Models\WorkdocVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkdocController extends Controller
{
    /**
     * Workdocs Library index
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if ($user->primaryRoleName() === 'external_user') {
            abort(403);
        }

        $docs = Workdoc::with(['owner:id,name', 'project:id,name,code', 'board:id,title', 'task:id,title'])
            ->where('is_archived', false)
            ->where(function ($q) use ($user) {
                $q->where('visibility', '!=', 'private')
                    ->orWhere('owner_id', $user->id);
            })
            ->orderByDesc('updated_at')
            ->get();

        $folders = Workdoc::whereNotNull('folder_name')->distinct()->pluck('folder_name');
        $projects = AgencyProject::select('id', 'name', 'code')->get();

        return Inertia::render('workdocs/index', [
            'docs' => $docs,
            'folders' => $folders,
            'projects' => $projects,
        ]);
    }

    /**
     * Show & Edit Workdoc
     */
    public function show(Request $request, Workdoc $workdoc): Response
    {
        $user = $request->user();

        // Client authorization check
        if ($user->primaryRoleName() === 'external_user') {
            if ($workdoc->visibility !== 'client_shared') {
                abort(403, 'Unauthorized access to internal document.');
            }
            if ($workdoc->project_id && $workdoc->project->client_id !== $user->salesCustomer?->id) {
                abort(403, 'Unauthorized access to other client documents.');
            }
        }

        $workdoc->load([
            'owner:id,name',
            'project:id,name,code',
            'board:id,title',
            'task:id,title',
            'versions.user:id,name',
            'comments.user:id,name',
            'comments.replies.user:id,name',
        ]);

        $tasks = KanbanTask::select('id', 'title', 'board_id')->limit(50)->get();
        $projects = AgencyProject::select('id', 'name', 'code')->get();

        return Inertia::render('workdocs/show', [
            'doc' => $workdoc,
            'tasks' => $tasks,
            'projects' => $projects,
            'canEdit' => $user->primaryRoleName() !== 'external_user',
        ]);
    }

    /**
     * Create Workdoc
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->primaryRoleName() === 'external_user') {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'folder_name' => 'nullable|string|max:100',
            'project_id' => 'nullable|exists:agency_projects,id',
            'board_id' => 'nullable|exists:kanban_boards,id',
            'task_id' => 'nullable|exists:kanban_tasks,id',
            'visibility' => 'required|string|in:private,team,client_shared',
        ]);

        $initialContent = $validated['content'] ?? '<h1>' . htmlspecialchars($validated['title']) . '</h1><p>Start drafting your project documentation here...</p>';

        $doc = Workdoc::create([
            ...$validated,
            'content' => $initialContent,
            'owner_id' => $user->id,
        ]);

        // Create initial version snapshot
        $doc->versions()->create([
            'user_id' => $user->id,
            'version_number' => '1.0',
            'summary' => 'Initial Document Creation',
            'content' => $doc->content,
        ]);

        return redirect()->route('workdocs.show', $doc->id)
            ->with('success', 'Document created successfully.');
    }

    /**
     * Autosave / Update document content
     */
    public function update(Request $request, Workdoc $workdoc): JsonResponse
    {
        $user = $request->user();
        if ($user->primaryRoleName() === 'external_user') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'folder_name' => 'nullable|string',
            'visibility' => 'sometimes|string|in:private,team,client_shared',
            'create_version' => 'nullable|boolean',
            'version_summary' => 'nullable|string',
        ]);

        $workdoc->update($validated);

        // Explicit version checkpoint if requested or large milestone
        if (!empty($validated['create_version']) && !empty($validated['content'])) {
            $nextVer = number_format(($workdoc->versions()->count() + 1) * 0.1 + 1.0, 1);
            $workdoc->versions()->create([
                'user_id' => $user->id,
                'version_number' => $nextVer,
                'summary' => $validated['version_summary'] ?? 'Manual milestone snapshot',
                'content' => $validated['content'],
            ]);
        }

        return response()->json([
            'success' => true,
            'updated_at' => $workdoc->updated_at->toIso8601String(),
        ]);
    }

    /**
     * Restore document from a prior version
     */
    public function restoreVersion(Request $request, Workdoc $workdoc, WorkdocVersion $version): RedirectResponse
    {
        $user = $request->user();
        if ($user->primaryRoleName() === 'external_user' || ($workdoc->owner_id !== $user->id && $user->primaryRoleName() !== 'super_admin')) {
            abort(403);
        }

        $workdoc->update(['content' => $version->content]);

        $workdoc->versions()->create([
            'user_id' => $user->id,
            'version_number' => 'Restored',
            'summary' => "Restored from version {$version->version_number}",
            'content' => $version->content,
        ]);

        return back()->with('success', "Document restored from version {$version->version_number}.");
    }

    /**
     * Add comment to document
     */
    public function storeComment(Request $request, Workdoc $workdoc): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'comment' => 'required|string|max:2000',
            'parent_id' => 'nullable|exists:workdoc_comments,id',
        ]);

        $workdoc->comments()->create([
            'user_id' => $user->id,
            'comment' => $validated['comment'],
            'parent_id' => $validated['parent_id'] ?? null,
            'is_resolved' => false,
        ]);

        return back()->with('success', 'Comment posted.');
    }

    /**
     * Toggle resolve state of comment
     */
    public function toggleCommentResolve(Request $request, WorkdocComment $comment): RedirectResponse
    {
        $comment->update(['is_resolved' => !$comment->is_resolved]);
        return back()->with('success', 'Comment status updated.');
    }

    /**
     * Delete Workdoc
     */
    public function destroy(Request $request, Workdoc $workdoc): RedirectResponse
    {
        $user = $request->user();
        if ($user->primaryRoleName() === 'external_user' || ($workdoc->owner_id !== $user->id && $user->primaryRoleName() !== 'super_admin')) {
            abort(403);
        }

        $workdoc->delete();
        return redirect()->route('workdocs.index')->with('success', 'Document deleted.');
    }
}
