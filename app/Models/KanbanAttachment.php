<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KanbanAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'file_name',
        'file_path',
        'file_size_bytes',
        'mime_type',
        'is_client_visible',
        'disk',
        'dimensions',
        'optimized_variants',
        'processing_status',
    ];

    protected $casts = [
        'is_client_visible' => 'boolean',
        'dimensions' => 'array',
        'optimized_variants' => 'array',
    ];

    protected $appends = [
        'url',
    ];

    public function getUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }

        $disk = $this->getStorageDisk();
        if ($disk === 's3') {
            try {
                return \Illuminate\Support\Facades\Storage::disk('s3')->temporaryUrl($this->file_path, now()->addMinutes(60));
            } catch (\Throwable $e) {
                return \Illuminate\Support\Facades\Storage::disk('s3')->url($this->file_path);
            }
        }

        return \Illuminate\Support\Facades\Storage::disk($disk)->url($this->file_path);
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime_type ?? '', 'image/')
            || in_array(strtolower(pathinfo($this->file_name ?? '', PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'webp', 'gif']);
    }

    public function getStorageDisk(): string
    {
        return $this->disk ?: config('filesystems.default', 'public');
    }

    public function task()
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
