<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskReviewCycle extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'round_number',
        'submitted_by',
        'state', // pending, approved, revision_requested
        'total_stages',
        'current_stage_index',
        'notes',
        'submitted_at',
        'resolved_at',
    ];

    protected $casts = [
        'round_number' => 'integer',
        'total_stages' => 'integer',
        'current_stage_index' => 'integer',
        'submitted_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function submitter()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function stages()
    {
        return $this->hasMany(TaskReviewStage::class, 'review_cycle_id')->orderBy('stage_index', 'asc');
    }

    public function currentStage()
    {
        return $this->hasOne(TaskReviewStage::class, 'review_cycle_id')
            ->where('stage_index', $this->current_stage_index ?? 1);
    }

    public function decisions()
    {
        return $this->hasMany(TaskReviewDecision::class, 'review_cycle_id')->orderBy('created_at', 'asc');
    }

    public function latestDecision()
    {
        return $this->hasOne(TaskReviewDecision::class, 'review_cycle_id')->latestOfMany();
    }
}
