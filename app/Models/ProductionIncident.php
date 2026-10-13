<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionIncident extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id',
        'title',
        'machine_line',
        'severity',
        'reported_by',
        'status',
        'description',
        'corrective_action',
    ];

    public function workOrder()
    {
        return $this->belongsTo(ProductionWorkOrder::class, 'work_order_id');
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
