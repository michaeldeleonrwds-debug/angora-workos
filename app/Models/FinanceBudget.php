<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinanceBudget extends Model
{
    use HasFactory;

    protected $fillable = [
        'department',
        'fiscal_year',
        'allocated_amount',
        'spent_amount',
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
        'spent_amount' => 'decimal:2',
    ];

    public function getRemainingAmountAttribute(): float
    {
        return (float) ($this->allocated_amount - $this->spent_amount);
    }

    public function getUsagePercentAttribute(): int
    {
        if ($this->allocated_amount <= 0) return 0;
        return (int) min(100, round(($this->spent_amount / $this->allocated_amount) * 100));
    }
}
