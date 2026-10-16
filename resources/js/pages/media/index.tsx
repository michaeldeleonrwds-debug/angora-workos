import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Check,
    Copy,
    Database,
    Download,
    ExternalLink,
    Eye,
    FolderArchive,
    Grid3X3,
    Image as ImageIcon,
    LayoutList,
    Loader2,
    RefreshCw,
    Search,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { MediaAsset } from '../kanban/types';

interface MediaPageProps {
    assets: {
        data: MediaAsset[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
        per_page: number;
    };
    filters: {
        search?: string | null;
        workspace_id?: number | null;
    };
    storageDisk?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'Data & Security', href: '/settings' },
    { title: 'File Manager', href: '/settings/data/files' },
];

export default function FileManagerPage({ assets, filters, storageDisk = 'public' }: MediaPageProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Inspector / Lightbox Modal
    const [inspectAsset, setInspectAsset] = useState<MediaAsset | null>(null);

    // Upload Drawer / Modal
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadAltText, setUploadAltText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Format bytes utility
    const formatBytes = (bytes: number): string => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Format date utility
    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(date);
        } catch {
            return dateString;
        }
    };

    // Search submit handler
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);
        router.get(
            '/settings/data/files',
            { search: searchQuery || undefined },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setIsSearching(false),
            },
        );
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        router.get('/settings/data/files', {}, { preserveState: true, preserveScroll: true });
    };

    // Copy direct URL to clipboard
    const handleCopyUrl = async (e: React.MouseEvent, asset: MediaAsset) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(asset.url);
            setCopiedId(asset.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    };

    // Delete asset
    const handleDeleteAsset = async (asset: MediaAsset) => {
        if (asset.usages_count && asset.usages_count > 0) {
            alert(
                `This image is currently referenced in ${asset.usages_count} location(s) and cannot be deleted until all usages are detached from boards and tasks.`,
            );
            return;
        }

        if (!confirm(`Are you sure you want to permanently delete "${asset.original_filename}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await axios.delete(`/media/${asset.id}`);
            if (inspectAsset?.id === asset.id) {
                setInspectAsset(null);
            }
            router.reload();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to delete media asset.';
            alert(msg);
        }
    };

    // Upload handling
    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setUploadError('Only image files (JPG, PNG, WebP, GIF, SVG) are permitted.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('Image size exceeds maximum allowed limit of 10MB.');
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
        setIsDragging(false);
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
            if (filters.workspace_id) {
                formData.append('workspace_id', String(filters.workspace_id));
            }
            if (uploadTitle.trim()) {
                formData.append('title', uploadTitle.trim());
            }
            if (uploadAltText.trim()) {
                formData.append('alt_text', uploadAltText.trim());
            }

            await axios.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Reset and close
            setUploadFile(null);
            setUploadPreview(null);
            setUploadTitle('');
            setUploadAltText('');
            setIsUploadOpen(false);
            router.reload();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Upload failed. Please verify the file is a valid image under 10MB.';
            setUploadError(msg);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="File Manager — Centralized Media Library" />

            <SettingsLayout
                title="File Manager"
                description="Centralized media repository with instant preview, object storage synchronization, and asset reuse across boards and tasks"
            >
                <div className="space-y-6">
                    {/* Top Stats & Quick Metrics Bar */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-[#0073ea]/15 p-2 text-[#0073ea] dark:bg-[#0073ea]/20 dark:text-[#579bfc]">
                                    <FolderArchive className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Media Assets</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                                        {assets.total} {assets.total === 1 ? 'file' : 'files'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-[#00c875]">
                                    <Database className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Storage Provider</p>
                                    <p className="text-lg font-bold text-slate-900 capitalize dark:text-white truncate">
                                        {storageDisk === 's3' ? 'S3-Compatible Object Storage' : `${storageDisk} Storage`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-purple-500/15 p-2 text-purple-600 dark:bg-purple-500/20 dark:text-[#a25ddc]">
                                    <ImageIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Accepted Formats</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">JPG, PNG, WebP, GIF, SVG</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Toolbar: Search, Filters, View Modes & Upload CTA */}
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.08] dark:bg-[#19192A]/40">
                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search by filename, title, or alt text..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-9 text-xs h-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0073ea] dark:bg-black/20 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </form>

                        {/* Right controls: View Toggle & Upload Button */}
                        <div className="flex items-center gap-2">
                            {/* View Switcher */}
                            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-white/10 dark:bg-black/20">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`rounded-md p-1.5 transition-colors ${
                                        viewMode === 'grid'
                                            ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                    title="Grid View"
                                >
                                    <Grid3X3 className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`rounded-md p-1.5 transition-colors ${
                                        viewMode === 'table'
                                            ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                    title="Table / List View"
                                >
                                    <LayoutList className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Refresh Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.reload()}
                                className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05]"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isSearching ? 'animate-spin' : ''}`} />
                            </Button>

                            {/* Upload CTA */}
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setIsUploadOpen(true)}
                                className="h-9 gap-1.5 bg-[#0073ea] text-white hover:bg-[#0060c0] font-semibold text-xs shadow-sm"
                            >
                                <UploadCloud className="h-4 w-4" />
                                <span>Upload New Image</span>
                            </Button>
                        </div>
                    </div>

                    {/* Media Assets Content */}
                    {assets.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 p-12 text-center dark:border-white/10 dark:bg-black/10">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0073ea]/10 text-[#0073ea] dark:bg-[#0073ea]/20 dark:text-[#579bfc]">
                                <ImageIcon className="h-7 w-7" />
                            </div>
                            <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                                {filters.search ? 'No media assets found' : 'No images in media library yet'}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                                {filters.search
                                    ? `No files matched "${filters.search}". Try clearing your search query.`
                                    : 'Upload your first image asset to start organizing deliverables, avatars, and Kanban attachments.'}
                            </p>
                            <div className="mt-5 flex gap-2">
                                {filters.search ? (
                                    <Button variant="outline" size="sm" onClick={handleClearSearch} className="text-xs">
                                        Clear Search
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={() => setIsUploadOpen(true)}
                                        className="gap-1.5 bg-[#0073ea] text-white hover:bg-[#0060c0] text-xs font-semibold"
                                    >
                                        <UploadCloud className="h-4 w-4" />
                                        <span>Upload First Image</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* Grid View */
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {assets.data.map((asset) => (
                                <div
                                    key={asset.id}
                                    onClick={() => setInspectAsset(asset)}
                                    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-[#0073ea]/40 hover:shadow-md dark:border-white/[0.08] dark:bg-[#19192A]/40 dark:hover:border-[#579bfc]/50"
                                >
                                    {/* Thumbnail container with transparency checkerboard */}
                                    <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-black/30">
                                        <div
                                            className="absolute inset-0 opacity-15 dark:opacity-5"
                                            style={{
                                                backgroundImage:
                                                    'radial-gradient(currentColor 1px, transparent 1px), radial-gradient(currentColor 1px, transparent 1px)',
                                                backgroundSize: '16px 16px',
                                                backgroundPosition: '0 0, 8px 8px',
                                            }}
                                        />
                                        <img
                                            src={asset.url}
                                            alt={asset.alt_text || asset.original_filename}
                                            className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-105"
                                            loading="lazy"
                                        />

                                        {/* Hover Quick Action Buttons */}
                                        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-150 group-hover:opacity-100">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setInspectAsset(asset);
                                                }}
                                                className="rounded-lg bg-white/90 p-1.5 text-slate-800 shadow hover:bg-white hover:text-[#0073ea] dark:bg-slate-900/90 dark:text-slate-200 dark:hover:text-[#579bfc]"
                                                title="Quick Preview"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => handleCopyUrl(e, asset)}
                                                className="rounded-lg bg-white/90 p-1.5 text-slate-800 shadow hover:bg-white hover:text-emerald-600 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:text-[#00c875]"
                                                title={copiedId === asset.id ? 'Copied URL!' : 'Copy Direct URL'}
                                            >
                                                {copiedId === asset.id ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </button>

                                            <a
                                                href={asset.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="rounded-lg bg-white/90 p-1.5 text-slate-800 shadow hover:bg-white hover:text-purple-600 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:text-[#a25ddc]"
                                                title="Open Original in New Tab"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteAsset(asset);
                                                }}
                                                className="rounded-lg bg-white/90 p-1.5 text-rose-600 shadow hover:bg-rose-600 hover:text-white dark:bg-slate-900/90 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
                                                title="Delete Asset"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {/* Usages Badge on top right */}
                                        <div className="absolute top-2 right-2">
                                            {asset.usages_count && asset.usages_count > 0 ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm backdrop-blur-xs">
                                                    {asset.usages_count} uses
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-slate-900/60 px-1.5 py-0.5 text-[9px] font-medium text-slate-300 backdrop-blur-xs">
                                                    Unused
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Information */}
                                    <div className="flex flex-1 flex-col justify-between p-2.5">
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white" title={asset.original_filename}>
                                                {asset.title || asset.original_filename}
                                            </p>
                                            <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                                {asset.original_filename}
                                            </p>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
                                            <span>{formatBytes(asset.file_size_bytes)}</span>
                                            {asset.width && asset.height && (
                                                <span>{asset.width}×{asset.height}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Table / List View */
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#19192A]/40">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:border-white/[0.08] dark:bg-black/20 dark:text-slate-300">
                                        <tr>
                                            <th className="py-3 pl-4 pr-3">Preview</th>
                                            <th className="px-3 py-3">File Name & Title</th>
                                            <th className="px-3 py-3">Dimensions</th>
                                            <th className="px-3 py-3">File Size</th>
                                            <th className="px-3 py-3">Usages</th>
                                            <th className="px-3 py-3">Uploaded By</th>
                                            <th className="px-3 py-3">Date</th>
                                            <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                                        {assets.data.map((asset) => (
                                            <tr
                                                key={asset.id}
                                                onClick={() => setInspectAsset(asset)}
                                                className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                                            >
                                                <td className="py-2.5 pl-4 pr-3">
                                                    <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-white/10 dark:bg-black/30">
                                                        <img
                                                            src={asset.url}
                                                            alt={asset.original_filename}
                                                            className="h-full w-full object-contain"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                        {asset.title || asset.original_filename}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        {asset.original_filename}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                                                    {asset.width && asset.height ? `${asset.width} × ${asset.height} px` : '—'}
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                                                    {formatBytes(asset.file_size_bytes)}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    {asset.usages_count && asset.usages_count > 0 ? (
                                                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                            {asset.usages_count} {asset.usages_count === 1 ? 'task' : 'tasks'}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[10px] text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                                                            Unused
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                                                    {asset.user?.name || 'System / Admin'}
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                                                    {formatDate(asset.created_at)}
                                                </td>
                                                <td className="py-2.5 pl-3 pr-4 text-right">
                                                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => handleCopyUrl(e, asset)}
                                                            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                                            title={copiedId === asset.id ? 'Copied!' : 'Copy URL'}
                                                        >
                                                            {copiedId === asset.id ? (
                                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>

                                                        <a
                                                            href={asset.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                                                            title="Open Link"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </a>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteAsset(asset)}
                                                            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination Bar */}
                    {assets.links && assets.links.length > 3 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row dark:border-white/[0.08]">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Showing <span className="font-semibold text-slate-900 dark:text-white">{assets.from || 0}</span> to{' '}
                                <span className="font-semibold text-slate-900 dark:text-white">{assets.to || 0}</span> of{' '}
                                <span className="font-semibold text-slate-900 dark:text-white">{assets.total}</span> assets
                            </p>

                            <div className="flex items-center gap-1">
                                {assets.links.map((link, idx) => {
                                    // Strip html entities if any (like &laquo;)
                                    const cleanLabel = link.label
                                        .replace('&laquo; Previous', 'Prev')
                                        .replace('Next &raquo;', 'Next');

                                    if (!link.url) {
                                        return (
                                            <span
                                                key={idx}
                                                className="rounded-lg px-2.5 py-1 text-xs text-slate-400 dark:text-slate-600"
                                                dangerouslySetInnerHTML={{ __html: cleanLabel }}
                                            />
                                        );
                                    }

                                    return (
                                        <Link
                                            key={idx}
                                            href={link.url}
                                            preserveScroll
                                            preserveState
                                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                                link.active
                                                    ? 'bg-[#0073ea] text-white shadow-xs'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: cleanLabel }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </SettingsLayout>

            {/* Lightbox / Asset Inspector Modal */}
            <Dialog open={!!inspectAsset} onOpenChange={() => setInspectAsset(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C2E] border-slate-200 dark:border-white/10">
                    {inspectAsset && (
                        <div className="flex flex-col md:flex-row max-h-[85vh]">
                            {/* Left: Big Preview with Dark Backdrop */}
                            <div className="relative flex flex-1 items-center justify-center bg-slate-950 p-6 min-h-[300px]">
                                <img
                                    src={inspectAsset.url}
                                    alt={inspectAsset.alt_text || inspectAsset.original_filename}
                                    className="max-h-[60vh] max-w-full rounded-md object-contain shadow-2xl"
                                />
                            </div>

                            {/* Right: Asset Metadata & Controls */}
                            <div className="w-full md:w-80 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50/50 p-6 dark:border-white/10 dark:bg-[#181828]">
                                <div className="space-y-4">
                                    <div>
                                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-white break-words">
                                            {inspectAsset.title || inspectAsset.original_filename}
                                        </DialogTitle>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-all">
                                            {inspectAsset.original_filename}
                                        </p>
                                    </div>

                                    {/* Usages Alert */}
                                    {inspectAsset.usages_count && inspectAsset.usages_count > 0 ? (
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                                            <span className="font-bold">Referenced Asset:</span> Used in {inspectAsset.usages_count} active Kanban task(s) or comment(s).
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                                            <span>Standalone: Not currently attached to any tasks.</span>
                                        </div>
                                    )}

                                    {/* Metadata List */}
                                    <div className="space-y-2 border-t border-slate-200 pt-3 text-xs dark:border-white/10">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Dimensions:</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {inspectAsset.width && inspectAsset.height
                                                    ? `${inspectAsset.width} × ${inspectAsset.height} px`
                                                    : 'Vector / N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">File Size:</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatBytes(inspectAsset.file_size_bytes)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">MIME Type:</span>
                                            <span className="font-mono text-[11px] text-slate-900 dark:text-white">
                                                {inspectAsset.mime_type}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Storage Disk:</span>
                                            <span className="font-semibold capitalize text-slate-900 dark:text-white">
                                                {inspectAsset.disk}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Uploaded By:</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {inspectAsset.user?.name || 'System'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Date Added:</span>
                                            <span className="font-medium text-slate-900 dark:text-white">
                                                {formatDate(inspectAsset.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 dark:border-white/10">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={(e) => handleCopyUrl(e, inspectAsset)}
                                        className="w-full gap-2 text-xs border-slate-200 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                                    >
                                        {copiedId === inspectAsset.id ? (
                                            <>
                                                <Check className="h-4 w-4 text-emerald-600" />
                                                <span className="text-emerald-600 font-semibold">Copied Direct URL</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                <span>Copy Direct URL</span>
                                            </>
                                        )}
                                    </Button>

                                    <a
                                        href={inspectAsset.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={inspectAsset.original_filename}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
                                    >
                                        <Download className="h-4 w-4" />
                                        <span>Download File</span>
                                    </a>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleDeleteAsset(inspectAsset)}
                                        className="w-full gap-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Delete Permanently</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Upload Modal */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1C1C2E] border-slate-200 dark:border-white/10">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                            <UploadCloud className="h-5 w-5 text-[#0073ea] dark:text-[#579bfc]" />
                            <span>Upload Image Asset</span>
                        </DialogTitle>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Files are automatically stored on {storageDisk === 's3' ? 'S3 object storage' : 'secure local storage'} with auto-generated dimensions.
                        </p>
                    </DialogHeader>

                    <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                        {/* Drag and Drop Zone */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                                isDragging
                                    ? 'border-[#0073ea] bg-[#0073ea]/5 dark:border-[#579bfc] dark:bg-[#579bfc]/10'
                                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/50 dark:border-white/10 dark:bg-black/20 dark:hover:border-white/20'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                className="hidden"
                            />

                            {uploadPreview ? (
                                <div className="space-y-3">
                                    <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-black/40">
                                        <img src={uploadPreview} alt="Upload preview" className="h-full w-full object-contain" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-white">
                                        {uploadFile?.name} ({formatBytes(uploadFile?.size || 0)})
                                    </p>
                                    <span className="text-[11px] text-[#0073ea] hover:underline dark:text-[#579bfc]">
                                        Click to change selected image
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0073ea]/10 text-[#0073ea] dark:bg-[#0073ea]/20 dark:text-[#579bfc]">
                                        <UploadCloud className="h-6 w-6" />
                                    </div>
                                    <p className="mt-3 text-xs font-semibold text-slate-800 dark:text-white">
                                        Drag & drop your image here, or <span className="text-[#0073ea] dark:text-[#579bfc]">browse</span>
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                        JPG, PNG, WebP, GIF, or SVG up to 10MB
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Title and Alt Text Inputs */}
                        {uploadFile && (
                            <div className="space-y-3 pt-2">
                                <div className="space-y-1">
                                    <Label htmlFor="upload_title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Asset Title (Optional)
                                    </Label>
                                    <Input
                                        id="upload_title"
                                        type="text"
                                        value={uploadTitle}
                                        onChange={(e) => setUploadTitle(e.target.value)}
                                        placeholder="e.g. Homepage Hero Banner"
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="upload_alt" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Alt Text / Description (Optional)
                                    </Label>
                                    <Input
                                        id="upload_alt"
                                        type="text"
                                        value={uploadAltText}
                                        onChange={(e) => setUploadAltText(e.target.value)}
                                        placeholder="Accessible description for screen readers"
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error message */}
                        {uploadError && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                                {uploadError}
                            </div>
                        )}

                        <DialogFooter className="mt-6 flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsUploadOpen(false)}
                                disabled={isUploading}
                                className="text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!uploadFile || isUploading}
                                className="gap-1.5 bg-[#0073ea] text-white hover:bg-[#0060c0] text-xs font-semibold"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="h-4 w-4" />
                                        <span>Upload File</span>
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
