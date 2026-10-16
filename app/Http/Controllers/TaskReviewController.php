<?php

namespace App\Http\Controllers;

use App\Events\TaskUpdatedEvent;
use App\Models\KanbanTask;
use App\Models\SystemNotification;
use App\Models\TaskReviewCycle;
use App\Models\TaskReviewDecision;
use App\Services\NotificationService;
use App\Services\TaskActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskReviewController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * Get review history and cycles for a task.
     */
    public function index(KanbanTask $task): JsonResponse
    {
        \Illuminate\Support\Facades\Gate::authorize('view', $task);

        $cycles = $task->reviewCycles()
            ->with([
                'submitter:id,name,email,avatar',
                'stages.reviewer:id,name,email,avatar',
                'decisions.reviewer:id,name,email,avatar',
                'client:id,name',
            ])
            ->get();

        return response()->json([
            'review_cycles' => $cycles,
            'current_cycle' => $cycles->last(),
        ]);
    }

    /**
     * Submit task for review (starts a new round).
     */
    public function submit(Request $request, KanbanTask $task): JsonResponse
    {
        \Illuminate\Support\Facades\Gate::authorize('submitReview', $task);

        $user = $request->user();

        // Check if there is already a pending cycle
        $pendingCycle = $task->reviewCycles()->where('state', 'pending')->first();
        if ($pendingCycle) {
            return response()->json([
                'error' => 'A review cycle is already pending for this task.',
                'current_cycle' => $pendingCycle,
            ], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:2000',
            'stages' => 'nullable|array|min:1',
            'stages.*.name' => 'required|string|max:100',
            'stages.*.required_role' => 'nullable|string|max:50',
        ]);

        $latestCycle = $task->reviewCycles()->latest('round_number')->first();
        $roundNumber = $latestCycle ? ($latestCycle->round_number + 1) : 1;

        $stagesSpec = $validated['stages'] ?? [
            ['name' => 'Internal Review', 'required_role' => null],
        ];

        $cycle = TaskReviewCycle::create([
            'task_id' => $task->id,
            'round_number' => $roundNumber,
            'submitted_by' => $user->id,
            'state' => 'pending',
            'total_stages' => count($stagesSpec),
            'current_stage_index' => 1,
            'notes' => $validated['notes'] ?? null,
            'submitted_at' => now(),
        ]);

        foreach ($stagesSpec as $sIdx => $sData) {
            $stageNum = $sIdx + 1;
            \App\Models\TaskReviewStage::create([
                'review_cycle_id' => $cycle->id,
                'stage_index' => $stageNum,
                'name' => $sData['name'] ?? "Stage {$stageNum}",
                'required_role' => $sData['required_role'] ?? null,
                'status' => $stageNum === 1 ? 'in_progress' : 'pending',
            ]);
        }

        // Find review column if exists on the board
        $board = $task->board;
        if ($board) {
            $reviewCol = $board->columns()
                ->where(function ($q) {
                    $q->where('title', 'like', '%Review%')
                      ->orWhere('title', 'like', '%Approval%');
                })
                ->first();

            if ($reviewCol) {
                $oldStatus = $task->column?->title;
                $task->column_id = $reviewCol->id;

                // Sync group_id if matching group exists
                $matchingGroup = $board->groups()->where('title', 'like', '%' . $reviewCol->title . '%')->first();
                if ($matchingGroup) {
                    $task->group_id = $matchingGroup->id;
                }
                $task->save();

                TaskActivityService::log(
                    task: $task,
                    eventType: 'status_changed',
                    description: "Status changed to {$reviewCol->title} for review",
                    fieldName: 'status',
                    oldValue: $oldStatus,
                    newValue: $reviewCol->title,
                    actor: $user
                );
            }
        }

        TaskActivityService::log(
            task: $task,
            eventType: 'review_submitted',
            description: "{$user->name} submitted Round {$roundNumber} for review.",
            fieldName: 'review_cycle',
            oldValue: null,
            newValue: ['round' => $roundNumber, 'notes' => $validated['notes'] ?? null],
            metadata: ['cycle_id' => $cycle->id, 'round' => $roundNumber],
            actor: $user
        );

        $this->notificationService->notifyReviewSubmitted($task, $cycle, $user);

        try {
            broadcast(new TaskUpdatedEvent($task->fresh(), 'review_submitted', $user->id));
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => "Round {$roundNumber} submitted for review.",
            'cycle' => $cycle->load(['submitter:id,name,email,avatar,avatar_url', 'decisions.reviewer:id,name,email,avatar,avatar_url']),
            'task' => $task->fresh(['column', 'group']),
        ]);
    }

    /**
     * Review decision (approve or request revision).
     */
    public function decide(Request $request, KanbanTask $task): JsonResponse
    {
        \Illuminate\Support\Facades\Gate::authorize('reviewTask', $task);

        $user = $request->user();

        $validated = $request->validate([
            'decision' => 'required|string|in:approved,revision_requested',
            'feedback' => 'nullable|string|max:3000',
            'attachments' => 'nullable|array',
        ]);

        $cycle = $task->reviewCycles()->where('state', 'pending')->latest('round_number')->first();
        if (!$cycle) {
            return response()->json([
                'error' => 'No active pending review cycle found for this task.',
            ], 422);
        }

        // A review decision must always come from someone other than the submitter.
        if ($cycle->submitted_by === $user->id) {
            return response()->json([
                'error' => 'You cannot approve or review your own submission. A Project Manager or Reviewer must complete the review.',
            ], 403);
        }

        $currentStage = $cycle->stages()->where('stage_index', $cycle->current_stage_index ?? 1)->first();

        // Stage role gating: if stage specifies required_role, enforce it (unless super_admin or admin)
        if ($currentStage && !empty($currentStage->required_role) && !in_array($user->primaryRoleName(), ['super_admin', 'admin'])) {
            $allowedRole = $currentStage->required_role;
            if ($allowedRole === 'client' && $user->primaryRoleName() !== 'client' && $user->primaryRoleName() !== 'external_user') {
                return response()->json([
                    'error' => "Stage '{$currentStage->name}' requires client authorization.",
                ], 403);
            } elseif ($allowedRole === 'project_manager' && ! $user->hasPermission('workos.tasks.review.decide')) {
                return response()->json([
                    'error' => "Stage '{$currentStage->name}' requires project manager authorization.",
                ], 403);
            } elseif ($allowedRole !== 'any' && $allowedRole !== 'client' && $allowedRole !== 'project_manager' && $user->primaryRoleName() !== $allowedRole) {
                return response()->json([
                    'error' => "Stage '{$currentStage->name}' requires '{$allowedRole}' role authorization.",
                ], 403);
            }
        }

        $decision = TaskReviewDecision::create([
            'review_cycle_id' => $cycle->id,
            'reviewer_id' => $user->id,
            'decision' => $validated['decision'],
            'feedback' => $validated['feedback'] ?? null,
            'attachments' => $validated['attachments'] ?? null,
            'decided_at' => now(),
        ]);

        if ($currentStage) {
            $currentStage->update([
                'status' => $validated['decision'],
                'reviewer_id' => $user->id,
                'feedback' => $validated['feedback'] ?? null,
                'decided_at' => now(),
            ]);
        }

        $board = $task->board;
        $isCycleComplete = false;
        $cycleFinalStatus = $validated['decision'];

        if ($validated['decision'] === 'revision_requested') {
            $isCycleComplete = true;
            $cycle->update([
                'state' => 'revision_requested',
                'resolved_at' => now(),
            ]);

            if ($cycle->review_type === 'internal') {
                $task->increment('internal_revision_count');
            }

            if ($board) {
                $targetCol = $board->columns()->where('stage_key', 'for_revision')->first()
                    ?? $board->columns()
                        ->where(function ($q) {
                            $q->where('title', 'like', '%Revision%')
                              ->orWhere('title', 'like', '%Needs Revision%')
                              ->orWhere('title', 'like', '%Changes%');
                        })
                        ->first();

                if ($targetCol) {
                    $oldStatus = $task->column?->title;
                    $task->applyWorkflowStatus($targetCol);

                    $matchingGroup = $board->groups()->where('title', 'like', '%' . $targetCol->title . '%')->first();
                    if ($matchingGroup) {
                        $task->group_id = $matchingGroup->id;
                    }
                    $task->save();

                    TaskActivityService::log(
                        task: $task,
                        eventType: 'status_changed',
                        description: "Status changed to {$targetCol->title}",
                        fieldName: 'status',
                        oldValue: $oldStatus,
                        newValue: $targetCol->title,
                        actor: $user
                    );
                }
            }
        } else {
            // Stage approved: check if there are subsequent stages
            $hasNextStage = $currentStage && ($cycle->current_stage_index < $cycle->total_stages);

            if ($hasNextStage) {
                $nextIndex = $cycle->current_stage_index + 1;
                $cycle->update([
                    'current_stage_index' => $nextIndex,
                ]);

                $nextStage = $cycle->stages()->where('stage_index', $nextIndex)->first();
                if ($nextStage) {
                    $nextStage->update(['status' => 'in_progress']);
                }
            } else {
                // Final stage approved -> cycle complete!
                $isCycleComplete = true;
                $cycle->update([
                    'state' => 'approved',
                    'resolved_at' => now(),
                ]);

                if ($board) {
                    $targetCol = null;
                    if ($cycle->review_type === 'internal' && $board->columns()->where('stage_key', 'ready_to_report')->exists()) {
                        $targetCol = $board->columns()->where('stage_key', 'ready_to_report')->first();
                    }

                    if (!$targetCol) {
                        $targetCol = $board->columns()->where('stage_key', 'complete')->first()
                            ?? $board->columns()
                                ->where(function ($q) {
                                    $q->where('title', 'like', '%Done%')
                                      ->orWhere('title', 'like', '%Approved%')
                                      ->orWhere('title', 'like', '%Completed%')
                                      ->orWhere('title', 'like', '%Complete%');
                                })
                                ->first();
                    }

                    if ($targetCol) {
                        $oldStatus = $task->column?->title;
                        $task->applyWorkflowStatus($targetCol);

                        $matchingGroup = $board->groups()->where('title', 'like', '%' . $targetCol->title . '%')->first();
                        if ($matchingGroup) {
                            $task->group_id = $matchingGroup->id;
                        }
                        $task->save();

                        TaskActivityService::log(
                            task: $task,
                            eventType: 'status_changed',
                            description: "Status changed to {$targetCol->title}",
                            fieldName: 'status',
                            oldValue: $oldStatus,
                            newValue: $targetCol->title,
                            actor: $user
                        );
                    }
                }
            }
        }

        $stageName = $currentStage ? $currentStage->name : "Round {$cycle->round_number}";
        $activityType = $validated['decision'] === 'approved' ? 'review_approved' : 'revision_requested';
        $actionDesc = $validated['decision'] === 'approved' ? 'approved' : 'requested revisions for';

        TaskActivityService::log(
            task: $task,
            eventType: $activityType,
            description: "{$user->name} {$actionDesc} '{$stageName}' (Round {$cycle->round_number}).",
            fieldName: 'review_decision',
            oldValue: 'pending',
            newValue: $validated['decision'],
            metadata: [
                'cycle_id' => $cycle->id,
                'round' => $cycle->round_number,
                'stage_index' => $currentStage?->stage_index ?? 1,
                'feedback' => $validated['feedback'] ?? null,
            ],
            actor: $user
        );

        $this->notificationService->notifyReviewDecision($task, $cycle, $decision, $user);

        try {
            broadcast(new TaskUpdatedEvent($task->fresh(), $activityType, $user->id));
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => $isCycleComplete
                ? ($validated['decision'] === 'approved' ? "Round {$cycle->round_number} fully approved!" : "Revision requested for Round {$cycle->round_number}.")
                : "Stage '{$stageName}' approved. Advanced to next stage.",
            'decision' => $decision->load('reviewer:id,name,email,avatar,avatar_url'),
            'cycle' => $cycle->fresh([
                'submitter:id,name,email,avatar,avatar_url',
                'stages.reviewer:id,name,email,avatar,avatar_url',
                'decisions.reviewer:id,name,email,avatar,avatar_url',
            ]),
            'task' => $task->fresh(['column', 'group']),
        ]);
    }

    /**
     * PM / Admin submits approved production work to client review.
     * Enforces internal review gate, transitions task to Client Under Review,
     * and creates/updates linked client review record without duplicating internal task.
     */
    public function submitToClientReview(Request $request, KanbanTask $task)
    {
        $user = $request->user();

        // Enforce authorization: only PM, AM, Admin, or Super Admin with review decision authority
        if (! $user->isSuperAdmin() && ! $user->hasPermission('workos.tasks.review.decide')) {
            abort(403, 'Unauthorized. Only Project Managers or Admins can submit tasks to Client Review.');
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:2000',
            'client_id' => 'nullable|exists:sales_customers,id',
            'deliverable_title' => 'nullable|string|max:255',
            'deliverable_url' => 'nullable|url',
        ]);

        $board = $task->board;
        abort_unless($board, 422, 'Task does not belong to a board.');

        // Enforce internal review gate: task must not be unstarted or in active production without review
        $unstartedStages = ['resources', 'hold', 'new_task', 'to_do'];
        if ($task->column && in_array($task->column->stage_key, $unstartedStages, true)) {
            abort(422, 'Task must complete production and internal review before submitting to client.');
        }

        // Determine client
        $clientId = $validated['client_id'] ?? $task->client_id;
        if (! $clientId) {
            $customer = \App\Models\SalesCustomer::first();
            $clientId = $customer?->id;
        }

        abort_unless($clientId, 422, 'A valid client account must be associated with the task.');

        // Find Client Under Review stage on board
        $clientReviewCol = $board->columns()->where('stage_key', 'client_under_review')->first()
            ?? $board->columns()->where(function ($q) {
                $q->where('title', 'like', '%Client Under Review%')
                  ->orWhere('title', 'like', '%Client Review%');
            })->first();

        abort_unless($clientReviewCol, 422, 'Client Under Review stage not found on this board.');

        // Calculate client revision round
        $latestClientCycle = $task->reviewCycles()->where('review_type', 'client')->latest('round_number')->first();
        $roundNumber = $latestClientCycle ? ($latestClientCycle->round_number + 1) : 1;

        // Create client review cycle without duplicating the task
        $cycle = TaskReviewCycle::create([
            'task_id' => $task->id,
            'round_number' => $roundNumber,
            'review_type' => 'client',
            'client_id' => $clientId,
            'submitted_by' => $user->id,
            'state' => 'pending',
            'total_stages' => 1,
            'current_stage_index' => 1,
            'notes' => $validated['notes'] ?? null,
            'submitted_at' => now(),
        ]);

        \App\Models\TaskReviewStage::create([
            'review_cycle_id' => $cycle->id,
            'stage_index' => 1,
            'name' => 'Client Approval',
            'required_role' => 'client',
            'status' => 'in_progress',
        ]);

        // If deliverable info was passed or exists, link/publish it
        if (!empty($validated['deliverable_title']) || !empty($validated['deliverable_url'])) {
            $project = \App\Models\AgencyProject::where('client_id', $clientId)->first();
            if ($project) {
                \App\Models\ProjectDeliverable::create([
                    'project_id' => $project->id,
                    'task_id' => $task->id,
                    'title' => $validated['deliverable_title'] ?? $task->title,
                    'description' => $validated['notes'] ?? $task->description,
                    'external_url' => $validated['deliverable_url'] ?? null,
                    'version' => $roundNumber,
                    'status' => 'approved_for_client',
                    'submitted_by' => $user->id,
                    'reviewed_by' => $user->id,
                    'is_client_visible' => true,
                    'approved_for_client_at' => now(),
                    'client_status' => 'pending',
                ]);
            }
        } else {
            // Ensure any existing deliverables on this task are approved for client
            $task->deliverables()->update([
                'is_client_visible' => true,
                'client_status' => 'pending',
                'status' => 'approved_for_client',
                'approved_for_client_at' => now(),
            ]);
        }

        // Transition task to Client Under Review stage
        $oldStatus = $task->column?->title;
        $task->client_id = $clientId;
        $task->is_client_visible = true;
        $task->client_review_status = 'submitted';
        $task->applyWorkflowStatus($clientReviewCol);

        $matchingGroup = $board->groups()->where('title', 'like', '%' . $clientReviewCol->title . '%')->first();
        if ($matchingGroup) {
            $task->group_id = $matchingGroup->id;
        }
        $task->save();

        TaskActivityService::log(
            task: $task,
            eventType: 'client_review_submitted',
            description: "{$user->name} submitted task to Client Review (Round {$roundNumber}).",
            fieldName: 'client_review_cycle',
            oldValue: $oldStatus,
            newValue: $clientReviewCol->title,
            metadata: ['cycle_id' => $cycle->id, 'round' => $roundNumber, 'client_id' => $clientId],
            actor: $user
        );

        // Notify client user if portal account exists
        $client = \App\Models\SalesCustomer::find($clientId);
        $clientUser = $client?->portalUser ?? $client?->contacts()->where('is_active', true)->first()?->user;
        if ($clientUser) {
            SystemNotification::create([
                'user_id' => $clientUser->id,
                'title' => "New Review Ready: {$task->title}",
                'message' => "Round {$roundNumber} of '{$task->title}' has been submitted for your review.",
                'type' => 'client_review',
                'category' => 'reviews',
                'link' => \App\Services\NotificationService::generateTaskLink($task, tab: 'reviews', recipient: $clientUser),
                'metadata' => [
                    'task_id' => $task->id,
                    'board_id' => $task->board_id,
                    'tab' => 'reviews',
                ],
            ]);
        }

        try {
            broadcast(new TaskUpdatedEvent($task->fresh(), 'client_review_submitted', $user->id));
        } catch (\Throwable $e) {}

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Task submitted to Client Review (Round {$roundNumber}).",
                'cycle' => $cycle,
                'task' => $task->fresh(['column', 'group', 'client']),
            ]);
        }

        return back()->with('success', "Task submitted to Client Review (Round {$roundNumber}).");
    }

    /**
     * PM / Admin reviews client feedback and sends task back to production.
     * Transitions task to New Task stage, keeping same task ID, work categories, assignees, and history.
     */
    public function sendBackToProduction(Request $request, KanbanTask $task)
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && ! $user->hasPermission('workos.tasks.review.decide')) {
            abort(403, 'Unauthorized. Only Project Managers or Admins can send tasks back to production.');
        }

        $validated = $request->validate([
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'instructions' => 'nullable|string|max:3000',
        ]);

        $board = $task->board;
        abort_unless($board, 422, 'Task does not belong to a board.');

        $newTaskCol = $board->columns()->where('stage_key', 'new_task')->first()
            ?? $board->columns()->where('is_default', true)->first()
            ?? $board->columns()->where('title', 'like', '%New Task%')->first();

        abort_unless($newTaskCol, 422, 'New Task stage not found on this board.');

        $oldStatus = $task->column?->title;
        $task->applyWorkflowStatus($newTaskCol);

        if (!empty($validated['assigned_to'])) {
            $task->assigned_to = $validated['assigned_to'];
        }
        if (!empty($validated['due_date'])) {
            $task->due_date = $validated['due_date'];
        }

        $task->client_review_status = 'rework_in_production';
        $task->completed_at = null;

        $matchingGroup = $board->groups()->where('title', 'like', '%' . $newTaskCol->title . '%')->first();
        if ($matchingGroup) {
            $task->group_id = $matchingGroup->id;
        }
        $task->save();

        // If instructions provided, save as internal comment
        if (!empty($validated['instructions'])) {
            \App\Models\KanbanComment::create([
                'task_id' => $task->id,
                'user_id' => $user->id,
                'message' => "Client Revision Instructions from PM: " . $validated['instructions'],
                'is_client_visible' => false,
            ]);
        }

        TaskActivityService::log(
            task: $task,
            eventType: 'sent_back_to_production',
            description: "{$user->name} sent task back to production for client revision (Round {$task->client_revision_count}).",
            fieldName: 'status',
            oldValue: $oldStatus,
            newValue: $newTaskCol->title,
            metadata: [
                'instructions' => $validated['instructions'] ?? null,
                'assigned_to' => $task->assigned_to,
                'client_revision_count' => $task->client_revision_count,
            ],
            actor: $user
        );

        if ($task->assigned_to && $task->assigned_to !== $user->id) {
            SystemNotification::create([
                'user_id' => $task->assigned_to,
                'title' => "Task Sent Back to Production: {$task->title}",
                'message' => "Client revisions required. Please review PM notes and begin rework.",
                'type' => 'task_assigned',
                'category' => 'assignments',
                'link' => \App\Services\NotificationService::generateTaskLink($task, tab: 'updates', recipient: $task->assigned_to),
                'metadata' => [
                    'task_id' => $task->id,
                    'board_id' => $task->board_id,
                    'tab' => 'updates',
                ],
            ]);
        }

        try {
            broadcast(new TaskUpdatedEvent($task->fresh(), 'sent_back_to_production', $user->id));
        } catch (\Throwable $e) {}

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Task sent back to production for revision round {$task->client_revision_count}.",
                'task' => $task->fresh(['column', 'group', 'assignee']),
            ]);
        }

        return back()->with('success', "Task sent back to production for revision round {$task->client_revision_count}.");
    }
}
