<?php

namespace App\Http\Controllers;

use App\Models\AgencyProject;
use App\Models\AuditLog;
use App\Models\ClientPortalInvitation;
use App\Models\ProjectDeliverable;
use App\Models\SalesCustomer;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClientPortalController extends Controller
{
    /**
     * Resolves the current logged in user's associated SalesCustomer record.
     * Prevents cross-client data leakage.
     */
    protected function getAuthenticatedCustomer(): SalesCustomer
    {
        $user = auth()->user();

        // 1. Direct user_id association on SalesCustomer
        $customer = SalesCustomer::where('user_id', $user->id)->first();

        // 2. Multi-contact association via client_contacts table
        if (!$customer) {
            $contact = \App\Models\ClientContact::where('user_id', $user->id)
                ->where('is_active', true)
                ->first();
            if ($contact) {
                $customer = SalesCustomer::find($contact->client_id);
            }
        }

        // 3. Fallback matching by email if external_user
        if (!$customer && $user->role === 'external_user') {
            $customer = SalesCustomer::where('email', $user->email)->first();
            if ($customer && !$customer->user_id) {
                $customer->update(['user_id' => $user->id]);
            }
        }

        // 4. For super_admin / developers testing the portal, provide first client or mock client
        if (!$customer && $user->isSuperAdmin()) {
            $customer = SalesCustomer::first();
        }

        if (!$customer) {
            abort(403, 'No client account associated with this login. Please contact your project manager.');
        }

        if (!$customer->portal_access_enabled) {
            abort(403, 'Client portal access is currently disabled for this account.');
        }

        return $customer;
    }

    public function dashboard()
    {
        $customer = $this->getAuthenticatedCustomer();

        $projects = AgencyProject::where('client_id', $customer->id)
            ->where('client_visible', true)
            ->with([
                'projectManager:id,name,email,avatar_url',
                'projectLeader:id,name,email,avatar_url',
                'deliverables' => function ($q) {
                    $q->where('is_client_visible', true)->latest();
                },
            ])
            ->latest()
            ->get();

        // Format projects for client safety (stripping internal fields)
        $clientSafeProjects = $projects->map(function ($project) {
            return [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'status' => $project->status,
                'priority' => $project->priority,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'due_date' => $project->due_date?->format('Y-m-d'),
                'budget' => $project->budget,
                'project_manager' => $project->projectManager ? [
                    'name' => $project->projectManager->name,
                    'email' => $project->projectManager->email,
                ] : null,
                'deliverables_count' => $project->deliverables->count(),
                'pending_review_count' => $project->deliverables->where('client_status', 'pending')->count(),
                'approved_count' => $project->deliverables->where('client_status', 'approved')->count(),
            ];
        });

        // Recent client deliverables pending action
        $pendingDeliverables = ProjectDeliverable::whereHas('project', function ($q) use ($customer) {
            $q->where('client_id', $customer->id)->where('client_visible', true);
        })
            ->where('is_client_visible', true)
            ->with('project:id,name')
            ->latest()
            ->get()
            ->map(function ($d) {
                return [
                    'id' => $d->id,
                    'project_id' => $d->project_id,
                    'project_name' => $d->project->name,
                    'title' => $d->title,
                    'description' => $d->description,
                    'file_url' => $d->file_url,
                    'external_url' => $d->external_url,
                    'version' => $d->version,
                    'client_status' => $d->client_status,
                    'client_feedback' => $d->client_feedback,
                    'client_reviewed_at' => $d->client_reviewed_at,
                    'approved_for_client_at' => $d->approved_for_client_at,
                ];
            });

        return Inertia::render('client-portal/dashboard', [
            'client' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'company' => $customer->company,
                'email' => $customer->email,
            ],
            'projects' => $clientSafeProjects,
            'deliverables' => $pendingDeliverables,
        ]);
    }

    public function project(AgencyProject $project)
    {
        $customer = $this->getAuthenticatedCustomer();

        // Strict multi-tenant isolation: project must belong to customer
        if ($project->client_id !== $customer->id || !$project->client_visible) {
            abort(403, 'Unauthorized access to this client project.');
        }

        $project->load([
            'projectManager:id,name,email,avatar_url',
            'projectLeader:id,name,email,avatar_url',
            'deliverables' => function ($q) {
                $q->where('is_client_visible', true)->latest();
            },
        ]);

        $safeDeliverables = $project->deliverables->map(function ($d) {
            return [
                'id' => $d->id,
                'title' => $d->title,
                'description' => $d->description,
                'file_url' => $d->file_url,
                'external_url' => $d->external_url,
                'version' => $d->version,
                'client_status' => $d->client_status,
                'client_feedback' => $d->client_feedback,
                'client_reviewed_at' => $d->client_reviewed_at?->format('Y-m-d H:i'),
                'approved_for_client_at' => $d->approved_for_client_at?->format('Y-m-d H:i'),
            ];
        });

        return Inertia::render('client-portal/project', [
            'client' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'company' => $customer->company,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'status' => $project->status,
                'priority' => $project->priority,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'due_date' => $project->due_date?->format('Y-m-d'),
                'project_manager' => $project->projectManager ? [
                    'name' => $project->projectManager->name,
                    'email' => $project->projectManager->email,
                ] : null,
                'deliverables' => $safeDeliverables,
            ],
        ]);
    }

    public function submitFeedback(Request $request, ProjectDeliverable $deliverable)
    {
        $customer = $this->getAuthenticatedCustomer();
        $project = $deliverable->project;

        // Verify ownership and visibility
        if ($project->client_id !== $customer->id || !$deliverable->is_client_visible) {
            abort(403, 'Unauthorized action.');
        }

        // Check explicit client project grant if defined
        $grant = \App\Models\ClientProjectGrant::where('project_id', $project->id)
            ->where('user_id', auth()->id())
            ->first();
        if ($grant && !$grant->can_approve) {
            abort(403, 'Your account does not have approval authority for this project.');
        }

        $validated = $request->validate([
            'client_status' => 'required|in:approved,revision_requested',
            'client_feedback' => 'nullable|string|max:2000',
        ]);

        $deliverable->update([
            'client_status' => $validated['client_status'],
            'client_feedback' => $validated['client_feedback'] ?? null,
            'client_reviewed_at' => now(),
            'status' => $validated['client_status'] === 'approved' ? 'client_approved' : 'revision_required',
        ]);

        // Notify Project Manager & Project Leader
        $recipients = array_filter([$project->project_manager_id, $project->project_leader_id]);
        $statusLabel = $validated['client_status'] === 'approved' ? 'APPROVED' : 'REVISION REQUESTED';

        foreach (array_unique($recipients) as $recipientId) {
            SystemNotification::create([
                'user_id' => $recipientId,
                'title' => "Client Feedback on '{$deliverable->title}': {$statusLabel}",
                'message' => "Client {$customer->name} submitted review: " . ($validated['client_feedback'] ?: 'No notes attached'),
                'type' => 'client_feedback',
                'link' => "/projects/{$project->id}",
            ]);
        }

        AuditLog::log(
            action: 'CLIENT_FEEDBACK_SUBMITTED',
            department: 'Production',
            entityType: 'ProjectDeliverable',
            entityId: $deliverable->id,
            description: "Client {$customer->name} submitted {$statusLabel} on deliverable '{$deliverable->title}'"
        );

        \App\Events\DeliverableStatusChangedEvent::dispatch($deliverable, 'client');

        return back()->with('success', 'Feedback submitted successfully. Our team has been notified!');
    }
}
