<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesLead extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'title',
        'deal_value',
        'stage',
        'probability',
        'expected_close_date',
        'assigned_to',
        'notes',
    ];

    protected $casts = [
        'deal_value' => 'decimal:2',
        'expected_close_date' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(SalesCustomer::class, 'customer_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
