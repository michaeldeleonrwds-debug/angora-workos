<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectDeliverable extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'task_id',
        'title',
        'description',
        'file_path',
        'file_url',
        'external_url',
        'version',
        'status',
        'submitted_by',
        'reviewed_by',
        'internal_notes',
        'is_client_visible',
        'approved_for_client_at',
        'client_status',
        'client_feedback',
        'client_reviewed_at',
    ];

    protected $casts = [
        'is_client_visible' => 'boolean',
        'version' => 'integer',
        'approved_for_client_at' => 'datetime',
        'client_reviewed_at' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(AgencyProject::class, 'project_id');
    }

    public function task()
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function submitter()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
