<?php

namespace App\Services;

use App\Models\KanbanTask;
use App\Models\MediaAsset;
use App\Models\MediaUsage;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaAssetService
{
    public const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
    ];

    public const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

    /**
     * Store an uploaded image asset securely.
     */
    public function upload(
        UploadedFile $file,
        ?User $user = null,
        ?int $workspaceId = null,
        ?string $title = null,
        ?string $altText = null,
        ?array $metadata = null
    ): MediaAsset {
        $mime = $file->getMimeType();
        if (!in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new \InvalidArgumentException("Invalid file type: {$mime}. Only JPG, PNG, WEBP, GIF, and SVG images are permitted.");
        }

        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            throw new \InvalidArgumentException("File exceeds maximum allowed size of 10MB.");
        }

        $uuid = (string) Str::uuid();
        $extension = $file->getClientOriginalExtension() ?: 'png';
        $disk = config('filesystems.media_disk', env('MEDIA_DISK', 'public'));
        $fileName = "{$uuid}.{$extension}";
        $filePath = "media/{$fileName}";

        // Calculate dimensions if raster image
        $width = null;
        $height = null;
        if (str_starts_with($mime, 'image/') && $mime !== 'image/svg+xml') {
            $imageInfo = @getimagesize($file->getRealPath());
            if ($imageInfo) {
                $width = $imageInfo[0];
                $height = $imageInfo[1];
            }
        }

        // Store file
        Storage::disk($disk)->putFileAs('media', $file, $fileName);

        return MediaAsset::create([
            'media_uuid' => $uuid,
            'user_id' => $user?->id,
            'workspace_id' => $workspaceId,
            'disk' => $disk,
            'file_path' => $filePath,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $mime,
            'file_size_bytes' => $file->getSize(),
            'width' => $width,
            'height' => $height,
            'title' => $title ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'alt_text' => $altText,
            'metadata' => $metadata ?: [],
        ]);
    }

    /**
     * Get accessible media assets for a workspace with usage count and filtering.
     */
    public function listAssets(?int $workspaceId = null, ?string $search = null, int $perPage = 30)
    {
        $query = MediaAsset::with(['user:id,name,email'])
            ->withCount('usages')
            ->orderByDesc('id');

        if ($workspaceId) {
            $query->where(function ($q) use ($workspaceId) {
                $q->where('workspace_id', $workspaceId)
                  ->orWhereNull('workspace_id');
            });
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('original_filename', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('alt_text', 'like', "%{$search}%");
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Attach a media asset to an entity (Task, Subitem, Comment, etc.).
     */
    public function attach(
        MediaAsset $asset,
        string $attachableType,
        int $attachableId,
        string $fieldName = 'default',
        ?User $user = null
    ): MediaUsage {
        return DB::transaction(function () use ($asset, $attachableType, $attachableId, $fieldName, $user) {
            $usage = MediaUsage::firstOrCreate([
                'media_asset_id' => $asset->id,
                'attachable_type' => $attachableType,
                'attachable_id' => $attachableId,
                'field_name' => $fieldName,
            ], [
                'user_id' => $user?->id,
            ]);

            // If attached to a KanbanTask, log activity
            if ($attachableType === KanbanTask::class || is_subclass_of($attachableType, KanbanTask::class)) {
                $task = KanbanTask::find($attachableId);
                if ($task) {
                    TaskActivityService::log(
                        $task,
                        'image_attached',
                        "Attached image '{$asset->original_filename}'",
                        $fieldName,
                        null,
                        ['media_id' => $asset->id, 'url' => $asset->url, 'filename' => $asset->original_filename],
                        ['media_uuid' => $asset->media_uuid],
                        $user
                    );
                }
            }

            return $usage;
        });
    }

    /**
     * Detach a media asset from an entity without deleting the physical asset.
     */
    public function detach(
        int $mediaAssetId,
        string $attachableType,
        int $attachableId,
        string $fieldName = 'default',
        ?User $user = null
    ): bool {
        return DB::transaction(function () use ($mediaAssetId, $attachableType, $attachableId, $fieldName, $user) {
            $asset = MediaAsset::find($mediaAssetId);
            $deleted = MediaUsage::where('media_asset_id', $mediaAssetId)
                ->where('attachable_type', $attachableType)
                ->where('attachable_id', $attachableId)
                ->where('field_name', $fieldName)
                ->delete();

            if ($deleted && ($attachableType === KanbanTask::class || is_subclass_of($attachableType, KanbanTask::class))) {
                $task = KanbanTask::find($attachableId);
                if ($task && $asset) {
                    TaskActivityService::log(
                        $task,
                        'image_detached',
                        "Removed image '{$asset->original_filename}'",
                        $fieldName,
                        ['media_id' => $asset->id, 'filename' => $asset->original_filename],
                        null,
                        ['media_uuid' => $asset->media_uuid],
                        $user
                    );
                }
            }

            return $deleted > 0;
        });
    }

    /**
     * Safely delete a media asset. Prevents deletion if referenced by other tasks or records.
     */
    public function safeDelete(MediaAsset $asset, bool $force = false): bool
    {
        return DB::transaction(function () use ($asset, $force) {
            $usageCount = $asset->usages()->count();

            if ($usageCount > 0 && !$force) {
                throw new \RuntimeException("Cannot delete image: it is currently referenced in {$usageCount} location(s).");
            }

            if (Storage::disk($asset->disk)->exists($asset->file_path)) {
                Storage::disk($asset->disk)->delete($asset->file_path);
            }

            return $asset->delete();
        });
    }
}
