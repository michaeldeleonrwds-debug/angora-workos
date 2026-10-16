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
        'is_system',
        'is_hidden',
        'settings',
        'position',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_system' => 'boolean',
        'is_hidden' => 'boolean',
        'settings' => 'array',
        'position' => 'integer',
    ];

    public function scopeVisible($query)
    {
        return $query->where('is_hidden', false);
    }

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }
}
