<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ThirdPartyIntegration extends Model
{
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'user_id',
        'provider',
        'name',
        'status',
        'credentials_encrypted',
        'account_identifier',
        'sync_settings',
        'last_synced_at',
        'error_log',
    ];

    protected $casts = [
        'sync_settings' => 'array',
        'last_synced_at' => 'datetime',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function resourceLinks()
    {
        return $this->hasMany(ExternalResourceLink::class, 'integration_id');
    }

    public function isConnected(): bool
    {
        return $this->status === 'connected';
    }
}
