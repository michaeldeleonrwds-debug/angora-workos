<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_id',
        'submission_token',
        'user_id',
        'client_id',
        'created_task_id',
        'submitter_name',
        'submitter_email',
        'ip_address',
        'status',
    ];

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(SalesCustomer::class, 'client_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(KanbanTask::class, 'created_task_id');
    }

    public function values(): HasMany
    {
        return $this->hasMany(FormSubmissionValue::class, 'submission_id');
    }
}
