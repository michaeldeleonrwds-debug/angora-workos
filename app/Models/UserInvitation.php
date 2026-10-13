<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class UserInvitation extends Model
{
    use HasFactory;

    /**
     * Ephemeral raw token populated only upon creation or regeneration.
     */
    public ?string $rawToken = null;

    protected $fillable = [
        'email',
        'token',
        'token_hash',
        'role',
        'workspace_id',
        'board_id',
        'invited_by',
        'expires_at',
        'accepted_at',
        'revoked_at',
    ];

    protected $hidden = [
        'token_hash',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    /**
     * Compute SHA-256 hash of a raw token.
     */
    public static function hashToken(string $rawToken): string
    {
        return hash('sha256', $rawToken);
    }

    /**
     * Securely find an invitation by raw token (checks token_hash first, falls back to legacy token).
     */
    public static function findByRawToken(string $rawToken): ?self
    {
        $hash = self::hashToken($rawToken);

        return self::where('token_hash', $hash)
            ->orWhere('token', $rawToken)
            ->first();
    }

    public static function createInvitation(array $attributes): self
    {
        $rawToken = Str::random(48);

        $invitation = self::create([
            'email' => strtolower(trim($attributes['email'])),
            'token' => $rawToken,
            'token_hash' => self::hashToken($rawToken),
            'role' => $attributes['role'] ?? 'employee',
            'workspace_id' => $attributes['workspace_id'] ?? null,
            'board_id' => $attributes['board_id'] ?? null,
            'invited_by' => $attributes['invited_by'] ?? null,
            'expires_at' => $attributes['expires_at'] ?? now()->addDays(7),
        ]);

        $invitation->rawToken = $rawToken;

        return $invitation;
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
