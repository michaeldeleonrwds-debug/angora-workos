<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WebhookSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'created_by',
        'name',
        'url',
        'secret',
        'events',
        'is_active',
        'failure_count',
    ];

    protected $casts = [
        'events' => 'array',
        'is_active' => 'boolean',
        'failure_count' => 'integer',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function deliveries()
    {
        return $this->hasMany(WebhookDelivery::class, 'subscription_id')->latest();
    }

    public function subscribesTo(string $event): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $events = $this->events ?? [];

        return in_array('*', $events, true) || in_array($event, $events, true);
    }
}
