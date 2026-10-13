<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnalyticsReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'report_type',
        'config',
        'created_by',
    ];

    protected $casts = [
        'config' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(ScheduledReport::class, 'report_id');
    }
}
