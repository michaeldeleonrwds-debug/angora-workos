<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ApiToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'workspace_id',
        'name',
        'token_hash',
        'token_prefix',
        'scopes',
        'last_used_at',
        'last_used_ip',
        'expires_at',
        'is_revoked',
    ];

    protected $casts = [
        'scopes' => 'array',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_revoked' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function requestLogs()
    {
        return $this->hasMany(ApiRequestLog::class);
    }

    public static function createToken(User $user, string $name, ?array $scopes = ['*'], ?Carbon $expiresAt = null, ?int $workspaceId = null): array
    {
        $entropy = Str::random(40);
        $prefix = 'angora_' . Str::random(6);
        $plainTextToken = "{$prefix}_{$entropy}";
        $hash = hash('sha256', $plainTextToken);

        $tokenModel = self::create([
            'user_id' => $user->id,
            'workspace_id' => $workspaceId ?? $user->current_workspace_id,
            'name' => $name,
            'token_hash' => $hash,
            'token_prefix' => $prefix,
            'scopes' => $scopes ?: ['*'],
            'expires_at' => $expiresAt,
            'is_revoked' => false,
        ]);

        return [
            'plain_text_token' => $plainTextToken,
            'token' => $tokenModel,
        ];
    }

    public function hasScope(string $scope): bool
    {
        if ($this->is_revoked) {
            return false;
        }

        $scopes = $this->scopes ?? ['*'];

        if (in_array('*', $scopes, true)) {
            return true;
        }

        return in_array($scope, $scopes, true);
    }

    public function isValid(): bool
    {
        if ($this->is_revoked) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }
}
