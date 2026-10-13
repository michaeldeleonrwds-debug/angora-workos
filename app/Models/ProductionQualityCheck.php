<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionQualityCheck extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id',
        'inspector_id',
        'sample_size',
        'defect_count',
        'status',
        'checklist_data',
        'notes',
        'inspected_at',
    ];

    protected $casts = [
        'checklist_data' => 'array',
        'inspected_at' => 'datetime',
    ];

    public function workOrder()
    {
        return $this->belongsTo(ProductionWorkOrder::class, 'work_order_id');
    }

    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }
}
