<?php

namespace App\Services;

use Illuminate\Support\Str;

class StorageKeyService
{
    /**
     * Generate a structured object key for a task attachment.
     * Convention: projects/{project_id}/tasks/{task_id}/attachments/{uuid}.{ext}
     */
    public static function taskAttachmentKey(int $projectId, int $taskId, string $extension, ?string $uuid = null): string
    {
        $uuid = $uuid ?: (string) Str::uuid();
        $ext = ltrim(strtolower($extension), '.');
        return "projects/{$projectId}/tasks/{$taskId}/attachments/{$uuid}.{$ext}";
    }

    /**
     * Generate a structured object key for a project deliverable.
     * Convention: projects/{project_id}/deliverables/{uuid}.{ext}
     */
    public static function deliverableKey(int $projectId, string $extension, ?string $uuid = null): string
    {
        $uuid = $uuid ?: (string) Str::uuid();
        $ext = ltrim(strtolower($extension), '.');
        return "projects/{$projectId}/deliverables/{$uuid}.{$ext}";
    }

    /**
     * Generate a structured object key for a user avatar.
     * Convention: users/{user_id}/avatars/{uuid}.{ext}
     */
    public static function userAvatarKey(int $userId, string $extension = 'webp', ?string $uuid = null): string
    {
        $uuid = $uuid ?: (string) Str::uuid();
        $ext = ltrim(strtolower($extension), '.');
        return "users/{$userId}/avatars/{$uuid}.{$ext}";
    }

    /**
     * Generate a structured object key for a centralized media asset.
     * Convention: workspaces/{workspace_id}/media/{uuid}.{ext} or media/{uuid}.{ext}
     */
    public static function mediaAssetKey(?int $workspaceId, string $extension, ?string $uuid = null): string
    {
        $uuid = $uuid ?: (string) Str::uuid();
        $ext = ltrim(strtolower($extension), '.');
        $prefix = $workspaceId ? "workspaces/{$workspaceId}/media" : "media";
        return "{$prefix}/{$uuid}.{$ext}";
    }

    /**
     * Generate a structured object key for a client-specific upload.
     * Convention: clients/{client_id}/uploads/{uuid}.{ext}
     */
    public static function clientUploadKey(int $clientId, string $extension, ?string $uuid = null): string
    {
        $uuid = $uuid ?: (string) Str::uuid();
        $ext = ltrim(strtolower($extension), '.');
        return "clients/{$clientId}/uploads/{$uuid}.{$ext}";
    }
}
