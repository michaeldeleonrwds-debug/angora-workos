<?php

namespace App\Console\Commands;

use App\Models\KanbanAttachment;
use App\Models\MediaAsset;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateStorageToS3Command extends Command
{
    protected $signature = 'storage:migrate-to-s3
                            {--dry-run : Simulate migration without writing to S3 or updating database}
                            {--batch=100 : Number of records to process per chunk}
                            {--force : Force re-uploading files that already exist on S3}
                            {--verify-checksum : Perform cryptographic SHA-256 integrity verification before updating database records}';

    protected $description = 'Safely migrate local attachments and media assets to S3/MinIO compatible object storage with checksum integrity verification';

    public function handle(): int
    {
        $isDryRun = (bool) $this->option('dry-run');
        $batchSize = (int) $this->option('batch');
        $force = (bool) $this->option('force');
        $verifyChecksum = true; // Always verify checksum by default for guaranteed file integrity

        $this->info("==================================================");
        $this->info("Angora Work OS — S3 / MinIO Storage Migration Tool");
        $this->info("Mode: " . ($isDryRun ? "[DRY RUN - Simulation Only]" : "[LIVE MIGRATION]"));
        $this->info("==================================================");

        // 1. Verify S3 configuration & connectivity
        $targetDisk = 's3';
        try {
            $s3Disk = Storage::disk($targetDisk);
            if (!$isDryRun) {
                // Test write permissions
                $testFile = '.angora-migration-test-' . uniqid();
                $s3Disk->put($testFile, 'test');
                $s3Disk->delete($testFile);
            }
            $this->info("✓ S3 / MinIO connection verified successfully.");
        } catch (\Throwable $e) {
            $this->error("Failed to connect to S3 disk: " . $e->getMessage());
            $this->warn("Please check your AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET, and AWS_ENDPOINT in .env.");
            return Command::FAILURE;
        }

        // 2. Query attachments eligible for migration
        $attachmentQuery = KanbanAttachment::where('disk', '!=', 's3');
        $attachmentCount = $attachmentQuery->count();

        // 3. Query media assets eligible for migration
        $mediaQuery = MediaAsset::where('disk', '!=', 's3');
        $mediaCount = $mediaQuery->count();

        $totalCount = $attachmentCount + $mediaCount;

        if ($totalCount === 0) {
            $this->info("All attachments are already stored on S3. Nothing to migrate.");
            return Command::SUCCESS;
        }

        $this->info("Found {$attachmentCount} attachment(s) and {$mediaCount} media asset(s) eligible for migration.");

        $migratedCount = 0;
        $skippedCount = 0;
        $failedCount = 0;
        $totalBytes = 0;

        // Process Kanban Attachments
        if ($attachmentCount > 0) {
            $this->newLine();
            $this->info("--- Migrating Kanban Attachments ---");
            $attachmentQuery->chunkById($batchSize, function ($attachments) use ($isDryRun, $s3Disk, $force, $verifyChecksum, &$migratedCount, &$skippedCount, &$failedCount, &$totalBytes) {
                foreach ($attachments as $attachment) {
                    $sourceDiskName = $attachment->disk ?: 'public';
                    $sourceDisk = Storage::disk($sourceDiskName);

                    // Check source existence
                    if (!$sourceDisk->exists($attachment->file_path)) {
                        if ($sourceDiskName !== 'public' && Storage::disk('public')->exists($attachment->file_path)) {
                            $sourceDisk = Storage::disk('public');
                        } elseif ($sourceDiskName !== 'local' && Storage::disk('local')->exists($attachment->file_path)) {
                            $sourceDisk = Storage::disk('local');
                        } else {
                            $this->warn("Skipping attachment #{$attachment->id} ('{$attachment->file_name}'): local file not found.");
                            $skippedCount++;
                            continue;
                        }
                    }

                    $fileSize = $sourceDisk->size($attachment->file_path);
                    $totalBytes += $fileSize;

                    if ($isDryRun) {
                        $this->line("[Dry Run] Would migrate: #{$attachment->id} - {$attachment->file_name} (" . round($fileSize / 1024, 1) . " KB)");
                        $migratedCount++;
                        continue;
                    }

                    try {
                        // Check if already on S3 and !force
                        if (!$force && $s3Disk->exists($attachment->file_path)) {
                            $this->line("Already on S3: #{$attachment->id} {$attachment->file_name} (updating DB record)");
                            $attachment->update(['disk' => 's3']);
                            $skippedCount++;
                            continue;
                        }

                        // Compute source checksum
                        $sourceContent = $sourceDisk->get($attachment->file_path);
                        $sourceHash = hash('sha256', $sourceContent);

                        // Upload to S3
                        $s3Disk->put($attachment->file_path, $sourceContent);

                        // Also copy any optimized variants if present
                        if (!empty($attachment->optimized_variants)) {
                            foreach ($attachment->optimized_variants as $key => $variantPath) {
                                if ($key !== 'original' && $sourceDisk->exists($variantPath)) {
                                    $vContent = $sourceDisk->get($variantPath);
                                    $s3Disk->put($variantPath, $vContent);
                                }
                            }
                        }

                        // Verify integrity via SHA-256 checksum comparison
                        if ($verifyChecksum) {
                            $targetContent = $s3Disk->get($attachment->file_path);
                            $targetHash = hash('sha256', $targetContent);

                            if ($sourceHash !== $targetHash) {
                                throw new \RuntimeException("Checksum mismatch! Source hash [{$sourceHash}] does not match S3 hash [{$targetHash}].");
                            }
                        }

                        // Update database record to 's3' (Local file stays intact as safe backup!)
                        $attachment->update(['disk' => 's3']);
                        $this->info("✓ Migrated #{$attachment->id}: {$attachment->file_name} (Checksum: " . substr($sourceHash, 0, 8) . "...)");
                        $migratedCount++;
                    } catch (\Throwable $e) {
                        $this->error("Failed to migrate attachment #{$attachment->id} ({$attachment->file_name}): " . $e->getMessage());
                        $failedCount++;
                    }
                }
            });
        }

        // Process Media Assets
        if ($mediaCount > 0) {
            $this->newLine();
            $this->info("--- Migrating Media Assets ---");
            $mediaQuery->chunkById($batchSize, function ($assets) use ($isDryRun, $s3Disk, $force, $verifyChecksum, &$migratedCount, &$skippedCount, &$failedCount, &$totalBytes) {
                foreach ($assets as $asset) {
                    $sourceDiskName = $asset->disk ?: 'public';
                    $sourceDisk = Storage::disk($sourceDiskName);

                    if (!$sourceDisk->exists($asset->file_path)) {
                        if ($sourceDiskName !== 'public' && Storage::disk('public')->exists($asset->file_path)) {
                            $sourceDisk = Storage::disk('public');
                        } elseif ($sourceDiskName !== 'local' && Storage::disk('local')->exists($asset->file_path)) {
                            $sourceDisk = Storage::disk('local');
                        } else {
                            $this->warn("Skipping media asset #{$asset->id} ('{$asset->original_filename}'): local file not found.");
                            $skippedCount++;
                            continue;
                        }
                    }

                    $fileSize = $sourceDisk->size($asset->file_path);
                    $totalBytes += $fileSize;

                    if ($isDryRun) {
                        $this->line("[Dry Run] Would migrate media asset: #{$asset->id} {$asset->original_filename} (" . round($fileSize / 1024, 1) . " KB)");
                        $migratedCount++;
                        continue;
                    }

                    try {
                        if (!$force && $s3Disk->exists($asset->file_path)) {
                            $this->line("Already on S3: #{$asset->id} {$asset->original_filename} (updating DB record)");
                            $asset->update(['disk' => 's3']);
                            $skippedCount++;
                            continue;
                        }

                        $sourceContent = $sourceDisk->get($asset->file_path);
                        $sourceHash = hash('sha256', $sourceContent);

                        $s3Disk->put($asset->file_path, $sourceContent);

                        if ($verifyChecksum) {
                            $targetContent = $s3Disk->get($asset->file_path);
                            $targetHash = hash('sha256', $targetContent);

                            if ($sourceHash !== $targetHash) {
                                throw new \RuntimeException("Checksum mismatch! Source hash [{$sourceHash}] does not match S3 hash [{$targetHash}].");
                            }
                        }

                        $asset->update(['disk' => 's3']);
                        $this->info("✓ Migrated media asset #{$asset->id}: {$asset->original_filename} (Checksum: " . substr($sourceHash, 0, 8) . "...)");
                        $migratedCount++;
                    } catch (\Throwable $e) {
                        $this->error("Failed to migrate media asset #{$asset->id} ({$asset->original_filename}): " . $e->getMessage());
                        $failedCount++;
                    }
                }
            });
        }

        $this->newLine();
        $this->info("--------------------------------------------------");
        $this->info("Migration Summary:");
        $this->info("Total eligible:  {$totalCount}");
        $this->info("Migrated:        {$migratedCount}");
        $this->info("Skipped:         {$skippedCount}");
        $this->info("Failed:          {$failedCount}");
        $this->info("Total data:      " . round($totalBytes / (1024 * 1024), 2) . " MB");
        $this->info("Note: Original local files were preserved intact as backup.");
        $this->info("--------------------------------------------------");

        return $failedCount === 0 ? Command::SUCCESS : Command::FAILURE;
    }
}
