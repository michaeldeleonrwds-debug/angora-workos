<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OperationsTicket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'service_type',
        'requested_by',
        'department',
        'priority',
        'status',
        'sla_due_at',
        'details',
    ];

    protected $casts = [
        'sla_due_at' => 'datetime',
    ];

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
