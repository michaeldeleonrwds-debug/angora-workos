<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskDependency extends Model
{
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'task_id',
        'depends_on_task_id',
        'dependency_type',
        'relationship_type',
        'lag_days',
        'created_by',
    ];

    protected $casts = [
        'lag_days' => 'integer',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function task()
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function dependencyTask()
    {
        return $this->belongsTo(KanbanTask::class, 'depends_on_task_id');
    }
}
