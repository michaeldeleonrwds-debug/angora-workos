<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BoardColumn extends Model
{
    use HasFactory;

    protected $fillable = [
        'board_id',
        'key',
        'title',
        'type',
        'scope',
        'config',
        'position',
        'is_visible',
        'width',
    ];

    protected $casts = [
        'config' => 'array',
        'is_visible' => 'boolean',
        'position' => 'integer',
        'width' => 'integer',
    ];

    public function scopeForTasks($query)
    {
        return $query->where(function ($q) {
            $q->where('scope', 'task')->orWhereNull('scope');
        });
    }

    public function scopeForSubtasks($query)
    {
        return $query->where('scope', 'subtask');
    }

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }
}
