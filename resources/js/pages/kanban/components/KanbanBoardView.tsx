import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate, formatTime, getExactTimeRemaining } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    Clock,
    CornerDownRight,
    Edit3,
    GripVertical,
    MessageCircle,
    MoreHorizontal,
    Plus,
    Repeat,
    ShieldAlert,
    Star,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import { BoardPermissions, getTaskAssignedUsers, isUserAssignedToTask, KanbanBoard, KanbanColumn, Task, User } from '../types';

interface KanbanBoardViewProps {
    board: KanbanBoard;
    viewSettings?: Record<string, any> | null;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    currentUser?: User;
    permissions?: BoardPermissions;
    onSelectTask: (task: Task) => void;
    onQuickAddTask: (columnId: number) => void;
}

export default function KanbanBoardView({
    board,
    viewSettings,
    searchTerm,
    personFilter,
    priorityFilter,
    users = [],
    currentUser,
    permissions,
    onSelectTask,
    onQuickAddTask,
}: KanbanBoardViewProps) {
    const { auth } = usePage<any>().props;
    const effectiveCurrentUser = currentUser || auth?.user;
    const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
    const [dragOverColumnId, setDragOverColumnId] = useState<number | null>(null);
    const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
    const [inlineSubtaskTitles, setInlineSubtaskTitles] = useState<Record<number, string>>({});
    const [addingSubtaskForTask, setAddingSubtaskForTask] = useState<number | null>(null);

    // Stage Management Modals
    const [isAddStageOpen, setIsAddStageOpen] = useState(false);
    const [newStageTitle, setNewStageTitle] = useState('');
    const [newStageColor, setNewStageColor] = useState('#64748b');

    const [editingStage, setEditingStage] = useState<KanbanColumn | null>(null);
    const [editStageTitle, setEditStageTitle] = useState('');

    const columns = board.columns || [];

    const toggleSubtasks = (taskId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedCards((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    const handleCreateStage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStageTitle.trim()) return;

        router.post(
            `/kanban/boards/${board.id}/stages`,
            {
                title: newStageTitle.trim(),
                color: newStageColor,
            },
            {
                onSuccess: () => {
                    setIsAddStageOpen(false);
                    setNewStageTitle('');
                },
            },
        );
    };

    const handleUpdateStage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStage || !editStageTitle.trim()) return;

        router.patch(
            `/kanban/stages/${editingStage.id}`,
            {
                title: editStageTitle.trim(),
            },
            {
                onSuccess: () => {
                    setEditingStage(null);
                },
            },
        );
    };

    const handleUpdateStageColor = (stageId: number, color: string) => {
        router.patch(`/kanban/stages/${stageId}`, { color });
    };

    const handleDeleteStage = (stageId: number) => {
        if (confirm('Delete this workflow stage? Remaining tasks will be moved to another stage.')) {
            router.delete(`/kanban/stages/${stageId}`);
        }
    };

    const handleAddInlineSubtask = (taskId: number, e: React.FormEvent) => {
        e.preventDefault();
        const title = inlineSubtaskTitles[taskId]?.trim();
        if (!title) return;

        router.post(
            `/kanban/tasks/${taskId}/subitems`,
            { title },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setInlineSubtaskTitles((prev) => ({ ...prev, [taskId]: '' }));
                    setAddingSubtaskForTask(null);
                    setExpandedCards((prev) => ({ ...prev, [taskId]: true }));
                },
            },
        );
    };

    const handleToggleSubtaskComplete = (subtask: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        const isDone = !!subtask.completed_at;
        router.patch(
            `/kanban/tasks/${subtask.id}`,
            {
                progress: isDone ? 0 : 100,
            },
            { preserveScroll: true },
        );
    };

    const canMoveTask = (task: Task) => {
        if (permissions?.canChangeStatus !== false) {
            return true;
        }
        if (permissions?.canMoveAssignedTask !== false && isUserAssignedToTask(task, effectiveCurrentUser?.id || 'me', effectiveCurrentUser?.id)) {
            return true;
        }
        return false;
    };

    // Filter tasks
    const filterTask = (task: Task) => {
        if (task.parent_id) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesTitle = task.title.toLowerCase().includes(term);
            const matchesDesc = (task.description || '').toLowerCase().includes(term);
            if (!matchesTitle && !matchesDesc) return false;
        }
        if (personFilter !== 'all' && !isUserAssignedToTask(task, personFilter, effectiveCurrentUser?.id)) {
            return false;
        }
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
            return false;
        }
        return true;
    };

    // Drag and Drop
    const handleDragStart = (e: React.DragEvent, task: Task) => {
        if (!canMoveTask(task)) {
            e.preventDefault();
            return;
        }
        setDraggingTaskId(task.id);
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, columnId: number) => {
        if (permissions?.canChangeStatus === false && permissions?.canMoveAssignedTask === false) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverColumnId !== columnId) {
            setDragOverColumnId(columnId);
        }
    };

    const handleDragLeave = (e: React.DragEvent, columnId: number) => {
        e.preventDefault();
        if (dragOverColumnId === columnId) {
            setDragOverColumnId(null);
        }
    };

    const handleDrop = (e: React.DragEvent, targetColumnId: number) => {
        e.preventDefault();
        setDragOverColumnId(null);
        const taskIdStr = e.dataTransfer.getData('text/plain');
        const taskId = taskIdStr ? parseInt(taskIdStr, 10) : draggingTaskId;

        if (!taskId) return;

        const allTasks = columns.flatMap((c) => c.tasks || []);
        const task = allTasks.find((t) => t.id === taskId);
        if (!task || !canMoveTask(task)) {
            setDraggingTaskId(null);
            return;
        }

        if (task.column_id === targetColumnId) {
            setDraggingTaskId(null);
            return;
        }

        router.patch(
            `/kanban/tasks/${taskId}/column`,
            {
                column_id: targetColumnId,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    console.error('Task move failed:', errors);
                },
            },
        );
        setDraggingTaskId(null);
    };

    const isOverdue = (task: Task) => {
        if (!task.due_date || task.completed_at || (task.progress ?? 0) === 100) return false;
        if (task.deadline_status) {
            return task.deadline_status === 'overdue';
        }
        const timeStr = task.due_time ? task.due_time : '23:59:59';
        const due = new Date(`${task.due_date}T${timeStr}`);
        return due < new Date();
    };

    const isDueToday = (task: Task) => {
        if (!task.due_date || task.completed_at || (task.progress ?? 0) === 100) return false;
        if (task.deadline_status === 'due_today') return true;
        const todayStr = new Date().toISOString().split('T')[0];
        return task.due_date === todayStr;
    };

    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case 'Urgent':
                return 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400';
            case 'High':
                return 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400';
            case 'Medium':
                return 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400';
            case 'Low':
                return 'bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400';
            default:
                return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-1 items-stretch gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {columns.map((col) => {
                const colTasks = (col.tasks || []).filter(filterTask);
                const isOver = dragOverColumnId === col.id;

                return (
                    <div
                        key={col.id}
                        onDragOver={(e) => handleDragOver(e, col.id)}
                        onDragLeave={(e) => handleDragLeave(e, col.id)}
                        onDrop={(e) => handleDrop(e, col.id)}
                        className={`flex h-full max-h-full min-h-0 w-[290px] sm:w-[310px] shrink-0 flex-col rounded-2xl border transition-all ${
                            isOver
                                ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
                                : 'border-border/70 bg-[#F0F1F3]/80 shadow-xs dark:bg-[#1A1A2B]/80'
                        }`}
                    >
                        {/* Column Header (Fixed Top) */}
                        <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-card/90 px-3.5 py-3 select-none backdrop-blur-xs">
                            <div className="flex items-center gap-2 min-w-0">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="h-3.5 w-3.5 shrink-0 rounded-full shadow-2xs transition-transform hover:scale-110"
                                            style={{ backgroundColor: col.color || '#64748b' }}
                                            title="Change stage color"
                                        />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="grid w-36 grid-cols-4 gap-1.5 p-2">
                                        {['#64748b', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'].map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => handleUpdateStageColor(col.id, c)}
                                                className="h-6 w-6 rounded-md border border-black/10 transition-all hover:scale-110"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <h3 className="truncate text-sm font-black tracking-tight text-foreground">{col.title}</h3>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="rounded-full bg-muted/80 px-2 py-0.5 text-xs font-bold text-muted-foreground">
                                    {colTasks.length}
                                </span>

                                {permissions?.canManageColumns !== false && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44 rounded-xl text-xs">
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setEditingStage(col);
                                                    setEditStageTitle(col.title);
                                                }}
                                            >
                                                <Edit3 className="mr-2 h-3.5 w-3.5" />
                                                <span>Rename Stage</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleDeleteStage(col.id)} className="text-rose-500 focus:text-rose-500">
                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                <span>Delete Stage</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>

                        {/* Cards List (Internal Scroll) */}
                        <div className="flex-1 min-h-0 space-y-2.5 overflow-y-auto p-2.5 scrollbar-thin">
                            {colTasks.map((task) => {
                                const subitems = task.subitems || [];
                                const completedSubitems = subitems.filter((s) => s.completed_at || s.progress === 100).length;
                                const isSubExpanded = !!expandedCards[task.id];
                                const exactRemaining = getExactTimeRemaining(task.due_date, task.due_time);
                                const overdue = isOverdue(task) || (exactRemaining?.isOverdue ?? false);
                                const isDueSoonOrToday = !overdue && exactRemaining && exactRemaining.hours < 24;
                                const dueToday = isDueToday(task) || Boolean(isDueSoonOrToday);
                                const commentCount = (task.comments || []).length;

                                // Extract cover image if present (attachments or media usages)
                                const imageAttachment = (task.attachments || []).find(
                                    (a) => a.mime_type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.file_name || ''),
                                );
                                const mediaUsageUrl = task.media_usages?.[0]?.media_asset?.url;

                                const assignedWorkers = getTaskAssignedUsers(task, users);

                                const amIds: number[] = (() => {
                                    const raw = task.custom_values?.['account_manager'] ?? task.custom_values?.['am'];
                                    if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
                                    if (typeof raw === 'number' && raw > 0) return [raw];
                                    return [];
                                })();
                                const amUsers = amIds.map((id) => users.find((u) => u.id === id)).filter((u): u is User => Boolean(u));

                                const serviceType = task.custom_values?.['service_type'] || task.custom_values?.['category'];
                                const isMovable = canMoveTask(task);

                                return (
                                    <div
                                        key={task.id}
                                        draggable={isMovable}
                                        onDragStart={(e) => handleDragStart(e, task)}
                                        onClick={() => onSelectTask(task)}
                                        className={`group relative rounded-xl border border-border/80 bg-card p-3 text-card-foreground shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md ${
                                            isMovable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                        } ${
                                            draggingTaskId === task.id ? 'scale-95 opacity-40' : 'opacity-100'
                                        }`}
                                    >
                                        {/* Top Row: Priority Chip, Tags, Drag Grip */}
                                        <div className="mb-2 flex items-center justify-between gap-1.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <Badge
                                                    variant="outline"
                                                    className={`border px-2 py-0.5 text-[10px] font-bold ${getPriorityBadgeClass(task.priority)}`}
                                                >
                                                    {task.priority}
                                                </Badge>

                                                {overdue && (
                                                    <span className="flex items-center gap-0.5 rounded border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                                        <AlertCircle className="h-2.5 w-2.5" />
                                                        <span>{exactRemaining ? exactRemaining.formattedRemaining : 'Overdue'}</span>
                                                    </span>
                                                )}

                                                {!overdue && exactRemaining && exactRemaining.hours < 24 && (
                                                    <span className="flex items-center gap-0.5 rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        <span>{exactRemaining.formattedRemaining}</span>
                                                    </span>
                                                )}

                                                {task.is_blocked && (
                                                    <span
                                                        title="Blocked by predecessor task"
                                                        className="flex items-center gap-0.5 rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                                                    >
                                                        <ShieldAlert className="h-2.5 w-2.5" />
                                                        <span>Blocked</span>
                                                    </span>
                                                )}

                                                {(task.recurrence_rule || task.recurrenceRule || task.recurrence_rule_id) && (
                                                    <span
                                                        title="Recurring task schedule active"
                                                        className="flex items-center gap-0.5 rounded border border-blue-500/25 bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400"
                                                    >
                                                        <Repeat className="h-2.5 w-2.5" />
                                                        <span>Repeats</span>
                                                    </span>
                                                )}

                                                {serviceType && (
                                                    <span className="max-w-[110px] truncate rounded border border-border/40 bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                        {String(serviceType)}
                                                    </span>
                                                )}
                                            </div>

                                            {isMovable && (
                                                <span title="Drag to move card" className="shrink-0">
                                                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 transition-opacity hover:text-foreground" />
                                                </span>
                                            )}
                                        </div>

                                        {/* Cover Image / Thumbnail (ONLY if image attachment or media usage exists) */}
                                        {imageAttachment && (
                                            <div className="relative mb-2.5 h-28 w-full overflow-hidden rounded-lg border border-border/40 bg-muted/40">
                                                <img
                                                    src={`/storage/${imageAttachment.file_path}`}
                                                    alt={imageAttachment.file_name}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            </div>
                                        )}
                                        {!imageAttachment && mediaUsageUrl && (
                                            <div className="relative mb-2.5 h-28 w-full overflow-hidden rounded-lg border border-border/40 bg-muted/40">
                                                <img
                                                    src={mediaUsageUrl}
                                                    alt={task.title}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            </div>
                                        )}

                                        {/* Title */}
                                        <h4 className="mb-1 text-xs sm:text-[13px] font-bold leading-snug text-foreground line-clamp-2 transition-colors group-hover:text-primary">
                                            {task.title}
                                        </h4>

                                        {/* Description Snippet (Only when present) */}
                                        {task.description && (
                                            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                                                {task.description}
                                            </p>
                                        )}

                                        {/* Work Categories Section */}
                                        {subitems.length > 0 && (
                                            <div
                                                className="mb-2 border-t border-border/40 pt-1"
                                                draggable={false}
                                                onDragStart={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleSubtasks(task.id, e)}
                                                    className="flex w-full items-center justify-between py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <CornerDownRight className="h-3 w-3 text-primary" />
                                                        <span>
                                                            Work Categories ({subitems.length})
                                                        </span>
                                                    </div>
                                                    {isSubExpanded ? (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    )}
                                                </button>

                                                {/* Expanded Work Categories List */}
                                                {isSubExpanded && (
                                                    <div
                                                        className="mt-1 space-y-1 rounded-lg border border-border/40 bg-muted/20 py-1.5 pr-1 pl-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {subitems.map((sub) => {
                                                            const subAssignees = getTaskAssignedUsers(sub, users);
                                                            return (
                                                                <div
                                                                    key={sub.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onSelectTask(sub);
                                                                    }}
                                                                    className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px] transition-colors hover:bg-card"
                                                                >
                                                                    <div className="flex flex-1 items-center gap-1.5 truncate">
                                                                        <span className="font-medium text-foreground truncate">
                                                                            {sub.title}
                                                                        </span>
                                                                        {sub.column?.title && (
                                                                            <span className="shrink-0 rounded px-1 py-0.2 text-[9px] font-semibold bg-muted text-muted-foreground">
                                                                                {sub.column.title}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {subAssignees.length > 0 && (
                                                                        <div
                                                                            className="flex items-center -space-x-1 shrink-0"
                                                                            title={`Assigned: ${subAssignees.map((u) => u.name).join(', ')}`}
                                                                        >
                                                                            {subAssignees.slice(0, 2).map((u) => (
                                                                                <div
                                                                                    key={u.id}
                                                                                    className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[8px] font-bold text-primary ring-1 ring-border"
                                                                                >
                                                                                    {u.name.charAt(0).toUpperCase()}
                                                                                </div>
                                                                            ))}
                                                                            {subAssignees.length > 2 && (
                                                                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground ring-1 ring-border">
                                                                                    +{subAssignees.length - 2}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Add Work Category Trigger within Card */}
                                                        {addingSubtaskForTask === task.id ? (
                                                            <form
                                                                onSubmit={(e) => handleAddInlineSubtask(task.id, e)}
                                                                className="mt-1.5 flex items-center gap-1"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <input
                                                                    type="text"
                                                                    placeholder="Category (e.g. Design, Video Editing, QA)..."
                                                                    value={inlineSubtaskTitles[task.id] || ''}
                                                                    onChange={(e) =>
                                                                        setInlineSubtaskTitles((prev) => ({
                                                                            ...prev,
                                                                            [task.id]: e.target.value,
                                                                        }))
                                                                    }
                                                                    autoFocus
                                                                    className="h-6 flex-1 rounded border border-primary bg-background px-1.5 text-[10px] focus:outline-none"
                                                                />
                                                                <Button type="submit" size="sm" className="h-6 px-2 text-[10px]">
                                                                    Add
                                                                </Button>
                                                            </form>
                                                        ) : (
                                                            permissions?.canManageSubtasks !== false && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setAddingSubtaskForTask(task.id);
                                                                    }}
                                                                    className="flex items-center gap-1 pt-1 text-[10px] font-bold text-primary hover:underline"
                                                                >
                                                                    <Plus className="h-2.5 w-2.5" />
                                                                    <span>Add Work Category</span>
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Card Footer: Due Date, Comments, Assignees */}
                                        <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                {task.due_date && (
                                                    <div
                                                        className={`flex items-center gap-1 font-medium ${
                                                            overdue ? 'font-bold text-rose-600 dark:text-rose-400' : dueToday ? 'font-bold text-amber-600 dark:text-amber-400' : ''
                                                        }`}
                                                        title={exactRemaining?.formattedRemaining}
                                                    >
                                                        <Calendar className="h-3 w-3" />
                                                        <span>
                                                            {formatDate(task.due_date)}
                                                            {task.due_time && ` · ${formatTime(task.due_time)}`}
                                                        </span>
                                                    </div>
                                                )}

                                                {task.is_milestone && (
                                                    <span title="Milestone">
                                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                    </span>
                                                )}

                                                {commentCount > 0 && (
                                                    <div className="flex items-center gap-0.5 text-muted-foreground">
                                                        <MessageCircle className="h-3 w-3" />
                                                        <span>{commentCount}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Assignees (Account Manager & Assigned Production Workers) */}
                                            <div className="flex items-center gap-1.5">
                                                {/* AM Avatars with Badge */}
                                                {amUsers.length > 0 && (
                                                    <div
                                                        className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5"
                                                        title={`Account Manager: ${amUsers.map((u) => u.name).join(', ')}`}
                                                    >
                                                        <span className="text-[8px] font-black text-amber-600 dark:text-amber-400">AM</span>
                                                        <div className="flex -space-x-1">
                                                            {amUsers.slice(0, 2).map((u) => (
                                                                <div
                                                                    key={u.id}
                                                                    className="flex h-4 w-4 items-center justify-center rounded-full border border-background bg-amber-500/20 text-[8px] font-bold text-amber-700 dark:text-amber-300"
                                                                >
                                                                    {u.name.charAt(0).toUpperCase()}
                                                                </div>
                                                            ))}
                                                            {amUsers.length > 2 && (
                                                                <div className="flex h-4 w-4 items-center justify-center rounded-full border border-background bg-amber-500/10 text-[8px] font-bold text-amber-700 dark:text-amber-300">
                                                                    +{amUsers.length - 2}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Assigned Workers / Designers Avatars */}
                                                {assignedWorkers.length > 0 ? (
                                                    <div
                                                        className="flex items-center -space-x-1"
                                                        title={`Assigned: ${assignedWorkers.map((u) => u.name).join(', ')}`}
                                                    >
                                                        {assignedWorkers.slice(0, 2).map((u) => (
                                                            <div
                                                                key={u.id}
                                                                className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-primary/20 text-[9px] font-bold text-primary ring-1 ring-border shadow-2xs"
                                                            >
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        ))}
                                                        {assignedWorkers.length > 2 && (
                                                            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-muted text-[8px] font-bold text-muted-foreground ring-1 ring-border">
                                                                +{assignedWorkers.length - 2}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-border"
                                                        title="Unassigned"
                                                    >
                                                        <UserIcon className="h-2.5 w-2.5 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );

                            })}

                            {colTasks.length === 0 && (
                                <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground/60 select-none">
                                    <span>{personFilter === 'me' ? 'No tasks assigned to you in this stage' : 'No tasks in this stage'}</span>
                                    <span className="text-[10px] text-muted-foreground/40">Drop items here</span>
                                </div>
                            )}
                        </div>

                        {/* Add Task Button (Fixed Bottom) */}
                        {permissions?.canCreateTask !== false && (
                            <div className="shrink-0 border-t border-border/50 bg-card/60 p-2">
                                <button
                                    onClick={() => onQuickAddTask(col.id)}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/50 hover:bg-muted/40 hover:text-foreground"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Add Task</span>
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* + Add Workflow Stage Button */}
            {permissions?.canManageColumns !== false && (
                <div className="w-72 shrink-0">
                    <button
                        onClick={() => setIsAddStageOpen(true)}
                        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 text-xs font-bold text-muted-foreground transition-all hover:border-primary/60 hover:bg-card hover:text-foreground"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Workflow Stage</span>
                    </button>
                </div>
            )}

            {/* Add Workflow Stage Modal */}
            <Dialog open={isAddStageOpen} onOpenChange={setIsAddStageOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleCreateStage}>
                        <DialogHeader>
                            <DialogTitle>Add New Workflow Stage</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-xs">
                            <div>
                                <Label htmlFor="stage-title">Stage Name</Label>
                                <Input
                                    id="stage-title"
                                    placeholder="e.g. In Review, Blocked, Testing"
                                    value={newStageTitle}
                                    onChange={(e) => setNewStageTitle(e.target.value)}
                                    required
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label>Stage Accent Color</Label>
                                <div className="mt-2 flex items-center gap-2">
                                    {['#64748b', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'].map((hex) => (
                                        <button
                                            type="button"
                                            key={hex}
                                            onClick={() => setNewStageColor(hex)}
                                            className={`h-6 w-6 rounded-full border-2 transition-all ${
                                                newStageColor === hex ? 'scale-110 border-foreground' : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: hex }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddStageOpen(false)} className="h-9 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!newStageTitle.trim()} className="h-9 rounded-xl">
                                Create Stage
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Rename Stage Modal */}
            <Dialog open={!!editingStage} onOpenChange={() => setEditingStage(null)}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleUpdateStage}>
                        <DialogHeader>
                            <DialogTitle>Rename Workflow Stage</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-xs">
                            <div>
                                <Label htmlFor="edit-stage-title">Stage Name</Label>
                                <Input
                                    id="edit-stage-title"
                                    value={editStageTitle}
                                    onChange={(e) => setEditStageTitle(e.target.value)}
                                    required
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingStage(null)} className="h-9 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!editStageTitle.trim()} className="h-9 rounded-xl">
                                Rename
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
