import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate, formatDateTime, getExactTimeRemaining } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    AtSign,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    CornerDownRight,
    Download,
    ExternalLink,
    Eye,
    FileText,
    GitFork,
    Image as ImageIcon,
    Link2,
    MessageCircle,
    Paperclip,
    Pause,
    Play,
    Repeat,
    RotateCcw,
    Search,
    Send,
    Settings2,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    Upload,
    User as UserIcon,
    X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { BoardPermissions, getTaskAssignedUsers, isProductionDeadlineHidden, isUserAssignedToTask, KanbanBoard, MediaAsset, Task, TaskRecurrenceLog, TaskRecurrenceRule, TaskReviewCycle, User } from '../types';
import MultiPeoplePicker from './MultiPeoplePicker';
import ImageCell from './ImageCell';
import MediaPickerModal from '@/components/media/MediaPickerModal';
import EmployeeTaskPanel from './EmployeeTaskPanel';

interface ItemDetailDrawerProps {
    task: Task | null;
    board: KanbanBoard;
    users: User[];
    permissions?: BoardPermissions;
    onClose: () => void;
    onSelectTask?: (task: Task) => void;
}

export default function ItemDetailDrawer({ task, board, users = [], permissions, onClose, onSelectTask }: ItemDetailDrawerProps) {
    if (!task) return null;

    const { auth } = usePage().props as any;
    const currentUser = auth?.user;
    const isSuperAdminOrAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
    const isReviewerRole = isSuperAdminOrAdmin || currentUser?.role === 'project_manager' || currentUser?.role === 'account_manager';

    const isAssigned = Boolean(
        currentUser?.id && isUserAssignedToTask(task, currentUser.id, currentUser.id)
    );

    const canEditTask = permissions?.canEditTask ?? true;
    const canMoveAssignedTask = permissions?.canMoveAssignedTask ?? true;
    const canChangeStatus = (permissions?.canChangeStatus ?? true) || (canMoveAssignedTask && isAssigned);
    const canChangePriority = permissions?.canChangePriority ?? true;
    const canAssignUsers = permissions?.canAssignUsers ?? true;
    const canChangeDeadlines = permissions?.canChangeDeadlines ?? true;
    const canManageRecurrence = permissions?.canManageRecurrence ?? true;
    const canManageDependencies = permissions?.canManageDependencies ?? true;
    const canApproveReview = permissions?.canApproveReview ?? true;
    const canManageSubtasks = canEditTask || isAssigned;
    const canSubmitReview = canEditTask || isAssigned;

    const isPrivilegedManager = Boolean(
        isSuperAdminOrAdmin ||
        currentUser?.role === 'project_manager' ||
        (currentUser?.role === 'account_manager' && canEditTask) ||
        (canEditTask && canAssignUsers && canChangeDeadlines)
    );
    const isEmployeeView = !isPrivilegedManager;

    const [activeCollabTab, setActiveCollabTab] = useState<'updates' | 'files' | 'activity' | 'reviews' | 'dependencies'>('updates');
    const [reviewCycles, setReviewCycles] = useState<TaskReviewCycle[]>(task.review_cycles || []);
    const [submitNotes, setSubmitNotes] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [decisionFeedback, setDecisionFeedback] = useState('');
    const [isDeciding, setIsDeciding] = useState(false);
    const [reviewErrorMessage, setReviewErrorMessage] = useState<string | null>(null);
    const [reviewPipelinePreset, setReviewPipelinePreset] = useState<'single' | 'two_stage' | 'three_stage'>('single');

    // Server-side deadline semantics: when a due date exists but the API reports
    // no_deadline, the stage-aware override suppressed overdue/due_today/due_soon
    // because the task sits outside an actionable production stage. Drop the
    // relative countdown in that case so no warning leaks into review/reporting.
    const currentColumn = (board.columns || []).find((c) => c.id === task.column_id) || task.column;
    const isDeadlineHidden = isProductionDeadlineHidden(task, currentColumn);
    const deadlineSuppressed = isDeadlineHidden || (Boolean(task.due_date) && task.deadline_status === 'no_deadline');

    const exactRemaining = useMemo(
        () => (deadlineSuppressed ? null : getExactTimeRemaining(task.due_date, task.due_time)),
        [deadlineSuppressed, task.due_date, task.due_time],
    );

    // Dependencies & Blockers state
    const [dependencySummary, setDependencySummary] = useState<{
        is_blocked: boolean;
        blocked_by: any[];
        blocks: any[];
        related: any[];
    }>({
        is_blocked: Boolean(task.is_blocked),
        blocked_by: [],
        blocks: [],
        related: [],
    });
    const [isLoadingDependencies, setIsLoadingDependencies] = useState(false);
    const [depSearchQuery, setDepSearchQuery] = useState('');
    const [linkableTasks, setLinkableTasks] = useState<any[]>([]);
    const [selectedLinkTaskId, setSelectedLinkTaskId] = useState<number | null>(null);
    const [depRelType, setDepRelType] = useState<'blocked_by' | 'blocks' | 'related_to'>('blocked_by');
    const [depLagDays, setDepLagDays] = useState(0);
    const [isSavingDep, setIsSavingDep] = useState(false);
    const [depErrorMessage, setDepErrorMessage] = useState<string | null>(null);

    const fetchDependencies = async () => {
        setIsLoadingDependencies(true);
        try {
            const res = await axios.get(`/kanban/tasks/${task.id}/dependencies`);
            if (res.data) {
                setDependencySummary(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch dependencies:', err);
        } finally {
            setIsLoadingDependencies(false);
        }
    };

    const searchLinkable = async (q: string) => {
        setDepSearchQuery(q);
        try {
            const res = await axios.get(`/kanban/tasks/${task.id}/linkable-tasks`, {
                params: { query: q },
            });
            setLinkableTasks(res.data || []);
        } catch (err) {
            console.error('Failed to search linkable tasks:', err);
        }
    };

    const handleAddDependency = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLinkTaskId) {
            setDepErrorMessage('Please select a task to link.');
            return;
        }

        setIsSavingDep(true);
        setDepErrorMessage(null);

        try {
            await axios.post(`/kanban/tasks/${task.id}/dependencies`, {
                depends_on_task_id: selectedLinkTaskId,
                relationship_type: depRelType,
                lag_days: depLagDays,
            });

            setSelectedLinkTaskId(null);
            setDepSearchQuery('');
            setLinkableTasks([]);
            setDepLagDays(0);
            await fetchDependencies();
            router.reload({ only: ['boards', 'tasks'] });
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.target_task_id?.[0] || 'Failed to establish dependency';
            setDepErrorMessage(msg);
        } finally {
            setIsSavingDep(false);
        }
    };

    const handleRemoveDependency = async (dependencyId: number) => {
        if (!confirm('Remove this dependency relationship?')) return;
        try {
            await axios.delete(`/kanban/dependencies/${dependencyId}`);
            await fetchDependencies();
            router.reload({ only: ['boards', 'tasks'] });
        } catch (err) {
            console.error('Failed to delete dependency:', err);
        }
    };

    const fetchReviewCycles = async () => {
        try {
            const res = await fetch(`/kanban/tasks/${task.id}/review`, {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                setReviewCycles(data.review_cycles || []);
            }
        } catch (err) {
            console.error('Failed to load review cycles:', err);
        }
    };

    // Recurrence state & helpers
    const [recurrenceRule, setRecurrenceRule] = useState<TaskRecurrenceRule | null>(
        task.recurrence_rule || task.recurrenceRule || null
    );
    const [recurrenceLogs, setRecurrenceLogs] = useState<TaskRecurrenceLog[]>([]);
    const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
    const [isSavingRecurrence, setIsSavingRecurrence] = useState(false);
    const [isTogglingRecurrence, setIsTogglingRecurrence] = useState(false);
    const [isRunningRecurrenceNow, setIsRunningRecurrenceNow] = useState(false);
    const [recurrenceErrorMessage, setRecurrenceErrorMessage] = useState<string | null>(null);

    // Form inputs for recurrence rule
    const [recFreq, setRecFreq] = useState<'daily' | 'weekly' | 'monthly' | 'custom' | 'on_completion'>('weekly');
    const [recInterval, setRecInterval] = useState(1);
    const [recDaysOfWeek, setRecDaysOfWeek] = useState<number[]>([1]); // Monday default
    const [recTimeOfDay, setRecTimeOfDay] = useState('09:00');
    const [recEndType, setRecEndType] = useState<'never' | 'after_occurrences' | 'on_date'>('never');
    const [recMaxOccurrences, setRecMaxOccurrences] = useState<number | ''>('');
    const [recEndDate, setRecEndDate] = useState('');
    const [recCopySubtasks, setRecCopySubtasks] = useState(true);
    const [recCopyAssignees, setRecCopyAssignees] = useState(true);
    const [recCopyCustomValues, setRecCopyCustomValues] = useState(true);

    const initRecurrenceForm = (rule: TaskRecurrenceRule | null) => {
        if (rule) {
            setRecFreq(rule.frequency);
            setRecInterval(rule.interval || 1);
            setRecDaysOfWeek(rule.days_of_week || [1]);
            setRecTimeOfDay(rule.time_of_day ? rule.time_of_day.slice(0, 5) : '09:00');
            setRecEndType(rule.end_type);
            setRecMaxOccurrences(rule.max_occurrences ?? '');
            setRecEndDate(rule.end_date || '');
            setRecCopySubtasks(Boolean(rule.copy_subtasks));
            setRecCopyAssignees(Boolean(rule.copy_assignees));
            setRecCopyCustomValues(Boolean(rule.copy_custom_values));
        } else {
            setRecFreq('weekly');
            setRecInterval(1);
            setRecDaysOfWeek([1]);
            setRecTimeOfDay('09:00');
            setRecEndType('never');
            setRecMaxOccurrences('');
            setRecEndDate('');
            setRecCopySubtasks(true);
            setRecCopyAssignees(true);
            setRecCopyCustomValues(true);
        }
    };

    const fetchRecurrence = async () => {
        try {
            const res = await axios.get(`/kanban/tasks/${task.id}/recurrence`);
            if (res.data) {
                setRecurrenceRule(res.data.rule || null);
                setRecurrenceLogs(res.data.logs || []);
                initRecurrenceForm(res.data.rule || null);
            }
        } catch (err) {
            console.error('Failed to load recurrence details:', err);
        }
    };

    const handleSaveRecurrence = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingRecurrence(true);
        setRecurrenceErrorMessage(null);
        try {
            const res = await axios.post(`/kanban/tasks/${task.id}/recurrence`, {
                frequency: recFreq,
                interval: recInterval,
                days_of_week: recFreq === 'weekly' ? recDaysOfWeek : null,
                time_of_day: recTimeOfDay || null,
                end_type: recEndType,
                max_occurrences: recEndType === 'after_occurrences' && recMaxOccurrences ? Number(recMaxOccurrences) : null,
                end_date: recEndType === 'on_date' && recEndDate ? recEndDate : null,
                copy_subtasks: recCopySubtasks,
                copy_assignees: recCopyAssignees,
                copy_custom_values: recCopyCustomValues,
            });

            if (res.data?.rule) {
                setRecurrenceRule(res.data.rule);
                setIsRecurrenceModalOpen(false);
                await fetchRecurrence();
                router.reload({ only: ['boards', 'tasks'] });
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to save recurrence rule';
            setRecurrenceErrorMessage(msg);
        } finally {
            setIsSavingRecurrence(false);
        }
    };

    const handleToggleRecurrence = async () => {
        setIsTogglingRecurrence(true);
        try {
            const res = await axios.post(`/kanban/tasks/${task.id}/recurrence/toggle`);
            if (res.data?.rule) {
                setRecurrenceRule(res.data.rule);
                router.reload({ only: ['boards', 'tasks'] });
            }
        } catch (err) {
            console.error('Failed to toggle recurrence:', err);
        } finally {
            setIsTogglingRecurrence(false);
        }
    };

    const handleDeleteRecurrence = async () => {
        if (!confirm('Are you sure you want to remove the recurrence schedule for this task?')) return;
        try {
            await axios.delete(`/kanban/tasks/${task.id}/recurrence`);
            setRecurrenceRule(null);
            setIsRecurrenceModalOpen(false);
            router.reload({ only: ['boards', 'tasks'] });
        } catch (err) {
            console.error('Failed to delete recurrence rule:', err);
        }
    };

    const handleRunRecurrenceNow = async () => {
        setIsRunningRecurrenceNow(true);
        try {
            const res = await axios.post(`/kanban/tasks/${task.id}/recurrence/run-now`);
            if (res.data?.rule) {
                setRecurrenceRule(res.data.rule);
                await fetchRecurrence();
                router.reload({ only: ['boards', 'tasks'] });
            }
        } catch (err) {
            console.error('Failed to trigger recurrence:', err);
        } finally {
            setIsRunningRecurrenceNow(false);
        }
    };

    useEffect(() => {
        if (task.id) {
            fetchReviewCycles();
            fetchDependencies();
            fetchRecurrence();
        }
    }, [task.id]);

    const currentCycle = reviewCycles.length > 0 ? reviewCycles[reviewCycles.length - 1] : null;
    const isPendingReview = currentCycle?.state === 'pending';
    const isSubmitter = currentCycle?.submitted_by === currentUser?.id;
    const activeStage = currentCycle?.stages?.find(s => s.stage_index === (currentCycle.current_stage_index || 1));
    const isStageRoleAuthorized = !activeStage?.required_role || isSuperAdminOrAdmin ||
        (activeStage.required_role === 'client' && (currentUser?.role === 'client' || currentUser?.role === 'external_user')) ||
        (activeStage.required_role === 'project_manager' && ['project_manager', 'admin_manager', 'admin', 'super_admin'].includes(currentUser?.role || '')) ||
        (activeStage.required_role === currentUser?.role);
    const canDecideReview = isPendingReview && canApproveReview && (isReviewerRole && (!isSubmitter || isSuperAdminOrAdmin) && isStageRoleAuthorized);

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingReview(true);
        setReviewErrorMessage(null);

        let stagesPayload: Array<{ name: string; required_role?: string | null }> | undefined = undefined;
        if (reviewPipelinePreset === 'two_stage') {
            stagesPayload = [
                { name: 'Internal QA', required_role: null },
                { name: 'Manager Sign-off', required_role: 'project_manager' },
            ];
        } else if (reviewPipelinePreset === 'three_stage') {
            stagesPayload = [
                { name: 'Internal QA', required_role: null },
                { name: 'Manager Sign-off', required_role: 'project_manager' },
                { name: 'Client Final Approval', required_role: 'client' },
            ];
        }

        try {
            const res = await fetch(`/kanban/tasks/${task.id}/review/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    notes: submitNotes.trim(),
                    stages: stagesPayload,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSubmitNotes('');
                await fetchReviewCycles();
                router.reload({ only: ['boards', 'tasks'] });
            } else {
                setReviewErrorMessage(data.error || 'Failed to submit review');
            }
        } catch (err) {
            setReviewErrorMessage('Network error while submitting review');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleDecideReview = async (decision: 'approved' | 'revision_requested') => {
        setIsDeciding(true);
        setReviewErrorMessage(null);
        try {
            const res = await fetch(`/kanban/tasks/${task.id}/review/decide`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    decision,
                    feedback: decisionFeedback.trim(),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setDecisionFeedback('');
                await fetchReviewCycles();
                router.reload({ only: ['boards', 'tasks'] });
            } else {
                setReviewErrorMessage(data.error || 'Failed to record review decision');
            }
        } catch (err) {
            setReviewErrorMessage('Network error while recording review decision');
        } finally {
            setIsDeciding(false);
        }
    };

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

    const isClientDeadlineColumn = (col: { key?: string; title?: string }) => {
        const k = (col?.key || '').toLowerCase().replace(/[\s-]+/g, '_');
        const t = (col?.title || '').toLowerCase();
        return k === 'client_deadline' || t === 'client deadline';
    };

    // Client deadline is management-only: hide the field entirely from
    // Employee, Designer and Developer rather than rendering an empty input.
    const visibleBoardColumns = isReviewerRole
        ? boardColumns
        : boardColumns.filter((col) => !isClientDeadlineColumn(col));
    const statusColumns = board.columns || [];

    const completedSubitems = subitems.filter((s) => s.completed_at || s.progress === 100).length;

    // Dismiss drawer on Escape key (allowing nested popovers/dialogs to close first)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (e.defaultPrevented || isMediaModalOpen || lightboxAsset) {
                    return;
                }
                // If any child dialog, popover, or dropdown menu is open, let it close first
                const hasOpenFloating = document.querySelector('[data-state="open"]:not([data-drawer-root])');
                if (hasOpenFloating) {
                    return;
                }
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isMediaModalOpen, lightboxAsset]);

    // Field updates
    const handleUpdateField = (field: string, val: any) => {
        if (field === 'column_id') {
            router.patch(`/kanban/tasks/${task.id}/column`, { column_id: val }, { preserveScroll: true });
            return;
        }
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
            data-drawer-root="true"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
            className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs duration-200 sm:p-6"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-card border-border flex h-[90vh] max-h-[900px] w-full max-w-[1080px] flex-col overflow-hidden rounded-3xl border shadow-2xl"
            >
                {/* Header Top Bar */}
                <div className="border-border bg-muted/20 flex items-center justify-between border-b px-6 py-3.5">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold truncate pr-4">
                        <span className="truncate">{board.title}</span>
                        <span>›</span>
                        <span className="text-foreground truncate">{task.group?.title || 'General Tasks'}</span>
                        {task.parent && (
                            <>
                                <span>›</span>
                                <button onClick={() => onSelectTask?.(task.parent!)} className="text-primary font-bold hover:underline truncate">
                                    {task.parent.title}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={onClose}
                            className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                            aria-label="Close task details"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Two-Column Grid Body */}
                <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12 min-h-0">
                    {/* LEFT PANEL: TASK INFORMATION (5 Columns / 41.7%) */}
                    <div className="border-border bg-card overflow-y-auto border-b p-6 lg:col-span-5 lg:border-r lg:border-b-0 min-h-0">
                        {isEmployeeView ? (
                            <EmployeeTaskPanel
                                task={task}
                                board={board}
                                users={users}
                                permissions={permissions}
                                isAssigned={isAssigned}
                                canChangeStatus={canChangeStatus}
                                canManageSubtasks={canManageSubtasks}
                                exactRemaining={exactRemaining}
                                dependencySummary={dependencySummary}
                                onUpdateField={handleUpdateField}
                                onToggleSubtask={handleToggleSubtask}
                                onAddSubtask={(title) => {
                                    router.post(
                                        `/kanban/tasks/${task.id}/subitems`,
                                        { title },
                                        { preserveScroll: true }
                                    );
                                }}
                                onSelectTask={onSelectTask}
                                onJumpToTab={(tab) => setActiveCollabTab(tab)}
                            />
                        ) : (
                            <div className="space-y-5">
                                {/* Task Title */}
                                <div>
                                    <input
                                        type="text"
                                value={titleInput}
                                readOnly={!canEditTask}
                                onChange={(e) => canEditTask && setTitleInput(e.target.value)}
                                onBlur={canEditTask ? handleTitleBlur : undefined}
                                onKeyDown={(e) => canEditTask && e.key === 'Enter' && handleTitleBlur()}
                                className={`text-foreground focus:ring-primary w-full rounded border-none bg-transparent p-1 text-xl font-black ${
                                    !canEditTask ? 'cursor-default' : 'focus:ring-1 focus:outline-none'
                                }`}
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
                                        <DropdownMenuTrigger asChild disabled={!canChangeStatus}>
                                            <button
                                                disabled={!canChangeStatus}
                                                className={`rounded-lg px-3 py-1.5 text-center text-xs font-bold text-white shadow-2xs transition-all ${
                                                    canChangeStatus ? 'hover:brightness-105 cursor-pointer' : 'cursor-default opacity-90'
                                                }`}
                                                style={{ backgroundColor: task.column?.color || '#64748b' }}
                                            >
                                                {task.column?.title || 'Not Started'}
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-40 space-y-1 rounded-xl p-1.5">
                                            {statusColumns.map((sc) => {
                                                const isRestrictedTarget = !permissions?.canChangeStatus && ['completed', 'done', 'cancelled', 'archive', 'closed'].includes(sc.category || sc.title.toLowerCase());
                                                if (isRestrictedTarget) return null;
                                                return (
                                                    <button
                                                        key={sc.id}
                                                        type="button"
                                                        onClick={() => handleUpdateField('column_id', sc.id)}
                                                        className="block w-full rounded py-1.5 text-center text-xs font-bold text-white hover:opacity-90"
                                                        style={{ backgroundColor: sc.color }}
                                                    >
                                                        {sc.title}
                                                    </button>
                                                );
                                            })}
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
                                        disabled={!canAssignUsers}
                                    />
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="grid grid-cols-3 items-center">
                                <Label className="text-muted-foreground font-medium">Priority</Label>
                                <div className="col-span-2">
                                    <select
                                        defaultValue={task.priority}
                                        disabled={!canChangePriority}
                                        onChange={(e) => handleUpdateField('priority', e.target.value)}
                                        className={`border-border bg-background h-8 rounded-xl border px-2.5 text-xs font-bold ${
                                            !canChangePriority ? 'cursor-default opacity-80' : ''
                                        }`}
                                    >
                                        <option value="Urgent">Urgent</option>
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                            </div>

                            {/* Deadline Status Badge */}
                            {!isDeadlineHidden && task.due_date && (
                                <div className="grid grid-cols-3 items-center">
                                    <Label className="text-muted-foreground font-medium">Deadline Status</Label>
                                    <div className="col-span-2 flex flex-wrap items-center gap-1.5">
                                        {task.deadline_status === 'completed_on_time' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Completed On Time
                                            </span>
                                        )}
                                        {task.deadline_status === 'completed_late' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Completed Late
                                            </span>
                                        )}
                                        {task.deadline_status !== 'completed_on_time' && task.deadline_status !== 'completed_late' && (
                                            <>
                                                {task.deadline_status === 'overdue' && exactRemaining ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:text-red-400">
                                                        <AlertCircle className="h-3 w-3" />
                                                        {exactRemaining.formattedRemaining}
                                                    </span>
                                                ) : task.deadline_status === 'due_today' && exactRemaining ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                                        <Clock className="h-3 w-3" />
                                                        {exactRemaining.formattedRemaining}
                                                    </span>
                                                ) : task.deadline_status === 'due_soon' && exactRemaining ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                                                        <Clock className="h-3 w-3" />
                                                        {exactRemaining.formattedRemaining}
                                                    </span>
                                                ) : exactRemaining ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                        <Calendar className="h-3 w-3" />
                                                        {exactRemaining.formattedRemaining}
                                                    </span>
                                                ) : deadlineSuppressed ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                        <Calendar className="h-3 w-3" />
                                                        Due {formatDate(task.due_date)}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                        {task.deadline_status === 'overdue' ? 'Overdue' : 'Upcoming'}
                                                    </span>
                                                )}
                                            </>
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
                                        key={`start-date-${task.id}-${task.start_date || ''}`}
                                        defaultValue={task.start_date || ''}
                                        disabled={!canChangeDeadlines}
                                        onChange={(e) => handleUpdateField('start_date', e.target.value || null)}
                                        className="h-8 flex-1 min-w-0 px-2 text-xs"
                                    />
                                    <Input
                                        type="time"
                                        key={`start-time-${task.id}-${task.start_time || ''}`}
                                        defaultValue={task.start_time ? task.start_time.slice(0, 5) : ''}
                                        disabled={!canChangeDeadlines}
                                        onChange={(e) => handleUpdateField('start_time', e.target.value || null)}
                                        className="h-8 w-[118px] shrink-0 px-2 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Due Date & Time */}
                            {!isDeadlineHidden && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1 sm:gap-0">
                                    <Label className="text-muted-foreground font-medium">Due Date & Time</Label>
                                    <div className="sm:col-span-2 flex items-center gap-2 min-w-0">
                                        <Input
                                            type="date"
                                            key={`due-date-${task.id}-${task.due_date || ''}`}
                                            defaultValue={task.due_date || ''}
                                            disabled={!canChangeDeadlines}
                                            onChange={(e) => handleUpdateField('due_date', e.target.value || null)}
                                            className="h-8 flex-1 min-w-0 px-2 text-xs"
                                        />
                                        <Input
                                            type="time"
                                            key={`due-time-${task.id}-${task.due_time || ''}`}
                                            defaultValue={task.due_time ? task.due_time.slice(0, 5) : ''}
                                            disabled={!canChangeDeadlines}
                                            onChange={(e) => handleUpdateField('due_time', e.target.value || null)}
                                            className="h-8 w-[118px] shrink-0 px-2 text-xs"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Milestone & Deadline Reminders */}
                            <div className="grid grid-cols-3 items-center">
                                <Label className="text-muted-foreground font-medium">Milestone & Alert</Label>
                                <div className="col-span-2 flex items-center justify-between gap-3">
                                    <label className={`flex items-center gap-2 text-xs font-medium ${canChangeDeadlines ? 'cursor-pointer' : 'cursor-default opacity-80'}`}>
                                        <input
                                            type="checkbox"
                                            disabled={!canChangeDeadlines}
                                            defaultChecked={Boolean(task.is_milestone)}
                                            onChange={(e) => handleUpdateField('is_milestone', e.target.checked)}
                                            className="rounded border-border text-primary focus:ring-primary"
                                        />
                                        <span>Milestone</span>
                                    </label>

                                    <select
                                        defaultValue={task.reminder_lead_minutes !== null && task.reminder_lead_minutes !== undefined ? String(task.reminder_lead_minutes) : ''}
                                        disabled={!canChangeDeadlines}
                                        onChange={(e) => handleUpdateField('reminder_lead_minutes', e.target.value === '' ? null : Number(e.target.value))}
                                        className={`border-border bg-background h-8 rounded-xl border px-2 text-xs ${
                                            !canChangeDeadlines ? 'cursor-default opacity-80' : ''
                                        }`}
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

                            {/* Recurrence Schedule */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1 sm:gap-0">
                                <Label className="text-muted-foreground font-medium flex items-center gap-1.5">
                                    <Repeat className="h-3.5 w-3.5 text-primary" />
                                    Recurrence
                                </Label>
                                <div className="sm:col-span-2 flex items-center justify-between gap-2 min-w-0">
                                    {recurrenceRule ? (
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <span
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${
                                                    recurrenceRule.is_active
                                                        ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {recurrenceRule.is_active ? 'Active' : 'Paused'}
                                            </span>
                                            <span className="text-xs truncate text-foreground font-medium">
                                                {recurrenceRule.frequency === 'daily' && `Every ${recurrenceRule.interval}d`}
                                                {recurrenceRule.frequency === 'weekly' && `Weekly (${recurrenceRule.interval}w)`}
                                                {recurrenceRule.frequency === 'monthly' && `Monthly (${recurrenceRule.interval}m)`}
                                                {recurrenceRule.frequency === 'custom' && `Every ${recurrenceRule.interval}d`}
                                                {recurrenceRule.frequency === 'on_completion' && `On Complete (+${recurrenceRule.interval}d)`}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">None configured</span>
                                    )}

                                    {canManageRecurrence && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            {recurrenceRule && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={handleToggleRecurrence}
                                                        disabled={isTogglingRecurrence}
                                                        title={recurrenceRule.is_active ? 'Pause recurrence' : 'Resume recurrence'}
                                                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        {recurrenceRule.is_active ? (
                                                            <Pause className="h-3.5 w-3.5 text-amber-600" />
                                                        ) : (
                                                            <Play className="h-3.5 w-3.5 text-emerald-600" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleRunRecurrenceNow}
                                                        disabled={isRunningRecurrenceNow}
                                                        title="Spawn task instance now"
                                                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                                    >
                                                        <Repeat className={`h-3.5 w-3.5 ${isRunningRecurrenceNow ? 'animate-spin text-primary' : ''}`} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    initRecurrenceForm(recurrenceRule);
                                                    setIsRecurrenceModalOpen(true);
                                                }}
                                                className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
                                            >
                                                {recurrenceRule ? 'Edit' : 'Set Up'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <Label className="text-muted-foreground mb-1 block font-medium">Description</Label>
                                <textarea
                                    rows={3}
                                    defaultValue={task.description || ''}
                                    readOnly={!canEditTask}
                                    onBlur={(e) => canEditTask && handleUpdateField('description', e.target.value)}
                                    placeholder={canEditTask ? 'Add notes or task background...' : '-'}
                                    className={`border-border bg-background focus:ring-primary w-full rounded-xl border p-2.5 text-xs ${
                                        !canEditTask ? 'cursor-default' : 'focus:ring-1 focus:outline-none'
                                    }`}
                                />
                            </div>

                            {/* Custom Dynamic Columns */}
                            {visibleBoardColumns.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <div className="text-muted-foreground border-border/60 border-t pt-3 text-[11px] font-bold uppercase tracking-wider">
                                        Board Columns & Custom Fields
                                    </div>
                                    {visibleBoardColumns.map((col) => {
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
                                                            disabled={!canAssignUsers}
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
                                                            readOnly={!canEditTask}
                                                            onBlur={(e) =>
                                                                canEditTask && handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: e.target.value,
                                                                })
                                                            }
                                                            placeholder={canEditTask ? `Enter ${col.title.toLowerCase()}...` : '-'}
                                                            className={`border-border bg-background focus:ring-primary w-full rounded-xl border p-2 text-xs ${
                                                                !canEditTask ? 'cursor-default' : 'focus:ring-1 focus:outline-none'
                                                            }`}
                                                        />
                                                    ) : col.type === 'checkbox' ? (
                                                        <input
                                                            type="checkbox"
                                                            disabled={!canEditTask}
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
                                                            disabled={!canEditTask}
                                                            onChange={(e) =>
                                                                handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: e.target.value,
                                                                })
                                                            }
                                                            className={`border-border bg-background h-8 w-full rounded-xl border px-2.5 text-xs ${
                                                                !canEditTask ? 'cursor-default opacity-80' : ''
                                                            }`}
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
                                                            readOnly={!canEditTask}
                                                            onBlur={(e) =>
                                                                canEditTask && handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: e.target.value ? Number(e.target.value) : null,
                                                                })
                                                            }
                                                            className={`h-8 text-xs ${!canEditTask ? 'cursor-default' : ''}`}
                                                        />
                                                    ) : col.type === 'date' ? (
                                                        (() => {
                                                            let curDate = '';
                                                            let curTime = '';
                                                            if (typeof customVal === 'object' && customVal !== null) {
                                                                curDate = customVal.date || '';
                                                                curTime = customVal.time ? String(customVal.time).slice(0, 5) : '';
                                                            } else if (typeof customVal === 'string') {
                                                                if (customVal.includes(' ') || customVal.includes('T')) {
                                                                    const parts = customVal.replace('T', ' ').split(' ');
                                                                    curDate = parts[0] || '';
                                                                    curTime = parts[1]?.slice(0, 5) || '';
                                                                } else {
                                                                    curDate = customVal;
                                                                }
                                                            }

                                                            const handleCustomDateChange = (newD: string) => {
                                                                const dateStr = newD || null;
                                                                const timeStr = curTime || null;
                                                                const finalVal = dateStr && timeStr ? { date: dateStr, time: timeStr } : dateStr;
                                                                handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: finalVal,
                                                                });
                                                            };

                                                            const handleCustomTimeChange = (newT: string) => {
                                                                const dateStr = curDate || null;
                                                                const timeStr = newT || null;
                                                                const finalVal = dateStr && timeStr ? { date: dateStr, time: timeStr } : dateStr;
                                                                handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: finalVal,
                                                                });
                                                            };

                                                            return (
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <Input
                                                                        type="date"
                                                                        key={`custom-date-${task.id}-${col.key}-${curDate}`}
                                                                        defaultValue={curDate}
                                                                        disabled={!canChangeDeadlines}
                                                                        onChange={(e) => handleCustomDateChange(e.target.value)}
                                                                        className="h-8 flex-1 min-w-0 px-2 text-xs"
                                                                    />
                                                                    {!col.config?.date_only && (
                                                                        <Input
                                                                            type="time"
                                                                            key={`custom-time-${task.id}-${col.key}-${curTime}`}
                                                                            defaultValue={curTime}
                                                                            disabled={!canChangeDeadlines}
                                                                            onChange={(e) => handleCustomTimeChange(e.target.value)}
                                                                            className="h-8 w-[118px] shrink-0 px-2 text-xs"
                                                                        />
                                                                    )}
                                                                </div>
                                                            );
                                                        })()
                                                    ) : col.type === 'image' ? (
                                                        <div className="flex items-center">
                                                            <ImageCell task={task} column={col} workspaceId={board.workspace_id} />
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            type="text"
                                                            defaultValue={customVal}
                                                            readOnly={!canEditTask}
                                                            onBlur={(e) =>
                                                                canEditTask && handleUpdateField('custom_values', {
                                                                    ...(task.custom_values || {}),
                                                                    [col.key]: e.target.value,
                                                                })
                                                            }
                                                            placeholder={canEditTask ? `Enter ${col.title.toLowerCase()}...` : '-'}
                                                            className={`h-8 text-xs ${!canEditTask ? 'cursor-default' : ''}`}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Work Categories Hierarchy & List */}
                        <div className="border-border/60 space-y-3 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-foreground flex items-center gap-1.5 text-xs font-black">
                                    <CornerDownRight className="text-primary h-3.5 w-3.5" />
                                    <span>
                                        Work Categories ({subitems.length})
                                    </span>
                                </h4>
                            </div>

                            {/* Work Categories List */}
                            <div className="max-h-48 space-y-1.5 overflow-y-auto">
                                {subitems.map((sub) => {
                                    const subAssignees = getTaskAssignedUsers(sub, users);
                                    return (
                                        <div
                                            key={sub.id}
                                            onClick={() => onSelectTask?.(sub)}
                                            className="bg-muted/20 border-border/60 hover:border-primary/50 flex cursor-pointer items-center justify-between rounded-xl border p-2 text-xs transition-all"
                                        >
                                            <div className="flex flex-1 items-center gap-2 truncate">
                                                <span className="truncate text-foreground font-semibold hover:underline">
                                                    {sub.title}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {subAssignees.length > 0 && (
                                                    <div
                                                        className="flex items-center -space-x-1"
                                                        title={`Assigned: ${subAssignees.map((u) => u.name).join(', ')}`}
                                                    >
                                                        {subAssignees.slice(0, 2).map((u) => (
                                                            <div
                                                                key={u.id}
                                                                className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary/20 text-[8px] font-bold text-primary ring-1 ring-border"
                                                            >
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        ))}
                                                        {subAssignees.length > 2 && (
                                                            <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground ring-1 ring-border">
                                                                +{subAssignees.length - 2}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-bold">
                                                    {sub.column?.title || 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add Work Category Input */}
                                {canManageSubtasks && (
                                    <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5 pt-1">
                                        <Input
                                            placeholder="Add work category (e.g. Design, Video Editing, QA)..."
                                            value={newSubtaskTitle}
                                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                            className="h-8 flex-1 text-xs"
                                        />
                                        <Button type="submit" size="sm" className="h-8 text-xs font-bold">
                                            Add
                                        </Button>
                                    </form>
                                )}
                            </div>
                        </div>


                        {/* Dependencies & Blockers Summary */}
                        <div className="border-border/60 space-y-2 border-t pt-4">
                            <div className="flex items-center justify-between text-xs font-black">
                                <span className="flex items-center gap-1.5 text-foreground">
                                    <GitFork className="text-primary h-3.5 w-3.5" />
                                    <span>Dependencies ({dependencySummary.blocked_by.length + dependencySummary.blocks.length + dependencySummary.related.length})</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setActiveCollabTab('dependencies')}
                                    className="text-[11px] font-semibold text-primary hover:underline"
                                >
                                    Manage
                                </button>
                            </div>

                            {dependencySummary.is_blocked ? (
                                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-2 text-xs font-semibold text-red-600 dark:text-red-400">
                                    <ShieldAlert className="h-4 w-4 shrink-0" />
                                    <span>Blocked by {dependencySummary.blocked_by.filter(b => !b.is_completed).length} predecessor(s)</span>
                                </div>
                            ) : (dependencySummary.blocked_by.length + dependencySummary.blocks.length + dependencySummary.related.length) > 0 ? (
                                <p className="text-[11px] text-muted-foreground">
                                    {dependencySummary.blocked_by.length} blocker(s) • {dependencySummary.blocks.length} dependent(s) • {dependencySummary.related.length} related
                                </p>
                            ) : (
                                <p className="text-[11px] text-muted-foreground italic">No dependencies configured.</p>
                            )}
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
                )}
            </div>

            {/* RIGHT PANEL: COLLABORATION (7 Columns / 58.3%) */}
            <div className="bg-background flex flex-col overflow-hidden lg:col-span-7 min-h-0">
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

                            <button
                                onClick={() => setActiveCollabTab('reviews')}
                                className={`flex items-center gap-1.5 border-b-2 pb-3 transition-all ${
                                    activeCollabTab === 'reviews'
                                        ? 'border-primary text-primary'
                                        : 'text-muted-foreground hover:text-foreground border-transparent'
                                }`}
                            >
                                <ShieldCheck className="h-4 w-4" />
                                <span>Reviews ({reviewCycles.length})</span>
                                {isPendingReview && (
                                    <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                )}
                            </button>

                            <button
                                onClick={() => setActiveCollabTab('dependencies')}
                                className={`flex items-center gap-1.5 border-b-2 pb-3 transition-all ${
                                    activeCollabTab === 'dependencies'
                                        ? 'border-primary text-primary'
                                        : 'text-muted-foreground hover:text-foreground border-transparent'
                                }`}
                            >
                                <GitFork className="h-4 w-4" />
                                <span>Dependencies ({dependencySummary.blocked_by.length + dependencySummary.blocks.length + dependencySummary.related.length})</span>
                                {dependencySummary.is_blocked && (
                                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Task is blocked" />
                                )}
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
                                                <div key={comment.id} className="border-border/70 bg-card space-y-3 rounded-2xl border p-4 shadow-2xs">
                                                    {/* Author, Role & Timestamp */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            {comment.user?.avatar || comment.user?.avatar_url ? (
                                                                <img
                                                                    src={(comment.user.avatar || comment.user.avatar_url) || undefined}
                                                                    alt={comment.user.name}
                                                                    className="h-7 w-7 rounded-full object-cover border border-border/80 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="bg-primary/20 text-primary flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 border border-primary/30">
                                                                    {comment.user?.name.charAt(0).toUpperCase() || 'U'}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <h5 className="text-foreground text-xs font-bold">{comment.user?.name || 'User'}</h5>
                                                                    {comment.user?.role && (
                                                                        <span className="rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border/50">
                                                                            {comment.user.role.replace('_', ' ')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-muted-foreground text-[10px]">
                                                                    {formatDateTime(comment.created_at)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {(isSuperAdminOrAdmin || comment.user_id === currentUser?.id) && (
                                                            <button
                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                className="text-muted-foreground rounded p-1 transition-colors hover:bg-red-500/10 hover:text-red-500"
                                                                title="Delete update"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
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
                                                                    <div className="mb-1.5 flex items-center justify-between">
                                                                        <div className="flex items-center gap-1.5">
                                                                            {rep.user?.avatar || rep.user?.avatar_url ? (
                                                                                <img
                                                                                    src={(rep.user.avatar || rep.user.avatar_url) || undefined}
                                                                                    alt={rep.user.name}
                                                                                    className="h-4.5 w-4.5 rounded-full object-cover border border-border/60 shrink-0"
                                                                                />
                                                                            ) : (
                                                                                <div className="bg-primary/20 text-primary flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-bold shrink-0">
                                                                                    {rep.user?.name.charAt(0).toUpperCase() || 'U'}
                                                                                </div>
                                                                            )}
                                                                            <span className="text-[11px] font-bold text-foreground">{rep.user?.name || 'User'}</span>
                                                                            {rep.user?.role && (
                                                                                <span className="rounded px-1 py-0.1 text-[8px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                                                                                    {rep.user.role.replace('_', ' ')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-muted-foreground text-[10px]">
                                                                            {formatDateTime(rep.created_at)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-foreground/90 whitespace-pre-wrap pl-6">
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
                                                All task mutations, status moves, people assignments, deadlines, subtasks, and comments are recorded in real time.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 4. REVIEWS & APPROVALS TAB */}
                            {activeCollabTab === 'reviews' && (
                                <div className="space-y-6">
                                    {/* Error Banner */}
                                    {reviewErrorMessage && (
                                        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>{reviewErrorMessage}</span>
                                        </div>
                                    )}

                                    {/* Active Review / Decision Block */}
                                    {isPendingReview ? (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">
                                                        {currentCycle?.round_number}
                                                    </span>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-[#191927] dark:text-white">
                                                            Round {currentCycle?.round_number} In Review
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500">
                                                            Submitted by {currentCycle?.submitter?.name || 'Designer'} on {currentCycle?.submitted_at ? formatDate(currentCycle.submitted_at) : 'recently'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:bg-amber-500/20">
                                                    Pending Review
                                                </span>
                                            </div>

                                            {/* Multi-Stage Approval Pipeline Progress */}
                                            {currentCycle?.stages && currentCycle.stages.length > 0 && (
                                                <div className="space-y-2 py-1">
                                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                                        <span>Approval Pipeline ({currentCycle.stages.length} Stages)</span>
                                                        <span className="text-[10px] lowercase font-normal">
                                                            Stage {currentCycle.current_stage_index || 1} of {currentCycle.stages.length}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        {currentCycle.stages.map((stg) => {
                                                            const isCurrent = stg.stage_index === (currentCycle.current_stage_index || 1);
                                                            const isApproved = stg.status === 'approved';
                                                            const isRevision = stg.status === 'revision_requested';
                                                            return (
                                                                <div
                                                                    key={stg.id}
                                                                    className={`rounded-xl border p-2.5 text-xs transition-all ${
                                                                        isApproved
                                                                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                                                                            : isRevision
                                                                            ? 'bg-rose-50/80 border-rose-300 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
                                                                            : isCurrent
                                                                            ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 text-amber-950 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200'
                                                                            : 'bg-slate-50/60 border-slate-200 text-slate-500 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-400'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                                                                        <span className="flex items-center gap-1.5 truncate">
                                                                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 text-[9px] shrink-0">
                                                                                {stg.stage_index}
                                                                            </span>
                                                                            <span className="truncate">{stg.name}</span>
                                                                        </span>
                                                                        {isApproved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                                                        {isRevision && <RotateCcw className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                                                                        {isCurrent && <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse shrink-0" />}
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                                                        <span className="truncate">{stg.required_role ? `Role: ${stg.required_role}` : 'Any Reviewer'}</span>
                                                                        <span className="capitalize font-semibold">{stg.status.replace('_', ' ')}</span>
                                                                    </div>
                                                                    {stg.reviewer && (
                                                                        <div className="mt-1 text-[9px] text-slate-400 truncate">
                                                                            By {stg.reviewer.name}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {currentCycle?.notes && (
                                                <div className="rounded-xl bg-white p-3 text-xs text-slate-700 shadow-2xs dark:bg-[#1E1E2F] dark:text-slate-300">
                                                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                                                        Designer Notes
                                                    </span>
                                                    {currentCycle.notes}
                                                </div>
                                            )}

                                            {/* Decision Form for Authorized Reviewers */}
                                            {canDecideReview ? (
                                                <div className="space-y-3 pt-2 border-t border-amber-200/70 dark:border-amber-900/40">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-bold text-[#191927] dark:text-white">
                                                            Reviewer Decision & Feedback
                                                            {activeStage && ` (Stage ${activeStage.stage_index}: ${activeStage.name})`}
                                                        </Label>
                                                        {activeStage && (
                                                            <span className="text-[10px] text-slate-400">
                                                                {activeStage.stage_index === (currentCycle?.total_stages || 1)
                                                                    ? 'Final Stage Approval'
                                                                    : `Advances to Stage ${(activeStage.stage_index || 1) + 1}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <textarea
                                                        rows={3}
                                                        value={decisionFeedback}
                                                        onChange={(e) => setDecisionFeedback(e.target.value)}
                                                        placeholder="Provide revision notes, feedback, or approval comments..."
                                                        className="w-full rounded-xl border border-border bg-white p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none dark:bg-[#1E1E2F]"
                                                    />

                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            type="button"
                                                            disabled={isDeciding}
                                                            onClick={() => handleDecideReview('revision_requested')}
                                                            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold gap-1.5 shadow-2xs"
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                            <span>Request Revisions</span>
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            type="button"
                                                            disabled={isDeciding}
                                                            onClick={() => handleDecideReview('approved')}
                                                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-2xs"
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            <span>
                                                                {activeStage && activeStage.stage_index < (currentCycle?.total_stages || 1)
                                                                    ? `Approve Stage ${activeStage.stage_index}`
                                                                    : 'Approve Deliverable'}
                                                            </span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : isSubmitter && !isSuperAdminOrAdmin ? (
                                                <p className="text-[11px] text-slate-500 italic">
                                                    You submitted this review round. An authorized Project Manager or Reviewer will evaluate your deliverables.
                                                </p>
                                            ) : (
                                                <p className="text-[11px] text-slate-500 italic">
                                                    Awaiting review decisions from assigned team leads.
                                                </p>
                                            )}
                                        </div>
                                    ) : canSubmitReview ? (
                                        /* Submission Block for Next Round */
                                        <form onSubmit={handleSubmitReview} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0073ea] text-white font-bold text-xs">
                                                        {reviewCycles.length + 1}
                                                    </span>
                                                    <h4 className="text-xs font-bold text-[#191927] dark:text-white">
                                                        Submit Deliverables for Review (Round {reviewCycles.length + 1})
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] font-semibold text-slate-400">
                                                    Round {reviewCycles.length + 1}
                                                </span>
                                            </div>

                                            {/* Approval Pipeline Preset Selector */}
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                    Approval Pipeline Stages
                                                </Label>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setReviewPipelinePreset('single')}
                                                        className={`rounded-xl border p-2 text-left text-xs transition-all ${
                                                            reviewPipelinePreset === 'single'
                                                                ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                                                                : 'border-border bg-background hover:bg-muted/40 text-slate-600 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <div className="font-semibold text-[11px]">Single-Stage</div>
                                                        <div className="text-[10px] text-muted-foreground font-normal">Internal Review</div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReviewPipelinePreset('two_stage')}
                                                        className={`rounded-xl border p-2 text-left text-xs transition-all ${
                                                            reviewPipelinePreset === 'two_stage'
                                                                ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                                                                : 'border-border bg-background hover:bg-muted/40 text-slate-600 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <div className="font-semibold text-[11px]">2-Stage Pipeline</div>
                                                        <div className="text-[10px] text-muted-foreground font-normal">Internal QA → Manager</div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReviewPipelinePreset('three_stage')}
                                                        className={`rounded-xl border p-2 text-left text-xs transition-all ${
                                                            reviewPipelinePreset === 'three_stage'
                                                                ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                                                                : 'border-border bg-background hover:bg-muted/40 text-slate-600 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <div className="font-semibold text-[11px]">3-Stage Enterprise</div>
                                                        <div className="text-[10px] text-muted-foreground font-normal">QA → PM → Client</div>
                                                    </button>
                                                </div>
                                            </div>

                                            <textarea
                                                rows={3}
                                                value={submitNotes}
                                                onChange={(e) => setSubmitNotes(e.target.value)}
                                                placeholder="Describe deliverables ready for review (e.g. Canva/Figma links, asset exports, change highlights)..."
                                                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                            />

                                            <div className="flex justify-end">
                                                <Button
                                                    size="sm"
                                                    type="submit"
                                                    disabled={isSubmittingReview}
                                                    className="rounded-xl bg-[#0073ea] hover:bg-[#0060c0] text-white text-xs font-bold gap-1.5 shadow-2xs"
                                                >
                                                    <Send className="h-3.5 w-3.5" />
                                                    <span>{isSubmittingReview ? 'Submitting...' : `Submit Round ${reviewCycles.length + 1} for Review`}</span>
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                                            Only assigned contributors or project managers can submit deliverables for review.
                                        </div>
                                    )}

                                    {/* Review History Rounds Timeline */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-[#191927] dark:text-white">
                                                Review History & Rounds ({reviewCycles.length})
                                            </h4>
                                        </div>

                                        {reviewCycles.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-xs text-slate-400">
                                                No review rounds submitted yet. When work is completed, submit Round 1 above for team review and sign-off.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {[...reviewCycles].reverse().map((cycle) => (
                                                    <div
                                                        key={cycle.id}
                                                        className="rounded-xl border border-border bg-card p-3.5 text-xs space-y-3 shadow-2xs"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 dark:bg-[#252538] dark:text-slate-300">
                                                                    R{cycle.round_number}
                                                                </span>
                                                                <span className="font-bold text-[#191927] dark:text-white">
                                                                    Round {cycle.round_number}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    by {cycle.submitter?.name || 'Assignee'}
                                                                </span>
                                                            </div>

                                                            <span
                                                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                                                                    cycle.state === 'approved'
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20'
                                                                        : cycle.state === 'revision_requested'
                                                                        ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20'
                                                                        : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20'
                                                                }`}
                                                            >
                                                                {cycle.state.replace('_', ' ')}
                                                            </span>
                                                        </div>

                                                        {cycle.notes && (
                                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-muted/20 p-2 rounded-lg">
                                                                <span className="font-semibold text-slate-500">Notes: </span>
                                                                {cycle.notes}
                                                            </p>
                                                        )}

                                                        {/* Decisions recorded for this cycle */}
                                                        {cycle.decisions && cycle.decisions.length > 0 && (
                                                            <div className="space-y-2 border-t border-border/60 pt-2">
                                                                {cycle.decisions.map((dec) => (
                                                                    <div
                                                                        key={dec.id}
                                                                        className={`rounded-lg p-2.5 text-[11px] space-y-1 ${
                                                                            dec.decision === 'approved'
                                                                                ? 'bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                                                                                : 'bg-amber-50/50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center justify-between font-bold">
                                                                            <span className="flex items-center gap-1">
                                                                                {dec.decision === 'approved' ? (
                                                                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                                                ) : (
                                                                                    <RotateCcw className="h-3 w-3 text-amber-600" />
                                                                                )}
                                                                                {dec.decision === 'approved' ? 'Approved' : 'Revision Requested'} by {dec.reviewer?.name || 'Reviewer'}
                                                                            </span>
                                                                            <span className="text-[10px] font-normal text-slate-400">
                                                                                {dec.decided_at ? formatDate(dec.decided_at) : ''}
                                                                            </span>
                                                                        </div>
                                                                        {dec.feedback && (
                                                                            <p className="pl-4 leading-relaxed">{dec.feedback}</p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Dependencies & Blockers Tab */}
                            {activeCollabTab === 'dependencies' && (
                                <div className="space-y-6">
                                    {/* Overall Blocker Banner */}
                                    <div
                                        className={`flex items-start gap-3 rounded-xl p-4 border transition-colors ${
                                            dependencySummary.is_blocked
                                                ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                                                : 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {dependencySummary.is_blocked ? (
                                                <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                            ) : (
                                                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1 text-xs">
                                            <p className="font-semibold text-sm">
                                                {dependencySummary.is_blocked
                                                    ? 'Task is Blocked'
                                                    : 'Task is Ready / Unblocked'}
                                            </p>
                                            <p className="leading-relaxed opacity-90">
                                                {dependencySummary.is_blocked
                                                    ? 'This task cannot proceed or be completed until all predecessor tasks are marked done.'
                                                    : 'All prerequisite dependencies are resolved or not blocked. Team can work freely.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Add New Dependency Form */}
                                    {canManageDependencies && (
                                        <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
                                            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                    <Link2 className="h-3.5 w-3.5 text-primary" />
                                                    Add Dependency Link
                                                </h4>
                                            </div>

                                            {depErrorMessage && (
                                                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                                    <span>{depErrorMessage}</span>
                                                </div>
                                            )}

                                            <form onSubmit={handleAddDependency} className="space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                                                            Relationship
                                                        </label>
                                                        <select
                                                            value={depRelType}
                                                            onChange={(e) => setDepRelType(e.target.value as any)}
                                                            className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                        >
                                                            <option value="blocked_by">Blocked By (Needs target first)</option>
                                                            <option value="blocks">Blocks (Target needs this first)</option>
                                                            <option value="related_to">Related To (Reference link)</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                                                            Lag Days (Buffer)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={depLagDays}
                                                            onChange={(e) => setDepLagDays(Math.max(0, parseInt(e.target.value) || 0))}
                                                            className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                                                        Select Task in Workspace
                                                    </label>
                                                    <div className="relative">
                                                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                                        <input
                                                            type="text"
                                                            value={depSearchQuery}
                                                            onChange={(e) => searchLinkable(e.target.value)}
                                                            placeholder="Type to search tasks..."
                                                            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                                                        />
                                                    </div>

                                                    {linkableTasks.length > 0 && (
                                                        <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-md divide-y divide-border/40 text-xs">
                                                            {linkableTasks.map((t) => (
                                                                <button
                                                                    key={t.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedLinkTaskId(t.id);
                                                                        setDepSearchQuery(`${t.title} (${t.board?.title || 'Board'})`);
                                                                        setLinkableTasks([]);
                                                                    }}
                                                                    className={`w-full text-left p-2 hover:bg-muted/60 flex items-center justify-between transition-colors ${
                                                                        selectedLinkTaskId === t.id ? 'bg-primary/10 text-primary font-semibold' : ''
                                                                    }`}
                                                                >
                                                                    <span className="truncate pr-2">{t.title}</span>
                                                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                                                        {t.board?.title || 'Board'}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-end pt-1">
                                                    <Button
                                                        type="submit"
                                                        size="sm"
                                                        disabled={isSavingDep || !selectedLinkTaskId}
                                                        className="h-8 text-xs font-semibold"
                                                    >
                                                        {isSavingDep ? 'Linking...' : 'Establish Dependency'}
                                                    </Button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Dependencies Lists */}
                                    <div className="space-y-4">
                                        {/* Blocked By List */}
                                        <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                                    <ShieldAlert className="h-3.5 w-3.5" />
                                                    Blocked By (Prerequisites)
                                                </h4>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20">
                                                    {dependencySummary.blocked_by.length}
                                                </span>
                                            </div>

                                            {dependencySummary.blocked_by.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic py-1">
                                                    No prerequisite blockers. This task does not wait on anything.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {dependencySummary.blocked_by.map((dep: any) => {
                                                        const targetTask = dep.dependency_task;
                                                        const isDone = Boolean(targetTask?.completed_at || (targetTask?.progress && targetTask.progress >= 100));
                                                        return (
                                                            <div
                                                                key={dep.id}
                                                                className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background hover:bg-muted/30 transition-colors text-xs"
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                                                    <span
                                                                        className={`h-2 w-2 rounded-full shrink-0 ${
                                                                            isDone ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                                                                        }`}
                                                                    />
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="font-semibold truncate text-foreground">
                                                                            {targetTask?.title || `Task #${dep.depends_on_task_id}`}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                            <span>{targetTask?.board?.title || 'Board'}</span>
                                                                            {targetTask?.column && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span className="px-1.5 py-0.2 rounded bg-muted">
                                                                                        {targetTask.column.title}
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                            {dep.lag_days > 0 && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span>+{dep.lag_days}d buffer</span>
                                                                                </>
                                                                            )}
                                                                            <span>•</span>
                                                                            <span className={isDone ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                                                                                {isDone ? 'Completed' : 'Blocking'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {canManageDependencies && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveDependency(dep.id)}
                                                                        className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                                        title="Remove dependency"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Blocks List */}
                                        <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                                    <GitFork className="h-3.5 w-3.5" />
                                                    Blocks (Successors Waiting on This)
                                                </h4>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20">
                                                    {dependencySummary.blocks.length}
                                                </span>
                                            </div>

                                            {dependencySummary.blocks.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic py-1">
                                                    This task is not holding up any other tasks.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {dependencySummary.blocks.map((dep: any) => {
                                                        const successorTask = dep.task;
                                                        return (
                                                            <div
                                                                key={dep.id}
                                                                className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background hover:bg-muted/30 transition-colors text-xs"
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="font-semibold truncate text-foreground">
                                                                            {successorTask?.title || `Task #${dep.task_id}`}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                            <span>{successorTask?.board?.title || 'Board'}</span>
                                                                            {successorTask?.column && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span className="px-1.5 py-0.2 rounded bg-muted">
                                                                                        {successorTask.column.title}
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                            {dep.lag_days > 0 && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span>+{dep.lag_days}d buffer</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {canManageDependencies && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveDependency(dep.id)}
                                                                        className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                                        title="Remove dependency"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Related Tasks */}
                                        <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                    <Link2 className="h-3.5 w-3.5 text-primary" />
                                                    Related References
                                                </h4>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                    {dependencySummary.related.length}
                                                </span>
                                            </div>

                                            {dependencySummary.related.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic py-1">
                                                    No related references linked.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {dependencySummary.related.map((dep: any) => {
                                                        const targetTask = dep.task_id === task.id ? dep.dependency_task : dep.task;
                                                        return (
                                                            <div
                                                                key={dep.id}
                                                                className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background hover:bg-muted/30 transition-colors text-xs"
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="font-semibold truncate text-foreground">
                                                                            {targetTask?.title || `Task #${dep.task_id === task.id ? dep.depends_on_task_id : dep.task_id}`}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                            <span>{targetTask?.board?.title || 'Board'}</span>
                                                                            {targetTask?.column && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span className="px-1.5 py-0.2 rounded bg-muted">
                                                                                        {targetTask.column.title}
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {canManageDependencies && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveDependency(dep.id)}
                                                                        className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                                        title="Remove link"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
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

            {/* Recurrence Configuration Modal */}
            <Dialog open={isRecurrenceModalOpen} onOpenChange={setIsRecurrenceModalOpen}>
                <DialogContent className="max-w-lg rounded-2xl p-6 sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                            <Repeat className="h-5 w-5 text-primary" />
                            Recurring Task Schedule
                        </DialogTitle>
                    </DialogHeader>

                    {recurrenceErrorMessage && (
                        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{recurrenceErrorMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleSaveRecurrence} className="space-y-4 text-xs">
                        {/* Frequency & Interval */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                    Frequency
                                </Label>
                                <select
                                    value={recFreq}
                                    onChange={(e) => setRecFreq(e.target.value as any)}
                                    className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="custom">Custom (Days)</option>
                                    <option value="on_completion">On Completion</option>
                                </select>
                            </div>

                            <div>
                                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                    Repeat Every
                                </Label>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        type="number"
                                        min="1"
                                        value={recInterval}
                                        onChange={(e) => setRecInterval(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="h-8 text-xs"
                                    />
                                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                                        {recFreq === 'daily' && (recInterval === 1 ? 'day' : 'days')}
                                        {recFreq === 'weekly' && (recInterval === 1 ? 'week' : 'weeks')}
                                        {recFreq === 'monthly' && (recInterval === 1 ? 'month' : 'months')}
                                        {recFreq === 'custom' && 'days'}
                                        {recFreq === 'on_completion' && 'days after done'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Days of Week (Weekly only) */}
                        {recFreq === 'weekly' && (
                            <div>
                                <Label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block">
                                    Days of the Week
                                </Label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {[
                                        { id: 1, label: 'Mon' },
                                        { id: 2, label: 'Tue' },
                                        { id: 3, label: 'Wed' },
                                        { id: 4, label: 'Thu' },
                                        { id: 5, label: 'Fri' },
                                        { id: 6, label: 'Sat' },
                                        { id: 7, label: 'Sun' },
                                    ].map((d) => {
                                        const isSelected = recDaysOfWeek.includes(d.id);
                                        return (
                                            <button
                                                key={d.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        if (recDaysOfWeek.length > 1) {
                                                            setRecDaysOfWeek(recDaysOfWeek.filter((x) => x !== d.id));
                                                        }
                                                    } else {
                                                        setRecDaysOfWeek([...recDaysOfWeek, d.id]);
                                                    }
                                                }}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-background hover:bg-muted text-muted-foreground border-input'
                                                }`}
                                            >
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Preferred Time of Day */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                    Spawn Time (Target)
                                </Label>
                                <Input
                                    type="time"
                                    value={recTimeOfDay}
                                    onChange={(e) => setRecTimeOfDay(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>

                            <div>
                                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                    Ends
                                </Label>
                                <select
                                    value={recEndType}
                                    onChange={(e) => setRecEndType(e.target.value as any)}
                                    className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="never">Never</option>
                                    <option value="after_occurrences">After Occurrences</option>
                                    <option value="on_date">On Specific Date</option>
                                </select>
                            </div>
                        </div>

                        {/* Conditional End Controls */}
                        {recEndType === 'after_occurrences' && (
                            <div>
                                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                    Total Occurrences
                                </Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={recMaxOccurrences}
                                    onChange={(e) => setRecMaxOccurrences(e.target.value ? parseInt(e.target.value) : '')}
                                    placeholder="e.g. 10"
                                    className="h-8 text-xs max-w-[160px]"
                                />
                            </div>
                        )}

                        {recEndType === 'on_date' && (
                            <div>
                                <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                    End Date
                                </Label>
                                <Input
                                    type="date"
                                    value={recEndDate}
                                    onChange={(e) => setRecEndDate(e.target.value)}
                                    className="h-8 text-xs max-w-[200px]"
                                />
                            </div>
                        )}

                        {/* Preservation Flags */}
                        <div className="space-y-2 border-t border-border/60 pt-3">
                            <Label className="text-[11px] font-semibold text-muted-foreground block">
                                Instance Duplication Options
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        checked={recCopySubtasks}
                                        onChange={(e) => setRecCopySubtasks(e.target.checked)}
                                        className="rounded border-input text-primary focus:ring-primary"
                                    />
                                    <span>Copy Subtasks</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        checked={recCopyAssignees}
                                        onChange={(e) => setRecCopyAssignees(e.target.checked)}
                                        className="rounded border-input text-primary focus:ring-primary"
                                    />
                                    <span>Preserve Assignees</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        checked={recCopyCustomValues}
                                        onChange={(e) => setRecCopyCustomValues(e.target.checked)}
                                        className="rounded border-input text-primary focus:ring-primary"
                                    />
                                    <span>Custom Columns</span>
                                </label>
                            </div>
                        </div>

                        {/* Recent Execution Logs */}
                        {recurrenceLogs.length > 0 && (
                            <div className="space-y-2 border-t border-border/60 pt-3">
                                <Label className="text-[11px] font-semibold text-muted-foreground block">
                                    Recent Recurrence History ({recurrenceLogs.length})
                                </Label>
                                <div className="max-h-28 overflow-y-auto rounded-lg border border-border/70 divide-y divide-border/40 text-[11px]">
                                    {recurrenceLogs.map((log) => (
                                        <div key={log.id} className="p-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${
                                                        log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                                                    }`}
                                                />
                                                <span className="text-foreground font-medium">
                                                    {log.executed_at ? formatDate(log.executed_at) : 'Executed'}
                                                </span>
                                                {log.generated_task_id && (
                                                    <span className="text-muted-foreground">
                                                        Task #{log.generated_task_id}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="capitalize text-muted-foreground text-[10px]">
                                                {log.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Modal Footer Controls */}
                        <div className="flex items-center justify-between border-t border-border/60 pt-4">
                            <div>
                                {recurrenceRule && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDeleteRecurrence}
                                        className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                                        Delete Schedule
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsRecurrenceModalOpen(false)}
                                    className="h-8 text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isSavingRecurrence}
                                    className="h-8 text-xs font-semibold"
                                >
                                    {isSavingRecurrence ? 'Saving...' : 'Save Schedule'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
