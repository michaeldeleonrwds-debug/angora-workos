<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OperationsWorkflow extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'department',
        'priority',
        'status',
        'requested_by',
        'assigned_to',
        'description',
        'resolution_details',
        'due_date',
    ];

    protected $casts = [
        'due_date' => 'date:Y-m-d',
    ];

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
