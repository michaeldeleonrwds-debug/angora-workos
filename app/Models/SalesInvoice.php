<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_code',
        'customer_id',
        'type',
        'subtotal',
        'tax_amount',
        'total_amount',
        'status',
        'issue_date',
        'due_date',
        'items_json',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'issue_date' => 'date:Y-m-d',
        'due_date' => 'date:Y-m-d',
        'items_json' => 'array',
    ];

    public function customer()
    {
        return $this->belongsTo(SalesCustomer::class, 'customer_id');
    }
}
