<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AutomationExecution extends Model
{
    use HasFactory;

    protected $fillable = [
        'automation_id',
        'board_id',
        'task_id',
        'triggered_by_user_id',
        'trigger_event',
        'status',
        'actions_attempted',
        'actions_succeeded',
        'actions_failed',
        'error_message',
        'execution_duration_ms',
    ];

    protected $casts = [
        'actions_attempted' => 'array',
        'actions_succeeded' => 'array',
        'actions_failed' => 'array',
        'execution_duration_ms' => 'integer',
    ];

    public function automation()
    {
        return $this->belongsTo(BoardAutomation::class, 'automation_id');
    }

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    public function task()
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function triggeredBy()
    {
        return $this->belongsTo(User::class, 'triggered_by_user_id');
    }
}
