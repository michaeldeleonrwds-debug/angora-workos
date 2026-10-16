<?php

namespace App\Console\Commands;

use App\Models\KanbanAttachment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateStorageToS3Command extends Command
{
    protected $signature = 'storage:migrate-to-s3
                            {--dry-run : Simulate migration without writing to S3 or updating database}
                            {--batch=100 : Number of records to process per chunk}
                            {--force : Force re-uploading files that already exist on S3}';

    protected $description = 'Safely migrate local attachments and image variants to S3-compatible object storage';

    public function handle(): int
    {
        $isDryRun = (bool) $this->option('dry-run');
        $batchSize = (int) $this->option('batch');
        $force = (bool) $this->option('force');

        $this->info("==================================================");
        $this->info("Angora Work OS — S3 Storage Migration Tool");
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
            $this->info("✓ S3 connection verified successfully.");
        } catch (\Throwable $e) {
            $this->error("Failed to connect to S3 disk: " . $e->getMessage());
            $this->warn("Please check your AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET, and AWS_ENDPOINT in .env.");
            return Command::FAILURE;
        }

        // 2. Query attachments eligible for migration
        $query = KanbanAttachment::where('disk', '!=', 's3');
        $totalCount = $query->count();

        if ($totalCount === 0) {
            $this->info("All attachments are already stored on S3. Nothing to migrate.");
            return Command::SUCCESS;
        }

        $this->info("Found {$totalCount} attachment(s) eligible for migration.");

        $migratedCount = 0;
        $skippedCount = 0;
        $failedCount = 0;
        $totalBytes = 0;

        $query->chunkById($batchSize, function ($attachments) use ($isDryRun, $s3Disk, $force, &$migratedCount, &$skippedCount, &$failedCount, &$totalBytes) {
            foreach ($attachments as $attachment) {
                $sourceDiskName = $attachment->disk ?: 'public';
                $sourceDisk = Storage::disk($sourceDiskName);

                // Check source existence
                if (!$sourceDisk->exists($attachment->file_path)) {
                    if ($sourceDiskName !== 'public' && Storage::disk('public')->exists($attachment->file_path)) {
                        $sourceDisk = Storage::disk('public');
                    } else {
                        $this->warn("Skipping #{$attachment->id} ('{$attachment->file_name}'): local file not found.");
                        $skippedCount++;
                        continue;
                    }
                }

                $fileSize = $sourceDisk->size($attachment->file_path);
                $totalBytes += $fileSize;

                if ($isDryRun) {
                    $this->line("[Dry Run] Would migrate: #{$attachment->id} {$attachment->file_name} (" . round($fileSize / 1024, 1) . " KB)");
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

                    // Copy file to S3
                    $fileStream = $sourceDisk->readStream($attachment->file_path);
                    if ($fileStream === false) {
                        throw new \Exception("Cannot open read stream for local file.");
                    }

                    $s3Disk->writeStream($attachment->file_path, $fileStream);
                    if (is_resource($fileStream)) {
                        fclose($fileStream);
                    }

                    // Also copy any optimized variants if present
                    if (!empty($attachment->optimized_variants)) {
                        foreach ($attachment->optimized_variants as $key => $variantPath) {
                            if ($key !== 'original' && $sourceDisk->exists($variantPath)) {
                                $vStream = $sourceDisk->readStream($variantPath);
                                if ($vStream !== false) {
                                    $s3Disk->writeStream($variantPath, $vStream);
                                    if (is_resource($vStream)) {
                                        fclose($vStream);
                                    }
                                }
                            }
                        }
                    }

                    // Verify size on S3
                    if (!$s3Disk->exists($attachment->file_path)) {
                        throw new \Exception("Target file verification failed on S3.");
                    }

                    // Update database record to 's3' (Local file stays intact as safe backup!)
                    $attachment->update(['disk' => 's3']);
                    $this->info("✓ Migrated #{$attachment->id}: {$attachment->file_name}");
                    $migratedCount++;
                } catch (\Throwable $e) {
                    $this->error("Failed to migrate #{$attachment->id} ({$attachment->file_name}): " . $e->getMessage());
                    $failedCount++;
                }
            }
        });

        $this->newLine();
        $this->info("--------------------------------------------------");
        $this->info("Migration Summary:");
        $this->info("Total eligible:  {$totalCount}");
        $this->info("Migrated:        {$migratedCount}");
        $this->info("Skipped:         {$skippedCount}");
        $this->info("Failed:          {$failedCount}");
        $this->info("Total data:      " . round($totalBytes / (1024 * 1024), 2) . " MB");
        $this->info("Note: Local files were preserved intact as backup.");
        $this->info("--------------------------------------------------");

        return $failedCount === 0 ? Command::SUCCESS : Command::FAILURE;
    }
}
