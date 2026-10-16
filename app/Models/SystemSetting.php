<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

class SystemSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'group',
        'value',
        'is_encrypted',
        'description',
        'updated_by',
    ];

    protected $casts = [
        'is_encrypted' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get a setting value, decrypting if necessary.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        if (!$setting || $setting->value === null) {
            return $default;
        }

        if ($setting->is_encrypted) {
            try {
                return Crypt::decryptString($setting->value);
            } catch (\Throwable $e) {
                Log::error("Failed to decrypt SystemSetting '{$key}': " . $e->getMessage());
                return $default;
            }
        }

        // Try JSON decode if applicable
        $decoded = json_decode($setting->value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $setting->value;
    }

    /**
     * Set a setting value, encrypting if specified.
     */
    public static function set(string $key, mixed $value, string $group = 'general', bool $isEncrypted = false, ?int $userId = null, ?string $description = null): static
    {
        $serializedValue = is_array($value) ? json_encode($value) : (string) $value;

        if ($isEncrypted && $serializedValue !== '') {
            $serializedValue = Crypt::encryptString($serializedValue);
        }

        return static::updateOrCreate(
            ['key' => $key],
            [
                'group' => $group,
                'value' => $serializedValue,
                'is_encrypted' => $isEncrypted,
                'description' => $description,
                'updated_by' => $userId ?? auth()->id(),
            ]
        );
    }
}
