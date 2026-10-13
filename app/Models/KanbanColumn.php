<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KanbanColumn extends Model
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
        return $this->hasMany(KanbanTask::class, 'column_id')->orderBy('position');
    }
}
