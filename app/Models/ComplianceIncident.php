<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComplianceIncident extends Model
{
    use HasFactory;

    protected $fillable = [
        'incident_code',
        'type',
        'severity',
        'reported_by',
        'incident_date',
        'status',
        'summary',
        'resolution_action',
    ];

    protected $casts = [
        'incident_date' => 'date:Y-m-d',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
