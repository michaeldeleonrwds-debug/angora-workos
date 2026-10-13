<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExternalResourceLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'integration_id',
        'attachable_type',
        'attachable_id',
        'resource_type',
        'external_id',
        'external_title',
        'external_url',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function integration()
    {
        return $this->belongsTo(ThirdPartyIntegration::class, 'integration_id');
    }

    public function attachable()
    {
        return $this->morphTo();
    }
}
