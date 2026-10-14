import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { ExternalLink, Eye, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import MediaPickerModal from '@/components/media/MediaPickerModal';
import { BoardColumn, MediaAsset, Task } from '../types';

interface ImageCellProps {
    task: Task;
    column: BoardColumn;
    workspaceId?: number;
    isSubtask?: boolean;
}

export default function ImageCell({ task, column, workspaceId, isSubtask = false }: ImageCellProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Get current cell value
    const cellValue = task.custom_values?.[column.key];

    // Normalize cell value to { url, media_asset_id, filename }
    let imageUrl: string | null = null;
    let assetId: number | null = null;
    let filename: string = 'Image';

    if (cellValue) {
        if (typeof cellValue === 'object' && cellValue.url) {
            imageUrl = cellValue.url;
            assetId = cellValue.media_asset_id ?? null;
            filename = cellValue.filename || 'Image';
        } else if (typeof cellValue === 'string' && cellValue.trim()) {
            imageUrl = cellValue;
            filename = cellValue.split('/').pop() || 'Image';
        }
    }

    // Check if task has media_usages that match this column key
    if (!imageUrl) {
        const usages = task.media_usages || task.mediaUsages || [];
        const match = usages.find((u) => u.field_name === column.key);
        if (match && match.media_asset) {
            imageUrl = match.media_asset.url;
            assetId = match.media_asset_id;
            filename = match.media_asset.original_filename;
        }
    }

    const handleSelectAsset = (asset: MediaAsset) => {
        const newCustomValues = {
            ...(task.custom_values || {}),
            [column.key]: {
                media_asset_id: asset.id,
                url: asset.url,
                filename: asset.original_filename,
            },
        };

        router.patch(
            `/kanban/tasks/${task.id}`,
            { custom_values: newCustomValues },
            { preserveScroll: true },
        );
    };

    const handleClearImage = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (assetId) {
            try {
                await axios.post('/media/detach', {
                    media_asset_id: assetId,
                    attachable_type: 'task',
                    attachable_id: task.id,
                    field_name: column.key,
                });
            } catch (err) {
                console.error('Failed to detach media asset:', err);
            }
        }

        const newCustomValues = {
            ...(task.custom_values || {}),
            [column.key]: null,
        };

        router.patch(
            `/kanban/tasks/${task.id}`,
            { custom_values: newCustomValues },
            { preserveScroll: true },
        );
    };

    return (
        <div className="group/img relative flex h-full w-full items-center justify-center px-1">
            {imageUrl ? (
                <div className="relative flex items-center justify-center">
                    <img
                        src={imageUrl}
                        alt={filename}
                        onClick={() => setPreviewUrl(imageUrl)}
                        className="h-7 w-7 cursor-pointer rounded-md object-cover border border-border/70 shadow-2xs transition-transform hover:scale-105"
                        title={filename}
                    />

                    {/* Quick Action Overlay on Hover */}
                    <div className="bg-background/95 border-border shadow-xs absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/img:flex items-center gap-1 rounded-md border p-1 z-20">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewUrl(imageUrl);
                            }}
                            className="text-muted-foreground hover:text-foreground rounded p-0.5 hover:bg-muted"
                            title="Preview image"
                        >
                            <Eye className="h-3 w-3" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPickerOpen(true);
                            }}
                            className="text-muted-foreground hover:text-foreground rounded p-0.5 hover:bg-muted"
                            title="Replace image"
                        >
                            <ImageIcon className="h-3 w-3" />
                        </button>
                        <button
                            type="button"
                            onClick={handleClearImage}
                            className="text-muted-foreground hover:text-red-500 rounded p-0.5 hover:bg-red-500/10"
                            title="Remove image"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="text-muted-foreground/60 hover:text-primary hover:border-primary/40 flex items-center gap-1 rounded-md border border-dashed border-border/60 px-2 py-1 text-[11px] font-medium transition-colors"
                >
                    <Plus className="h-3 w-3" />
                    <span>Image</span>
                </button>
            )}

            {/* Media Picker Modal */}
            <MediaPickerModal
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelect={handleSelectAsset}
                workspaceId={workspaceId}
                attachableType="task"
                attachableId={task.id}
                fieldName={column.key}
                title={`Set Image for '${column.title}'`}
            />

            {/* Preview Lightbox */}
            {previewUrl && (
                <Dialog open={Boolean(previewUrl)} onOpenChange={() => setPreviewUrl(null)}>
                    <DialogContent className="max-w-xl rounded-2xl p-4 sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="truncate text-xs font-bold text-muted-foreground">
                                {filename}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="bg-muted/30 my-2 flex max-h-[60vh] items-center justify-center overflow-hidden rounded-xl">
                            <img
                                src={previewUrl}
                                alt={filename}
                                className="max-h-[55vh] w-auto max-w-full rounded-lg object-contain"
                            />
                        </div>
                        <div className="flex justify-end">
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-xs font-semibold"
                            >
                                <ExternalLink className="h-3 w-3" />
                                <span>Open Full Resolution</span>
                            </a>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
