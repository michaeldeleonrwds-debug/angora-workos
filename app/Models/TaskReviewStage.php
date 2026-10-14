<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskReviewStage extends Model
{
    use HasFactory;

    protected $fillable = [
        'review_cycle_id',
        'stage_index',
        'name',
        'required_role',
        'status',
        'reviewer_id',
        'feedback',
        'decided_at',
    ];

    protected $casts = [
        'stage_index' => 'integer',
        'decided_at' => 'datetime',
    ];

    public function cycle()
    {
        return $this->belongsTo(TaskReviewCycle::class, 'review_cycle_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
