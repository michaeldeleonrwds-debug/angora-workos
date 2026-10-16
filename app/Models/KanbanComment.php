<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KanbanComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'parent_id',
        'user_id',
        'message',
        'reactions',
        'is_client_visible',
    ];

    protected $casts = [
        'reactions' => 'array',
        'is_client_visible' => 'boolean',
    ];

    public function task()
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function parent()
    {
        return $this->belongsTo(KanbanComment::class, 'parent_id');
    }

    public function replies()
    {
        return $this->hasMany(KanbanComment::class, 'parent_id')->with('user')->oldest();
    }
}
