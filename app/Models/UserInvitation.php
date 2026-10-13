<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class UserInvitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'token',
        'role',
        'workspace_id',
        'board_id',
        'invited_by',
        'expires_at',
        'accepted_at',
        'revoked_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public static function createInvitation(array $attributes): self
    {
        return self::create([
            'email' => strtolower(trim($attributes['email'])),
            'token' => Str::random(48),
            'role' => $attributes['role'] ?? 'employee',
            'workspace_id' => $attributes['workspace_id'] ?? null,
            'board_id' => $attributes['board_id'] ?? null,
            'invited_by' => $attributes['invited_by'] ?? null,
            'expires_at' => $attributes['expires_at'] ?? now()->addDays(7),
        ]);
    }

    public function isPending(): bool
    {
        return is_null($this->accepted_at) && is_null($this->revoked_at) && $this->expires_at->isFuture();
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isRevoked(): bool
    {
        return !is_null($this->revoked_at);
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }
}
