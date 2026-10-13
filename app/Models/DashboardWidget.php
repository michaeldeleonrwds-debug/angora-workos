<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DashboardWidget extends Model
{
    use HasFactory;

    protected $fillable = [
        'dashboard_id',
        'title',
        'type', // numbers, battery, chart, workload, timeline, calendar, task_list, activity
        'config',
        'layout',
        'position',
    ];

    protected $casts = [
        'config' => 'array',
        'layout' => 'array',
        'position' => 'integer',
    ];

    public function dashboard(): BelongsTo
    {
        return $this->belongsTo(Dashboard::class);
    }
}
