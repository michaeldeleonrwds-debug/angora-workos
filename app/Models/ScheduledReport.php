<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_id',
        'title',
        'frequency',
        'recipients',
        'format',
        'is_active',
        'last_sent_at',
        'next_run_at',
    ];

    protected $casts = [
        'recipients' => 'array',
        'is_active' => 'boolean',
        'last_sent_at' => 'datetime',
        'next_run_at' => 'datetime',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(AnalyticsReport::class, 'report_id');
    }
}
