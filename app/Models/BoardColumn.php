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

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }
}
