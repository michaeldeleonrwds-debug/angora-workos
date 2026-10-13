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
        'estimated_hours',
        'actual_hours',
        'progress',
        'assigned_to',
        'created_by',
        'position',
        'labels',
        'custom_values',
        'is_personal',
        'completed_at',
    ];

    protected $casts = [
        'labels' => 'array',
        'custom_values' => 'array',
        'due_date' => 'date:Y-m-d',
        'start_date' => 'date:Y-m-d',
        'completed_at' => 'datetime',
        'is_personal' => 'boolean',
        'progress' => 'integer',
        'estimated_hours' => 'decimal:2',
        'actual_hours' => 'decimal:2',
    ];

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

    public function recalculateProgressFromSubtasks(): void
    {
        $total = $this->subitems()->count();
        if ($total > 0) {
            $completed = $this->subitems()
                ->where(function ($q) {
                    $q->whereNotNull('completed_at')
                        ->orWhereHas('column', function ($sq) {
                            $sq->whereRaw('LOWER(title) LIKE ?', ['%done%'])
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
}
