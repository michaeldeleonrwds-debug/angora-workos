<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class MediaAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'media_uuid',
        'user_id',
        'workspace_id',
        'disk',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size_bytes',
        'width',
        'height',
        'title',
        'alt_text',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'file_size_bytes' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        if ($this->disk === 's3') {
            try {
                return Storage::disk('s3')->temporaryUrl($this->file_path, now()->addMinutes(60));
            } catch (\Throwable $e) {
                return Storage::disk('s3')->url($this->file_path);
            }
        }

        return Storage::disk($this->disk)->url($this->file_path);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    public function usages()
    {
        return $this->hasMany(MediaUsage::class, 'media_asset_id');
    }
}
