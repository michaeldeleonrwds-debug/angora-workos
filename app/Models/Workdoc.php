<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workdoc extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'content',
        'folder_name',
        'owner_id',
        'project_id',
        'board_id',
        'task_id',
        'visibility',
        'is_template',
        'template_category',
        'is_archived',
        'is_favorite',
    ];

    protected $casts = [
        'is_template' => 'boolean',
        'is_archived' => 'boolean',
        'is_favorite' => 'boolean',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(AgencyProject::class, 'project_id');
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(WorkdocVersion::class)->orderByDesc('created_at');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(WorkdocComment::class)->whereNull('parent_id')->orderByDesc('created_at');
    }
}
