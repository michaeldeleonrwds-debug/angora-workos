<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BoardGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'board_id',
        'title',
        'color',
        'position',
    ];

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    public function tasks()
    {
        return $this->hasMany(KanbanTask::class, 'group_id')->whereNull('parent_id')->orderBy('position');
    }
}
