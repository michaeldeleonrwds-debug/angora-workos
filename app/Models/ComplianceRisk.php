<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComplianceRisk extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'category',
        'likelihood',
        'impact',
        'risk_score',
        'mitigation_strategy',
        'status',
        'owner_id',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
