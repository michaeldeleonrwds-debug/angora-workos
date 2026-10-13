<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkdocVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'workdoc_id',
        'user_id',
        'version_number',
        'summary',
        'content',
    ];

    public function workdoc(): BelongsTo
    {
        return $this->belongsTo(Workdoc::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
