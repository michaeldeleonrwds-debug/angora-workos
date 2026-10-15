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
        'semantic_category',
        'stage_key',
        'stage_role',
        'exclude_from_metrics',
        'is_default',
        'is_archived',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_archived' => 'boolean',
        'exclude_from_metrics' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $column) {
            if (!$column->semantic_category) {
                $column->semantic_category = self::categoryForLegacyLabel($column->title);
            }
        });
    }

    public static function categoryForLegacyLabel(string $title): string
    {
        return match (strtolower(trim($title))) {
            'done', 'completed', 'complete', 'delivered' => 'completed',
            'for review', 'review', 'in review', 'needs revision' => 'in_review',
            'hold', 'blocked', 'on hold' => 'blocked',
            'working on it', 'in progress', 'progress' => 'in_progress',
            'cancelled', 'canceled' => 'cancelled',
            default => 'not_started',
        };
    }

    public function isCompletionStatus(): bool
    {
        return $this->semantic_category === 'completed';
    }

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    public function tasks()
    {
        return $this->hasMany(KanbanTask::class, 'column_id')->orderBy('position');
    }
}
