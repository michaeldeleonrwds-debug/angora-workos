<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionWorkOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_no',
        'product_title',
        'batch_number',
        'quantity',
        'completed_quantity',
        'status',
        'priority',
        'start_date',
        'target_date',
        'assigned_unit',
        'supervisor_id',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'target_date' => 'date:Y-m-d',
    ];

    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function qualityChecks()
    {
        return $this->hasMany(ProductionQualityCheck::class, 'work_order_id');
    }

    public function incidents()
    {
        return $this->hasMany(ProductionIncident::class, 'work_order_id');
    }

    public function getProgressPercentAttribute(): int
    {
        if ($this->quantity <= 0) return 0;
        return (int) min(100, round(($this->completed_quantity / $this->quantity) * 100));
    }
}
