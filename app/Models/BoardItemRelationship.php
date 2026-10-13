<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BoardItemRelationship extends Model
{
    use HasFactory;

    protected $fillable = [
        'source_board_id',
        'source_task_id',
        'target_board_id',
        'target_task_id',
        'column_key',
        'relation_type',
        'created_by',
    ];

    public function sourceBoard()
    {
        return $this->belongsTo(KanbanBoard::class, 'source_board_id');
    }

    public function sourceTask()
    {
        return $this->belongsTo(KanbanTask::class, 'source_task_id');
    }

    public function targetBoard()
    {
        return $this->belongsTo(KanbanBoard::class, 'target_board_id');
    }

    public function targetTask()
    {
        return $this->belongsTo(KanbanTask::class, 'target_task_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
