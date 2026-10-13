<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KanbanBoard extends Model
{
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'title',
        'description',
        'department',
        'folder_name',
        'visibility',
        'is_favorite',
        'is_template',
        'settings',
        'created_by',
    ];

    protected $casts = [
        'is_favorite' => 'boolean',
        'is_template' => 'boolean',
        'settings' => 'array',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members()
    {
        return $this->hasMany(BoardMember::class, 'board_id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'board_members', 'board_id', 'user_id')->withPivot('role')->withTimestamps();
    }

    public function columns()
    {
        return $this->hasMany(KanbanColumn::class, 'board_id')->orderBy('position');
    }

    public function groups()
    {
        return $this->hasMany(BoardGroup::class, 'board_id')->orderBy('position');
    }

    public function boardColumns()
    {
        return $this->hasMany(BoardColumn::class, 'board_id')
            ->where(function ($q) {
                $q->where('scope', 'task')->orWhereNull('scope');
            })
            ->orderBy('position');
    }

    public function subitemColumns()
    {
        return $this->hasMany(BoardColumn::class, 'board_id')
            ->where('scope', 'subtask')
            ->orderBy('position');
    }

    public function allBoardColumns()
    {
        return $this->hasMany(BoardColumn::class, 'board_id')->orderBy('position');
    }

    public function views()
    {
        return $this->hasMany(BoardView::class, 'board_id')->orderBy('position');
    }

    public function tasks()
    {
        return $this->hasMany(KanbanTask::class, 'board_id');
    }

    public function automations()
    {
        return $this->hasMany(BoardAutomation::class, 'board_id')->latest();
    }

    public function automationExecutions()
    {
        return $this->hasMany(AutomationExecution::class, 'board_id')->latest();
    }

    public function project()
    {
        return $this->hasOne(AgencyProject::class, 'board_id');
    }
}
