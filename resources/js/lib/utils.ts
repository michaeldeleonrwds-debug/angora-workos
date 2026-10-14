import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format ISO or date strings (e.g. 2026-10-14T00:00:00.000000Z or 2026-10-14)
 * into a clean readable date string like "Oct 14, 2026".
 */
export function formatDate(dateVal: string | Date | null | undefined, fallback: string = '-'): string {
    if (!dateVal) return fallback;
    try {
        const str = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
        // If it starts with YYYY-MM-DD, parse parts directly to avoid UTC timezone day-shifts
        const datePart = str.split('T')[0];
        const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            const day = parseInt(match[3], 10);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            if (!isNaN(year) && month >= 0 && month <= 11 && !isNaN(day)) {
                return `${months[month]} ${day}, ${year}`;
            }
        }
        const d = new Date(str);
        if (isNaN(d.getTime())) return str;
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return String(dateVal);
    }
}

/**
 * Format datetime strings into a clean readable format like "Oct 14, 2026, 08:30 AM"
 */
export function formatDateTime(dateVal: string | Date | null | undefined, fallback: string = '-'): string {
    if (!dateVal) return fallback;
    try {
        const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
        if (isNaN(d.getTime())) return String(dateVal);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return String(dateVal);
    }
}

/**
 * Format time strings (e.g. "17:00", "09:30:00") or Date objects into 12-hour AM/PM format (e.g. "5:00 PM", "9:30 AM")
 */
export function formatTime(timeVal: string | Date | null | undefined, fallback: string = '-'): string {
    if (!timeVal) return fallback;
    try {
        if (typeof timeVal === 'string') {
            const trimmed = timeVal.trim();
            // Check for HH:mm or HH:mm:ss format
            const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
            if (match) {
                let hour = parseInt(match[1], 10);
                const minute = match[2];
                const ampm = hour >= 12 ? 'PM' : 'AM';
                hour = hour % 12;
                if (hour === 0) hour = 12;
                return `${hour}:${minute} ${ampm}`;
            }
        }
        const d = typeof timeVal === 'string' ? new Date(timeVal) : timeVal;
        if (isNaN(d.getTime())) return String(timeVal);
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
        return String(timeVal);
    }
}
