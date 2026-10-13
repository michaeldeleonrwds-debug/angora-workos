<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOsTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'type', // board, project, task, workdoc
        'category', // website_development, graphic_design, marketing_campaign, client_onboarding, general
        'created_by',
        'is_system_template',
        'icon',
        'color',
        'content_schema',
    ];

    protected $casts = [
        'is_system_template' => 'boolean',
        'content_schema' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
