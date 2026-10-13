<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormSubmissionValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'submission_id',
        'field_key',
        'field_label',
        'value',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(FormSubmission::class);
    }
}
