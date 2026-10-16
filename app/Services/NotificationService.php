<?php

namespace App\Services;

use App\Events\NotificationCreatedEvent;
use App\Models\KanbanTask;
use App\Models\NotificationPreference;
use App\Models\SystemNotification;
use App\Models\TaskReviewCycle;
use App\Models\TaskReviewDecision;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class NotificationService
{
    /**
     * Send a notification to a specific user.
     */
    public function notify(
        User|int $recipient,
        string $title,
        string $message,
        string $type = 'info',
        string $category = 'system',
        ?string $link = null,
        ?int $actorId = null,
        ?array $metadata = null
    ): ?SystemNotification {
        $recipientId = $recipient instanceof User ? $recipient->id : (int) $recipient;

        // Never notify self
        if ($actorId && (int) $actorId === (int) $recipientId) {
            return null;
        }

        // Check user preferences
        $preference = NotificationPreference::where('user_id', $recipientId)
            ->where('category', $category)
            ->first();

        if ($preference && !$preference->in_app_enabled) {
            return null;
        }

        $notification = SystemNotification::create([
            'user_id' => $recipientId,
            'actor_id' => $actorId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'category' => $category,
            'link' => $link,
            'metadata' => $metadata,
            'is_read' => false,
        ]);

        try {
            broadcast(new NotificationCreatedEvent($notification));
        } catch (\Throwable $e) {
            Log::debug('Broadcasting notification failed: ' . $e->getMessage());
        }

        try {
            \App\Jobs\SendWebPushNotificationJob::dispatch($notification);
        } catch (\Throwable $e) {
            Log::debug('Dispatching web push job failed: ' . $e->getMessage());
        }

        return $notification;
    }

    /**
     * Generate canonical, safe deep-link for a task notification.
     */
    public static function generateTaskLink(
        KanbanTask $task,
        string $tab = 'updates',
        ?int $targetId = null,
        User|int|null $recipient = null
    ): string {
        $recipientUser = null;
        if ($recipient instanceof User) {
            $recipientUser = $recipient;
        } elseif (is_numeric($recipient)) {
            $recipientUser = User::find($recipient);
        }

        $isClient = $recipientUser && $recipientUser->isClientUser();

        if ($isClient) {
            $params = [
                'item' => $task->id,
                'tab' => $tab === 'updates' ? 'reviews' : $tab,
            ];
            if ($targetId) {
                $params['target_id'] = $targetId;
            }
            return route('client-portal.board', $params);
        }

        $params = [
            'board' => $task->board_id,
            'item' => $task->id,
            'tab' => $tab,
        ];
        if ($targetId) {
            $params['target_id'] = $targetId;
        }

        return '/kanban?' . http_build_query($params);
    }

    /**
     * Notify an assignee when a task is assigned to them.
     */
    public function notifyAssignment(KanbanTask $task, User $assignee, ?User $actor = null): ?SystemNotification
    {
        $actorName = $actor ? $actor->name : 'System';
        return $this->notify(
            recipient: $assignee,
            title: 'Task Assigned: ' . $task->title,
            message: "{$actorName} assigned you to \"{$task->title}\"",
            type: 'info',
            category: 'assignments',
            link: self::generateTaskLink($task, tab: 'updates', recipient: $assignee),
            actorId: $actor?->id,
            metadata: ['task_id' => $task->id, 'board_id' => $task->board_id, 'tab' => 'updates']
        );
    }

    /**
     * Notify a user when they are mentioned in a comment or task description.
     */
    public function notifyMention(KanbanTask $task, User $mentionedUser, User $actor, string $commentExcerpt, ?int $commentId = null): ?SystemNotification
    {
        $excerpt = Str::limit(strip_tags($commentExcerpt), 80);
        return $this->notify(
            recipient: $mentionedUser,
            title: "{$actor->name} mentioned you",
            message: "{$actor->name} mentioned you on \"{$task->title}\": \"{$excerpt}\"",
            type: 'info',
            category: 'mentions',
            link: self::generateTaskLink($task, tab: 'updates', targetId: $commentId, recipient: $mentionedUser),
            actorId: $actor->id,
            metadata: [
                'task_id' => $task->id,
                'board_id' => $task->board_id,
                'tab' => 'updates',
                'comment_id' => $commentId,
                'target_id' => $commentId,
            ]
        );
    }

    /**
     * Notify when a task is submitted for review.
     */
    public function notifyReviewSubmitted(KanbanTask $task, TaskReviewCycle $cycle, User $actor, ?User $reviewer = null): ?SystemNotification
    {
        // If explicit reviewer is designated, notify them; otherwise notify board creator or PM
        $targetUser = $reviewer;
        if (!$targetUser) {
            $board = $task->board;
            if ($board && $board->created_by && (int) $board->created_by !== (int) $actor->id) {
                $targetUser = User::find($board->created_by);
            }
        }

        if (!$targetUser) {
            // Find an admin or project manager
            $targetUser = User::role(['super_admin', 'admin', 'project_manager'])
                ->where('id', '!=', $actor->id)
                ->first();
        }

        if (!$targetUser) {
            return null;
        }

        return $this->notify(
            recipient: $targetUser,
            title: "Review Requested (Round {$cycle->round_number}): {$task->title}",
            message: "{$actor->name} submitted \"{$task->title}\" for review (Round {$cycle->round_number}).",
            type: 'warning',
            category: 'reviews',
            link: self::generateTaskLink($task, tab: 'reviews', targetId: $cycle->id, recipient: $targetUser),
            actorId: $actor->id,
            metadata: [
                'task_id' => $task->id,
                'board_id' => $task->board_id,
                'tab' => 'reviews',
                'review_cycle_id' => $cycle->id,
                'target_id' => $cycle->id,
                'round_number' => $cycle->round_number,
            ]
        );
    }

    /**
     * Notify submitter/assignee when a review decision is made.
     */
    public function notifyReviewDecision(KanbanTask $task, TaskReviewCycle $cycle, TaskReviewDecision $decision, User $actor): ?SystemNotification
    {
        $isApproved = $decision->decision === 'approved';
        $title = $isApproved
            ? "Approved: {$task->title} (Round {$cycle->round_number})"
            : "Revision Requested: {$task->title} (Round {$cycle->round_number})";

        $feedbackExcerpt = $decision->feedback ? Str::limit($decision->feedback, 90) : ($isApproved ? 'All checks passed.' : 'Please revise.');
        $message = "{$actor->name} " . ($isApproved ? 'approved' : 'requested revisions on') . " \"{$task->title}\": \"{$feedbackExcerpt}\"";
        $type = $isApproved ? 'success' : 'danger';

        $recipientId = $cycle->submitted_by;
        if (!$recipientId && $task->assigned_to) {
            $recipientId = $task->assigned_to;
        }

        if (!$recipientId) {
            return null;
        }

        return $this->notify(
            recipient: $recipientId,
            title: $title,
            message: $message,
            type: $type,
            category: 'reviews',
            link: self::generateTaskLink($task, tab: 'reviews', targetId: $decision->id, recipient: $recipientId),
            actorId: $actor->id,
            metadata: [
                'task_id' => $task->id,
                'board_id' => $task->board_id,
                'tab' => 'reviews',
                'review_cycle_id' => $cycle->id,
                'target_id' => $decision->id,
                'decision' => $decision->decision,
                'round_number' => $cycle->round_number,
            ]
        );
    }
}
