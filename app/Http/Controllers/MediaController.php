<?php

namespace App\Http\Controllers;

use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\MediaAsset;
use App\Services\MediaAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MediaController extends Controller
{
    protected MediaAssetService $mediaService;

    public function __construct(MediaAssetService $mediaService)
    {
        $this->mediaService = $mediaService;
    }

    /**
     * List media assets accessible to the user in the given workspace.
     */
    public function index(Request $request): JsonResponse|Response
    {
        $workspaceId = $request->integer('workspace_id') ?: session('active_workspace_id');
        $search = $request->string('search')->trim()->value() ?: null;
        $perPage = min($request->integer('per_page', 24), 100);

        $assets = $this->mediaService->listAssets($workspaceId, $search, $perPage);

        // When requested via Axios / API client expecting raw JSON
        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json($assets);
        }

        return Inertia::render('media/index', [
            'assets' => $assets,
            'filters' => [
                'search' => $search,
                'workspace_id' => $workspaceId,
            ],
            'storageDisk' => config('filesystems.media_disk', env('MEDIA_DISK', config('filesystems.default', 'public'))),
        ]);
    }

    /**
     * Upload a new media image asset.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:jpeg,jpg,png,webp,gif,svg',
                'max:10240', // 10MB
            ],
            'workspace_id' => ['nullable', 'integer', 'exists:workspaces,id'],
            'title' => ['nullable', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'attachable_type' => ['nullable', 'string'],
            'attachable_id' => ['nullable', 'integer'],
            'field_name' => ['nullable', 'string', 'max:64'],
        ]);

        $workspaceId = $request->integer('workspace_id') ?: session('active_workspace_id');

        try {
            $asset = $this->mediaService->upload(
                $request->file('file'),
                $request->user(),
                $workspaceId,
                $request->input('title'),
                $request->input('alt_text')
            );

            // Optional immediate attachment
            $usage = null;
            $attachableType = $request->input('attachable_type');
            $attachableId = $request->integer('attachable_id');
            $fieldName = $request->input('field_name', 'default');

            if ($attachableType && $attachableId) {
                $resolvedType = $this->resolveAttachableType($attachableType);
                if ($resolvedType) {
                    $usage = $this->mediaService->attach(
                        $asset,
                        $resolvedType,
                        $attachableId,
                        $fieldName,
                        $request->user()
                    );
                }
            }

            return response()->json([
                'success' => true,
                'asset' => $asset->fresh(['user:id,name,email']),
                'usage' => $usage,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Upload failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Attach an existing media asset to an entity.
     */
    public function attach(Request $request): JsonResponse
    {
        $request->validate([
            'media_asset_id' => ['required', 'integer', 'exists:media_assets,id'],
            'attachable_type' => ['required', 'string'],
            'attachable_id' => ['required', 'integer'],
            'field_name' => ['nullable', 'string', 'max:64'],
        ]);

        $resolvedType = $this->resolveAttachableType($request->input('attachable_type'));
        if (!$resolvedType) {
            return response()->json(['message' => 'Invalid attachable target.'], 422);
        }

        $asset = MediaAsset::findOrFail($request->integer('media_asset_id'));
        $usage = $this->mediaService->attach(
            $asset,
            $resolvedType,
            $request->integer('attachable_id'),
            $request->input('field_name', 'default'),
            $request->user()
        );

        return response()->json([
            'success' => true,
            'asset' => $asset,
            'usage' => $usage,
        ]);
    }

    /**
     * Detach a media asset from an entity without deleting the physical asset.
     */
    public function detach(Request $request): JsonResponse
    {
        $request->validate([
            'media_asset_id' => ['required', 'integer', 'exists:media_assets,id'],
            'attachable_type' => ['required', 'string'],
            'attachable_id' => ['required', 'integer'],
            'field_name' => ['nullable', 'string', 'max:64'],
        ]);

        $resolvedType = $this->resolveAttachableType($request->input('attachable_type'));
        if (!$resolvedType) {
            return response()->json(['message' => 'Invalid attachable target.'], 422);
        }

        $this->mediaService->detach(
            $request->integer('media_asset_id'),
            $resolvedType,
            $request->integer('attachable_id'),
            $request->input('field_name', 'default'),
            $request->user()
        );

        return response()->json(['success' => true]);
    }

    /**
     * Safely delete a media asset.
     */
    public function destroy(Request $request, MediaAsset $mediaAsset): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $user = $request->user();

        // Must be the owner or an admin
        if ($mediaAsset->user_id !== $user->id && ! $user->hasRole(['super_admin', 'workspace_admin', 'admin'])) {
            if ($request->header('X-Inertia')) {
                return back()->withErrors(['message' => 'Unauthorized to delete this media asset.']);
            }
            return response()->json(['message' => 'Unauthorized to delete this media asset.'], 403);
        }

        try {
            $this->mediaService->safeDelete($mediaAsset, $request->boolean('force', false));
            if ($request->header('X-Inertia')) {
                return back()->with('success', 'Media asset deleted successfully.');
            }
            return response()->json(['success' => true, 'message' => 'Media asset deleted successfully.']);
        } catch (\RuntimeException $e) {
            if ($request->header('X-Inertia')) {
                return back()->withErrors(['message' => $e->getMessage()]);
            }
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\Throwable $e) {
            if ($request->header('X-Inertia')) {
                return back()->withErrors(['message' => 'Delete failed: ' . $e->getMessage()]);
            }
            return response()->json(['message' => 'Delete failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Resolve short alias to fully-qualified model class.
     */
    protected function resolveAttachableType(string $type): ?string
    {
        $map = [
            'task' => KanbanTask::class,
            'kanban_task' => KanbanTask::class,
            'subitem' => KanbanTask::class,
            'comment' => KanbanComment::class,
            'kanban_comment' => KanbanComment::class,
        ];

        if (isset($map[strtolower($type)])) {
            return $map[strtolower($type)];
        }

        if (class_exists($type)) {
            return $type;
        }

        return null;
    }
}
