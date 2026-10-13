<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinanceTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'party_name',
        'invoice_ref',
        'amount',
        'due_date',
        'status',
        'paid_date',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date:Y-m-d',
        'paid_date' => 'date:Y-m-d',
    ];
}
