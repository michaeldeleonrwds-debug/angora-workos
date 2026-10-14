<?php

namespace App\Http\Controllers;

use App\Events\TaskUpdatedEvent;
use App\Models\KanbanTask;
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

        // Self-review prevention: designer/submitter cannot approve their own submission unless super_admin or admin
        if ($cycle->submitted_by === $user->id && !in_array($user->role, ['super_admin', 'admin'])) {
            return response()->json([
                'error' => 'You cannot approve or review your own submission. A Project Manager or Reviewer must complete the review.',
            ], 403);
        }

        $currentStage = $cycle->stages()->where('stage_index', $cycle->current_stage_index ?? 1)->first();

        // Stage role gating: if stage specifies required_role, enforce it (unless super_admin or admin)
        if ($currentStage && !empty($currentStage->required_role) && !in_array($user->role, ['super_admin', 'admin'])) {
            $allowedRole = $currentStage->required_role;
            if ($allowedRole === 'client' && $user->role !== 'client' && $user->role !== 'external_user') {
                return response()->json([
                    'error' => "Stage '{$currentStage->name}' requires client authorization.",
                ], 403);
            } elseif ($allowedRole === 'project_manager' && !in_array($user->role, ['project_manager', 'admin_manager', 'admin', 'super_admin'])) {
                return response()->json([
                    'error' => "Stage '{$currentStage->name}' requires project manager authorization.",
                ], 403);
            } elseif ($allowedRole !== 'any' && $allowedRole !== 'client' && $allowedRole !== 'project_manager' && $user->role !== $allowedRole) {
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

            if ($board) {
                $targetCol = $board->columns()
                    ->where(function ($q) {
                        $q->where('title', 'like', '%Revision%')
                          ->orWhere('title', 'like', '%Needs Revision%')
                          ->orWhere('title', 'like', '%Changes%');
                    })
                    ->first();

                if ($targetCol) {
                    $oldStatus = $task->column?->title;
                    $task->column_id = $targetCol->id;

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
                    $targetCol = $board->columns()
                        ->where(function ($q) {
                            $q->where('title', 'like', '%Done%')
                              ->orWhere('title', 'like', '%Approved%')
                              ->orWhere('title', 'like', '%Completed%');
                        })
                        ->first();

                    if ($targetCol) {
                        $oldStatus = $task->column?->title;
                        $task->column_id = $targetCol->id;

                        if (in_array(strtolower($targetCol->title), ['done', 'completed', 'approved'])) {
                            $task->completed_at = now();
                            $task->progress = 100;
                        }

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
}
