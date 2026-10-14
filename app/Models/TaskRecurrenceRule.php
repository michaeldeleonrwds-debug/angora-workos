<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskRecurrenceRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'workspace_id',
        'frequency',
        'interval',
        'days_of_week',
        'time_of_day',
        'end_type',
        'max_occurrences',
        'occurrences_count',
        'end_date',
        'next_run_at',
        'last_run_at',
        'is_active',
        'copy_subtasks',
        'copy_assignees',
        'copy_custom_values',
        'created_by',
    ];

    protected $casts = [
        'days_of_week' => 'array',
        'interval' => 'integer',
        'max_occurrences' => 'integer',
        'occurrences_count' => 'integer',
        'end_date' => 'date:Y-m-d',
        'next_run_at' => 'datetime',
        'last_run_at' => 'datetime',
        'is_active' => 'boolean',
        'copy_subtasks' => 'boolean',
        'copy_assignees' => 'boolean',
        'copy_custom_values' => 'boolean',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(TaskRecurrenceLog::class, 'recurrence_rule_id')->latest();
    }

    public function spawnedTasks(): HasMany
    {
        return $this->hasMany(KanbanTask::class, 'recurrence_rule_id')->latest();
    }
}
