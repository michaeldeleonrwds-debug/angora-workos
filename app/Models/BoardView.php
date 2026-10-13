<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BoardView extends Model
{
    use HasFactory;

    protected $fillable = [
        'board_id',
        'name',
        'type',
        'is_default',
        'settings',
        'position',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'settings' => 'array',
        'position' => 'integer',
    ];

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }
}
