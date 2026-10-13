<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WebhookDelivery extends Model
{
    use HasFactory;

    protected $fillable = [
        'subscription_id',
        'event',
        'payload',
        'status_code',
        'response_body',
        'attempts',
        'is_successful',
        'error_message',
    ];

    protected $casts = [
        'payload' => 'array',
        'status_code' => 'integer',
        'attempts' => 'integer',
        'is_successful' => 'boolean',
    ];

    public function subscription()
    {
        return $this->belongsTo(WebhookSubscription::class, 'subscription_id');
    }
}
