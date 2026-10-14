<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskReviewDecision extends Model
{
    use HasFactory;

    protected $fillable = [
        'review_cycle_id',
        'reviewer_id',
        'decision', // approved, revision_requested
        'feedback',
        'attachments',
        'decided_at',
    ];

    protected $casts = [
        'attachments' => 'array',
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
