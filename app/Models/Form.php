<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Form extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'title',
        'description',
        'category',
        'board_id',
        'project_id',
        'owner_id',
        'visibility',
        'is_published',
        'is_archived',
        'success_message',
        'settings',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'is_archived' => 'boolean',
        'settings' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($form) {
            if (empty($form->uuid)) {
                $form->uuid = (string) Str::uuid();
            }
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(AgencyProject::class, 'project_id');
    }

    public function fields(): HasMany
    {
        return $this->hasMany(FormField::class)->orderBy('position');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(FormSubmission::class)->orderByDesc('created_at');
    }
}
