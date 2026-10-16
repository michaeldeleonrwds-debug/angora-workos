<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Minishlink\WebPush\Subscription;

class WebPushSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'endpoint',
        'endpoint_hash',
        'public_key',
        'auth_token',
        'content_encoding',
        'device_name',
        'user_agent',
        'last_used_at',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Compute deterministic hash of endpoint for indexed lookup.
     */
    public static function hashEndpoint(string $endpoint): string
    {
        return hash('sha256', trim($endpoint));
    }

    /**
     * Convert to Minishlink WebPush Subscription instance.
     */
    public function toMinishlinkSubscription(): Subscription
    {
        return Subscription::create([
            'endpoint' => $this->endpoint,
            'publicKey' => $this->public_key,
            'authToken' => $this->auth_token,
            'contentEncoding' => $this->content_encoding ?: 'aes128gcm',
        ]);
    }
}
