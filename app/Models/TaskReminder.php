<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskReminder extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'lead_minutes',
        'scheduled_for',
        'sent_at',
        'status',
    ];

    protected $casts = [
        'lead_minutes' => 'integer',
        'scheduled_for' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
