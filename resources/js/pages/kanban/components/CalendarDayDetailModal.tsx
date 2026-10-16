import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Calendar as CalendarIcon,
    Clock,
    Plus,
    Star,
    CheckCircle2,
    AlertCircle,
    User as UserIcon,
    ArrowRight,
    ExternalLink,
    Sparkles,
    X,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatTime } from '@/lib/utils';
import { isProductionDeadlineHidden, KanbanBoard, Task, User } from '../types';

interface CalendarDayDetailModalProps {
    isOpen: boolean;
    dateStr: string | null;
    board: KanbanBoard;
    users?: User[];
    tasks: Task[];
    onClose: () => void;
    onSelectTask: (task: Task) => void;
    onQuickAddTask?: (dateStr: string, title?: string) => void;
}

export default function CalendarDayDetailModal({
    isOpen,
    dateStr,
    board,
    users = [],
    tasks = [],
    onClose,
    onSelectTask,
    onQuickAddTask,
}: CalendarDayDetailModalProps) {
    if (!dateStr) return null;

    const [newTitle, setNewTitle] = useState('');
    const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
    const [selectedGroupId, setSelectedGroupId] = useState<number | ''>(board.groups?.[0]?.id || '');
    const [isCreating, setIsCreating] = useState(false);

    // Format the date header
    const parsedDate = new Date(`${dateStr}T12:00:00`);
    const formattedDate = parsedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    // Filter tasks scheduled on this specific date
    const dayTasks = tasks.filter((t) => {
        if (t.due_date === dateStr) return true;
        if (t.start_date === dateStr) return true;
        return false;
    });

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newTitle.trim();
        if (!trimmed || !board.id) return;

        if (onQuickAddTask) {
            onQuickAddTask(dateStr, trimmed);
            setNewTitle('');
            return;
        }

        setIsCreating(true);
        router.post(
            '/kanban/tasks',
            {
                board_id: board.id,
                group_id: selectedGroupId || undefined,
                title: trimmed,
                priority: newPriority,
                due_date: dateStr,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewTitle('');
                    setIsCreating(false);
                },
                onError: () => {
                    setIsCreating(false);
                },
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl border-white/10 bg-[#161624] text-white p-0 overflow-hidden shadow-2xl rounded-2xl">
                {/* Header Banner */}
                <div className="border-b border-white/10 bg-gradient-to-r from-[#1c1c30] via-[#1a1a2b] to-[#161624] px-6 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25 shadow-xs">
                                <CalendarIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-white tracking-tight">
                                        {formattedDate}
                                    </h3>
                                    {isToday && (
                                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/30 uppercase tracking-wider">
                                            Today
                                        </span>
                                    )}
                                    {isPast && !isToday && (
                                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-white/10">
                                            Past Date
                                        </span>
                                    )}
                                    {isFuture && (
                                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                                            Upcoming
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {dayTasks.length} {dayTasks.length === 1 ? 'item' : 'items'} scheduled on this date
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                    {/* Quick Add Inline Form */}
                    <form onSubmit={handleCreateTask} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder={`+ Add new item scheduled for ${dateStr}...`}
                                className="h-9 flex-1 border-white/10 bg-[#1e1e30] text-xs text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-primary"
                            />
                            <Button
                                type="submit"
                                disabled={!newTitle.trim() || isCreating}
                                className="h-9 px-4 text-xs font-bold bg-[#0073ea] hover:bg-[#0060c0] text-white shrink-0 rounded-lg shadow-xs"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add
                            </Button>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-slate-400">Group:</span>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                                    className="h-6 rounded border border-white/10 bg-[#1e1e30] px-2 text-[11px] text-slate-200 outline-none"
                                >
                                    {(board.groups || []).map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-slate-400">Priority:</span>
                                <select
                                    value={newPriority}
                                    onChange={(e) => setNewPriority(e.target.value as any)}
                                    className="h-6 rounded border border-white/10 bg-[#1e1e30] px-2 text-[11px] text-slate-200 outline-none"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>
                        </div>
                    </form>

                    {/* Task List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                            <span>Scheduled Tasks</span>
                            <span>{dayTasks.length} total</span>
                        </div>

                        {dayTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
                                <CalendarIcon className="h-8 w-8 text-slate-600 mb-2 opacity-50" />
                                <p className="text-xs font-semibold text-slate-300">No tasks scheduled for this day</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Use the quick input above to schedule an item for {formattedDate}.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dayTasks.map((task) => {
                                    const isDone = isProductionDeadlineHidden(task);
                                    const isOverdue = !isDone && task.deadline_status === 'overdue';
                                    const group = board.groups?.find((g) => g.id === task.group_id);
                                    const column = board.columns?.find((c) => c.id === task.column_id) || task.column;

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => {
                                                onSelectTask(task);
                                                onClose();
                                            }}
                                            className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-primary/40 cursor-pointer transition-all shadow-xs"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {/* Status indicator pill / dot */}
                                                <div
                                                    className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                                                    style={{
                                                        backgroundColor: isDone
                                                            ? '#00c875'
                                                            : isOverdue
                                                            ? '#e2445c'
                                                            : column?.color || '#579bfc',
                                                    }}
                                                />

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4
                                                            className={`text-xs font-bold truncate group-hover:text-primary transition-colors ${
                                                                isDone ? 'text-slate-400 line-through' : 'text-white'
                                                            }`}
                                                        >
                                                            {task.title}
                                                        </h4>
                                                        {task.is_milestone && (
                                                            <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                                        {group && (
                                                            <span
                                                                className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                                                                style={{
                                                                    backgroundColor: `${group.color}20`,
                                                                    color: group.color,
                                                                }}
                                                            >
                                                                {group.title}
                                                            </span>
                                                        )}

                                                        {column && (
                                                            <span
                                                                className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                                                                style={{
                                                                    backgroundColor: `${column.color}20`,
                                                                    color: column.color,
                                                                }}
                                                            >
                                                                {column.title}
                                                            </span>
                                                        )}

                                                        <span
                                                            className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                                                            style={{
                                                                backgroundColor:
                                                                    task.priority === 'Urgent'
                                                                        ? '#fee2e2'
                                                                        : task.priority === 'High'
                                                                        ? '#ffedd5'
                                                                        : '#e0f2fe',
                                                                color:
                                                                    task.priority === 'Urgent'
                                                                        ? '#b91c1c'
                                                                        : task.priority === 'High'
                                                                        ? '#c2410c'
                                                                        : '#0369a1',
                                                            }}
                                                        >
                                                            {task.priority}
                                                        </span>

                                                        {task.due_time && (
                                                            <span className="flex items-center gap-1 text-slate-400">
                                                                <Clock className="h-2.5 w-2.5" />
                                                                {formatTime(task.due_time)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Assignee & Action */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                {task.assignee ? (
                                                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[10px] text-slate-300">
                                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[9px]">
                                                            {task.assignee.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        <span className="max-w-[70px] truncate hidden sm:inline">
                                                            {task.assignee.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-500 italic">Unassigned</span>
                                                )}

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg text-slate-400 group-hover:text-white group-hover:bg-white/10"
                                                    title="Open task details drawer"
                                                >
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-white/10 bg-white/[0.02] px-6 py-3 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                        Click any item to view details, updates, and files.
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onClose}
                        className="h-8 rounded-lg px-3 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white"
                    >
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
