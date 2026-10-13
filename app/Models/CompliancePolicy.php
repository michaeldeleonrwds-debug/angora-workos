<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompliancePolicy extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'policy_code',
        'category',
        'version',
        'effective_date',
        'status',
        'description',
    ];

    protected $casts = [
        'effective_date' => 'date',
    ];
}
