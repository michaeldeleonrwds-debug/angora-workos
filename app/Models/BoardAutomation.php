<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BoardAutomation extends Model
{
    use HasFactory;

    protected $fillable = [
        'board_id',
        'name',
        'description',
        'trigger_type',
        'trigger_config',
        'conditions',
        'actions',
        'is_active',
        'created_by',
        'execution_count',
        'last_executed_at',
    ];

    protected $casts = [
        'trigger_config' => 'array',
        'conditions' => 'array',
        'actions' => 'array',
        'is_active' => 'boolean',
        'execution_count' => 'integer',
        'last_executed_at' => 'datetime',
    ];

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function executions()
    {
        return $this->hasMany(AutomationExecution::class, 'automation_id')->latest();
    }
}
