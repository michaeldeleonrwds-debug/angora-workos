<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Throwable;

class SafeBroadcast
{
    /**
     * Safely dispatch a broadcast event.
     * Ensures that any broadcast transport failure (e.g. Reverb server unreachable,
     * cURL connection timeout, socket error) never interrupts business transactions
     * or turns successful database mutations into HTTP 500 errors.
     *
     * @param object $event
     * @return void
     */
    public static function dispatch(object $event): void
    {
        try {
            event($event);
        } catch (Throwable $e) {
            // Strip any sensitive credentials and log a clean warning
            $className = class_basename($event);
            $cleanMessage = preg_replace('/(auth_key|auth_signature|secret|password)=[^&\s]+/i', '$1=***', $e->getMessage());
            Log::warning("[Broadcasting] Transport failure dispatching {$className}: {$cleanMessage}");
        }
    }
}
