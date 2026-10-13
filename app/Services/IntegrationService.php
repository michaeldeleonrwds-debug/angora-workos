<?php

namespace App\Services;

use App\Models\ExternalResourceLink;
use App\Models\ThirdPartyIntegration;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IntegrationService
{
    /**
     * List integrations with connection statuses
     */
    public function getIntegrations(?int $workspaceId = null): array
    {
        $providers = [
            'google_drive' => [
                'name' => 'Google Drive',
                'description' => 'Link files and documentation directly to tasks and deliverables.',
                'icon' => 'HardDrive',
                'category' => 'Cloud Storage',
            ],
            'slack' => [
                'name' => 'Slack',
                'description' => 'Send task updates, deliverable review notifications, and channel alerts.',
                'icon' => 'MessageSquare',
                'category' => 'Team Chat',
            ],
            'github' => [
                'name' => 'GitHub',
                'description' => 'Track pull requests, commit statuses, and code review deliverables.',
                'icon' => 'GitBranch',
                'category' => 'Code & DevOps',
            ],
            'figma' => [
                'name' => 'Figma',
                'description' => 'Embed Figma design frames and link interactive UI mockups.',
                'icon' => 'Figma',
                'category' => 'Design & Creative',
            ],
            'canva' => [
                'name' => 'Canva',
                'description' => 'Associate Canva brand assets and presentation decks with deliverables.',
                'icon' => 'Palette',
                'category' => 'Design & Creative',
            ],
        ];

        $records = ThirdPartyIntegration::where(function ($q) use ($workspaceId) {
            if ($workspaceId) {
                $q->where('workspace_id', $workspaceId)->orWhereNull('workspace_id');
            }
        })->get()->keyBy('provider');

        $result = [];
        foreach ($providers as $key => $meta) {
            $record = $records->get($key);
            $result[] = [
                'provider' => $key,
                'name' => $meta['name'],
                'description' => $meta['description'],
                'icon' => $meta['icon'],
                'category' => $meta['category'],
                'status' => $record ? $record->status : 'disconnected',
                'account_identifier' => $record ? $record->account_identifier : null,
                'last_synced_at' => $record && $record->last_synced_at ? $record->last_synced_at->toIso8601String() : null,
                'id' => $record ? $record->id : null,
            ];
        }

        return $result;
    }

    /**
     * Connect or update integration
     */
    public function connect(User $user, string $provider, array $credentials, ?string $accountIdentifier = null, ?int $workspaceId = null): ThirdPartyIntegration
    {
        $encrypted = Crypt::encryptString(json_encode($credentials));

        $integration = ThirdPartyIntegration::updateOrCreate(
            [
                'workspace_id' => $workspaceId ?? $user->current_workspace_id,
                'provider' => $provider,
            ],
            [
                'user_id' => $user->id,
                'name' => ucwords(str_replace('_', ' ', $provider)),
                'status' => 'connected',
                'credentials_encrypted' => $encrypted,
                'account_identifier' => $accountIdentifier,
                'last_synced_at' => now(),
                'error_log' => null,
            ]
        );

        return $integration;
    }

    /**
     * Disconnect integration
     */
    public function disconnect(ThirdPartyIntegration $integration): void
    {
        $integration->update([
            'status' => 'disconnected',
            'credentials_encrypted' => null,
            'last_synced_at' => null,
            'error_log' => null,
        ]);
    }

    /**
     * Link external resource to an entity
     */
    public function linkResource(
        ThirdPartyIntegration $integration,
        string $attachableType,
        int $attachableId,
        string $resourceType,
        string $externalTitle,
        string $externalUrl,
        ?string $externalId = null,
        ?array $metadata = null
    ): ExternalResourceLink {
        return ExternalResourceLink::create([
            'integration_id' => $integration->id,
            'attachable_type' => $attachableType,
            'attachable_id' => $attachableId,
            'resource_type' => $resourceType,
            'external_id' => $externalId,
            'external_title' => $externalTitle,
            'external_url' => $externalUrl,
            'metadata' => $metadata,
        ]);
    }
}
