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
        if (!$customer && $user->primaryRoleName() === 'external_user') {
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

    public function projectsTab(Request $request)
    {
        return $this->dashboard($request, 'projects');
    }

    public function boardTab(Request $request)
    {
        return $this->dashboard($request, 'board');
    }

    public function reviewsTab(Request $request)
    {
        return $this->dashboard($request, 'reviews');
    }

    public function notificationsTab(Request $request)
    {
        return $this->dashboard($request, 'notifications');
    }

    public function dashboard(Request $request = null, string $tab = 'overview')
    {
        $request = $request ?? request();
        $activeTab = $request->query('tab', $tab);
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

        // Client-visible tasks linked to customer
        $clientTasks = \App\Models\KanbanTask::where('client_id', $customer->id)
            ->where('is_client_visible', true)
            ->whereNull('parent_id')
            ->with([
                'column:id,title,color,stage_key,semantic_category',
                'assignee:id,name,email,avatar,avatar_url',
                'deliverables' => function ($q) {
                    $q->where('is_client_visible', true)->latest();
                },
                'reviewCycles' => function ($q) {
                    $q->where('review_type', 'client')->latest('round_number')->with(['decisions.reviewer:id,name,email']);
                },
                'comments' => function ($q) {
                    $q->where('is_client_visible', true)->with('user:id,name,email,avatar,avatar_url')->latest();
                },
                'attachments' => function ($q) {
                    $q->where('is_client_visible', true)->latest();
                },
            ])
            ->latest()
            ->get();

        $clientSafeTasks = $clientTasks->map(function ($task) {
            $latestCycle = $task->reviewCycles->first();
            $latestDecision = $latestCycle?->decisions->last();
            $isComplete = $task->column?->stage_key === 'complete' || $task->client_review_status === 'approved';

            return [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'priority' => $task->priority,
                // In Complete stage, production deadline is hidden entirely per Phase 1B
                'due_date' => $isComplete ? null : $task->due_date,
                'client_deadline' => $task->client_deadline,
                'status' => $task->column?->title ?? 'New Task',
                'stage_key' => $task->column?->stage_key ?? 'new_task',
                'stage_color' => $task->column?->color ?? '#579BFC',
                'client_review_status' => $task->client_review_status,
                'client_revision_count' => $task->client_revision_count,
                'is_awaiting_approval' => $task->column?->stage_key === 'client_under_review' && in_array($task->client_review_status, ['submitted', 'pending'], true),
                'is_revision_requested' => $task->client_review_status === 'revision_requested',
                'is_complete' => $isComplete,
                'assignee' => $task->assignee ? [
                    'name' => $task->assignee->name,
                    'avatar_url' => $task->assignee->avatar_url,
                ] : null,
                'review_cycle' => $latestCycle ? [
                    'id' => $latestCycle->id,
                    'round_number' => $latestCycle->round_number,
                    'state' => $latestCycle->state,
                    'notes' => $latestCycle->notes,
                    'client_feedback' => $latestCycle->client_feedback ?? $latestDecision?->feedback,
                    'submitted_at' => $latestCycle->submitted_at?->format('Y-m-d H:i'),
                    'resolved_at' => $latestCycle->resolved_at?->format('Y-m-d H:i'),
                ] : null,
                'deliverables' => $task->deliverables->map(fn($d) => [
                    'id' => $d->id,
                    'title' => $d->title,
                    'description' => $d->description,
                    'file_url' => $d->file_url,
                    'external_url' => $d->external_url,
                    'version' => $d->version,
                    'client_status' => $d->client_status,
                    'client_feedback' => $d->client_feedback,
                ]),
                'deliverables_count' => $task->deliverables->count(),
                'comments' => $task->comments->map(fn($c) => [
                    'id' => $c->id,
                    'message' => $c->message,
                    'created_at' => $c->created_at->diffForHumans(),
                    'user' => [
                        'name' => $c->user?->name,
                        'avatar_url' => $c->user?->avatar_url,
                    ],
                ]),
                'attachments' => $task->attachments->map(fn($a) => [
                    'id' => $a->id,
                    'file_name' => $a->file_name,
                    'file_size_bytes' => $a->file_size_bytes,
                    'mime_type' => $a->mime_type,
                    'download_url' => route('kanban.attachments.download', $a->id),
                ]),
            ];
        });

        // Resolve or create Client Kanban Board
        $clientBoard = \App\Models\KanbanBoard::where('title', 'like', '%Client Review Board%')->first()
            ?? \App\Models\KanbanBoard::where('department', 'Client Portal')->first();

        if (!$clientBoard) {
            $clientBoard = \App\Models\KanbanBoard::firstOrCreate(
                ['title' => ($customer->company ?: $customer->name) . ' — Client Review Board'],
                [
                    'department' => 'Client Portal',
                    'visibility' => 'private',
                    'settings' => ['client_id' => $customer->id],
                    'created_by' => auth()->id(),
                ]
            );
        }

        // Ensure 3 standard client stages: Awaiting Review, Needs Revision, Approved / Completed
        $stageConfigs = [
            ['title' => 'Awaiting Review', 'key' => 'client_under_review', 'color' => '#579BFC', 'semantic' => 'in_review', 'pos' => 0],
            ['title' => 'Needs Revision', 'key' => 'for_revision', 'color' => '#FF642E', 'semantic' => 'in_progress', 'pos' => 1],
            ['title' => 'Approved / Completed', 'key' => 'complete', 'color' => '#00C875', 'semantic' => 'completed', 'pos' => 2],
        ];

        $boardCols = [];
        foreach ($stageConfigs as $sc) {
            $col = $clientBoard->columns()->where('stage_key', $sc['key'])->first();
            if (!$col) {
                $col = \App\Models\KanbanColumn::create([
                    'board_id' => $clientBoard->id,
                    'title' => $sc['title'],
                    'color' => $sc['color'],
                    'stage_key' => $sc['key'],
                    'semantic_category' => $sc['semantic'],
                    'position' => $sc['pos'],
                ]);
            } else {
                if ($col->title !== $sc['title'] || $col->color !== $sc['color']) {
                    $col->update(['title' => $sc['title'], 'color' => $sc['color']]);
                }
            }
            $boardCols[] = $col;
        }

        // Map client tasks into the 3 columns for KanbanBoardView
        $awaitingColId = $boardCols[0]->id;
        $revisionColId = $boardCols[1]->id;
        $approvedColId = $boardCols[2]->id;

        $colTasksMap = [
            $awaitingColId => [],
            $revisionColId => [],
            $approvedColId => [],
        ];

        foreach ($clientSafeTasks as $taskData) {
            $targetColId = $awaitingColId;
            if ($taskData['is_complete'] || $taskData['client_review_status'] === 'approved') {
                $targetColId = $approvedColId;
            } elseif ($taskData['is_revision_requested'] || $taskData['client_review_status'] === 'revision_requested') {
                $targetColId = $revisionColId;
            }

            // Find matching column object
            $matchingCol = collect($boardCols)->firstWhere('id', $targetColId);

            $colTasksMap[$targetColId][] = array_merge($taskData, [
                'board_id' => $clientBoard->id,
                'column_id' => $targetColId,
                'column' => [
                    'id' => $targetColId,
                    'board_id' => $clientBoard->id,
                    'title' => $matchingCol?->title ?? 'Stage',
                    'stage_key' => $matchingCol?->stage_key ?? 'new_task',
                    'color' => $matchingCol?->color ?? '#579bfc',
                    'semantic_category' => $matchingCol?->semantic_category ?? 'in_progress',
                ],
            ]);
        }

        $formattedColumns = array_map(function ($col) use ($colTasksMap) {
            return [
                'id' => $col->id,
                'board_id' => $col->board_id,
                'title' => $col->title,
                'color' => $col->color,
                'position' => $col->position,
                'stage_key' => $col->stage_key,
                'semantic_category' => $col->semantic_category,
                'tasks' => $colTasksMap[$col->id] ?? [],
            ];
        }, $boardCols);

        $boardData = [
            'id' => $clientBoard->id,
            'title' => $clientBoard->title,
            'department' => 'Client Portal',
            'visibility' => 'private',
            'columns' => $formattedColumns,
            'groups' => [],
            'views' => [
                [
                    'id' => 1,
                    'board_id' => $clientBoard->id,
                    'name' => 'Client Kanban',
                    'type' => 'kanban',
                    'is_default' => true,
                    'position' => 0,
                ],
            ],
        ];

        $clientNotifications = SystemNotification::with('actor:id,name,email,avatar,avatar_url')
            ->where('user_id', auth()->id())
            ->latest()
            ->paginate(50);

        $unreadNotificationsCount = SystemNotification::where('user_id', auth()->id())
            ->where('is_read', false)
            ->count();

        $stats = [
            'total_items' => count($clientSafeTasks),
            'awaiting_review' => count($colTasksMap[$awaitingColId]),
            'needs_revision' => count($colTasksMap[$revisionColId]),
            'approved' => count($colTasksMap[$approvedColId]),
            'total_projects' => $clientSafeProjects->count(),
            'unread_notifications' => $unreadNotificationsCount,
        ];

        $permissions = [
            'canView' => true,
            'canCreateTask' => false,
            'canEditTask' => false,
            'canEditProgress' => false,
            'canChangeStatus' => false,
            'canMoveAssignedTask' => false,
            'canAssignUsers' => false,
            'canChangeDeadlines' => false,
            'canChangePriority' => false,
            'canDeleteTask' => false,
            'canViewAllTasks' => true,
            'canFilterPersonalTasks' => false,
            'canManageBoard' => false,
            'canManageColumns' => false,
            'canManageGroups' => false,
            'canManageAutomations' => false,
            'canManageBlueprints' => false,
            'canManageDependencies' => false,
            'canManageRecurrence' => false,
            'canApproveReview' => true,
            'canExport' => false,
        ];

        return Inertia::render('client-portal/dashboard', [
            'client' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'company' => $customer->company,
                'email' => $customer->email,
            ],
            'stats' => $stats,
            'activeTab' => $activeTab,
            'board' => $boardData,
            'permissions' => $permissions,
            'projects' => $clientSafeProjects,
            'deliverables' => $pendingDeliverables,
            'tasks' => $clientSafeTasks,
            'users' => User::select('id', 'name', 'email', 'avatar', 'avatar_url')->get(),
            'notifications' => $clientNotifications,
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

        \App\Support\SafeBroadcast::dispatch(new \App\Events\DeliverableStatusChangedEvent($deliverable, 'client'));

        return back()->with('success', 'Feedback submitted successfully. Our team has been notified!');
    }

    /**
     * Client approves task deliverables and review cycle.
     * Transitions task to semantic Complete stage atomically, hides production deadline from UI,
     * logs activity, and notifies PM/AM.
     */
    public function approveTask(Request $request, \App\Models\KanbanTask $task)
    {
        $customer = $this->getAuthenticatedCustomer();

        abort_unless((int) $task->client_id === (int) $customer->id && $task->is_client_visible, 403, 'Unauthorized access to this task.');

        // Idempotency check: if already approved, return success
        if ($task->client_review_status === 'approved' && $task->column?->stage_key === 'complete') {
            if ($request->wantsJson()) {
                return response()->json(['success' => true, 'message' => 'Task is already approved.']);
            }
            return back()->with('success', 'Task is already approved.');
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($task, $customer, $request) {
            $cycle = $task->reviewCycles()
                ->where('review_type', 'client')
                ->where('state', 'pending')
                ->latest('round_number')
                ->first();

            $roundNumber = $cycle?->round_number ?? 1;

            if ($cycle) {
                $cycle->update([
                    'state' => 'approved',
                    'resolved_at' => now(),
                ]);

                \App\Models\TaskReviewDecision::create([
                    'review_cycle_id' => $cycle->id,
                    'reviewer_id' => auth()->id(),
                    'decision' => 'approved',
                    'feedback' => $request->input('feedback'),
                    'decided_at' => now(),
                ]);
            }

            // Update linked deliverables
            $task->deliverables()
                ->where('is_client_visible', true)
                ->where('client_status', 'pending')
                ->update([
                    'client_status' => 'approved',
                    'status' => 'client_approved',
                    'client_reviewed_at' => now(),
                ]);

            // Transition production task to Complete
            $completeCol = $task->board?->columns()->where('stage_key', 'complete')->first()
                ?? $task->board?->columns()->where('semantic_category', 'completed')->first();

            if ($completeCol) {
                $task->applyWorkflowStatus($completeCol);
                $matchingGroup = $task->board?->groups()->where('title', 'like', '%' . $completeCol->title . '%')->first();
                if ($matchingGroup) {
                    $task->group_id = $matchingGroup->id;
                }
            }

            $task->completed_at = now();
            $task->progress = 100;
            $task->client_review_status = 'approved';
            // Phase 1B rule: production deadline remains stored in database for audit/reporting, but is suppressed/hidden in Complete
            $task->save();

            \App\Services\TaskActivityService::log(
                task: $task,
                eventType: 'client_approved',
                description: "Client " . auth()->user()->name . " approved task (Round {$roundNumber}). The task is now Complete.",
                fieldName: 'status',
                oldValue: 'Client Under Review',
                newValue: $completeCol?->title ?? 'Complete',
                metadata: ['round' => $roundNumber, 'client_id' => $customer->id],
                actor: auth()->user()
            );

            // Notify PM / AM
            $recipients = array_filter([
                $task->board?->created_by,
                $customer->account_manager_id,
                $cycle?->submitted_by,
                $task->deliverables()->first()?->project?->project_manager_id,
            ]);

            foreach (array_unique($recipients) as $recipientId) {
                \App\Models\SystemNotification::create([
                    'user_id' => $recipientId,
                    'title' => "Client Approved: {$task->title}",
                    'message' => "Client {$customer->name} has approved Round {$roundNumber} of '{$task->title}'. The task is now Complete.",
                    'type' => 'client_approved',
                    'category' => 'reviews',
                    'link' => \App\Services\NotificationService::generateTaskLink($task, tab: 'reviews', recipient: $recipientId),
                    'metadata' => [
                        'task_id' => $task->id,
                        'board_id' => $task->board_id,
                        'tab' => 'reviews',
                    ],
                ]);
            }
        });

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Task approved successfully!',
                'task' => $task->fresh(['column', 'group']),
            ]);
        }

        return back()->with('success', 'Task approved successfully!');
    }

    /**
     * Client requests revision on task deliverables.
     * Records feedback, increments client revision count, retains task in management review queue,
     * and notifies PM/AM without automatically sending back to employees.
     */
    public function requestTaskRevision(Request $request, \App\Models\KanbanTask $task)
    {
        $customer = $this->getAuthenticatedCustomer();

        abort_unless((int) $task->client_id === (int) $customer->id && $task->is_client_visible, 403, 'Unauthorized access to this task.');

        $validated = $request->validate([
            'feedback' => 'required|string|max:3000',
            'attachments' => 'nullable|array',
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($task, $customer, $validated) {
            $cycle = $task->reviewCycles()
                ->where('review_type', 'client')
                ->where('state', 'pending')
                ->latest('round_number')
                ->first();

            $roundNumber = $cycle?->round_number ?? 1;

            if ($cycle) {
                $cycle->update([
                    'state' => 'revision_requested',
                    'client_feedback' => $validated['feedback'],
                    'resolved_at' => now(),
                ]);

                \App\Models\TaskReviewDecision::create([
                    'review_cycle_id' => $cycle->id,
                    'reviewer_id' => auth()->id(),
                    'decision' => 'revision_requested',
                    'feedback' => $validated['feedback'],
                    'attachments' => $validated['attachments'] ?? null,
                    'decided_at' => now(),
                ]);
            }

            // Update deliverables
            $task->deliverables()
                ->where('is_client_visible', true)
                ->update([
                    'client_status' => 'revision_requested',
                    'client_feedback' => $validated['feedback'],
                    'status' => 'revision_required',
                    'client_reviewed_at' => now(),
                ]);

            $task->increment('client_revision_count');
            $task->client_review_status = 'revision_requested';
            $task->save();

            // Record as client-visible comment
            \App\Models\KanbanComment::create([
                'task_id' => $task->id,
                'user_id' => auth()->id(),
                'message' => "Client Revision Request (Round {$roundNumber}): " . $validated['feedback'],
                'is_client_visible' => true,
            ]);

            \App\Services\TaskActivityService::log(
                task: $task,
                eventType: 'client_revision_requested',
                description: "Client " . auth()->user()->name . " requested revision for Round {$roundNumber}: " . $validated['feedback'],
                metadata: ['feedback' => $validated['feedback'], 'round' => $roundNumber],
                actor: auth()->user()
            );

            // Notify PM / AM
            $recipients = array_filter([
                $task->board?->created_by,
                $customer->account_manager_id,
                $cycle?->submitted_by,
                $task->deliverables()->first()?->project?->project_manager_id,
            ]);

            foreach (array_unique($recipients) as $recipientId) {
                \App\Models\SystemNotification::create([
                    'user_id' => $recipientId,
                    'title' => "Client Revision Requested: {$task->title}",
                    'message' => "Client {$customer->name} requested revisions on '{$task->title}': " . \Illuminate\Support\Str::limit($validated['feedback'], 100),
                    'type' => 'client_revision',
                    'category' => 'reviews',
                    'link' => \App\Services\NotificationService::generateTaskLink($task, tab: 'reviews', recipient: $recipientId),
                    'metadata' => [
                        'task_id' => $task->id,
                        'board_id' => $task->board_id,
                        'tab' => 'reviews',
                    ],
                ]);
            }
        });

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Revision request submitted. Our management team will review your notes.',
                'task' => $task->fresh(['column', 'group']),
            ]);
        }

        return back()->with('success', 'Revision request submitted. Our management team will review your notes.');
    }

    /**
     * Client detail view for a specific task.
     * Enforces multi-tenant isolation, ensuring client sees only client-visible data.
     */
    public function taskDetail(\App\Models\KanbanTask $task)
    {
        $customer = $this->getAuthenticatedCustomer();

        abort_unless((int) $task->client_id === (int) $customer->id && $task->is_client_visible, 403, 'Unauthorized access to this task.');

        $task->load([
            'column:id,title,color,stage_key,semantic_category',
            'deliverables' => function ($q) {
                $q->where('is_client_visible', true)->latest();
            },
            'reviewCycles' => function ($q) {
                $q->where('review_type', 'client')->latest('round_number')->with(['decisions.reviewer:id,name,email']);
            },
            'comments' => function ($q) {
                $q->where('is_client_visible', true)->with('user:id,name,email,avatar_url')->latest();
            },
            'attachments' => function ($q) {
                $q->where('is_client_visible', true)->latest();
            },
        ]);

        $latestCycle = $task->reviewCycles->first();
        $isComplete = $task->column?->stage_key === 'complete' || $task->client_review_status === 'approved';

        return response()->json([
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'priority' => $task->priority,
            // Suppress production deadline in Complete stage per Phase 1B
            'due_date' => $isComplete ? null : $task->due_date,
            'client_deadline' => $task->client_deadline,
            'status' => $task->column?->title,
            'stage_key' => $task->column?->stage_key,
            'client_review_status' => $task->client_review_status,
            'client_revision_count' => $task->client_revision_count,
            'is_awaiting_approval' => $task->column?->stage_key === 'client_under_review' && in_array($task->client_review_status, ['submitted', 'pending'], true),
            'is_revision_requested' => $task->client_review_status === 'revision_requested',
            'is_complete' => $isComplete,
            'review_cycle' => $latestCycle,
            'deliverables' => $task->deliverables,
            'comments' => $task->comments,
            'attachments' => $task->attachments->map(fn($a) => [
                'id' => $a->id,
                'file_name' => $a->file_name,
                'file_size_bytes' => $a->file_size_bytes,
                'mime_type' => $a->mime_type,
                'download_url' => route('kanban.attachments.download', $a->id),
            ]),
        ]);
    }
}
