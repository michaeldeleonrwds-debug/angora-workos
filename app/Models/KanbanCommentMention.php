<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KanbanCommentMention extends Model
{
    use HasFactory;

    protected $fillable = [
        'comment_id',
        'user_id',
        'task_id',
    ];

    public function comment()
    {
        return $this->belongsTo(KanbanComment::class, 'comment_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function task()
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }
}
