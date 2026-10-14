import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDate, formatTime } from '@/lib/utils';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

export interface DatePickerCellProps {
    value?: string | null | Record<string, any>;
    date?: string | null;
    time?: string | null;
    onChange: (newDate: string | null, newTime: string | null) => void;
    placeholder?: string;
    isOverdue?: boolean;
    isDueToday?: boolean;
    disabled?: boolean;
    align?: 'start' | 'center' | 'end';
}

/**
 * Extracts normalized YYYY-MM-DD date and HH:mm time from inputs
 */
function extractDateTime(
    dateProp?: string | null,
    timeProp?: string | null,
    valueProp?: string | null | Record<string, any>,
): { date: string | null; time: string | null } {
    let date: string | null = null;
    let time: string | null = null;

    if (dateProp) {
        const dMatch = String(dateProp).split('T')[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dMatch) date = `${dMatch[1]}-${dMatch[2]}-${dMatch[3]}`;
        else date = String(dateProp).split('T')[0];
    }
    if (timeProp) {
        time = String(timeProp).slice(0, 5);
    }

    if ((!date || !time) && valueProp) {
        if (typeof valueProp === 'object' && valueProp !== null) {
            if (!date && valueProp.date) date = String(valueProp.date).split('T')[0];
            if (!time && valueProp.time) time = String(valueProp.time).slice(0, 5);
        } else if (typeof valueProp === 'string') {
            const raw = valueProp.trim();
            if (raw.includes(' ') || raw.includes('T')) {
                const parts = raw.replace('T', ' ').split(' ');
                if (!date && parts[0]) date = parts[0];
                if (!time && parts[1]) time = parts[1].slice(0, 5);
            } else if (!date && raw.match(/^\d{4}-\d{2}-\d{2}$/)) {
                date = raw;
            }
        }
    }

    return { date, time };
}

/**
 * Format YYYY-MM-DD to MM/DD/YYYY for input bar
 */
function formatInputDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        return `${match[2]}/${match[3]}/${match[1]}`;
    }
    return dateStr;
}

/**
 * Format HH:mm to compact 12-hour string (e.g. "5:00AM")
 */
function formatCompactTime(timeStr: string | null): string {
    if (!timeStr) return '';
    const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return timeStr;
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute}${ampm}`;
}

/**
 * Convert 24-hour HH:mm to 12-hour parts
 */
function to12Hour(timeStr: string | null): { hour12: number; minute: string; period: 'AM' | 'PM' } {
    if (!timeStr) {
        return { hour12: 9, minute: '00', period: 'AM' };
    }
    const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (!match) {
        return { hour12: 9, minute: '00', period: 'AM' };
    }
    const rawH = parseInt(match[1], 10);
    const minute = match[2];
    const period: 'AM' | 'PM' = rawH >= 12 ? 'PM' : 'AM';
    let hour12 = rawH % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, minute, period };
}

/**
 * Convert 12-hour parts to 24-hour HH:mm string
 */
function to24Hour(hour12: number, minute: string, period: 'AM' | 'PM'): string {
    let h = hour12 % 12;
    if (period === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

export default function DatePickerCell({
    value,
    date: propDate,
    time: propTime,
    onChange,
    placeholder = 'Set date',
    isOverdue = false,
    isDueToday = false,
    disabled = false,
    align = 'center',
}: DatePickerCellProps) {
    const [open, setOpen] = useState(false);

    // Current parsed state from props
    const { date: activeDate, time: activeTime } = useMemo(
        () => extractDateTime(propDate, propTime, value),
        [propDate, propTime, value],
    );

    // Internal working state while picker is open
    const [selectedDate, setSelectedDate] = useState<string | null>(activeDate);
    const [selectedTime, setSelectedTime] = useState<string | null>(activeTime);
    const [isTimeMode, setIsTimeMode] = useState<boolean>(Boolean(activeTime));

    // Calendar view (year & month)
    const initialViewDate = useMemo(() => {
        if (activeDate) {
            const match = activeDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (match) {
                return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, 1);
            }
        }
        return new Date();
    }, [activeDate]);

    const [viewDate, setViewDate] = useState<Date>(initialViewDate);

    // Keep internal state synchronized when props change
    useEffect(() => {
        setSelectedDate(activeDate);
        setSelectedTime(activeTime);
        setIsTimeMode(Boolean(activeTime));
    }, [activeDate, activeTime]);

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setSelectedDate(activeDate);
            setSelectedTime(activeTime);
            setIsTimeMode(Boolean(activeTime));
            if (activeDate) {
                const match = activeDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (match) {
                    setViewDate(new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, 1));
                }
            }
        }
        setOpen(nextOpen);
    };

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const yearsList = useMemo(() => {
        const years: number[] = [];
        const baseYear = new Date().getFullYear();
        for (let y = baseYear - 5; y <= baseYear + 10; y++) {
            years.push(y);
        }
        return years;
    }, []);

    // 12-hour breakdown of current selected time
    const { hour12, minute, period } = useMemo(() => to12Hour(selectedTime), [selectedTime]);

    // Calendar grid calculations
    const daysGrid = useMemo(() => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

        const startDayIndex = firstDayOfMonth.getDay(); // 0 = Sunday
        const daysInMonth = lastDayOfMonth.getDate();

        const grid: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

        // Previous month padding
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
        for (let i = startDayIndex - 1; i >= 0; i--) {
            const d = prevMonthLastDay - i;
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            grid.push({ dateStr, dayNumber: d, isCurrentMonth: false, isToday: false });
        }

        // Today string
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            grid.push({
                dateStr,
                dayNumber: d,
                isCurrentMonth: true,
                isToday: dateStr === todayStr,
            });
        }

        // Next month padding to complete multiple of 7
        const remaining = (7 - (grid.length % 7)) % 7;
        for (let d = 1; d <= remaining; d++) {
            const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            grid.push({ dateStr, dayNumber: d, isCurrentMonth: false, isToday: false });
        }

        return grid;
    }, [currentYear, currentMonth]);

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
    };

    // Selecting a date preserves existing time (if time mode is enabled)
    const handleSelectDay = (dateStr: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedDate(dateStr);
        const timeToKeep = isTimeMode ? (selectedTime || '09:00') : null;
        onChange(dateStr, timeToKeep);
    };

    // Selecting today's date
    const handleSelectToday = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setSelectedDate(todayStr);
        setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
        const timeToKeep = isTimeMode ? (selectedTime || '09:00') : null;
        onChange(todayStr, timeToKeep);
    };

    // Toggle Time Mode on/off
    const handleToggleTimeMode = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isTimeMode) {
            // Turning time mode OFF
            setIsTimeMode(false);
            setSelectedTime(null);
            onChange(selectedDate, null);
        } else {
            // Turning time mode ON
            setIsTimeMode(true);
            const defaultTime = selectedTime || '09:00';
            setSelectedTime(defaultTime);
            const targetDate = selectedDate || (() => {
                const today = new Date();
                return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            })();
            setSelectedDate(targetDate);
            onChange(targetDate, defaultTime);
        }
    };

    // Updating time component (hour, minute, period)
    const handleUpdateTimePart = (
        newHour12: number,
        newMinute: string,
        newPeriod: 'AM' | 'PM',
        e?: React.MouseEvent | React.ChangeEvent,
    ) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const time24 = to24Hour(newHour12, newMinute, newPeriod);
        setSelectedTime(time24);
        setIsTimeMode(true);
        const targetDate = selectedDate || (() => {
            const today = new Date();
            return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        })();
        setSelectedDate(targetDate);
        onChange(targetDate, time24);
    };

    // Clear everything
    const handleClearAll = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedDate(null);
        setSelectedTime(null);
        setIsTimeMode(false);
        onChange(null, null);
        setOpen(false);
    };

    // Remove time only (keep date)
    const handleRemoveTime = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedTime(null);
        setIsTimeMode(false);
        onChange(selectedDate, null);
    };

    // Cell display text in table
    const cellDisplayText = useMemo(() => {
        if (!activeDate) return null;
        const formattedDate = formatDate(activeDate);
        if (activeTime) {
            const formattedTime = formatTime(activeTime);
            return `${formattedDate}, ${formattedTime}`;
        }
        return formattedDate;
    }, [activeDate, activeTime]);

    return (
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <button
                    type="button"
                    className={`group/date flex h-full w-full items-center justify-between gap-1.5 px-2 py-1 text-xs transition-colors focus:outline-none select-none rounded hover:bg-muted/40 ${
                        isOverdue
                            ? 'text-red-600 font-bold dark:text-red-400'
                            : isDueToday
                              ? 'text-amber-600 font-bold dark:text-amber-400'
                              : 'text-foreground font-medium'
                    }`}
                    title={cellDisplayText ? `${cellDisplayText} (Click to edit)` : placeholder}
                >
                    <span className="truncate flex-1 min-w-0 text-center whitespace-nowrap">
                        {cellDisplayText || (
                            <span className="text-muted-foreground/50 font-normal italic">
                                {placeholder}
                            </span>
                        )}
                    </span>
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover/date:text-foreground" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align={align}
                sideOffset={4}
                className="w-72 rounded-2xl border-border bg-popover p-3 shadow-2xl select-none z-50 text-xs"
            >
                {/* 1. Top Bar: "Today" on left, Clock Toggle button on right */}
                <div className="flex items-center justify-between mb-2">
                    <button
                        type="button"
                        onClick={handleSelectToday}
                        className="text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                    >
                        Today
                    </button>

                    <button
                        type="button"
                        onClick={handleToggleTimeMode}
                        className={`p-1.5 rounded-lg border transition-all ${
                            isTimeMode
                                ? 'bg-primary/10 border-primary/30 text-primary shadow-xs'
                                : 'border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        title={isTimeMode ? 'Disable time mode' : 'Enable time mode'}
                    >
                        <Clock className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* 2. Combined Input Bar: [ MM/DD/YYYY | hh:mmAM ] */}
                <div className="flex items-center rounded-xl border border-border/80 bg-background px-2.5 py-1.5 mb-2.5 shadow-2xs">
                    <span className="flex-1 text-xs font-semibold text-foreground truncate">
                        {selectedDate ? formatInputDate(selectedDate) : (
                            <span className="text-muted-foreground/50 font-normal">MM/DD/YYYY</span>
                        )}
                    </span>

                    <div className="mx-2 h-3.5 w-px bg-border/80 shrink-0" />

                    <div className="flex items-center shrink-0">
                        {isTimeMode ? (
                            <span className="text-xs font-semibold text-primary">
                                {formatCompactTime(selectedTime || '09:00')}
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={handleToggleTimeMode}
                                className="text-[11px] font-medium text-muted-foreground/70 hover:text-primary transition-colors"
                            >
                                + Add time
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Month & Year Selectors with Navigation Arrows */}
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-border/40">
                    <div className="flex items-center gap-1 font-bold text-foreground">
                        <select
                            value={currentMonth}
                            onChange={(e) => setViewDate(new Date(currentYear, Number(e.target.value), 1))}
                            className="bg-transparent font-bold text-xs cursor-pointer text-foreground border-none focus:outline-none rounded hover:bg-muted py-0.5 px-1"
                        >
                            {monthNames.map((m, idx) => (
                                <option key={m} value={idx} className="bg-popover text-foreground">
                                    {m}
                                </option>
                            ))}
                        </select>

                        <select
                            value={currentYear}
                            onChange={(e) => setViewDate(new Date(Number(e.target.value), currentMonth, 1))}
                            className="bg-transparent font-bold text-xs cursor-pointer text-foreground border-none focus:outline-none rounded hover:bg-muted py-0.5 px-1"
                        >
                            {yearsList.map((y) => (
                                <option key={y} value={y} className="bg-popover text-foreground">
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-0.5">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Previous Month"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Next Month"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* 4. Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground mb-1">
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                </div>

                {/* 5. Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                    {daysGrid.map((day) => {
                        const isSelected = day.dateStr === selectedDate;
                        return (
                            <button
                                key={day.dateStr}
                                type="button"
                                onClick={(e) => handleSelectDay(day.dateStr, e)}
                                className={`h-7 w-7 text-xs rounded-lg flex items-center justify-center font-medium transition-all ${
                                    isSelected
                                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                        : day.isToday
                                          ? 'border border-primary text-primary font-bold hover:bg-primary/10 underline underline-offset-2'
                                          : day.isCurrentMonth
                                            ? 'text-foreground hover:bg-muted'
                                            : 'text-muted-foreground/35 hover:bg-muted/40'
                                }`}
                            >
                                {day.dayNumber}
                            </button>
                        );
                    })}
                </div>

                {/* 6. Time Selector Section (Visible when Time Mode is ON) */}
                {isTimeMode && (
                    <div className="mt-3 pt-2.5 border-t border-border/40 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                            <span>Select Time</span>
                            <button
                                type="button"
                                onClick={handleRemoveTime}
                                className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
                            >
                                Remove time
                            </button>
                        </div>

                        {/* Hour : Minute and AM/PM */}
                        <div className="flex items-center justify-center gap-1.5 bg-muted/30 p-1.5 rounded-xl border border-border/40">
                            {/* Hour (1-12) */}
                            <select
                                value={hour12}
                                onChange={(e) => handleUpdateTimePart(Number(e.target.value), minute, period, e)}
                                className="bg-background border border-border/80 rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                    <option key={h} value={h}>
                                        {h}
                                    </option>
                                ))}
                            </select>

                            <span className="font-bold text-foreground">:</span>

                            {/* Minute */}
                            <select
                                value={minute}
                                onChange={(e) => handleUpdateTimePart(hour12, e.target.value, period, e)}
                                className="bg-background border border-border/80 rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none"
                            >
                                {['00', '15', '30', '45'].map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>

                            {/* AM / PM switcher pill */}
                            <div className="flex items-center bg-background border border-border/80 rounded-lg p-0.5 ml-1">
                                <button
                                    type="button"
                                    onClick={(e) => handleUpdateTimePart(hour12, minute, 'AM', e)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                        period === 'AM'
                                            ? 'bg-primary text-primary-foreground shadow-2xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    AM
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => handleUpdateTimePart(hour12, minute, 'PM', e)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                        period === 'PM'
                                            ? 'bg-primary text-primary-foreground shadow-2xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    PM
                                </button>
                            </div>
                        </div>

                        {/* Quick Common Times Chips */}
                        <div className="flex items-center justify-between gap-1 pt-1">
                            {[
                                { label: '9:00 AM', h: 9, m: '00', p: 'AM' as const },
                                { label: '12:00 PM', h: 12, m: '00', p: 'PM' as const },
                                { label: '3:00 PM', h: 3, m: '00', p: 'PM' as const },
                                { label: '5:00 PM', h: 5, m: '00', p: 'PM' as const },
                            ].map((chip) => (
                                <button
                                    key={chip.label}
                                    type="button"
                                    onClick={(e) => handleUpdateTimePart(chip.h, chip.m, chip.p, e)}
                                    className="flex-1 py-1 rounded-lg border border-border/40 bg-muted/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-[10px] font-semibold text-muted-foreground transition-all"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 7. Footer: Clear Button */}
                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                    {(selectedDate || selectedTime) ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAll}
                            className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        >
                            <X className="mr-1 h-3 w-3" />
                            Clear
                        </Button>
                    ) : (
                        <div />
                    )}

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpen(false)}
                        className="h-7 px-2.5 text-[11px] font-semibold text-foreground hover:bg-muted"
                    >
                        Done
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
