import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Plus,
    Star,
    User as UserIcon,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import { isProductionDeadlineHidden, isUserAssignedToTask, KanbanBoard, Task, User } from '../types';
import CalendarDayDetailModal from './CalendarDayDetailModal';

interface CalendarViewProps {
    board: KanbanBoard;
    viewSettings?: Record<string, any> | null;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
    onQuickAddTask?: (dateStr: string, title?: string) => void;
    onRescheduleTask?: (taskId: number, newDate: string) => void;
}

export default function CalendarView({
    board,
    viewSettings,
    searchTerm,
    personFilter,
    priorityFilter,
    users = [],
    onSelectTask,
    onQuickAddTask,
    onRescheduleTask,
}: CalendarViewProps) {
    const { auth } = usePage<any>().props;
    const currentUserId = auth?.user?.id;
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [calendarMode, setCalendarMode] = useState<'month' | 'week'>(() =>
        viewSettings?.calendarMode === 'week' ? 'week' : 'month',
    );
    const [selectedDateForModal, setSelectedDateForModal] = useState<string | null>(null);

    // Extract all board items matching search & filters
    const allTasks = (board.groups || [])
        .flatMap((g) => g.tasks || [])
        .filter((task) => {
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (!task.title.toLowerCase().includes(term)) return false;
            }
            if (personFilter !== 'all' && !isUserAssignedToTask(task, personFilter, currentUserId)) return false;
            if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
            return true;
        });

    // Calendar Calculations
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayIndex = firstDayOfMonth.getDay(); // 0 is Sunday
    const daysInMonth = lastDayOfMonth.getDate();

    // Days grid for month view
    const daysGrid: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
        const d = prevMonthLastDay - i;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        daysGrid.push({ dateStr, dayNumber: d, isCurrentMonth: false, isToday: false });
    }

    // Current month days
    const todayStr = new Date().toISOString().split('T')[0];
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        daysGrid.push({
            dateStr,
            dayNumber: d,
            isCurrentMonth: true,
            isToday: dateStr === todayStr,
        });
    }

    // Next month padding to complete multiple of 7
    const remaining = (7 - (daysGrid.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        daysGrid.push({ dateStr, dayNumber: d, isCurrentMonth: false, isToday: false });
    }

    // Week view calculations
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDays: { dateStr: string; dayNumber: number; dayName: string; isToday: boolean }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        weekDays.push({
            dateStr: dStr,
            dayNumber: d.getDate(),
            dayName: dayNames[i],
            isToday: dStr === todayStr,
        });
    }

    // Navigation handlers
    const handlePrev = () => {
        if (calendarMode === 'month') {
            setCurrentDate(new Date(year, month - 1, 1));
        } else {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 7);
            setCurrentDate(d);
        }
    };

    const handleNext = () => {
        if (calendarMode === 'month') {
            setCurrentDate(new Date(year, month + 1, 1));
        } else {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 7);
            setCurrentDate(d);
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // Drag-and-drop reschedule
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('text/plain', String(taskId));
    };

    const handleDrop = (e: React.DragEvent, targetDate: string) => {
        e.preventDefault();
        const id = draggedTaskId || Number(e.dataTransfer.getData('text/plain'));
        if (id && onRescheduleTask) {
            onRescheduleTask(id, targetDate);
        }
        setDraggedTaskId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const datedTasksCount = allTasks.filter((t) => !!t.due_date || !!t.start_date).length;

    return (
        <div className="border border-border/70 bg-card dark:border-[#28283E] dark:bg-[#161624] space-y-4 rounded-2xl p-4 shadow-sm select-none transition-colors">
            {/* Calendar Controls Bar */}
            <div className="flex flex-col items-start justify-between gap-3 border-b border-border/50 dark:border-[#28283E] pb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        <h2 className="text-foreground text-lg font-black tracking-tight">
                            {monthNames[month]} {year}
                        </h2>
                    </div>

                    <div className="flex items-center rounded-xl border border-border/60 bg-muted/40 p-0.5 dark:border-white/10 dark:bg-white/5">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrev}
                            className="h-7 w-7 rounded-lg hover:bg-muted dark:hover:bg-white/10"
                            title="Previous period"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleToday}
                            className="h-7 rounded-lg px-2.5 text-xs font-bold hover:bg-muted dark:hover:bg-white/10"
                        >
                            Today
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNext}
                            className="h-7 w-7 rounded-lg hover:bg-muted dark:hover:bg-white/10"
                            title="Next period"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Month / Week Switcher */}
                    <div className="flex rounded-xl border border-border/60 bg-muted/40 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
                        <button
                            type="button"
                            onClick={() => setCalendarMode('month')}
                            className={`rounded-lg px-3 py-1 font-bold transition-all cursor-pointer ${
                                calendarMode === 'month'
                                    ? 'bg-card text-foreground shadow-xs dark:bg-[#1f1f33] dark:text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => setCalendarMode('week')}
                            className={`rounded-lg px-3 py-1 font-bold transition-all cursor-pointer ${
                                calendarMode === 'week'
                                    ? 'bg-card text-foreground shadow-xs dark:bg-[#1f1f33] dark:text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Week
                        </button>
                    </div>

                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary hidden sm:inline-block">
                        {datedTasksCount} scheduled {datedTasksCount === 1 ? 'item' : 'items'}
                    </span>
                </div>
            </div>

            {/* MONTH VIEW */}
            {calendarMode === 'month' && (
                <div className="overflow-hidden rounded-xl border border-border/60 dark:border-[#28283E] bg-background dark:bg-[#12121d]">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b border-border/60 dark:border-[#28283E] bg-muted/30 dark:bg-white/[0.02] text-muted-foreground py-2 text-center text-xs font-bold uppercase tracking-wider">
                        <span className="text-rose-500/80">Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span className="text-rose-500/80">Sat</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid auto-rows-fr grid-cols-7 divide-x divide-y divide-border/40 dark:divide-[#28283E]/60">
                        {daysGrid.map((day, idx) => {
                            const dayTasks = allTasks.filter((t) => {
                                if (t.start_date === day.dateStr) return true;
                                if (t.due_date === day.dateStr) {
                                    return !isProductionDeadlineHidden(t);
                                }
                                return false;
                            });

                            return (
                                <div
                                    key={`${day.dateStr}-${idx}`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, day.dateStr)}
                                    onClick={() => setSelectedDateForModal(day.dateStr)}
                                    className={`group relative flex min-h-[115px] flex-col p-2 transition-all cursor-pointer ${
                                        day.isCurrentMonth
                                            ? 'bg-background hover:bg-muted/30 dark:bg-[#12121d] dark:hover:bg-white/[0.04]'
                                            : 'bg-muted/10 text-muted-foreground/40 dark:bg-black/20'
                                    } ${day.isToday ? 'bg-primary/5 dark:bg-primary/[0.08]' : ''}`}
                                    title={`Click to view all tasks scheduled for ${day.dateStr}`}
                                >
                                    {/* Date Header Strip */}
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span
                                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                                day.isToday
                                                    ? 'bg-[#0073ea] text-white font-black shadow-md ring-2 ring-[#0073ea]/40'
                                                    : day.isCurrentMonth
                                                    ? 'text-foreground/90 group-hover:text-primary group-hover:font-extrabold'
                                                    : 'text-muted-foreground/40'
                                            }`}
                                        >
                                            {day.dayNumber}
                                        </span>

                                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            {dayTasks.length > 0 && (
                                                <span className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.2 border border-primary/25">
                                                    {dayTasks.length}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDateForModal(day.dateStr);
                                                }}
                                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-white/10 transition-colors"
                                                title={`Add or view items on ${day.dateStr}`}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Task Cards on this date */}
                                    <div className="scrollbar-none max-h-[125px] flex-1 space-y-1.5 overflow-y-auto">
                                        {dayTasks.slice(0, 3).map((task) => {
                                            const isDone = isProductionDeadlineHidden(task);
                                            const isOverdue = !isDone && task.deadline_status === 'overdue';
                                            const colColor = task.column?.color || '#579bfc';

                                            return (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectTask(task);
                                                    }}
                                                    className="group/item flex cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-border/70 bg-card hover:border-primary/60 hover:bg-muted/40 dark:border-white/10 dark:bg-[#1a1a2b] dark:hover:bg-[#202035] px-2 py-1 text-[11px] font-semibold shadow-2xs transition-all"
                                                >
                                                    <div className="flex min-w-0 items-center gap-1.5">
                                                        <span
                                                            className="h-2 w-2 flex-shrink-0 rounded-full"
                                                            style={{
                                                                backgroundColor: isDone ? '#00c875' : isOverdue ? '#e2445c' : colColor,
                                                            }}
                                                        />
                                                        {task.is_milestone && (
                                                            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                                                        )}
                                                        <span
                                                            className={`truncate ${
                                                                isDone ? 'text-muted-foreground line-through' : 'text-foreground'
                                                            }`}
                                                        >
                                                            {task.title}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {!isDone && task.due_time && (
                                                            <span className="text-muted-foreground text-[9px] font-normal">
                                                                {formatTime(task.due_time)}
                                                            </span>
                                                        )}
                                                        {task.assignee && (
                                                            <span className="bg-primary/20 text-primary flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold">
                                                                {task.assignee.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {dayTasks.length > 3 && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDateForModal(day.dateStr);
                                                }}
                                                className="w-full text-center rounded py-0.5 text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors"
                                            >
                                                +{dayTasks.length - 3} more items
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* WEEK VIEW */}
            {calendarMode === 'week' && (
                <div className="overflow-hidden rounded-xl border border-border/60 dark:border-[#28283E] bg-background dark:bg-[#12121d]">
                    <div className="grid grid-cols-7 border-b border-border/60 dark:border-[#28283E] bg-muted/30 dark:bg-white/[0.02] py-2.5 text-center">
                        {weekDays.map((wd) => (
                            <div
                                key={wd.dateStr}
                                onClick={() => setSelectedDateForModal(wd.dateStr)}
                                className="space-y-0.5 cursor-pointer hover:bg-muted/20 rounded-lg p-1 transition-colors"
                            >
                                <span className="text-muted-foreground text-[11px] font-semibold">{wd.dayName}</span>
                                <div
                                    className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                                        wd.isToday ? 'bg-[#0073ea] text-white shadow-xs' : 'text-foreground'
                                    }`}
                                >
                                    {wd.dayNumber}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="divide-border/40 dark:divide-[#28283E]/60 grid min-h-[380px] grid-cols-7 divide-x">
                        {weekDays.map((wd) => {
                            const dayTasks = allTasks.filter((t) => t.due_date === wd.dateStr || t.start_date === wd.dateStr);

                            return (
                                <div
                                    key={wd.dateStr}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, wd.dateStr)}
                                    onClick={() => setSelectedDateForModal(wd.dateStr)}
                                    className="group bg-background hover:bg-muted/10 dark:bg-[#12121d] dark:hover:bg-white/[0.03] space-y-2 p-2 transition-colors cursor-pointer"
                                >
                                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                        <span>{dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDateForModal(wd.dateStr);
                                            }}
                                            className="text-muted-foreground hover:text-foreground rounded-md p-1 opacity-0 transition-all group-hover:opacity-100"
                                            title="Add item"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {dayTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectTask(task);
                                            }}
                                            className="border border-border/70 dark:border-white/10 bg-card dark:bg-[#1a1a2b] hover:border-primary/50 cursor-pointer space-y-1.5 rounded-xl p-2.5 shadow-2xs transition-all"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                                                    style={{
                                                        backgroundColor:
                                                            task.priority === 'Urgent' ? '#fee2e2' : task.priority === 'High' ? '#ffedd5' : '#e0f2fe',
                                                        color:
                                                            task.priority === 'Urgent' ? '#b91c1c' : task.priority === 'High' ? '#c2410c' : '#0369a1',
                                                    }}
                                                >
                                                    {task.priority}
                                                </span>

                                                <div className="flex items-center gap-1">
                                                    {task.is_milestone && (
                                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                                                    )}
                                                    {task.due_time && (
                                                        <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                                                            <Clock className="h-2.5 w-2.5" /> {formatTime(task.due_time)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <h4 className="text-foreground line-clamp-2 text-xs font-bold">{task.title}</h4>

                                            <div className="border-t border-border/40 dark:border-white/10 text-muted-foreground flex items-center justify-between pt-1.5 text-[10px]">
                                                <span>{task.column?.title || 'Open'}</span>
                                                {task.assignee ? (
                                                    <span className="text-foreground max-w-[80px] truncate font-semibold">{task.assignee.name}</span>
                                                ) : (
                                                    <UserIcon className="h-3 w-3" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* DYNAMIC DAY SCHEDULE POPUP MODAL */}
            <CalendarDayDetailModal
                isOpen={Boolean(selectedDateForModal)}
                dateStr={selectedDateForModal}
                board={board}
                users={users}
                tasks={allTasks}
                onClose={() => setSelectedDateForModal(null)}
                onSelectTask={onSelectTask}
                onQuickAddTask={onQuickAddTask}
            />
        </div>
    );
}
