<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkdocComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'workdoc_id',
        'user_id',
        'parent_id',
        'comment',
        'is_resolved',
    ];

    protected $casts = [
        'is_resolved' => 'boolean',
    ];

    public function workdoc(): BelongsTo
    {
        return $this->belongsTo(Workdoc::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(WorkdocComment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(WorkdocComment::class, 'parent_id')->orderBy('created_at');
    }
}
