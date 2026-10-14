import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import {
    Check,
    Copy,
    ExternalLink,
    Eye,
    Image as ImageIcon,
    Loader2,
    Search,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { MediaAsset } from '../../pages/kanban/types';

interface MediaPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (asset: MediaAsset) => void;
    workspaceId?: number;
    title?: string;
    attachableType?: string;
    attachableId?: number;
    fieldName?: string;
}

export default function MediaPickerModal({
    isOpen,
    onClose,
    onSelect,
    workspaceId,
    title = 'Select or Upload Media Asset',
    attachableType,
    attachableId,
    fieldName = 'default',
}: MediaPickerModalProps) {
    const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
    const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

    // Upload state
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadAltText, setUploadAltText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load assets from backend
    const loadAssets = async (searchQuery = '') => {
        setIsLoading(true);
        try {
            const params: Record<string, any> = {};
            if (workspaceId) params.workspace_id = workspaceId;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await axios.get('/media', { params });
            const data = res.data?.data || res.data || [];
            setAssets(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load media assets:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadAssets(search);
            setSelectedAsset(null);
            setUploadFile(null);
            setUploadPreview(null);
            setUploadError(null);
        }
    }, [isOpen, workspaceId]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loadAssets(search);
    };

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setUploadError('Only image files (JPG, PNG, WebP, GIF, SVG) are permitted.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('Image size exceeds maximum limit of 10MB.');
            return;
        }

        setUploadError(null);
        setUploadFile(file);
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
        const objectUrl = URL.createObjectURL(file);
        setUploadPreview(objectUrl);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', uploadFile);
            if (workspaceId) formData.append('workspace_id', String(workspaceId));
            if (uploadTitle.trim()) formData.append('title', uploadTitle.trim());
            if (uploadAltText.trim()) formData.append('alt_text', uploadAltText.trim());
            if (attachableType) formData.append('attachable_type', attachableType);
            if (attachableId) formData.append('attachable_id', String(attachableId));
            if (fieldName) formData.append('field_name', fieldName);

            const res = await axios.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const asset = res.data?.asset;
            if (asset) {
                onSelect(asset);
                onClose();
            } else {
                // Refresh library tab
                setActiveTab('library');
                loadAssets();
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Upload failed. Please try again.';
            setUploadError(msg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmSelect = async () => {
        if (!selectedAsset) return;

        // If target attachable is provided, attach on backend
        if (attachableType && attachableId) {
            try {
                await axios.post('/media/attach', {
                    media_asset_id: selectedAsset.id,
                    attachable_type: attachableType,
                    attachable_id: attachableId,
                    field_name: fieldName,
                });
            } catch (err) {
                console.error('Failed to attach media asset:', err);
            }
        }

        onSelect(selectedAsset);
        onClose();
    };

    const handleDeleteAsset = async (e: React.MouseEvent, asset: MediaAsset) => {
        e.stopPropagation();
        if (asset.usages_count && asset.usages_count > 0) {
            alert(`This image is currently referenced in ${asset.usages_count} location(s) and cannot be deleted until all usages are detached.`);
            return;
        }

        if (!confirm(`Are you sure you want to delete '${asset.original_filename}' permanently?`)) {
            return;
        }

        try {
            await axios.delete(`/media/${asset.id}`);
            setAssets((prev) => prev.filter((a) => a.id !== asset.id));
            if (selectedAsset?.id === asset.id) {
                setSelectedAsset(null);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete media asset.');
        }
    };

    const formatBytes = (bytes: number): string => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden sm:max-w-3xl">
                {/* Header */}
                <div className="border-border flex items-center justify-between border-b px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-xl">
                            <ImageIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold">{title}</DialogTitle>
                            <p className="text-muted-foreground text-xs">
                                Centralized image repository with instant reuse across boards and tasks.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs bar */}
                <div className="border-border/60 bg-muted/30 flex items-center gap-4 border-b px-6 pt-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('library')}
                        className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-semibold transition-all ${
                            activeTab === 'library'
                                ? 'border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground border-transparent'
                        }`}
                    >
                        <span>Media Library</span>
                        <span className="bg-muted text-muted-foreground ml-1 rounded-full px-2 py-0.2 text-[10px] font-bold">
                            {assets.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('upload')}
                        className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-semibold transition-all ${
                            activeTab === 'upload'
                                ? 'border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground border-transparent'
                        }`}
                    >
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>Upload New Image</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6">
                    {/* TAB 1: MEDIA LIBRARY */}
                    {activeTab === 'library' && (
                        <div className="space-y-4">
                            {/* Search bar */}
                            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                                <Search className="text-muted-foreground absolute left-3 h-4 w-4" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search images by name or title..."
                                    className="pl-9 text-xs"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            loadAssets('');
                                        }}
                                        className="text-muted-foreground hover:text-foreground absolute right-3 text-xs"
                                    >
                                        Clear
                                    </button>
                                )}
                            </form>

                            {/* Images Grid */}
                            {isLoading ? (
                                <div className="flex h-64 flex-col items-center justify-center gap-2">
                                    <Loader2 className="text-primary h-6 w-6 animate-spin" />
                                    <span className="text-muted-foreground text-xs">Loading media library...</span>
                                </div>
                            ) : assets.length === 0 ? (
                                <div className="border-border/60 flex h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center">
                                    <ImageIcon className="text-muted-foreground/40 mb-2 h-10 w-10" />
                                    <h4 className="text-foreground text-xs font-bold">No images found</h4>
                                    <p className="text-muted-foreground mt-1 max-w-xs text-[11px]">
                                        {search
                                            ? `No images matched '${search}'. Try a different search term.`
                                            : 'Your media library is empty. Upload your first image to get started!'}
                                    </p>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setActiveTab('upload')}
                                        className="mt-3 text-xs font-semibold"
                                    >
                                        Upload Image
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid max-h-[360px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
                                    {assets.map((asset) => {
                                        const isSelected = selectedAsset?.id === asset.id;
                                        return (
                                            <div
                                                key={asset.id}
                                                onClick={() => setSelectedAsset(asset)}
                                                className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-all ${
                                                    isSelected
                                                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
                                                        : 'border-border/70 hover:border-primary/50 hover:shadow-xs bg-card'
                                                }`}
                                            >
                                                {/* Image preview box */}
                                                <div className="bg-muted/40 relative flex aspect-square items-center justify-center overflow-hidden">
                                                    <img
                                                        src={asset.url}
                                                        alt={asset.alt_text || asset.original_filename}
                                                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                        loading="lazy"
                                                    />

                                                    {/* Selection Indicator */}
                                                    {isSelected && (
                                                        <div className="bg-primary text-primary-foreground absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full shadow-sm">
                                                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                                                        </div>
                                                    )}

                                                    {/* Quick Actions Overlay */}
                                                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPreviewAsset(asset);
                                                            }}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-800 shadow-sm transition hover:bg-white"
                                                            title="Preview image"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteAsset(e, asset)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/90 text-white shadow-sm transition hover:bg-red-600"
                                                            title="Delete asset"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Metadata */}
                                                <div className="p-2">
                                                    <div className="text-foreground truncate text-[11px] font-bold" title={asset.original_filename}>
                                                        {asset.title || asset.original_filename}
                                                    </div>
                                                    <div className="text-muted-foreground flex items-center justify-between text-[10px]">
                                                        <span>{formatBytes(asset.file_size_bytes)}</span>
                                                        {asset.width && asset.height && (
                                                            <span>{asset.width}×{asset.height}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: UPLOAD */}
                    {activeTab === 'upload' && (
                        <form onSubmit={handleUploadSubmit} className="space-y-4">
                            {uploadError && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-600">
                                    {uploadError}
                                </div>
                            )}

                            {/* Dropzone */}
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-border hover:border-primary/60 hover:bg-muted/10 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleFileSelect(e.target.files[0]);
                                        }
                                    }}
                                    className="hidden"
                                />

                                {uploadPreview ? (
                                    <div className="relative flex flex-col items-center gap-2">
                                        <img
                                            src={uploadPreview}
                                            alt="Preview"
                                            className="max-h-36 rounded-lg object-contain shadow-xs"
                                        />
                                        <span className="text-primary text-xs font-bold">
                                            {uploadFile?.name} ({formatBytes(uploadFile?.size || 0)})
                                        </span>
                                        <span className="text-muted-foreground text-[10px]">Click or drop another image to replace</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="bg-primary/10 text-primary mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
                                            <UploadCloud className="h-6 w-6" />
                                        </div>
                                        <div className="text-foreground text-xs font-bold">
                                            Click to browse or drag and drop image here
                                        </div>
                                        <p className="text-muted-foreground mt-1 text-[11px]">
                                            PNG, JPG, WEBP, GIF, SVG up to 10MB
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Extra metadata fields */}
                            {uploadFile && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="upload-title" className="text-xs">Image Title / Name</Label>
                                        <Input
                                            id="upload-title"
                                            value={uploadTitle}
                                            onChange={(e) => setUploadTitle(e.target.value)}
                                            placeholder="Descriptive title..."
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="upload-alt" className="text-xs">Alt Text (Accessibility)</Label>
                                        <Input
                                            id="upload-alt"
                                            value={uploadAltText}
                                            onChange={(e) => setUploadAltText(e.target.value)}
                                            placeholder="Image description..."
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setUploadFile(null);
                                        setUploadPreview(null);
                                        setActiveTab('library');
                                    }}
                                    className="text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={!uploadFile || isUploading}
                                    className="text-xs font-bold gap-1.5"
                                >
                                    {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{isUploading ? 'Uploading...' : 'Upload & Use'}</span>
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer (for Library Tab) */}
                {activeTab === 'library' && (
                    <div className="border-border bg-muted/20 flex items-center justify-between border-t px-6 py-3">
                        <div className="text-muted-foreground text-xs truncate max-w-sm">
                            {selectedAsset ? (
                                <span className="text-foreground font-semibold">
                                    Selected: {selectedAsset.original_filename}
                                </span>
                            ) : (
                                <span>No image selected</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                disabled={!selectedAsset}
                                onClick={handleConfirmSelect}
                                className="text-xs font-bold"
                            >
                                Use Selected Image
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>

            {/* LIGHTBOX MODAL */}
            {previewAsset && (
                <Dialog open={Boolean(previewAsset)} onOpenChange={() => setPreviewAsset(null)}>
                    <DialogContent className="max-w-2xl rounded-2xl p-4 sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="truncate text-sm font-bold">
                                {previewAsset.title || previewAsset.original_filename}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="bg-muted/40 my-2 flex max-h-[70vh] items-center justify-center overflow-hidden rounded-xl">
                            <img
                                src={previewAsset.url}
                                alt={previewAsset.alt_text || previewAsset.original_filename}
                                className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain"
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {previewAsset.width && previewAsset.height ? `${previewAsset.width}×${previewAsset.height} px • ` : ''}
                                {formatBytes(previewAsset.file_size_bytes)}
                            </span>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewAsset.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-foreground flex items-center gap-1 font-semibold"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    <span>Open Original</span>
                                </a>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
}
