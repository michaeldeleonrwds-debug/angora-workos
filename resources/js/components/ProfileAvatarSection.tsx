import React, { useState, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Camera, Trash2, Upload, ZoomIn, ZoomOut, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { UserAvatar } from '@/components/UserAvatar';
import { User } from '@/types';

interface ProfileAvatarSectionProps {
    user: User;
}

export function ProfileAvatarSection({ user }: ProfileAvatarSectionProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
    const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const validateAndProcessFile = (file: File) => {
        setValidationError(null);
        setSuccessMessage(null);

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setValidationError('Only JPG, PNG, and WebP images are supported.');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setValidationError('Image size must be less than 5 MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const img = new Image();
            img.onload = () => {
                setImageObj(img);
                setRawImageSrc(dataUrl);
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setCropModalOpen(true);
            };
            img.onerror = () => {
                setValidationError('Failed to load the selected image.');
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            validateAndProcessFile(file);
        }
        // Reset file input so user can choose same file again if needed
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            validateAndProcessFile(file);
        }
    };

    // Pan & Crop handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingImage(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingImage) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDraggingImage(false);
    };

    // Touch support for crop
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setIsDraggingImage(true);
            setDragStart({
                x: e.touches[0].clientX - pan.x,
                y: e.touches[0].clientY - pan.y,
            });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDraggingImage || e.touches.length !== 1) return;
        setPan({
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y,
        });
    };

    const handleTouchEnd = () => {
        setIsDraggingImage(false);
    };

    // Generate cropped blob and upload
    const handleSaveCrop = async () => {
        if (!imageObj) return;

        setIsSaving(true);
        setValidationError(null);

        try {
            // Target size is 256x256 (or smaller if natural size is smaller to prevent upscaling)
            const naturalMin = Math.min(imageObj.naturalWidth, imageObj.naturalHeight);
            const targetDim = naturalMin < 256 ? naturalMin : 256;

            const canvas = document.createElement('canvas');
            canvas.width = targetDim;
            canvas.height = targetDim;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Canvas 2D context unavailable');
            }

            // Viewport size in modal is 240x240
            const viewportSize = 240;

            // Determine base scale where the image fits the square viewport
            const baseScale = Math.max(viewportSize / imageObj.naturalWidth, viewportSize / imageObj.naturalHeight);
            const currentScale = baseScale * zoom;

            // Image dimensions in viewport units
            const renderedWidth = imageObj.naturalWidth * currentScale;
            const renderedHeight = imageObj.naturalHeight * currentScale;

            // Calculate center of crop relative to top-left of image
            const cropCenterXInRendered = viewportSize / 2 - pan.x;
            const cropCenterYInRendered = viewportSize / 2 - pan.y;

            // Convert to natural image coordinates
            const cropCenterXInNatural = cropCenterXInRendered / currentScale;
            const cropCenterYInNatural = cropCenterYInRendered / currentScale;

            const naturalCropSize = viewportSize / currentScale;

            let sx = cropCenterXInNatural - naturalCropSize / 2;
            let sy = cropCenterYInNatural - naturalCropSize / 2;
            let sWidth = naturalCropSize;
            let sHeight = naturalCropSize;

            // Clamp crop within image boundaries
            if (sx < 0) sx = 0;
            if (sy < 0) sy = 0;
            if (sx + sWidth > imageObj.naturalWidth) sx = imageObj.naturalWidth - sWidth;
            if (sy + sHeight > imageObj.naturalHeight) sy = imageObj.naturalHeight - sHeight;

            // Fill transparent/clear
            ctx.clearRect(0, 0, targetDim, targetDim);

            // Draw image
            ctx.drawImage(imageObj, sx, sy, sWidth, sHeight, 0, 0, targetDim, targetDim);

            // Convert to Blob
            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/webp', 0.92);
            }) || await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/png');
            });

            if (!blob) {
                throw new Error('Failed to generate image file');
            }

            const formData = new FormData();
            formData.append('avatar', blob, 'avatar.webp');

            router.post(route('profile.avatar.update'), formData, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setCropModalOpen(false);
                    setImageObj(null);
                    setRawImageSrc(null);
                    setIsSaving(false);
                    setSuccessMessage('Profile photo updated successfully.');
                    setTimeout(() => setSuccessMessage(null), 4000);
                },
                onError: (errors) => {
                    setIsSaving(false);
                    setValidationError(errors.avatar || 'Failed to update avatar.');
                },
            });
        } catch (err: any) {
            setIsSaving(false);
            setValidationError(err?.message || 'Error processing avatar crop.');
        }
    };

    // Remove photo
    const handleRemoveAvatar = () => {
        if (!confirm('Are you sure you want to remove your profile photo?')) return;

        setIsDeleting(true);
        setValidationError(null);

        router.delete(route('profile.avatar.destroy'), {
            preserveScroll: true,
            onSuccess: () => {
                setIsDeleting(false);
                setSuccessMessage('Profile photo removed.');
                setTimeout(() => setSuccessMessage(null), 4000);
            },
            onError: () => {
                setIsDeleting(false);
                setValidationError('Failed to remove profile photo.');
            },
        });
    };

    const hasAvatar = Boolean(user.avatar || user.avatar_url);

    return (
        <div className="rounded-2xl border border-white/10 bg-[#1E1E30] p-6 shadow-sm">
            <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Avatar / Profile Photo</h3>
                <p className="text-xs text-slate-400">
                    Upload a profile photo. Supported formats: JPG, PNG, and WebP (up to 5 MB).
                </p>
            </div>

            {validationError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{validationError}</span>
                </div>
            )}

            {successMessage && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar Preview with click to upload */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative cursor-pointer"
                    title="Click to change photo"
                >
                    <UserAvatar
                        user={user}
                        size="xl"
                        className="ring-2 ring-white/15 transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                        <Camera className="h-6 w-6 text-white" />
                        <span className="text-[10px] font-semibold text-white">Change</span>
                    </div>
                </div>

                {/* Dropzone & Actions */}
                <div className="flex-1 w-full space-y-3">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors cursor-pointer ${
                            dragActive
                                ? 'border-[#0073ea] bg-[#0073ea]/5 dark:border-[#D8F779] dark:bg-[#D8F779]/5'
                                : 'border-slate-300 bg-white hover:border-slate-400 dark:border-white/10 dark:bg-[#28283E]/50 dark:hover:border-white/20'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <Upload className="mb-1.5 h-5 w-5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            Click to upload or drag & drop photo here
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Square crop with zoom & circular preview
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-8 gap-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-[#28283E] dark:text-white dark:hover:bg-[#353550]"
                        >
                            <Camera className="h-3.5 w-3.5" />
                            <span>{hasAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                        </Button>

                        {hasAvatar && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleRemoveAvatar}
                                disabled={isDeleting}
                                className="h-8 gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            >
                                {isDeleting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                )}
                                <span>Remove Photo</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Square Crop & Circular Preview Modal */}
            <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
                <DialogContent className="max-w-md border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-[#1E1E30] dark:text-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">Crop Profile Photo</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Drag to reposition and adjust the slider to zoom. The circle shows your final avatar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-5 py-3">
                        {/* Interactive Square Crop Viewport */}
                        <div
                            className="relative h-[240px] w-[240px] overflow-hidden rounded-2xl border-2 border-[#0073ea]/40 bg-slate-900 shadow-inner cursor-grab active:cursor-grabbing select-none dark:border-[#D8F779]/40 dark:bg-black/60"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {rawImageSrc && (
                                <img
                                    src={rawImageSrc}
                                    alt="Crop target"
                                    draggable={false}
                                    style={{
                                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                        transformOrigin: 'center center',
                                        maxWidth: 'none',
                                    }}
                                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                                />
                            )}
                            {/* Circular Overlay Mask Guideline */}
                            <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-white/70" />
                        </div>

                        {/* Live Circular Preview */}
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Live Preview:</span>
                            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-slate-300 shadow-md dark:border-white/20">
                                {rawImageSrc && (
                                    <img
                                        src={rawImageSrc}
                                        alt="Circular preview"
                                        draggable={false}
                                        style={{
                                            transform: `translate(${pan.x * (64 / 240)}px, ${pan.y * (64 / 240)}px) scale(${zoom})`,
                                            transformOrigin: 'center center',
                                            maxWidth: 'none',
                                        }}
                                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Zoom Slider */}
                        <div className="flex w-full items-center gap-3 px-4">
                            <ZoomOut className="h-4 w-4 text-slate-400" />
                            <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.05"
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#0073ea] dark:bg-white/20 dark:accent-[#D8F779]"
                            />
                            <ZoomIn className="h-4 w-4 text-slate-400" />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setCropModalOpen(false)}
                            disabled={isSaving}
                            className="text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveCrop}
                            disabled={isSaving}
                            className="gap-1.5 text-xs font-bold bg-[#0073ea] text-white hover:bg-[#0060c0] dark:bg-[#D8F779] dark:hover:bg-[#c9e86a] dark:text-black"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Save Avatar</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default ProfileAvatarSection;
