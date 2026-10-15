<?php

namespace App\Http\Controllers;

use App\Models\AgencyProject;
use App\Models\AuditLog;
use App\Models\ProjectDeliverable;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DeliverableController extends Controller
{
    public function store(Request $request, AgencyProject $project)
    {
        $validated = $request->validate([
            'task_id' => 'nullable|exists:kanban_tasks,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'file' => 'nullable|file|max:51200', // 50MB max
            'external_url' => 'nullable|url',
            'version' => 'nullable|integer|min:1',
            'internal_notes' => 'nullable|string',
        ]);

        $filePath = null;
        $fileUrl = null;

        if ($request->hasFile('file')) {
            $path = $request->file('file')->store('deliverables', 'public');
            $filePath = $path;
            $fileUrl = Storage::url($path);
        }

        $deliverable = ProjectDeliverable::create([
            'project_id' => $project->id,
            'task_id' => $validated['task_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'file_path' => $filePath,
            'file_url' => $fileUrl,
            'external_url' => $validated['external_url'] ?? null,
            'version' => $validated['version'] ?? 1,
            'status' => 'submitted', // Designer/Developer submitted for internal review
            'submitted_by' => auth()->id(),
            'internal_notes' => $validated['internal_notes'] ?? null,
            'is_client_visible' => false,
            'client_status' => 'pending',
        ]);

        // Notify Project Leader & Project Manager
        $recipients = array_filter([
            $project->project_leader_id,
            $project->project_manager_id,
        ]);

        foreach (array_unique($recipients) as $recipientId) {
            if ($recipientId !== auth()->id()) {
                SystemNotification::create([
                    'user_id' => $recipientId,
                    'title' => 'New Deliverable Submitted for Review',
                    'message' => auth()->user()->name . " submitted '{$deliverable->title}' on {$project->name}",
                    'type' => 'deliverable_review',
                    'link' => "/projects/{$project->id}",
                ]);
            }
        }

        AuditLog::log(
            action: 'DELIVERABLE_SUBMITTED',
            department: 'Production',
            entityType: 'ProjectDeliverable',
            entityId: $deliverable->id,
            description: "Submitted deliverable '{$deliverable->title}' (v{$deliverable->version}) for project '{$project->name}'"
        );

        return back()->with('success', 'Deliverable submitted for review');
    }

    public function internalReview(Request $request, ProjectDeliverable $deliverable)
    {
        $validated = $request->validate([
            'action' => 'required|in:approve_internally,request_revision,approve_for_client',
            'internal_notes' => 'nullable|string',
        ]);

        $user = auth()->user();
        $project = $deliverable->project;

        $action = $validated['action'];
        $notes = $validated['internal_notes'] ?? '';

        if ($action === 'request_revision') {
            $deliverable->update([
                'status' => 'revision_required',
                'reviewed_by' => $user->id,
                'internal_notes' => $notes,
            ]);

            // Notify submitter
            SystemNotification::create([
                'user_id' => $deliverable->submitted_by,
                'title' => 'Revision Requested on Deliverable',
                'message' => "Revision requested on '{$deliverable->title}' by {$user->name}: {$notes}",
                'type' => 'deliverable_revision',
                'link' => "/projects/{$project->id}",
            ]);
        } elseif ($action === 'approve_internally') {
            $deliverable->update([
                'status' => 'internal_review',
                'reviewed_by' => $user->id,
                'internal_notes' => $notes,
            ]);
        } elseif ($action === 'approve_for_client') {
            // Only Project Manager or Super Admin can publish to client
            $deliverable->update([
                'status' => 'approved_for_client',
                'reviewed_by' => $user->id,
                'internal_notes' => $notes,
                'is_client_visible' => true,
                'approved_for_client_at' => now(),
                'client_status' => 'pending',
            ]);

            // Notify client user if portal account is linked
            if ($project->client && $project->client->user_id) {
                SystemNotification::create([
                    'user_id' => $project->client->user_id,
                    'title' => 'New Deliverable Ready for Review',
                    'message' => "A new deliverable '{$deliverable->title}' is ready for your review and feedback.",
                    'type' => 'client_review',
                    'link' => "/client-portal/projects/{$project->id}",
                ]);
            }
        }

        AuditLog::log(
            action: 'DELIVERABLE_REVIEW_UPDATED',
            department: 'Production',
            entityType: 'ProjectDeliverable',
            entityId: $deliverable->id,
            description: "Review decision '{$action}' recorded on '{$deliverable->title}'"
        );

        \App\Events\DeliverableStatusChangedEvent::dispatch($deliverable, 'internal');

        return back()->with('success', 'Deliverable review updated');
    }

    public function destroy(ProjectDeliverable $deliverable)
    {
        $project = $deliverable->project;
        $title = $deliverable->title;

        if ($deliverable->file_path && Storage::disk('public')->exists($deliverable->file_path)) {
            Storage::disk('public')->delete($deliverable->file_path);
        }

        $deliverable->delete();

        AuditLog::log(
            action: 'DELIVERABLE_DELETED',
            department: 'Production',
            entityType: 'ProjectDeliverable',
            entityId: $deliverable->id,
            description: "Deleted deliverable '{$title}' from project '{$project->name}'"
        );

        return back()->with('success', 'Deliverable removed');
    }

    public function download(ProjectDeliverable $deliverable)
    {
        $user = auth()->user();
        $project = $deliverable->project;

        $isAuthorized = false;

        if ($user->isSuperAdmin()) {
            $isAuthorized = true;
        } elseif ($user->primaryRoleName() !== 'external_user') {
            if ($project->project_manager_id === $user->id ||
                $project->project_leader_id === $user->id ||
                $project->members()->where('user_id', $user->id)->exists() ||
                $deliverable->submitted_by === $user->id ||
                $user->hasPermission('kanban.view')) {
                $isAuthorized = true;
            }
        } else {
            if ($deliverable->is_client_visible && $project->client_visible) {
                if ($project->client && $project->client->user_id === $user->id) {
                    $isAuthorized = true;
                } else {
                    $isAuthorized = \DB::table('client_contacts')
                        ->where('client_id', $project->client_id)
                        ->where('user_id', $user->id)
                        ->where('is_active', true)
                        ->exists();
                }
            }
        }

        abort_unless($isAuthorized, 403, 'Unauthorized access to deliverable asset.');

        if (!$deliverable->file_path || !Storage::disk('public')->exists($deliverable->file_path)) {
            abort(404, 'Deliverable file not found on storage.');
        }

        return Storage::disk('public')->download($deliverable->file_path, basename($deliverable->file_path));
    }
}

