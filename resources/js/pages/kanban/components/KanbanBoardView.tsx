import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';
import { router } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    CornerDownRight,
    Edit3,
    GripVertical,
    MessageCircle,
    MoreHorizontal,
    Plus,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import { KanbanBoard, KanbanColumn, Task, User } from '../types';

interface KanbanBoardViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
    onQuickAddTask: (columnId: number) => void;
}

export default function KanbanBoardView({
    board,
    searchTerm,
    personFilter,
    priorityFilter,
    users = [],
    onSelectTask,
    onQuickAddTask,
}: KanbanBoardViewProps) {
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

    // Filter tasks
    const filterTask = (task: Task) => {
        if (task.parent_id) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesTitle = task.title.toLowerCase().includes(term);
            const matchesDesc = (task.description || '').toLowerCase().includes(term);
            if (!matchesTitle && !matchesDesc) return false;
        }
        if (personFilter !== 'all' && String(task.assigned_to) !== personFilter) {
            return false;
        }
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
            return false;
        }
        return true;
    };

    // Drag and Drop
    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        setDraggingTaskId(taskId);
        e.dataTransfer.setData('text/plain', String(taskId));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, columnId: number) => {
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

        router.patch(
            `/kanban/tasks/${taskId}/column`,
            {
                column_id: targetColumnId,
            },
            { preserveScroll: true },
        );
        setDraggingTaskId(null);
    };

    const isOverdue = (task: Task) => {
        if (!task.due_date || task.completed_at) return false;
        const due = new Date(task.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return due < today;
    };

    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case 'Urgent':
                return 'bg-red-500/10 text-red-600 border-red-500/30';
            case 'High':
                return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
            case 'Medium':
                return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
            default:
                return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <div className="scrollbar-thin flex items-start gap-4 overflow-x-auto pb-4">
            {columns.map((col) => {
                const colTasks = (col.tasks || []).filter(filterTask);
                const isOver = dragOverColumnId === col.id;

                return (
                    <div
                        key={col.id}
                        onDragOver={(e) => handleDragOver(e, col.id)}
                        onDragLeave={(e) => handleDragLeave(e, col.id)}
                        onDrop={(e) => handleDrop(e, col.id)}
                        className={`bg-card flex w-72 flex-shrink-0 flex-col rounded-2xl border transition-all sm:w-80 ${
                            isOver ? 'border-primary ring-primary/20 bg-primary/5 ring-2' : 'border-border shadow-xs'
                        }`}
                    >
                        {/* Column Header */}
                        <div className="border-border/50 flex items-center justify-between border-b p-3 select-none">
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="h-3.5 w-3.5 rounded-full shadow-2xs transition-transform hover:scale-110"
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

                                <h3 className="text-foreground max-w-[150px] truncate text-sm font-black tracking-tight">{col.title}</h3>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-bold">{colTasks.length}</span>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="hover:bg-muted text-muted-foreground rounded p-1">
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setEditingStage(col);
                                                setEditStageTitle(col.title);
                                            }}
                                            className="text-xs"
                                        >
                                            <Edit3 className="mr-2 h-3.5 w-3.5" />
                                            <span>Rename Stage</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDeleteStage(col.id)} className="text-xs text-red-500">
                                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                                            <span>Delete Stage</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Cards List */}
                        <div className="max-h-[calc(100vh-280px)] min-h-[320px] space-y-2.5 overflow-y-auto p-2.5">
                            {colTasks.map((task) => {
                                const subitems = task.subitems || [];
                                const completedSubitems = subitems.filter((s) => s.completed_at || s.progress === 100).length;
                                const isSubExpanded = !!expandedCards[task.id];
                                const overdue = isOverdue(task);
                                const commentCount = (task.comments || []).length;

                                return (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onClick={() => onSelectTask(task)}
                                        className={`group bg-background border-border hover:border-primary/50 cursor-pointer rounded-xl border p-3 transition-all hover:shadow-md ${
                                            draggingTaskId === task.id ? 'scale-95 opacity-40' : 'opacity-100'
                                        }`}
                                    >
                                        {/* Card Top: Priority, Overdue Tag, Grip */}
                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <Badge
                                                    variant="outline"
                                                    className={`border px-2 py-0.5 text-[10px] font-bold ${getPriorityBadgeClass(task.priority)}`}
                                                >
                                                    {task.priority}
                                                </Badge>

                                                {overdue && (
                                                    <span className="flex items-center gap-0.5 rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                                                        <AlertCircle className="h-2.5 w-2.5" />
                                                        <span>Overdue</span>
                                                    </span>
                                                )}
                                            </div>

                                            <GripVertical className="text-muted-foreground/30 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                                        </div>

                                        {/* Title */}
                                        <h4 className="text-foreground mb-1 text-xs leading-snug font-bold">{task.title}</h4>

                                        {task.description && (
                                            <p className="text-muted-foreground mb-2 line-clamp-2 text-[11px]">{task.description}</p>
                                        )}

                                        {/* Progress Bar */}
                                        {task.progress > 0 && (
                                            <div className="mb-2">
                                                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-500 transition-all"
                                                        style={{ width: `${task.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Subtasks Collapsible Section directly beneath Card */}
                                        {subitems.length > 0 && (
                                            <div className="border-border/40 mb-2 border-t pt-1">
                                                <button
                                                    onClick={(e) => toggleSubtasks(task.id, e)}
                                                    className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between py-0.5 text-[11px] font-semibold"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <CornerDownRight className="text-primary h-3 w-3" />
                                                        <span>
                                                            Subtasks ({completedSubitems}/{subitems.length})
                                                        </span>
                                                    </div>
                                                    {isSubExpanded ? (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    )}
                                                </button>

                                                {/* Expanded Indented Subtask List */}
                                                {isSubExpanded && (
                                                    <div className="bg-muted/20 border-border/40 mt-1 space-y-1 rounded-lg border py-1.5 pr-1 pl-3">
                                                        {subitems.map((sub) => (
                                                            <div
                                                                key={sub.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectTask(sub);
                                                                }}
                                                                className="hover:bg-card group/sub flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px] transition-colors"
                                                            >
                                                                <div className="flex flex-1 items-center gap-1.5 truncate">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => handleToggleSubtaskComplete(sub, e)}
                                                                        className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-all ${
                                                                            sub.completed_at || sub.progress === 100
                                                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                                                : 'border-border bg-card'
                                                                        }`}
                                                                    >
                                                                        {(sub.completed_at || sub.progress === 100) && (
                                                                            <Check className="h-2.5 w-2.5" />
                                                                        )}
                                                                    </button>
                                                                    <span
                                                                        className={`truncate ${
                                                                            sub.completed_at || sub.progress === 100
                                                                                ? 'text-muted-foreground line-through'
                                                                                : 'text-foreground font-medium'
                                                                        }`}
                                                                    >
                                                                        {sub.title}
                                                                    </span>
                                                                </div>

                                                                {sub.assignee && (
                                                                    <div
                                                                        className="bg-primary/20 text-primary flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                                                                        title={sub.assignee.name}
                                                                    >
                                                                        {sub.assignee.name.charAt(0)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {/* Add Subtask Trigger within Card */}
                                                        {addingSubtaskForTask === task.id ? (
                                                            <form
                                                                onSubmit={(e) => handleAddInlineSubtask(task.id, e)}
                                                                className="mt-1.5 flex items-center gap-1"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <input
                                                                    type="text"
                                                                    placeholder="Subtask title..."
                                                                    value={inlineSubtaskTitles[task.id] || ''}
                                                                    onChange={(e) =>
                                                                        setInlineSubtaskTitles((prev) => ({
                                                                            ...prev,
                                                                            [task.id]: e.target.value,
                                                                        }))
                                                                    }
                                                                    autoFocus
                                                                    className="bg-background border-primary h-6 flex-1 rounded border px-1.5 text-[10px] focus:outline-none"
                                                                />
                                                                <Button type="submit" size="sm" className="h-6 px-2 text-[10px]">
                                                                    Add
                                                                </Button>
                                                            </form>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAddingSubtaskForTask(task.id);
                                                                }}
                                                                className="text-primary flex items-center gap-1 pt-1 text-[10px] font-bold hover:underline"
                                                            >
                                                                <Plus className="h-2.5 w-2.5" />
                                                                <span>Add Subtask</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Card Footer: Dates, Comments count, Assignee Avatar */}
                                        <div className="border-border/40 text-muted-foreground flex items-center justify-between border-t pt-2 text-[11px]">
                                            <div className="flex items-center gap-2">
                                                {task.due_date && (
                                                    <div className={`flex items-center gap-1 font-medium ${overdue ? 'font-bold text-red-500' : ''}`}>
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{formatDate(task.due_date)}</span>
                                                    </div>
                                                )}

                                                {commentCount > 0 && (
                                                    <div className="flex items-center gap-0.5">
                                                        <MessageCircle className="text-muted-foreground h-3 w-3" />
                                                        <span>{commentCount}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Assignee Avatar */}
                                            {task.assignee ? (
                                                <div
                                                    className="bg-primary/20 text-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                                                    title={task.assignee.name}
                                                >
                                                    {task.assignee.name.charAt(0)}
                                                </div>
                                            ) : (
                                                <div className="border-border flex h-5 w-5 items-center justify-center rounded-full border border-dashed">
                                                    <UserIcon className="h-2.5 w-2.5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {colTasks.length === 0 && (
                                <div className="border-border text-muted-foreground/60 flex h-28 items-center justify-center rounded-xl border border-dashed text-xs">
                                    Drop items here
                                </div>
                            )}
                        </div>

                        {/* Add Task Button at bottom of column */}
                        <div className="border-border/50 border-t p-2">
                            <button
                                onClick={() => onQuickAddTask(col.id)}
                                className="border-border hover:border-primary/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1 rounded-xl border border-dashed py-1.5 text-xs font-semibold transition-all"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Task</span>
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* + Add Workflow Stage Button */}
            <div className="w-72 flex-shrink-0">
                <button
                    onClick={() => setIsAddStageOpen(true)}
                    className="border-border hover:border-primary/60 hover:bg-card text-muted-foreground hover:text-foreground flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-xs font-bold transition-all"
                >
                    <Plus className="h-4 w-4" />
                    <span>Add Workflow Stage</span>
                </button>
            </div>

            {/* Add Workflow Stage Modal */}
            <Dialog open={isAddStageOpen} onOpenChange={setIsAddStageOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleCreateStage}>
                        <DialogHeader>
                            <DialogTitle>Add New Workflow Stage</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="stage-title">Stage Name</Label>
                                <Input
                                    id="stage-title"
                                    placeholder="e.g. In Review, Blocked, Testing"
                                    value={newStageTitle}
                                    onChange={(e) => setNewStageTitle(e.target.value)}
                                    required
                                    className="mt-1"
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
                                                newStageColor === hex ? 'border-foreground scale-110' : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: hex }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddStageOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create Stage</Button>
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
                        <div className="py-4">
                            <Label htmlFor="edit-stage-title">Stage Name</Label>
                            <Input
                                id="edit-stage-title"
                                value={editStageTitle}
                                onChange={(e) => setEditStageTitle(e.target.value)}
                                required
                                className="mt-1"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingStage(null)}>
                                Cancel
                            </Button>
                            <Button type="submit">Rename</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
