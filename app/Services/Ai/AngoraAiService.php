<?php

namespace App\Services\Ai;

use App\Models\AgencyProject;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\BoardAutomation;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\ProjectDeliverable;
use App\Models\User;
use App\Models\Workdoc;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;

class AngoraAiService
{
    public function __construct(
        protected AiProviderService $providerService
    ) {}

    /**
     * Retrieve or create conversation for user
     */
    public function getOrCreateConversation(User $user, ?int $conversationId = null, string $contextType = 'general', ?int $contextId = null): AiConversation
    {
        if ($conversationId) {
            $conversation = AiConversation::where('id', $conversationId)
                ->where('user_id', $user->id)
                ->first();
            if ($conversation) {
                return $conversation;
            }
        }

        return AiConversation::create([
            'workspace_id' => $user->current_workspace_id,
            'user_id' => $user->id,
            'title' => 'New Discussion (' . now()->format('M j, g:i A') . ')',
            'context_type' => $contextType,
            'context_id' => $contextId,
        ]);
    }

    /**
     * Gather authorized workspace context without leaking unauthorized data
     */
    public function getAuthorizedContext(User $user, string $contextType = 'general', ?int $contextId = null): array
    {
        $isExternalUser = $user->hasRole('external_user');
        $workspaceId = $user->current_workspace_id;

        // 1. Projects
        $projectsQuery = AgencyProject::query();
        if ($isExternalUser && $user->customer_id) {
            $projectsQuery->where('client_id', $user->customer_id)->where('client_visible', true);
        } else {
            $projectsQuery->where('workspace_id', $workspaceId);
        }
        $projects = $projectsQuery->latest()->take(10)->get(['id', 'title', 'status', 'start_date', 'due_date']);

        // 2. Tasks
        $tasksQuery = KanbanTask::query();
        if ($isExternalUser) {
            $tasksQuery->whereHas('board.workspace', function ($q) use ($workspaceId) {
                $q->where('id', $workspaceId);
            })->where('client_visible', true);
        } else {
            $tasksQuery->whereHas('board.workspace', function ($q) use ($workspaceId) {
                $q->where('id', $workspaceId);
            });
        }
        $tasks = $tasksQuery->latest()->take(15)->get(['id', 'board_id', 'title', 'status_id', 'priority', 'due_date']);

        // 3. Workdocs (Internal vs Client shared)
        $workdocsQuery = Workdoc::query()->where('workspace_id', $workspaceId);
        if ($isExternalUser) {
            $workdocsQuery->where('is_client_shared', true);
        }
        $workdocs = $workdocsQuery->latest()->take(5)->get(['id', 'title', 'is_client_shared']);

        $context = [
            'user_name' => $user->name,
            'user_role' => $user->role ?? 'member',
            'is_client' => $isExternalUser,
            'projects_count' => $projects->count(),
            'tasks_count' => $tasks->count(),
            'projects' => $projects->map(fn($p) => ['id' => $p->id, 'title' => $p->title, 'status' => $p->status])->all(),
            'tasks' => $tasks->map(fn($t) => ['id' => $t->id, 'title' => $t->title, 'priority' => $t->priority])->all(),
        ];

        // Specific Context Details
        if ($contextType === 'task' && $contextId) {
            $task = KanbanTask::with(['subitems', 'comments'])->find($contextId);
            if ($task) {
                $context['focused_task'] = [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'priority' => $task->priority,
                    'subtasks' => $task->subitems->pluck('title')->all(),
                ];
            }
        } elseif ($contextType === 'project' && $contextId) {
            $project = AgencyProject::with('deliverables')->find($contextId);
            if ($project) {
                $context['focused_project'] = [
                    'id' => $project->id,
                    'title' => $project->title,
                    'status' => $project->status,
                    'deliverables' => $project->deliverables->pluck('title')->all(),
                ];
            }
        } elseif ($contextType === 'workdoc' && $contextId) {
            $doc = Workdoc::find($contextId);
            if ($doc) {
                $context['document_content'] = $doc->content;
            }
        }

        return $context;
    }

    /**
     * Send message and get AI response with optional action proposals
     */
    public function sendMessage(AiConversation $conversation, string $userMessageText, User $user): AiMessage
    {
        // 1. Persist User Message
        AiMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $userMessageText,
            'tokens_used' => 0,
        ]);

        // Auto update conversation title if default
        if ($conversation->title === 'New Conversation' || str_starts_with($conversation->title, 'New Discussion')) {
            $conversation->update([
                'title' => substr(trim($userMessageText), 0, 40) . (strlen($userMessageText) > 40 ? '...' : ''),
            ]);
        }

        // 2. Gather context
        $context = $this->getAuthorizedContext($user, $conversation->context_type, $conversation->context_id);

        $systemPrompt = "You are Angora AI, an intelligent work management copilot built inside Angora Work OS. "
            . "You assist teams with agency projects, kanban boards, tasks, workdocs, and automations. "
            . "Always be professional, concise, structured, and helpful. "
            . "Never invent unauthorized data or bypass permissions. "
            . "Authorized User: {$user->name} ({$user->role}). Workspace: {$conversation->workspace_id}.";

        // 3. Complete with AI Provider
        $result = $this->providerService->generateCompletion(
            $systemPrompt,
            $userMessageText,
            $context,
            $user,
            $conversation->context_type,
            $conversation->workspace_id
        );

        // 4. Extract citations if referencing real tasks or projects
        $citations = [];
        foreach ($context['projects'] ?? [] as $p) {
            if (stripos($result['content'], $p['title']) !== false) {
                $citations[] = ['type' => 'project', 'id' => $p['id'], 'title' => $p['title']];
            }
        }
        foreach ($context['tasks'] ?? [] as $t) {
            if (stripos($result['content'], $t['title']) !== false) {
                $citations[] = ['type' => 'task', 'id' => $t['id'], 'title' => $t['title']];
            }
        }

        // 5. Persist Assistant Message with any proposed tool calls
        return AiMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $result['content'],
            'tool_calls' => $result['tool_calls'] ?? null,
            'citations' => count($citations) > 0 ? $citations : null,
            'tokens_used' => $result['tokens_used'] ?? 0,
        ]);
    }

    /**
     * Human-in-the-loop: Approve proposed tasks
     */
    public function approveProposedTasks(User $user, int $boardId, array $tasks, ?int $groupId = null): array
    {
        $board = KanbanBoard::findOrFail($boardId);
        $targetGroup = $groupId 
            ? BoardGroup::where('board_id', $board->id)->findOrFail($groupId)
            : BoardGroup::where('board_id', $board->id)->orderBy('position', 'asc')->first();

        $column = KanbanColumn::where('board_id', $board->id)->first() ?? KanbanColumn::create([
            'board_id' => $board->id,
            'title' => 'To Do',
            'color' => '#579bfc',
            'position' => 0,
        ]);

        $createdTasks = [];

        DB::transaction(function () use ($board, $targetGroup, $column, $tasks, $user, &$createdTasks) {
            foreach ($tasks as $taskData) {
                $task = KanbanTask::create([
                    'board_id' => $board->id,
                    'group_id' => $targetGroup ? $targetGroup->id : null,
                    'column_id' => $column->id,
                    'created_by' => $user->id,
                    'title' => $taskData['title'] ?? 'Untitled AI Task',
                    'description' => $taskData['description'] ?? null,
                    'priority' => $taskData['priority'] ?? 'medium',
                    'assigned_to' => $user->id,
                    'status_id' => 1,
                    'sort_order' => ((int) KanbanTask::where('board_id', $board->id)->max('sort_order')) + 1,
                ]);

                // Subtasks
                if (!empty($taskData['subtasks']) && is_array($taskData['subtasks'])) {
                    foreach ($taskData['subtasks'] as $subIdx => $subTitle) {
                        KanbanTask::create([
                            'board_id' => $board->id,
                            'parent_id' => $task->id,
                            'column_id' => $column->id,
                            'created_by' => $user->id,
                            'group_id' => $targetGroup ? $targetGroup->id : null,
                            'title' => is_array($subTitle) ? ($subTitle['title'] ?? 'Subtask') : $subTitle,
                            'priority' => 'medium',
                            'sort_order' => $subIdx,
                        ]);
                    }
                }

                $createdTasks[] = $task;
            }
        });

        return $createdTasks;
    }

    /**
     * Human-in-the-loop: Approve proposed automation rule
     */
    public function approveProposedAutomation(User $user, int $boardId, array $ruleData): BoardAutomation
    {
        $board = KanbanBoard::findOrFail($boardId);

        return BoardAutomation::create([
            'board_id' => $board->id,
            'name' => $ruleData['name'] ?? 'AI-Generated Automation',
            'trigger_type' => $ruleData['trigger_type'] ?? 'status_changed',
            'trigger_config' => $ruleData['trigger_config'] ?? [],
            'conditions' => $ruleData['conditions'] ?? [],
            'action_type' => $ruleData['action_type'] ?? 'send_notification',
            'action_config' => $ruleData['action_config'] ?? [],
            'is_active' => true,
        ]);
    }
}
