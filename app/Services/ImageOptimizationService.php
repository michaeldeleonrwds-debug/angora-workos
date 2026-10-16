<?php

namespace App\Services;

use App\Models\KanbanAttachment;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;

class ImageOptimizationService
{
    private ?ImageManager $manager = null;

    public function __construct()
    {
        if (extension_loaded('imagick')) {
            $this->manager = new ImageManager(new ImagickDriver());
        } elseif (extension_loaded('gd') && function_exists('imagecreatetruecolor')) {
            $this->manager = new ImageManager(new GdDriver());
        }
    }

    /**
     * Optimize an attachment's image, generating WebP variants while preserving the original.
     *
     * @param KanbanAttachment $attachment
     * @return array{dimensions: array, variants: array, status: string}
     */
    public function optimize(KanbanAttachment $attachment): array
    {
        $diskName = $attachment->getStorageDisk();
        $disk = Storage::disk($diskName);

        if (!$disk->exists($attachment->file_path)) {
            if ($diskName !== 'public' && Storage::disk('public')->exists($attachment->file_path)) {
                $disk = Storage::disk('public');
                $diskName = 'public';
            } else {
                return [
                    'dimensions' => [],
                    'variants' => [],
                    'status' => 'failed',
                ];
            }
        }

        if (!$attachment->isImage()) {
            return [
                'dimensions' => [],
                'variants' => [],
                'status' => 'ready',
            ];
        }

        $rawContents = $disk->get($attachment->file_path);
        if (!$rawContents) {
            return [
                'dimensions' => [],
                'variants' => [],
                'status' => 'failed',
            ];
        }

        // 1. Inspect image dimensions using standard PHP getimagesize (works even without GD/Imagick)
        $dimensions = [];
        $imageInfo = @getimagesizefromstring($rawContents);
        if ($imageInfo) {
            $dimensions = [
                'width' => (int) $imageInfo[0],
                'height' => (int) $imageInfo[1],
                'mime' => $imageInfo['mime'] ?? $attachment->mime_type,
            ];
        }

        // 2. If no image driver is available, fallback safely with original asset reference
        if (!$this->manager) {
            Log::info("ImageOptimizationService: No GD or Imagick driver available. Preserving original file without transcoding.");
            $variants = [
                'original' => $attachment->file_path,
                'thumbnail' => $attachment->file_path,
                'card' => $attachment->file_path,
                'preview' => $attachment->file_path,
            ];

            $attachment->update([
                'dimensions' => $dimensions,
                'optimized_variants' => $variants,
                'processing_status' => 'ready',
            ]);

            return [
                'dimensions' => $dimensions,
                'variants' => $variants,
                'status' => 'ready',
            ];
        }

        try {
            $image = $this->manager->read($rawContents);
            $origWidth = $image->width();
            $origHeight = $image->height();
            $dimensions = [
                'width' => $origWidth,
                'height' => $origHeight,
                'mime' => $attachment->mime_type,
            ];

            $baseDir = dirname($attachment->file_path);
            $filenameWithoutExt = pathinfo($attachment->file_path, PATHINFO_FILENAME);
            $variantsDir = ($baseDir === '.' ? '' : $baseDir . '/') . 'variants/' . $filenameWithoutExt;

            $variants = [
                'original' => $attachment->file_path,
            ];

            // A. Thumbnail (320px width max)
            $thumbWidth = min(320, $origWidth);
            $thumbImage = clone $image;
            $thumbImage->scaleDown(width: $thumbWidth);
            $thumbWebp = $thumbImage->toWebp(quality: 80);
            $thumbPath = $variantsDir . '_thumb.webp';
            $disk->put($thumbPath, (string) $thumbWebp);
            $variants['thumbnail'] = $thumbPath;

            // B. Card Preview (800px width max)
            $cardWidth = min(800, $origWidth);
            $cardImage = clone $image;
            $cardImage->scaleDown(width: $cardWidth);
            $cardWebp = $cardImage->toWebp(quality: 82);
            $cardPath = $variantsDir . '_card.webp';
            $disk->put($cardPath, (string) $cardWebp);
            $variants['card'] = $cardPath;

            // C. Full Preview (2560px width max)
            $previewWidth = min(2560, $origWidth);
            $previewImage = clone $image;
            $previewImage->scaleDown(width: $previewWidth);
            $previewWebp = $previewImage->toWebp(quality: 85);
            $previewPath = $variantsDir . '_preview.webp';
            $disk->put($previewPath, (string) $previewWebp);
            $variants['preview'] = $previewPath;

            $attachment->update([
                'dimensions' => $dimensions,
                'optimized_variants' => $variants,
                'processing_status' => 'ready',
            ]);

            return [
                'dimensions' => $dimensions,
                'variants' => $variants,
                'status' => 'ready',
            ];
        } catch (\Throwable $e) {
            Log::warning("ImageOptimizationService failed on attachment #{$attachment->id}: " . $e->getMessage());

            $variants = [
                'original' => $attachment->file_path,
                'thumbnail' => $attachment->file_path,
                'card' => $attachment->file_path,
                'preview' => $attachment->file_path,
            ];

            $attachment->update([
                'dimensions' => $dimensions,
                'optimized_variants' => $variants,
                'processing_status' => 'ready',
            ]);

            return [
                'dimensions' => $dimensions,
                'variants' => $variants,
                'status' => 'ready',
            ];
        }
    }
}
