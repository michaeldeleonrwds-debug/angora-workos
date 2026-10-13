<?php

namespace App\Http\Controllers;

use App\Models\AiConversation;
use App\Models\AiProviderConfig;
use App\Models\AiUsageRecord;
use App\Models\KanbanBoard;
use App\Services\Ai\AiProviderService;
use App\Services\Ai\AngoraAiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Inertia\Inertia;
use Inertia\Response;

class AiController extends Controller
{
    public function __construct(
        protected AngoraAiService $aiService,
        protected AiProviderService $providerService
    ) {}

    /**
     * Dedicated AI Workspace
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $conversations = AiConversation::where('user_id', $user->id)
            ->with(['messages' => fn($q) => $q->latest()->take(1)])
            ->latest()
            ->get();

        $activeConversation = null;
        if ($request->has('conversation_id')) {
            $activeConversation = AiConversation::with('messages')
                ->where('user_id', $user->id)
                ->find($request->query('conversation_id'));
        }

        if (!$activeConversation && $conversations->isNotEmpty()) {
            $activeConversation = AiConversation::with('messages')->find($conversations->first()->id);
        }

        $activeConfig = $this->providerService->getActiveConfig($user->current_workspace_id);
        $startOfMonth = now()->startOfMonth();
        $monthlyTokens = (int) AiUsageRecord::where('user_id', $user->id)
            ->where('created_at', '>=', $startOfMonth)
            ->sum('total_tokens');
        $monthlySpend = (float) AiUsageRecord::where('user_id', $user->id)
            ->where('created_at', '>=', $startOfMonth)
            ->sum('estimated_cost');

        $boards = KanbanBoard::where('workspace_id', $user->current_workspace_id)->get(['id', 'title']);

        return Inertia::render('ai/index', [
            'conversations' => $conversations,
            'activeConversation' => $activeConversation,
            'activeConfig' => $activeConfig ? [
                'provider' => $activeConfig->provider,
                'model' => $activeConfig->model,
                'has_key' => !empty($activeConfig->api_key_encrypted),
                'monthly_token_cap' => $activeConfig->monthly_token_cap,
                'monthly_spend_cap' => $activeConfig->monthly_spend_cap,
            ] : null,
            'usage' => [
                'monthly_tokens' => $monthlyTokens,
                'monthly_spend' => round($monthlySpend, 4),
            ],
            'boards' => $boards,
        ]);
    }

    /**
     * Start new conversation
     */
    public function createConversation(Request $request): JsonResponse
    {
        $user = $request->user();
        $conversation = $this->aiService->getOrCreateConversation(
            $user,
            null,
            $request->input('context_type', 'general'),
            $request->input('context_id')
        );

        return response()->json([
            'success' => true,
            'conversation' => $conversation->load('messages'),
        ]);
    }

    /**
     * Send message to conversation
     */
    public function sendMessage(Request $request, int $conversationId): JsonResponse
    {
        $user = $request->user();
        $conversation = AiConversation::where('id', $conversationId)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $message = $this->aiService->sendMessage($conversation, $validated['message'], $user);

        return response()->json([
            'success' => true,
            'message' => $message,
            'conversation' => $conversation->fresh()->load('messages'),
        ]);
    }

    /**
     * Human-in-the-loop: Approve proposed tasks
     */
    public function approveTasks(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'board_id' => 'required|exists:kanban_boards,id',
            'group_id' => 'nullable|exists:board_groups,id',
            'tasks' => 'required|array|min:1',
        ]);

        $createdTasks = $this->aiService->approveProposedTasks(
            $request->user(),
            $validated['board_id'],
            $validated['tasks'],
            $validated['group_id'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => count($createdTasks) . ' tasks successfully created on the board.',
            'tasks' => $createdTasks,
        ]);
    }

    /**
     * Human-in-the-loop: Approve proposed automation
     */
    public function approveAutomation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'board_id' => 'required|exists:kanban_boards,id',
            'rule' => 'required|array',
        ]);

        $automation = $this->aiService->approveProposedAutomation(
            $request->user(),
            $validated['board_id'],
            $validated['rule']
        );

        return response()->json([
            'success' => true,
            'message' => 'Automation rule activated successfully.',
            'automation' => $automation,
        ]);
    }

    /**
     * Contextual Workdocs Writing Assistant
     */
    public function assistWorkdoc(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'workdoc_id' => 'required|exists:workdocs,id',
            'action' => 'required|in:improve,summarize,fix_grammar,extract_tasks,shorten,expand',
            'selected_text' => 'nullable|string',
        ]);

        $result = $this->providerService->generateCompletion(
            "You are an expert editorial and project documentation assistant in Angora Work OS.",
            "Please perform the action '{$validated['action']}' on the following text: \n\n" . ($validated['selected_text'] ?? ''),
            ['action' => $validated['action']],
            $request->user(),
            'workdoc'
        );

        return response()->json([
            'success' => true,
            'result' => $result,
        ]);
    }

    /**
     * Update AI Provider settings
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => 'required|in:openai,anthropic,gemini,local',
            'model' => 'required|string',
            'api_key' => 'nullable|string',
            'base_url' => 'nullable|string',
            'monthly_token_cap' => 'nullable|integer',
            'monthly_spend_cap' => 'nullable|numeric',
        ]);

        $user = $request->user();

        $config = AiProviderConfig::updateOrCreate(
            ['workspace_id' => $user->current_workspace_id],
            [
                'provider' => $validated['provider'],
                'model' => $validated['model'],
                'api_key_encrypted' => !empty($validated['api_key']) ? Crypt::encryptString($validated['api_key']) : null,
                'base_url' => $validated['base_url'] ?? null,
                'monthly_token_cap' => $validated['monthly_token_cap'] ?? 1000000,
                'monthly_spend_cap' => $validated['monthly_spend_cap'] ?? 50.00,
                'created_by' => $user->id,
                'is_active' => true,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'AI Provider configuration updated successfully.',
            'config' => [
                'provider' => $config->provider,
                'model' => $config->model,
                'has_key' => !empty($config->api_key_encrypted),
                'monthly_token_cap' => $config->monthly_token_cap,
                'monthly_spend_cap' => $config->monthly_spend_cap,
            ],
        ]);
    }
}
