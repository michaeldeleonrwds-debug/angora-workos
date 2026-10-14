<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KanbanTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'board_id',
        'column_id',
        'group_id',
        'parent_id',
        'title',
        'description',
        'priority',
        'due_date',
        'due_time',
        'start_date',
        'start_time',
        'estimated_hours',
        'actual_hours',
        'progress',
        'assigned_to',
        'created_by',
        'position',
        'labels',
        'custom_values',
        'is_personal',
        'is_milestone',
        'reminder_lead_minutes',
        'reminder_sent_at',
        'completed_at',
        'recurrence_rule_id',
    ];

    protected $casts = [
        'labels' => 'array',
        'custom_values' => 'array',
        'due_date' => 'date:Y-m-d',
        'start_date' => 'date:Y-m-d',
        'completed_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'is_personal' => 'boolean',
        'is_milestone' => 'boolean',
        'reminder_lead_minutes' => 'integer',
        'progress' => 'integer',
        'estimated_hours' => 'decimal:2',
        'actual_hours' => 'decimal:2',
    ];

    protected $appends = [
        'deadline_status',
        'time_remaining',
        'is_blocked',
    ];

    public function getIsBlockedAttribute(): bool
    {
        if ($this->completed_at !== null || $this->column?->isCompletionStatus()) {
            return false;
        }

        if ($this->column?->isCompletionStatus()) {
            return false;
        }

        $dependencies = $this->relationLoaded('dependencies')
            ? $this->dependencies
            : $this->dependencies()->with('dependencyTask.column')->get();

        foreach ($dependencies as $dep) {
            if ($dep->relationship_type === 'related_to') {
                continue;
            }
            $t = $dep->dependencyTask;
            if ($t) {
                $isDone = $t->completed_at !== null || $t->column?->isCompletionStatus();
                if (!$isDone) {
                    return true;
                }
            }
        }

        return false;
    }

    public function getDueDateAttribute($value)
    {
        return $value ? \Illuminate\Support\Carbon::parse($value)->format('Y-m-d') : null;
    }

    public function getStartDateAttribute($value)
    {
        return $value ? \Illuminate\Support\Carbon::parse($value)->format('Y-m-d') : null;
    }

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    public function column()
    {
        return $this->belongsTo(KanbanColumn::class, 'column_id');
    }

    public function group()
    {
        return $this->belongsTo(BoardGroup::class, 'group_id');
    }

    public function parent()
    {
        return $this->belongsTo(KanbanTask::class, 'parent_id');
    }

    public function subitems()
    {
        return $this->hasMany(KanbanTask::class, 'parent_id')->with(['assignee', 'column'])->orderBy('position');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function comments()
    {
        return $this->hasMany(KanbanComment::class, 'task_id')
            ->whereNull('parent_id')
            ->with(['user', 'replies.user'])
            ->latest();
    }

    public function allComments()
    {
        return $this->hasMany(KanbanComment::class, 'task_id');
    }

    public function attachments()
    {
        return $this->hasMany(KanbanAttachment::class, 'task_id')->with('user')->latest();
    }

    public function mediaUsages()
    {
        return $this->morphMany(MediaUsage::class, 'attachable')->with('mediaAsset');
    }

    public function dependencies()
    {
        return $this->hasMany(TaskDependency::class, 'task_id')->with('dependencyTask');
    }

    public function dependents()
    {
        return $this->hasMany(TaskDependency::class, 'depends_on_task_id')->with('task');
    }

    public function deliverables()
    {
        return $this->hasMany(ProjectDeliverable::class, 'task_id')->latest();
    }

    public function reviewCycles()
    {
        return $this->hasMany(TaskReviewCycle::class, 'task_id')->with(['submitter', 'decisions.reviewer'])->orderBy('round_number', 'asc');
    }

    public function latestReviewCycle()
    {
        return $this->hasOne(TaskReviewCycle::class, 'task_id')->latestOfMany('round_number')->with(['submitter', 'decisions.reviewer']);
    }

    public function recurrenceRule()
    {
        return $this->hasOne(TaskRecurrenceRule::class, 'task_id');
    }

    public function spawnedFromRule()
    {
        return $this->belongsTo(TaskRecurrenceRule::class, 'recurrence_rule_id');
    }

    public function outgoingRelationships()
    {
        return $this->hasMany(BoardItemRelationship::class, 'source_task_id')
            ->with(['targetBoard', 'targetTask.column', 'targetTask.assignee']);
    }

    public function incomingRelationships()
    {
        return $this->hasMany(BoardItemRelationship::class, 'target_task_id')
            ->with(['sourceBoard', 'sourceTask.column', 'sourceTask.assignee']);
    }

    public function activities()
    {
        return $this->hasMany(TaskActivity::class, 'task_id')->with('user')->latest();
    }

    public function reminders()
    {
        return $this->hasMany(TaskReminder::class, 'task_id');
    }

    /**
     * Resolve exact due timestamp in UTC.
     * If due_time is set, parses using user's timezone (or board creator's timezone) and converts to UTC.
     * If date-only, defaults to end of day (23:59:59) in user's timezone.
     */
    public function getDueDateTimeUtc(?string $timezone = null): ?\Illuminate\Support\Carbon
    {
        if (!$this->due_date) {
            return null;
        }

        $userTimezone = $timezone 
            ?? $this->assignee?->timezone 
            ?? auth()->user()?->timezone 
            ?? config('app.timezone', 'UTC');

        if (!in_array($userTimezone, timezone_identifiers_list())) {
            $userTimezone = 'UTC';
        }

        $dateString = is_string($this->due_date) 
            ? $this->due_date 
            : \Illuminate\Support\Carbon::parse($this->due_date)->format('Y-m-d');

        if (!empty($this->due_time)) {
            $timeString = trim($this->due_time);
            // Handle H:i or H:i:s
            if (strlen($timeString) === 5) {
                $timeString .= ':00';
            }
            try {
                return \Illuminate\Support\Carbon::createFromFormat(
                    'Y-m-d H:i:s',
                    "{$dateString} {$timeString}",
                    $userTimezone
                )->setTimezone('UTC');
            } catch (\Throwable $e) {
                // fallback
            }
        }

        // Date-only policy: 23:59:59 in user's timezone converted to UTC
        return \Illuminate\Support\Carbon::createFromFormat(
            'Y-m-d H:i:s',
            "{$dateString} 23:59:59",
            $userTimezone
        )->setTimezone('UTC');
    }

    /**
     * Resolve start timestamp in UTC.
     */
    public function getStartDateTimeUtc(?string $timezone = null): ?\Illuminate\Support\Carbon
    {
        if (!$this->start_date) {
            return null;
        }

        $userTimezone = $timezone 
            ?? $this->assignee?->timezone 
            ?? auth()->user()?->timezone 
            ?? config('app.timezone', 'UTC');

        if (!in_array($userTimezone, timezone_identifiers_list())) {
            $userTimezone = 'UTC';
        }

        $dateString = is_string($this->start_date) 
            ? $this->start_date 
            : \Illuminate\Support\Carbon::parse($this->start_date)->format('Y-m-d');

        if (!empty($this->start_time)) {
            $timeString = trim($this->start_time);
            if (strlen($timeString) === 5) {
                $timeString .= ':00';
            }
            try {
                return \Illuminate\Support\Carbon::createFromFormat(
                    'Y-m-d H:i:s',
                    "{$dateString} {$timeString}",
                    $userTimezone
                )->setTimezone('UTC');
            } catch (\Throwable $e) {
                // fallback
            }
        }

        return \Illuminate\Support\Carbon::createFromFormat(
            'Y-m-d H:i:s',
            "{$dateString} 00:00:00",
            $userTimezone
        )->setTimezone('UTC');
    }

    /**
     * Calculate deadline status:
     * - 'completed_on_time'
     * - 'completed_late'
     * - 'overdue'
     * - 'due_today'
     * - 'due_soon' (within next 48 hours)
     * - 'upcoming'
     * - 'no_deadline'
     */
    public function getDeadlineStatusAttribute(): string
    {
        if (!$this->due_date) {
            return 'no_deadline';
        }

        $dueUtc = $this->getDueDateTimeUtc();
        if (!$dueUtc) {
            return 'no_deadline';
        }

        $now = now()->setTimezone('UTC');

        // Check if completed
        $isCompleted = !empty($this->completed_at) || $this->column?->isCompletionStatus();
        if ($isCompleted) {
            $completedAt = $this->completed_at ? \Illuminate\Support\Carbon::parse($this->completed_at)->setTimezone('UTC') : $now;
            return $completedAt->lte($dueUtc) ? 'completed_on_time' : 'completed_late';
        }

        if ($now->gt($dueUtc)) {
            return 'overdue';
        }

        // User's calendar date comparison for "due today"
        $userTz = auth()->user()?->timezone ?? $this->assignee?->timezone ?? 'UTC';
        if (!in_array($userTz, timezone_identifiers_list())) {
            $userTz = 'UTC';
        }

        $userToday = now($userTz)->format('Y-m-d');
        $taskDueDate = is_string($this->due_date) 
            ? $this->due_date 
            : \Illuminate\Support\Carbon::parse($this->due_date)->format('Y-m-d');

        if ($taskDueDate === $userToday || $now->diffInHours($dueUtc, false) <= 24) {
            return 'due_today';
        }

        // Within next 48 hours
        if ($now->diffInHours($dueUtc, false) <= 48) {
            return 'due_soon';
        }

        return 'upcoming';
    }

    /**
     * Exact human-readable remaining time to deadline (or overdue duration).
     */
    public function getTimeRemainingAttribute(): ?string
    {
        if (!$this->due_date) {
            return null;
        }

        $dueUtc = $this->getDueDateTimeUtc();
        if (!$dueUtc) {
            return null;
        }

        $now = now()->setTimezone('UTC');

        // Check if completed
        $isCompleted = !empty($this->completed_at) || $this->column?->isCompletionStatus();
        if ($isCompleted) {
            $completedAt = $this->completed_at ? \Illuminate\Support\Carbon::parse($this->completed_at)->setTimezone('UTC') : $now;
            return $completedAt->lte($dueUtc) ? 'Completed On Time' : 'Completed Late';
        }

        $isOverdue = $now->gt($dueUtc);
        $diffMinutes = (int) abs($now->diffInMinutes($dueUtc, false));
        $hours = intdiv($diffMinutes, 60);
        $minutes = $diffMinutes % 60;
        $days = intdiv($hours, 24);
        $remHours = $hours % 24;

        if ($days > 0) {
            $formatted = $remHours > 0 ? "{$days}d {$remHours}h" : "{$days}d";
        } elseif ($hours > 0) {
            $formatted = $minutes > 0 ? "{$hours}h {$minutes}m" : "{$hours}h";
        } elseif ($diffMinutes > 0) {
            $formatted = "{$diffMinutes}m";
        } else {
            $formatted = "< 1m";
        }

        return $isOverdue ? "Overdue by {$formatted}" : "Due in {$formatted}";
    }

    public function recalculateProgressFromSubtasks(): void
    {
        $total = $this->subitems()->count();
        if ($total > 0) {
            $completed = $this->subitems()
                ->where(function ($q) {
                    $q->whereNotNull('completed_at')
                        ->orWhereHas('column', function ($sq) {
                            $sq->where('semantic_category', 'completed')
                                ->orWhereRaw('LOWER(title) LIKE ?', ['%done%'])
                                ->orWhereRaw('LOWER(title) LIKE ?', ['%completed%']);
                        });
                })->count();

            $newProgress = (int) round(($completed / $total) * 100);
            $this->update([
                'progress' => $newProgress,
                'completed_at' => $newProgress === 100 ? ($this->completed_at ?? now()) : null,
            ]);
        }
    }

    public function applyWorkflowStatus(KanbanColumn $status): void
    {
        $this->column_id = $status->id;
        $this->completed_at = $status->isCompletionStatus()
            ? ($this->completed_at ?? now())
            : null;
    }

    /**
     * Check if a specific user is assigned to this task (directly or via people custom values).
     */
    public function isAssignedTo($user): bool
    {
        if (!$user) {
            return false;
        }

        $userId = $user instanceof User ? $user->id : (int) $user;
        if ($userId <= 0) {
            return false;
        }

        if ((int) $this->assigned_to === $userId) {
            return true;
        }

        if (is_array($this->custom_values)) {
            foreach ($this->custom_values as $key => $val) {
                // Do not treat Account Manager or client columns as designer assignment
                if (in_array(strtolower((string) $key), ['account_manager', 'am', 'client', 'client_id'], true)) {
                    continue;
                }
                if (is_array($val)) {
                    if (in_array($userId, array_map('intval', $val), true)) {
                        return true;
                    }
                } elseif (is_numeric($val) && (int) $val === $userId) {
                    return true;
                }
            }
        }

        if ($this->parent_id && $this->parent) {
            if ($this->parent->isAssignedTo($userId) || (int) $this->created_by === $userId) {
                return true;
            }
        }

        if ($this->relationLoaded('subitems') && $this->subitems) {
            foreach ($this->subitems as $subitem) {
                if ($subitem->isAssignedTo($userId)) {
                    return true;
                }
            }
        }

        return false;
    }
}
