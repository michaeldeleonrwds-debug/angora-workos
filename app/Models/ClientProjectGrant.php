<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientProjectGrant extends Model
{
    protected $fillable = [
        'project_id',
        'user_id',
        'can_view_tasks',
        'can_approve',
    ];

    protected $casts = [
        'can_view_tasks' => 'boolean',
        'can_approve' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(AgencyProject::class, 'project_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
