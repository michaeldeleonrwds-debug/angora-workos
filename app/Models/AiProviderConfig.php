<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiProviderConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'provider',
        'model',
        'api_key_encrypted',
        'base_url',
        'is_active',
        'settings',
        'monthly_token_cap',
        'monthly_spend_cap',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
        'monthly_token_cap' => 'integer',
        'monthly_spend_cap' => 'decimal:4',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
