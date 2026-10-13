<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'department',
        'action',
        'entity_type',
        'entity_id',
        'description',
        'payload',
        'ip_address',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function log(string $action, ?string $department = null, ?string $entityType = null, ?int $entityId = null, ?string $description = null, ?array $payload = null): self
    {
        return self::create([
            'user_id' => auth()->id(),
            'department' => $department ?? auth()->user()?->department ?? 'General',
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'description' => $description,
            'payload' => $payload,
            'ip_address' => request()->ip(),
        ]);
    }
}
