<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskRecurrenceLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'recurrence_rule_id',
        'source_task_id',
        'generated_task_id',
        'executed_at',
        'status',
        'notes',
    ];

    protected $casts = [
        'executed_at' => 'datetime',
    ];

    public function rule(): BelongsTo
    {
        return $this->belongsTo(TaskRecurrenceRule::class, 'recurrence_rule_id');
    }

    public function sourceTask(): BelongsTo
    {
        return $this->belongsTo(KanbanTask::class, 'source_task_id');
    }

    public function generatedTask(): BelongsTo
    {
        return $this->belongsTo(KanbanTask::class, 'generated_task_id');
    }
}
