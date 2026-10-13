<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IncomingWebhookLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'source',
        'event',
        'idempotency_key',
        'payload',
        'status',
    ];

    protected $casts = [
        'payload' => 'array',
    ];
}
