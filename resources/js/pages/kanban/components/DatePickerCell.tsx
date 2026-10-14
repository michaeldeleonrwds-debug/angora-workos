import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface DatePickerCellProps {
    value: string | null | undefined;
    onChange: (dateStr: string | null) => void;
    placeholder?: string;
    isOverdue?: boolean;
    isDueToday?: boolean;
    disabled?: boolean;
}

export default function DatePickerCell({
    value,
    onChange,
    placeholder = 'Add date',
    isOverdue = false,
    isDueToday = false,
    disabled = false,
}: DatePickerCellProps) {
    const [open, setOpen] = useState(false);

    // Parse initial viewing month/year from value or current date
    const parsedInitialDate = useMemo(() => {
        if (!value) return new Date();
        const datePart = String(value).split('T')[0];
        const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
        }
        const d = new Date(value);
        return isNaN(d.getTime()) ? new Date() : d;
    }, [value]);

    const [viewDate, setViewDate] = useState<Date>(parsedInitialDate);

    // Sync viewDate when popover opens
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setViewDate(parsedInitialDate);
        }
        setOpen(isOpen);
    };

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    // Selected date ISO string formatted as YYYY-MM-DD
    const selectedDateStr = useMemo(() => {
        if (!value) return '';
        const datePart = String(value).split('T')[0];
        const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) return `${match[1]}-${match[2]}-${match[3]}`;
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, [value]);

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

    const handleSelectDate = (dateStr: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(dateStr);
        setOpen(false);
    };

    const handleClearDate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(null);
        setOpen(false);
    };

    const handleSelectToday = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        onChange(todayStr);
        setOpen(false);
    };

    const formattedDateText = value ? formatDate(value) : null;

    return (
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <button
                    type="button"
                    className={`group/date flex h-full w-full items-center justify-between gap-1 px-2.5 py-1 text-xs transition-colors focus:outline-none select-none rounded hover:bg-muted/40 ${
                        isOverdue
                            ? 'text-red-600 font-bold dark:text-red-400'
                            : isDueToday
                              ? 'text-amber-600 font-bold dark:text-amber-400'
                              : 'text-foreground font-medium'
                    }`}
                    title={formattedDateText ? `${formattedDateText} (Click to change)` : placeholder}
                >
                    <span className="truncate text-center flex-1">
                        {formattedDateText || (
                            <span className="text-muted-foreground/50 font-normal italic">
                                {placeholder}
                            </span>
                        )}
                    </span>
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover/date:text-foreground" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="center"
                sideOffset={4}
                className="w-64 rounded-2xl border-border bg-popover p-3 shadow-xl select-none z-50"
            >
                {/* Header: Month / Year with prev / next arrows */}
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-border/40">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Previous Month"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-foreground">
                        {monthNames[currentMonth]} {currentYear}
                    </span>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Next Month"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {/* Day of week headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground mb-1">
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                    {daysGrid.map((day) => {
                        const isSelected = day.dateStr === selectedDateStr;
                        return (
                            <button
                                key={day.dateStr}
                                type="button"
                                onClick={(e) => handleSelectDate(day.dateStr, e)}
                                className={`h-7 w-7 text-xs rounded-lg flex items-center justify-center font-medium transition-all ${
                                    isSelected
                                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                        : day.isToday
                                          ? 'border border-primary text-primary font-bold hover:bg-primary/10'
                                          : day.isCurrentMonth
                                            ? 'text-foreground hover:bg-muted'
                                            : 'text-muted-foreground/40 hover:bg-muted/40'
                                }`}
                            >
                                {day.dayNumber}
                            </button>
                        );
                    })}
                </div>

                {/* Footer Controls: Today & Clear */}
                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectToday}
                        className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10"
                    >
                        Today
                    </Button>

                    {value && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearDate}
                            className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        >
                            <X className="mr-1 h-3 w-3" />
                            Clear
                        </Button>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
