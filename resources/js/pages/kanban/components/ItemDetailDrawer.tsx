import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';
import { router } from '@inertiajs/react';
import {
    Activity,
    AtSign,
    Check,
    CornerDownRight,
    Download,
    ExternalLink,
    Eye,
    FileText,
    Image as ImageIcon,
    Link2,
    MessageCircle,
    Paperclip,
    Send,
    Trash2,
    Upload,
    User as UserIcon,
    X,
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { KanbanBoard, MediaAsset, Task, User } from '../types';
import MultiPeoplePicker from './MultiPeoplePicker';
import ImageCell from './ImageCell';
import MediaPickerModal from '@/components/media/MediaPickerModal';

interface ItemDetailDrawerProps {
    task: Task | null;
    board: KanbanBoard;
    users: User[];
    onClose: () => void;
    onSelectTask?: (task: Task) => void;
}

export default function ItemDetailDrawer({ task, board, users = [], onClose, onSelectTask }: ItemDetailDrawerProps) {
    if (!task) return null;

    const [activeCollabTab, setActiveCollabTab] = useState<'updates' | 'files' | 'activity'>('updates');
    const [titleInput, setTitleInput] = useState(task.title);
    const [commentText, setCommentText] = useState('');
    const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [mediaTarget, setMediaTarget] = useState<'task_attachment' | 'comment'>('task_attachment');
    const [lightboxAsset, setLightboxAsset] = useState<MediaAsset | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const comments = task.comments || [];
    const subitems = task.subitems || [];
    const attachments = task.attachments || [];
    const mediaUsages = task.media_usages || task.mediaUsages || [];
    const boardColumns = board.board_columns || [];
    const statusColumns = board.columns || [];

    const completedSubitems = subitems.filter((s) => s.completed_at || s.progress === 100).length;

    // Dismiss drawer on Escape key
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Field updates
    const handleUpdateField = (field: string, val: any) => {
        router.patch(`/kanban/tasks/${task.id}`, { [field]: val }, { preserveScroll: true });
    };

    // Parse and render inline images for comments
    const renderCommentContent = (text: string) => {
        if (!text) return null;
        const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = imgRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(<span key={lastIndex}>{text.substring(lastIndex, match.index)}</span>);
            }
            const alt = match[1] || 'image';
            const src = match[2];
            parts.push(
                <div key={match.index} className="my-2 max-w-sm rounded-xl overflow-hidden border border-border/70 shadow-2xs">
                    <img
                        src={src}
                        alt={alt}
                        onClick={() =>
                            setLightboxAsset({
                                id: 0,
                                media_uuid: '',
                                disk: 'public',
                                file_path: src,
                                original_filename: alt,
                                mime_type: 'image/png',
                                file_size_bytes: 0,
                                url: src,
                                created_at: '',
                            })
                        }
                        className="max-h-56 w-auto cursor-pointer rounded-lg object-contain hover:opacity-95"
                    />
                </div>
            );
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(<span key={lastIndex}>{text.substring(lastIndex)}</span>);
        }

        return parts.length > 0 ? parts : text;
    };

    const primaryAssigneeIds = useMemo(() => {
        if (!task) return [];
        if (Array.isArray(task.custom_values?.['designer_ids'])) {
            return task.custom_values['designer_ids'].map(Number).filter(Boolean);
        }
        if (Array.isArray(task.custom_values?.['person'])) {
            return task.custom_values['person'].map(Number).filter(Boolean);
        }
        return task.assigned_to ? [task.assigned_to] : [];
    }, [task]);

    const handlePrimaryAssigneeChange = (newIds: number[]) => {
        if (!task) return;
        router.patch(
            `/kanban/tasks/${task.id}`,
            {
                assigned_to: newIds[0] ?? null,
                custom_values: {
                    ...(task.custom_values || {}),
                    designer_ids: newIds,
                    person: newIds,
                },
            },
            { preserveScroll: true },
        );
    };

    const handleTitleBlur = () => {
        if (titleInput.trim() && titleInput !== task.title) {
            handleUpdateField('title', titleInput.trim());
        }
    };

    // Subtasks
    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;

        router.post(
            `/kanban/tasks/${task.id}/subitems`,
            { title: newSubtaskTitle.trim() },
            {
                preserveScroll: true,
                onSuccess: () => setNewSubtaskTitle(''),
            },
        );
    };

    const handleToggleSubtask = (sub: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        const isDone = !!sub.completed_at || sub.progress === 100;
        router.patch(`/kanban/tasks/${sub.id}`, { progress: isDone ? 0 : 100 }, { preserveScroll: true });
    };

    // Comments & Replies
    const handleSendComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        router.post(
            `/kanban/tasks/${task.id}/comments`,
            { message: commentText.trim() },
            {
                preserveScroll: true,
                onSuccess: () => setCommentText(''),
            },
        );
    };

    const handleSendReply = (parentId: number, e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        router.post(
            `/kanban/tasks/${task.id}/comments`,
            {
                parent_id: parentId,
                message: replyText.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReplyText('');
                    setReplyingToCommentId(null);
                },
            },
        );
    };

    const handleDeleteComment = (commentId: number) => {
        if (confirm('Delete this update?')) {
            router.delete(`/kanban/comments/${commentId}`, { preserveScroll: true });
        }
    };

    const handleReaction = (commentId: number, emoji: string) => {
        router.post(`/kanban/comments/${commentId}/reactions`, { emoji }, { preserveScroll: true });
    };

    // Attachments
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        router.post(`/kanban/tasks/${task.id}/attachments`, formData, {
            preserveScroll: true,
            onFinish: () => {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    };

    const handleDeleteAttachment = (attachmentId: number) => {
        if (confirm('Delete this file attachment?')) {
            router.delete(`/kanban/attachments/${attachmentId}`, { preserveScroll: true });
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div
            onClick={onClose}
            className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs duration-200 sm:p-6"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-card border-border flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
            >
                {/* Header Top Bar */}
                <div className="border-border bg-muted/20 flex items-center justify-between border-b px-6 py-3.5">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
                        <span>{board.title}</span>
                        <span>›</span>
                        <span className="text-foreground">{task.group?.title || 'General Tasks'}</span>
                        {task.parent && (
                            <>
                                <span>›</span>
                                <button onClick={() => onSelectTask?.(task.parent!)} className="text-primary font-bold hover:underline">
                                    {task.parent.title}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl p-1.5 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Two-Column Grid Body */}
                <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
                    {/* LEFT PANEL: TASK INFORMATION (5 Columns) */}
                    <div className="border-border bg-card space-y-5 overflow-y-auto border-b p-6 lg:col-span-5 lg:border-r lg:border-b-0">
                        {/* Task Title */}
                        <div>
                            <input
                                type="text"
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                                onBlur={handleTitleBlur}
                                onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                                className="text-foreground focus:ring-primary w-full rounded border-none bg-transparent p-1 text-xl font-black focus:ring-1 focus:outline-none"
                                placeholder="Task Title"
                            />
                        </div>

                        {/* Fields Grid */}
                        <div className="space-y-3.5 text-xs">
                            {/* Workflow Status */}
                            <div className="grid grid-cols-3 items-center">
                                <Label className="text-muted-foreground font-medium">Status</Label>
                                <div className="col-span-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className="rounded-lg px-3 py-1.5 text-center text-xs font-bold text-white shadow-2xs transition-all hover:brightness-105"
                                                style={{ backgroundColor: task.column?.color || '#64748b' }}
                                            >
                                                {task.column?.title || 'Not Started'}
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-40 space-y-1 rounded-xl p-1.5">
                                            {statusColumns.map((sc) => (
                                                <button
                                                    key={sc.id}
                                                    type="button"
                                                    onClick={() => handleUpdateField('column_id', sc.id)}
                                                    className="block w-full rounded py-1.5 text-center text-xs font-bold text-white hover:opacity-90"
                                                    style={{ backgroundColor: sc.color }}
                                                >
                                                    {sc.title}
                                                </button>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Assignee / Designer */}
                            <div className="grid grid-cols-3 items-center">
                                <Label className="text-muted-foreground font-medium">Assignee</Label>
                                <div className="col-span-2">
                                    <MultiPeoplePicker
                                        selectedUserIds={primaryAssigneeIds}
                                        users={users}
                                        onChange={handlePrimaryAssigneeChange}
                                        placeholder="Unassigned"
                                        align="start"
                                    />
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="grid grid-cols-3 items-center">
                                <Label className="text-muted-foreground font-medium">Priority</Label>
                                <div className="col-span-2">
                                    <select
                                        defaultValue={task.priority}
                                        onChange={(e) => handleUpdateField('priority', e.target.value)}
                                        className="border-border bg-background h-8 rounded-xl border px-2.5 text-xs font-bold"
                                    >
                                        <option value="Urgent">Urgent</option>
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                            </div>

                            {/* Deadline Status Badge */}
                            {task.due_date && (
                                <div className="grid grid-cols-3 items-center">
                                    <Label className="text-muted-foreground font-medium">Deadline Status</Label>
                                    <div className="col-span-2">
                                        {task.deadline_status === 'overdue' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-600">
                                                Overdue
                                            </span>
                                        )}
                                        {task.deadline_status === 'due_today' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600">
                                                Due Today
                                            </span>
                                        )}
                                        {task.deadline_status === 'due_soon' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600">
                                                Due Soon (48h)
                                            </span>
                                        )}
                                        {task.deadline_status === 'upcoming' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                Upcoming
                                            </span>
                                        )}
                                        {task.deadline_status === 'completed_on_time' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                                                Completed On Time
                                            </span>
                                        )}
                                        {task.deadline_status === 'completed_late' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600">
                                                Completed Late
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Start Date & Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1 sm:gap-0">
                                <Label className="text-muted-foreground font-medium">Start Date & Time</Label>
                                <div className="sm:col-span-2 flex items-center gap-2 min-w-0">
                                    <Input
                                        type="date"
                                        defaultValue={task.start_date || ''}
                                        onChange={(e) => handleUpdateField('start_date', e.target.value || null)}
                                        className="h-8 flex-1 min-w-0 px-2 text-xs"
                                    />
                                    <Input
                                        type="time"
                                        defaultValue={task.start_time || ''}
                                        onChange={(e) => handleUpdateField('start_time', e.target.value || null)}
                                        className="h-8 w-[118px] shrink-0 px-2 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Due Date & Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1 sm:gap-0">
                                <Label className="text-muted-foreground font-medium">Due Date & Time</Label>
                                <div className="sm:col-span-2 flex items-center gap-2 min-w-0">
                                    <Input
                                        type="date"
                                        defaultValue={task.due_date || ''}
                                        onChange={(e) => handleUpdateField('due_date', e.target.value || null)}
                                        className="h-8 flex-1 min-w-0 px-2 text-xs"
                                    />
                                    <Input
                                        type="time"
                                        defaultValue={task.due_time || ''}
                                        onChange={(e) => handleUpdateField('due_time', e.target.value || null)}
                                        className="h-8 w-[118px] shrink-0 px-2 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Milestone & Deadline Reminders */}
                            <div className="grid grid-cols-3 items-center">
                                <Label className="text-muted-foreground font-medium">Milestone & Alert</Label>
                                <div className="col-span-2 flex items-center justify-between gap-3">
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                        <input
                                            type="checkbox"
                                            defaultChecked={Boolean(task.is_milestone)}
                                            onChange={(e) => handleUpdateField('is_milestone', e.target.checked)}
                                            className="rounded border-border text-primary focus:ring-primary"
                                        />
                                        <span>Milestone</span>
                                    </label>

                                    <select
                                        defaultValue={task.reminder_lead_minutes !== null && task.reminder_lead_minutes !== undefined ? String(task.reminder_lead_minutes) : ''}
                                        onChange={(e) => handleUpdateField('reminder_lead_minutes', e.target.value === '' ? null : Number(e.target.value))}
                                        className="border-border bg-background h-8 rounded-xl border px-2 text-xs"
                                    >
                                        <option value="">No Reminder</option>
                                        <option value="0">At deadline</option>
                                        <option value="5">5 mins before</option>
                                        <option value="15">15 mins before</option>
                                        <option value="30">30 mins before</option>
                                        <option value="60">1 hour before</option>
                                        <option value="1440">1 day before</option>
                                    </select>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="grid grid-cols-3 items-center">
                                <Label className="text-muted-foreground font-medium">Progress</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${task.progress}%` }} />
                                    </div>
                                    <span className="w-8 text-right text-xs font-bold">{task.progress}%</span>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <Label className="text-muted-foreground mb-1 block font-medium">Description</Label>
                                <textarea
                                    rows={3}
                                    defaultValue={task.description || ''}
                                    onBlur={(e) => handleUpdateField('description', e.target.value)}
                                    placeholder="Add notes or task background..."
                                    className="border-border bg-background focus:ring-primary w-full rounded-xl border p-2.5 text-xs focus:ring-1 focus:outline-none"
                                />
                            </div>

                            {/* Custom Dynamic Columns */}
                            {boardColumns.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <div className="text-muted-foreground border-border/60 border-t pt-3 text-[11px] font-bold uppercase tracking-wider">
                                        Board Columns & Custom Fields
                                    </div>
                                    {boardColumns.map((col) => {
                                        const customVal = (task.custom_values as Record<string, any>)?.[col.key] ?? '';
                                        return (
                                            <div key={col.id} className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1 sm:gap-0">
                                                <Label className="text-muted-foreground font-medium truncate" title={col.title}>
                                                    {col.title}
                                                </Label>
                                                <div className="sm:col-span-2">
                                                    {col.type === 'people' ? (
                                                        <MultiPeoplePicker
                                                            selectedUserIds={
                                                                Array.isArray(customVal)
                                                                    ? customVal.map(Number).filter(Boolean)
                                                                    : typeof customVal === 'number' && customVal > 0
                                                                      ? [customVal]
                                                                      : []
                                                            }
                                                            users={users}
                                                            onChange={(newIds) =>
                                                                handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: newIds,
                                                                })
                                                            }
                                                            placeholder="Assign..."
                                                            align="start"
                                                        />
                                                    ) : col.type === 'long_text' ? (
                                                        <textarea
                                                            rows={2}
                                                            defaultValue={customVal}
                                                            onBlur={(e) =>
                                                                handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: e.target.value,
                                                                })
                                                            }
                                                            placeholder={`Enter ${col.title.toLowerCase()}...`}
                                                            className="border-border bg-background focus:ring-primary w-full rounded-xl border p-2 text-xs focus:ring-1 focus:outline-none"
                                                        />
                                                    ) : col.type === 'checkbox' ? (
                                                        <input
                                                            type="checkbox"
                                                            defaultChecked={Boolean(customVal)}
                                                            onChange={(e) =>
                                                                handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: e.target.checked,
                                                                })
                                                            }
                                                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                                        />
                                                    ) : col.type === 'dropdown' && col.config?.options ? (
                                                        <select
                                                            defaultValue={customVal}
                                                            onChange={(e) =>
                                                                handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: e.target.value,
                                                                })
                                                            }
                                                            className="border-border bg-background h-8 w-full rounded-xl border px-2.5 text-xs"
                                                        >
                                                            <option value="">Select option</option>
                                                            {col.config.options.map((opt: string) => (
                                                                <option key={opt} value={opt}>
                                                                    {opt}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : col.type === 'number' ? (
                                                        <Input
                                                            type="number"
                                                            defaultValue={customVal}
                                                            onBlur={(e) =>
                                                                handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: e.target.value ? Number(e.target.value) : null,
                                                                })
                                                            }
                                                            className="h-8 text-xs"
                                                        />
                                                    ) : col.type === 'date' ? (
                                                        <Input
                                                            type="date"
                                                            defaultValue={customVal}
                                                            onChange={(e) =>
                                                                handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: e.target.value || null,
                                                                })
                                                            }
                                                            className="h-8 text-xs"
                                                        />
                                                    ) : col.type === 'image' ? (
                                                        <div className="flex items-center">
                                                            <ImageCell task={task} column={col} workspaceId={board.workspace_id} />
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            type="text"
                                                            defaultValue={customVal}
                                                            onBlur={(e) =>
                                                                handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: e.target.value,
                                                                })
                                                            }
                                                            placeholder={`Enter ${col.title.toLowerCase()}...`}
                                                            className="h-8 text-xs"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Subtask Hierarchy & List */}
                        <div className="border-border/60 space-y-3 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-foreground flex items-center gap-1.5 text-xs font-black">
                                    <CornerDownRight className="text-primary h-3.5 w-3.5" />
                                    <span>
                                        Subtasks ({completedSubitems}/{subitems.length})
                                    </span>
                                </h4>
                            </div>

                            {/* Subtask List */}
                            <div className="max-h-48 space-y-1.5 overflow-y-auto">
                                {subitems.map((sub) => (
                                    <div
                                        key={sub.id}
                                        onClick={() => onSelectTask?.(sub)}
                                        className="bg-muted/20 border-border/60 hover:border-primary/50 flex cursor-pointer items-center justify-between rounded-xl border p-2 text-xs transition-all"
                                    >
                                        <div className="flex flex-1 items-center gap-2 truncate">
                                            <button
                                                type="button"
                                                onClick={(e) => handleToggleSubtask(sub, e)}
                                                className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                                                    sub.completed_at || sub.progress === 100
                                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                                        : 'border-border bg-card'
                                                }`}
                                            >
                                                {(sub.completed_at || sub.progress === 100) && <Check className="h-3 w-3" />}
                                            </button>
                                            <span
                                                className={`truncate ${
                                                    sub.completed_at || sub.progress === 100
                                                        ? 'text-muted-foreground line-through'
                                                        : 'text-foreground font-semibold'
                                                }`}
                                            >
                                                {sub.title}
                                            </span>
                                        </div>

                                        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-bold">
                                            {sub.column?.title || 'Active'}
                                        </span>
                                    </div>
                                ))}

                                {/* Add Subtask Input */}
                                <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5 pt-1">
                                    <Input
                                        placeholder="Add a new subtask..."
                                        value={newSubtaskTitle}
                                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                        className="h-8 flex-1 text-xs"
                                    />
                                    <Button type="submit" size="sm" className="h-8 text-xs font-bold">
                                        Add
                                    </Button>
                                </form>
                            </div>
                        </div>

                        {/* Connected Boards & Workflows (Phase 6) */}
                        <div className="border-border/60 space-y-3 border-t pt-4">
                            <h4 className="text-foreground flex items-center justify-between text-xs font-black">
                                <span className="flex items-center gap-1.5">
                                    <Link2 className="text-primary h-3.5 w-3.5" />
                                    <span>Connected Board Items ({task.outgoingRelationships?.length || 0})</span>
                                </span>
                            </h4>

                            {!task.outgoingRelationships || task.outgoingRelationships.length === 0 ? (
                                <p className="text-muted-foreground text-[11px] italic">
                                    No cross-board items connected yet. Add a Connect Boards column to link tasks across departments.
                                </p>
                            ) : (
                                <div className="space-y-1.5">
                                    {task.outgoingRelationships.map((rel) => (
                                        <div
                                            key={rel.id}
                                            className="bg-muted/20 border-border/50 flex items-center justify-between rounded-xl border p-2 text-xs"
                                        >
                                            <div className="flex flex-1 items-center gap-2 truncate">
                                                <Link2 className="text-primary h-3 w-3 shrink-0" />
                                                <div className="truncate">
                                                    <span className="text-foreground block truncate font-semibold">
                                                        {rel.target_task?.title || `Item #${rel.target_task_id}`}
                                                    </span>
                                                    <span className="text-muted-foreground text-[10px]">
                                                        {rel.target_board?.title || 'External Board'} •{' '}
                                                        {rel.relation_type === 'two_way' ? 'Two-Way' : 'One-Way'}
                                                    </span>
                                                </div>
                                            </div>
                                            {rel.target_task?.column && (
                                                <span
                                                    className="py-0.2 shrink-0 rounded px-1.5 text-[9px] font-bold text-white"
                                                    style={{ backgroundColor: rel.target_task.column.color || '#64748b' }}
                                                >
                                                    {rel.target_task.column.title}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: COLLABORATION (7 Columns) */}
                    <div className="bg-background flex flex-col overflow-hidden lg:col-span-7">
                        {/* Tabs Bar */}
                        <div className="border-border flex items-center gap-6 border-b px-6 pt-4 text-xs font-bold">
                            <button
                                onClick={() => setActiveCollabTab('updates')}
                                className={`flex items-center gap-1.5 border-b-2 pb-3 transition-all ${
                                    activeCollabTab === 'updates'
                                        ? 'border-primary text-primary'
                                        : 'text-muted-foreground hover:text-foreground border-transparent'
                                }`}
                            >
                                <MessageCircle className="h-4 w-4" />
                                <span>Updates ({comments.length})</span>
                            </button>

                            <button
                                onClick={() => setActiveCollabTab('files')}
                                className={`flex items-center gap-1.5 border-b-2 pb-3 transition-all ${
                                    activeCollabTab === 'files'
                                        ? 'border-primary text-primary'
                                        : 'text-muted-foreground hover:text-foreground border-transparent'
                                }`}
                            >
                                <Paperclip className="h-4 w-4" />
                                <span>Files ({attachments.length})</span>
                            </button>

                            <button
                                onClick={() => setActiveCollabTab('activity')}
                                className={`flex items-center gap-1.5 border-b-2 pb-3 transition-all ${
                                    activeCollabTab === 'activity'
                                        ? 'border-primary text-primary'
                                        : 'text-muted-foreground hover:text-foreground border-transparent'
                                }`}
                            >
                                <Activity className="h-4 w-4" />
                                <span>Activity Log</span>
                            </button>
                        </div>

                        {/* Tab Contents */}
                        <div className="flex-1 space-y-5 overflow-y-auto p-6">
                            {/* 1. UPDATES TAB */}
                            {activeCollabTab === 'updates' && (
                                <div className="space-y-5">
                                    {/* Composer */}
                                    <form onSubmit={handleSendComment} className="border-border bg-card rounded-2xl border p-3.5 shadow-xs">
                                        <textarea
                                            rows={3}
                                            placeholder="Write an update, ask a question, or use @mention for team members..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            className="placeholder:text-muted-foreground/60 w-full resize-none border-none bg-transparent text-xs focus:outline-none"
                                        />

                                        <div className="border-border/40 flex items-center justify-between border-t pt-2 text-xs">
                                            {/* @mention Quick Tool */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="text-muted-foreground hover:text-primary hover:bg-muted flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold"
                                                    >
                                                        <AtSign className="h-3.5 w-3.5" />
                                                        <span>Mention</span>
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-48 rounded-xl">
                                                    {users.map((u) => (
                                                        <DropdownMenuItem
                                                            key={u.id}
                                                            onClick={() => setCommentText((prev) => `${prev} @${u.name} `)}
                                                            className="text-xs"
                                                        >
                                                            <span>@{u.name}</span>
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <div className="flex items-center gap-1.5 ml-2 mr-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMediaTarget('comment');
                                                        setIsMediaModalOpen(true);
                                                    }}
                                                    className="text-muted-foreground hover:text-primary hover:bg-muted flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold"
                                                    title="Attach image from media library"
                                                >
                                                    <ImageIcon className="h-3.5 w-3.5" />
                                                    <span>Image</span>
                                                </button>
                                            </div>

                                            <Button type="submit" size="sm" className="h-8 gap-1 px-4 text-xs font-bold">
                                                <Send className="h-3 w-3" />
                                                <span>Update</span>
                                            </Button>
                                        </div>
                                    </form>

                                    {/* Comments List */}
                                    <div className="space-y-4">
                                        {comments.map((comment) => {
                                            const reactions = comment.reactions || {};
                                            const replies = comment.replies || [];

                                            return (
                                                <div key={comment.id} className="border-border/70 bg-card space-y-3 rounded-2xl border p-4 shadow-xs">
                                                    {/* Author & Timestamp */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="bg-primary/20 text-primary flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">
                                                                {comment.user?.name.charAt(0) || 'U'}
                                                            </div>
                                                            <div>
                                                                <h5 className="text-foreground text-xs font-bold">{comment.user?.name || 'User'}</h5>
                                                                <span className="text-muted-foreground text-[10px]">
                                                                    {formatDate(comment.created_at)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="text-muted-foreground rounded p-1 transition-colors hover:bg-red-500/10 hover:text-red-500"
                                                            title="Delete update"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>

                                                    {/* Message */}
                                                    <div className="text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                                                        {renderCommentContent(comment.message)}
                                                    </div>

                                                    {/* Reaction Badges & Actions */}
                                                    <div className="border-border/40 flex items-center gap-2 border-t pt-2 text-xs">
                                                        {/* Emoji buttons */}
                                                        {['👍', '❤️', '🎉', '🚀'].map((emoji) => {
                                                            const count = reactions[emoji]?.length || 0;
                                                            return (
                                                                <button
                                                                    key={emoji}
                                                                    type="button"
                                                                    onClick={() => handleReaction(comment.id, emoji)}
                                                                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-all ${
                                                                        count > 0
                                                                            ? 'bg-primary/10 border-primary/40 text-primary'
                                                                            : 'border-border/60 hover:bg-muted text-muted-foreground'
                                                                    }`}
                                                                >
                                                                    <span>{emoji}</span>
                                                                    {count > 0 && <span>{count}</span>}
                                                                </button>
                                                            );
                                                        })}

                                                        {/* Reply Trigger */}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)
                                                            }
                                                            className="text-primary ml-auto text-[11px] font-semibold hover:underline"
                                                        >
                                                            Reply ({replies.length})
                                                        </button>
                                                    </div>

                                                    {/* Threaded Replies */}
                                                    {replies.length > 0 && (
                                                        <div className="border-border/30 space-y-2 border-t pt-2 pl-6">
                                                            {replies.map((rep) => (
                                                                <div
                                                                    key={rep.id}
                                                                    className="bg-muted/30 border-border/50 rounded-xl border p-2.5 text-xs"
                                                                >
                                                                    <div className="mb-1 flex items-center justify-between">
                                                                        <span className="text-[11px] font-bold">{rep.user?.name || 'User'}</span>
                                                                        <span className="text-muted-foreground text-[10px]">
                                                                            {formatDate(rep.created_at)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-foreground/90 whitespace-pre-wrap">
                                                                        {renderCommentContent(rep.message)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Reply Composer */}
                                                    {replyingToCommentId === comment.id && (
                                                        <form
                                                            onSubmit={(e) => handleSendReply(comment.id, e)}
                                                            className="flex items-center gap-2 pt-2 pl-4"
                                                        >
                                                            <Input
                                                                placeholder="Write a reply..."
                                                                value={replyText}
                                                                onChange={(e) => setReplyText(e.target.value)}
                                                                autoFocus
                                                                className="h-8 flex-1 text-xs"
                                                            />
                                                            <Button type="submit" size="sm" className="h-8 text-xs font-bold">
                                                                Reply
                                                            </Button>
                                                        </form>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {comments.length === 0 && (
                                            <div className="text-muted-foreground py-12 text-center text-xs">
                                                No updates on this task yet. Start the conversation above!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 2. FILES TAB */}
                            {activeCollabTab === 'files' && (
                                <div className="space-y-4">
                                    {/* Upload & Media Library Triggers */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-border hover:border-primary/60 hover:bg-muted/10 cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all"
                                        >
                                            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
                                            <Upload className="text-primary mx-auto mb-1.5 h-6 w-6 opacity-80" />
                                            <div className="text-foreground text-xs font-bold">
                                                {isUploading ? 'Uploading file...' : 'Upload File'}
                                            </div>
                                            <p className="text-muted-foreground mt-0.5 text-[10px]">PDF, PNG, JPG, ZIP up to 20MB</p>
                                        </div>

                                        <div
                                            onClick={() => {
                                                setMediaTarget('task_attachment');
                                                setIsMediaModalOpen(true);
                                            }}
                                            className="border-border hover:border-primary/60 hover:bg-muted/10 cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all"
                                        >
                                            <ImageIcon className="text-primary mx-auto mb-1.5 h-6 w-6 opacity-80" />
                                            <div className="text-foreground text-xs font-bold">Media Library</div>
                                            <p className="text-muted-foreground mt-0.5 text-[10px]">Reusable team images & assets</p>
                                        </div>
                                    </div>

                                    {/* Attachments & Media Assets List */}
                                    <div className="space-y-2">
                                        {/* 1. Media Assets */}
                                        {mediaUsages.map((usage) => {
                                            const asset = usage.media_asset || usage.mediaAsset;
                                            if (!asset) return null;
                                            return (
                                                <div
                                                    key={`media-${usage.id}`}
                                                    className="border-border bg-card flex items-center justify-between rounded-xl border p-2.5 text-xs shadow-xs"
                                                >
                                                    <div className="flex flex-1 items-center gap-3 truncate">
                                                        <img
                                                            src={asset.url}
                                                            alt={asset.original_filename}
                                                            onClick={() => setLightboxAsset(asset)}
                                                            className="h-9 w-9 rounded-lg object-cover cursor-pointer border border-border/60 hover:scale-105 transition-transform shrink-0"
                                                        />
                                                        <div className="truncate">
                                                            <div className="text-foreground truncate font-bold">{asset.title || asset.original_filename}</div>
                                                            <span className="text-muted-foreground text-[10px]">
                                                                {formatBytes(asset.file_size_bytes)} • Media Asset
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setLightboxAsset(asset)}
                                                            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border p-1.5 transition-colors"
                                                            title="Preview image"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    await axios.post('/media/detach', {
                                                                        media_asset_id: asset.id,
                                                                        attachable_type: 'task',
                                                                        attachable_id: task.id,
                                                                        field_name: usage.field_name || 'default',
                                                                    });
                                                                    router.reload();
                                                                } catch (err) {
                                                                    console.error('Failed to detach media:', err);
                                                                }
                                                            }}
                                                            className="text-muted-foreground rounded-lg p-1.5 transition-colors hover:bg-red-500/10 hover:text-red-500"
                                                            title="Detach image"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* 2. File Attachments */}
                                        {attachments.map((att) => (
                                            <div
                                                key={att.id}
                                                className="border-border bg-card flex items-center justify-between rounded-xl border p-3 text-xs shadow-xs"
                                            >
                                                <div className="flex flex-1 items-center gap-3 truncate">
                                                    <FileText className="text-primary h-6 w-6 flex-shrink-0" />
                                                    <div className="truncate">
                                                        <div className="text-foreground truncate font-bold">{att.file_name}</div>
                                                        <span className="text-muted-foreground text-[10px]">
                                                            {formatBytes(att.file_size_bytes)} • {formatDate(att.created_at)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={`/storage/${att.file_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border p-1.5 transition-colors"
                                                        title="Download / View"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                        className="text-muted-foreground rounded-lg p-1.5 transition-colors hover:bg-red-500/10 hover:text-red-500"
                                                        title="Delete attachment"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {attachments.length === 0 && mediaUsages.length === 0 && (
                                            <div className="text-muted-foreground py-10 text-center text-xs">
                                                No attachments or media uploaded to this item yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 3. ACTIVITY LOG TAB */}
                            {activeCollabTab === 'activity' && (
                                <div className="space-y-3">
                                    {task.activities && task.activities.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {task.activities.map((act) => {
                                                const getBadgeColor = (type: string) => {
                                                    switch (type) {
                                                        case 'task_created':
                                                            return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                                                        case 'status_changed':
                                                            return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
                                                        case 'priority_changed':
                                                            return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
                                                        case 'assignee_changed':
                                                        case 'people_assignment_changed':
                                                            return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
                                                        case 'due_date_changed':
                                                        case 'due_time_changed':
                                                            return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
                                                        case 'progress_updated':
                                                            return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
                                                        case 'subitem_created':
                                                        case 'subitem_deleted':
                                                            return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
                                                        case 'comment_added':
                                                        case 'reply_added':
                                                            return 'bg-sky-500/10 text-sky-600 border-sky-500/20';
                                                        case 'attachment_uploaded':
                                                        case 'attachment_deleted':
                                                            return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
                                                        case 'dependency_added':
                                                        case 'dependency_removed':
                                                            return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
                                                        default:
                                                            return 'bg-muted text-muted-foreground border-border';
                                                    }
                                                };

                                                const getDotBg = (type: string) => {
                                                    switch (type) {
                                                        case 'task_created':
                                                            return 'bg-emerald-500';
                                                        case 'status_changed':
                                                            return 'bg-blue-500';
                                                        case 'priority_changed':
                                                            return 'bg-purple-500';
                                                        case 'assignee_changed':
                                                        case 'people_assignment_changed':
                                                            return 'bg-indigo-500';
                                                        case 'due_date_changed':
                                                        case 'due_time_changed':
                                                            return 'bg-amber-500';
                                                        case 'progress_updated':
                                                            return 'bg-teal-500';
                                                        case 'subitem_created':
                                                        case 'subitem_deleted':
                                                            return 'bg-cyan-500';
                                                        case 'comment_added':
                                                        case 'reply_added':
                                                            return 'bg-sky-500';
                                                        case 'attachment_uploaded':
                                                        case 'attachment_deleted':
                                                            return 'bg-rose-500';
                                                        case 'dependency_added':
                                                        case 'dependency_removed':
                                                            return 'bg-orange-500';
                                                        default:
                                                            return 'bg-slate-500';
                                                    }
                                                };

                                                return (
                                                    <div
                                                        key={act.id}
                                                        className="bg-card border-border flex items-start gap-3 rounded-2xl border p-3 text-xs shadow-2xs transition-colors hover:border-primary/40"
                                                    >
                                                        <div className="mt-0.5 flex flex-col items-center">
                                                            {act.user ? (
                                                                <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black">
                                                                    {act.user.name.charAt(0).toUpperCase()}
                                                                </div>
                                                            ) : (
                                                                <div className="bg-muted text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold">
                                                                    SYS
                                                                </div>
                                                            )}
                                                            <div className={`mt-1.5 h-1.5 w-1.5 rounded-full ${getDotBg(act.event_type)}`} />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                                                <span
                                                                    className={`rounded-full border px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider ${getBadgeColor(
                                                                        act.event_type,
                                                                    )}`}
                                                                >
                                                                    {act.event_type.replace(/_/g, ' ')}
                                                                </span>
                                                                <span className="text-muted-foreground text-[10px]">
                                                                    {formatDate(act.created_at)}
                                                                </span>
                                                            </div>

                                                            <p className="text-foreground text-xs leading-relaxed font-medium break-words">
                                                                {act.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="bg-card border-border flex items-center gap-3 rounded-xl border p-3 text-xs">
                                                <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-500" />
                                                <div>
                                                    <span className="text-foreground font-bold">Task Created</span>
                                                    <p className="text-muted-foreground text-[10px]">
                                                        Created by {task.creator?.name || 'System'} on {formatDate(task.created_at)}
                                                    </p>
                                                </div>
                                            </div>

                                            {task.completed_at && (
                                                <div className="bg-card border-border flex items-center gap-3 rounded-xl border p-3 text-xs">
                                                    <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500" />
                                                    <div>
                                                        <span className="text-foreground font-bold">Task Completed</span>
                                                        <p className="text-muted-foreground text-[10px]">Completed on {formatDate(task.completed_at)}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="bg-muted/20 border-border/50 text-muted-foreground rounded-xl border p-3 text-xs">
                                                All task mutations, status moves, people assignments, deadlines, subitems, and comments are recorded in real time.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Media Library Picker Modal */}
            <MediaPickerModal
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                workspaceId={board.workspace_id}
                attachableType={mediaTarget === 'task_attachment' ? 'task' : undefined}
                attachableId={mediaTarget === 'task_attachment' ? task.id : undefined}
                fieldName={mediaTarget === 'task_attachment' ? 'attachment' : 'comment'}
                title={mediaTarget === 'comment' ? 'Insert Image into Update' : 'Attach from Media Library'}
                onSelect={(asset) => {
                    if (mediaTarget === 'comment') {
                        setCommentText((prev) => `${prev} ![${asset.title || asset.original_filename}](${asset.url}) `);
                    } else {
                        router.reload();
                    }
                }}
            />

            {/* Lightbox for Attached Images */}
            {lightboxAsset && (
                <Dialog open={Boolean(lightboxAsset)} onOpenChange={() => setLightboxAsset(null)}>
                    <DialogContent className="max-w-xl rounded-2xl p-4 sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="truncate text-xs font-bold text-muted-foreground">
                                {lightboxAsset.title || lightboxAsset.original_filename}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="bg-muted/30 my-2 flex max-h-[60vh] items-center justify-center overflow-hidden rounded-xl">
                            <img
                                src={lightboxAsset.url}
                                alt={lightboxAsset.original_filename}
                                className="max-h-[55vh] w-auto max-w-full rounded-lg object-contain"
                            />
                        </div>
                        <div className="flex justify-end">
                            <a
                                href={lightboxAsset.url}
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
