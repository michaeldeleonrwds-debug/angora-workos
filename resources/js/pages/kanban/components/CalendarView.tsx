import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Clock, Plus, Star, User as UserIcon } from 'lucide-react';
import React, { useState } from 'react';
import { isUserAssignedToTask, KanbanBoard, Task, User } from '../types';

interface CalendarViewProps {
    board: KanbanBoard;
    viewSettings?: Record<string, any> | null;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
    onQuickAddTask?: (dateStr: string) => void;
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
        viewSettings?.calendarMode === 'week' ? 'week' : viewSettings?.calendarMode === 'month' ? 'month' : 'month',
    );

    // Extract all board items
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

    // Next month padding to complete 35 or 42 cells (multiple of 7)
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

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return (
        <div className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-xs">
            {/* Calendar Controls */}
            <div className="border-border/50 flex flex-col items-start justify-between gap-3 border-b pb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-foreground text-lg font-black tracking-tight">
                        {monthNames[month]} {year}
                    </h2>
                    <div className="bg-muted/60 border-border/50 flex items-center rounded-xl border p-0.5">
                        <Button variant="ghost" size="icon" onClick={handlePrev} className="h-7 w-7 rounded-lg">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleToday} className="h-7 rounded-lg px-2.5 text-xs font-semibold">
                            Today
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7 rounded-lg">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-muted/60 border-border/50 flex rounded-xl border p-0.5 text-xs">
                        <button
                            onClick={() => setCalendarMode('month')}
                            className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                                calendarMode === 'month' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setCalendarMode('week')}
                            className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                                calendarMode === 'week' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Week
                        </button>
                    </div>

                    <span className="text-muted-foreground hidden text-xs sm:inline-block">
                        {allTasks.filter((t) => !!t.due_date).length} dated items
                    </span>
                </div>
            </div>

            {/* MONTH VIEW */}
            {calendarMode === 'month' && (
                <div className="border-border/60 bg-background overflow-hidden rounded-xl border">
                    {/* Weekday Headers */}
                    <div className="border-border/60 bg-muted/30 text-muted-foreground grid grid-cols-7 border-b py-2 text-center text-xs font-bold">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                    </div>

                    {/* Days Grid */}
                    <div className="divide-border/40 grid auto-rows-fr grid-cols-7 divide-x divide-y">
                        {daysGrid.map((day, idx) => {
                            const dayTasks = allTasks.filter((t) => t.due_date === day.dateStr || t.start_date === day.dateStr);

                            return (
                                <div
                                    key={`${day.dateStr}-${idx}`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, day.dateStr)}
                                    className={`group relative flex min-h-[110px] flex-col p-2 transition-colors ${
                                        day.isCurrentMonth ? 'bg-background hover:bg-muted/10' : 'bg-muted/20 text-muted-foreground/60'
                                    } ${day.isToday ? 'bg-primary/5' : ''}`}
                                >
                                    {/* Date Header */}
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span
                                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                                day.isToday ? 'bg-primary text-primary-foreground font-black shadow-xs' : 'text-foreground/80'
                                            }`}
                                        >
                                            {day.dayNumber}
                                        </span>

                                        {onQuickAddTask && day.isCurrentMonth && (
                                            <button
                                                onClick={() => onQuickAddTask(day.dateStr)}
                                                className="hover:bg-muted text-muted-foreground hover:text-foreground rounded-md p-1 opacity-0 transition-all group-hover:opacity-100"
                                                title={`Add task on ${day.dateStr}`}
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Task Cards on this date */}
                                    <div className="scrollbar-none max-h-[120px] flex-1 space-y-1.5 overflow-y-auto">
                                        {dayTasks.slice(0, 3).map((task) => {
                                            const isDone = !!task.completed_at || (task.progress ?? 0) === 100;
                                            const isOverdue = !isDone && (task.deadline_status === 'overdue' || (task.due_date && task.due_date < todayStr));

                                            return (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                                    onClick={() => onSelectTask(task)}
                                                    className="border-border/70 hover:border-primary/60 bg-card hover:bg-card/90 group/item flex cursor-pointer items-center justify-between gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold shadow-2xs transition-all"
                                                >
                                                    <div className="flex min-w-0 items-center gap-1.5">
                                                        <span
                                                            className="h-2 w-2 flex-shrink-0 rounded-full"
                                                            style={{
                                                                backgroundColor: isDone ? '#00c875' : isOverdue ? '#e2445c' : '#579bfc',
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
                                                        {task.due_time && (
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
                                            <div className="text-muted-foreground px-1 text-center text-[10px] font-semibold">
                                                +{dayTasks.length - 3} more
                                            </div>
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
                <div className="border-border/60 bg-background overflow-hidden rounded-xl border">
                    <div className="border-border/60 bg-muted/30 grid grid-cols-7 border-b py-2.5 text-center">
                        {weekDays.map((wd) => (
                            <div key={wd.dateStr} className="space-y-0.5">
                                <span className="text-muted-foreground text-[11px] font-semibold">{wd.dayName}</span>
                                <div
                                    className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                                        wd.isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                                    }`}
                                >
                                    {wd.dayNumber}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="divide-border/40 grid min-h-[380px] grid-cols-7 divide-x">
                        {weekDays.map((wd) => {
                            const dayTasks = allTasks.filter((t) => t.due_date === wd.dateStr || t.start_date === wd.dateStr);

                            return (
                                <div
                                    key={wd.dateStr}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, wd.dateStr)}
                                    className="group bg-background hover:bg-muted/10 space-y-2 p-2 transition-colors"
                                >
                                    <div className="flex justify-end">
                                        {onQuickAddTask && (
                                            <button
                                                onClick={() => onQuickAddTask(wd.dateStr)}
                                                className="text-muted-foreground hover:text-foreground rounded-md p-1 opacity-0 transition-all group-hover:opacity-100"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {dayTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onClick={() => onSelectTask(task)}
                                            className="border-border/70 bg-card hover:border-primary/50 cursor-pointer space-y-1 rounded-xl border p-2 shadow-2xs transition-all"
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

                                            <div className="border-border/40 text-muted-foreground flex items-center justify-between border-t pt-1 text-[10px]">
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
        </div>
    );
}
