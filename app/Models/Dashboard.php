<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dashboard extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'icon',
        'type',
        'department',
        'project_id',
        'owner_id',
        'visibility',
        'is_favorite',
        'is_default',
        'is_archived',
        'filters',
    ];

    protected $casts = [
        'filters' => 'array',
        'is_favorite' => 'boolean',
        'is_default' => 'boolean',
        'is_archived' => 'boolean',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(AgencyProject::class, 'project_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(DashboardMember::class);
    }

    public function widgets(): HasMany
    {
        return $this->hasMany(DashboardWidget::class)->orderBy('position');
    }
}
